// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  HoodlrzKidsEngine
 * @notice Stockage on-chain du moteur generatif Hoodlrz Gen Kids.
 *
 * @dev    Le moteur est un fichier HTML autonome de ~116 Ko : aucun CDN,
 *         aucune police externe, aucune dependance. Il est stocke ici en
 *         bytecode de contrat (SSTORE2), une fois pour toute la collection.
 *         Les 3333 tokens ne different que par leur graine - il n'y a donc
 *         aucun stockage par token.
 *
 *         DECOUPAGE
 *         Le HTML est coupe en deux moities autour d'un marqueur, et le
 *         tokenURI se reconstitue par PRE + hash + POST. Le contrat ne fait
 *         jamais de recherche/remplacement de chaine : ce serait couteux et
 *         inutile puisque le point d'injection est connu a la compilation.
 *
 *         Chaque moitie est elle-meme decoupee en morceaux de 24 Ko. La
 *         chaine cible autorise 96 Ko de bytecode, mais on s'aligne sur la
 *         limite EIP-170 d'Ethereum : le meme moteur se redeploie alors a
 *         l'identique sur n'importe quelle EVM, ce qui est la condition du
 *         plan de repli. Le cout en gas est inchange, on paie a l'octet.
 *
 *         VERROUILLAGE
 *         Une fois `seal()` appele, plus rien ne peut etre ajoute ni
 *         remplace. C'est ce qui rend la promesse "on-chain" verifiable :
 *         n'importe qui peut relire le bytecode et recalculer le SHA-256
 *         publie.
 */
contract HoodlrzKidsEngine is Ownable {
    /// @notice Morceaux precedant le point d'injection du hash.
    address[] public preChunks;
    /// @notice Morceaux suivant le point d'injection du hash.
    address[] public postChunks;

    /// @notice SHA-256 de l'artefact HTML complet, hash injecte compris.
    ///         Publie pour que quiconque puisse verifier que le bytecode
    ///         stocke correspond bien a l'artefact annonce.
    bytes32 public artifactHash;

    /// @notice Une fois scelle, le moteur est immuable.
    bool public sealed_;

    event ChunkStored(bool isPre, uint256 index, address pointer, uint256 size);
    event Sealed(bytes32 artifactHash, uint256 totalBytes);

    error AlreadySealed();
    error NotSealed();
    error EmptyChunk();

    constructor() Ownable(msg.sender) {}

    modifier whileOpen() {
        if (sealed_) revert AlreadySealed();
        _;
    }

    /* ------------------------------------------------------------------ *
     *  SSTORE2
     * ------------------------------------------------------------------ */

    function _sstore2Write(bytes memory data) internal returns (address pointer) {
        bytes memory creationCode = abi.encodePacked(
            hex"61",                         // PUSH2
            bytes2(uint16(data.length + 1)), // longueur runtime (STOP + data)
            hex"80",                         // DUP1
            hex"600c",                       // PUSH1 12
            hex"6000",                       // PUSH1 0
            hex"39",                         // CODECOPY
            hex"6000",                       // PUSH1 0
            hex"f3",                         // RETURN
            hex"00",                         // STOP - premier octet du runtime
            data
        );
        assembly {
            pointer := create(0, add(creationCode, 0x20), mload(creationCode))
        }
        require(pointer != address(0), "SSTORE2: deploiement echoue");
    }

    function _sstore2Read(address pointer) internal view returns (bytes memory data) {
        require(pointer != address(0), "SSTORE2: pointeur nul");
        uint256 size;
        assembly { size := extcodesize(pointer) }
        require(size > 1, "SSTORE2: vide");
        data = new bytes(size - 1); // on saute l'opcode STOP
        assembly {
            extcodecopy(pointer, add(data, 0x20), 1, sub(size, 1))
        }
    }

    /* ------------------------------------------------------------------ *
     *  Ecriture
     * ------------------------------------------------------------------ */

    /// @notice Ajoute un morceau a la fin de la moitie choisie.
    /// @param  isPre true pour la partie avant le hash, false pour apres.
    function appendChunk(bool isPre, bytes calldata data) external onlyOwner whileOpen {
        if (data.length == 0) revert EmptyChunk();
        address p = _sstore2Write(data);
        if (isPre) {
            preChunks.push(p);
            emit ChunkStored(true, preChunks.length - 1, p, data.length);
        } else {
            postChunks.push(p);
            emit ChunkStored(false, postChunks.length - 1, p, data.length);
        }
    }

    /// @notice Scelle definitivement le moteur.
    /// @param  expectedHash SHA-256 de l'artefact, publie avec la collection.
    /// @dev    Volontairement irreversible : c'est le geste qui transforme un
    ///         deploiement en oeuvre. A n'appeler qu'apres avoir verifie le
    ///         rendu depuis la chaine (voir scripts/kids/verify-onchain.mjs).
    function seal(bytes32 expectedHash) external onlyOwner whileOpen {
        require(preChunks.length > 0 && postChunks.length > 0, "Moteur incomplet");
        artifactHash = expectedHash;
        sealed_ = true;
        emit Sealed(expectedHash, totalBytes());
    }

    /* ------------------------------------------------------------------ *
     *  Lecture
     * ------------------------------------------------------------------ */

    function _concat(address[] storage chunks) private view returns (bytes memory out) {
        for (uint256 i = 0; i < chunks.length; ++i) {
            out = abi.encodePacked(out, _sstore2Read(chunks[i]));
        }
    }

    /// @notice Partie du HTML precedant le hash.
    function pre() public view returns (bytes memory) {
        return _concat(preChunks);
    }

    /// @notice Partie du HTML suivant le hash.
    function post() public view returns (bytes memory) {
        return _concat(postChunks);
    }

    /// @notice Document HTML complet pour un hash donne.
    /// @dev    Simple concatenation : c'est tout l'interet du decoupage
    ///         au marqueur. Fonction `view`, donc gratuite en lecture RPC.
    function documentFor(string memory hashStr) public view returns (string memory) {
        return string(abi.encodePacked(pre(), hashStr, post()));
    }

    function totalBytes() public view returns (uint256 n) {
        for (uint256 i = 0; i < preChunks.length; ++i) {
            n += _size(preChunks[i]);
        }
        for (uint256 i = 0; i < postChunks.length; ++i) {
            n += _size(postChunks[i]);
        }
    }

    function _size(address p) private view returns (uint256 s) {
        assembly { s := extcodesize(p) }
        unchecked { s = s - 1; }
    }

    function chunkCounts() external view returns (uint256 preCount, uint256 postCount) {
        return (preChunks.length, postChunks.length);
    }
}
