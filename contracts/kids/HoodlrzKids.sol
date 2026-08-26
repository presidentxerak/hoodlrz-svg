// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {HoodlrzKidsRenderer} from "./HoodlrzKidsRenderer.sol";

/**
 * @title  Hoodlrz Gen Kids
 * @author XERAK
 * @notice Collection generative de 3333 pieces, integralement on-chain.
 *
 * @dev    PARAMETRES, arretes le 21/08/2026, supply revue le 23/08/2026,
 *         graves ici en constantes :
 *
 *           supply totale      3333
 *           reserve createur    300  (9,0 %), mintee avant toute ouverture
 *           public             3033
 *           plafond par wallet   10  -> 304 wallets distincts au minimum
 *           prix              gratuit (gas seulement)
 *           royalties            5 % (EIP-2981, declaratif)
 *
 *         POURQUOI 10 ET PAS 100
 *         A 100 par wallet, 31 adresses suffiraient a rafler la collection
 *         entiere. En free mint sur une chaine a gas sub-centime, monter 31
 *         wallets ne coute rien a un bot. A 10, il en faut 304 : le vidage
 *         reste possible mais devient couteux, et l'allowlist donne aux
 *         holders Hoodlrz une avance reelle plutot que symbolique.
 *
 *         Le plafond n'a PAS ete reduit avec la supply. A 3333 pieces pour
 *         ~117 holders OG, 10 laisse a chacun de quoi constituer un petit
 *         ensemble plutot qu'une piece unique - ce qui est le propre d'une
 *         collection generative : on y cherche des combinaisons, pas un
 *         jeton.
 *
 *         GRAINE
 *         Le hash d'un token est keccak256(seedBase, tokenId). `seedBase`
 *         est fixe une seule fois, apres la fin du mint, a partir d'un
 *         blockhash posterieur : personne - pas meme le deployeur - ne peut
 *         donc choisir quel token recevra quels traits pendant le mint.
 *         Aucun stockage par token n'est necessaire.
 *
 *         PIEGE DE CHAINE
 *         Les phases sont pilotees par block.timestamp, JAMAIS par
 *         block.number : sur la chaine cible (Arbitrum Orbit), block.number
 *         renvoie une estimation du bloc L1, pas du bloc local.
 */
contract HoodlrzKids is ERC721, IERC2981, Ownable {
    /* ------------------------------------------------------------------ *
     *  Constantes de collection
     * ------------------------------------------------------------------ */
    uint256 public constant MAX_SUPPLY = 3333;
    uint256 public constant RESERVE = 300;
    uint256 public constant MAX_PER_WALLET = 10;
    uint96 public constant ROYALTY_BPS = 500; // 5 %

    /* ------------------------------------------------------------------ *
     *  Etat
     * ------------------------------------------------------------------ */
    HoodlrzKidsRenderer public renderer;

    /// @notice Racine Merkle de l'allowlist (snapshot des holders Hoodlrz).
    bytes32 public allowlistRoot;

    /// @notice Base de graine, figee apres le mint. Nulle = pas encore revelee.
    bytes32 public seedBase;

    /// @notice Beneficiaire des royalties.
    address public royaltyReceiver;

    uint256 public totalMinted;
    uint256 public reserveMinted;

    /// @notice Ouverture de la phase allowlist, puis de la phase publique.
    ///         Zero = phase non programmee.
    uint64 public allowlistStart;
    uint64 public publicStart;
    uint64 public mintEnd;

    /// @dev Compte les mints publics + allowlist par adresse, plafond commun.
    mapping(address => uint256) public minted;

    /// @notice Verrou du renderer. Une fois pose, l'adresse ne change plus.
    bool public rendererLocked;

    event SeedRevealed(bytes32 seedBase, uint256 blockNumber);
    event PhasesSet(uint64 allowlistStart, uint64 publicStart, uint64 mintEnd);
    event RendererLocked(address renderer);

    error MintClosed();
    error WalletCapReached();
    error SupplyExhausted();
    error BadProof();
    error SeedAlreadySet();
    error SeedNotSet();
    error ReserveExhausted();
    error ReserveFirst();
    error Locked();

    constructor(address renderer_, address royaltyReceiver_)
        ERC721("Hoodlrz Gen Kids", "KIDS")
        Ownable(msg.sender)
    {
        renderer = HoodlrzKidsRenderer(renderer_);
        royaltyReceiver = royaltyReceiver_;
    }

    /* ------------------------------------------------------------------ *
     *  Administration
     * ------------------------------------------------------------------ */

    function setPhases(uint64 alStart, uint64 pubStart, uint64 end) external onlyOwner {
        require(alStart <= pubStart && pubStart < end, "Phases incoherentes");
        allowlistStart = alStart;
        publicStart = pubStart;
        mintEnd = end;
        emit PhasesSet(alStart, pubStart, end);
    }

    function setAllowlistRoot(bytes32 root) external onlyOwner {
        allowlistRoot = root;
    }

    function setRenderer(address r) external onlyOwner {
        if (rendererLocked) revert Locked();
        renderer = HoodlrzKidsRenderer(r);
    }

    /// @dev Irreversible : fige l'adresse du renderer. A appeler une fois le
    ///      rendu verifie depuis la chaine.
    function lockRenderer() external onlyOwner {
        rendererLocked = true;
        emit RendererLocked(address(renderer));
    }

    function setRoyaltyReceiver(address r) external onlyOwner {
        royaltyReceiver = r;
    }

    /* ------------------------------------------------------------------ *
     *  Reserve createur
     * ------------------------------------------------------------------ */

    /// @notice Mint de la reserve, obligatoirement avant l'ouverture publique.
    /// @dev    Decoupable en plusieurs appels pour tenir dans un bloc.
    function mintReserve(address to, uint256 qty) external onlyOwner {
        if (reserveMinted + qty > RESERVE) revert ReserveExhausted();
        // La reserve doit etre servie avant que quiconque puisse minter :
        // une reserve prelevee apres coup se paie cher en reputation.
        require(allowlistStart == 0 || block.timestamp < allowlistStart, "Trop tard pour la reserve");
        reserveMinted += qty;
        _mintMany(to, qty);
    }

    /* ------------------------------------------------------------------ *
     *  Mint
     * ------------------------------------------------------------------ */

    function _mintMany(address to, uint256 qty) private {
        uint256 start = totalMinted;
        if (start + qty > MAX_SUPPLY) revert SupplyExhausted();
        totalMinted = start + qty;
        for (uint256 i = 0; i < qty; ++i) {
            _safeMint(to, start + i);
        }
    }

    function _checkCap(uint256 qty) private {
        uint256 m = minted[msg.sender] + qty;
        if (m > MAX_PER_WALLET) revert WalletCapReached();
        minted[msg.sender] = m;
    }

    /// @notice Mint pendant la phase allowlist, reservee aux holders Hoodlrz.
    function mintAllowlist(uint256 qty, bytes32[] calldata proof) external {
        if (allowlistStart == 0 || block.timestamp < allowlistStart || block.timestamp >= publicStart) {
            revert MintClosed();
        }
        if (reserveMinted < RESERVE) revert ReserveFirst();
        if (!MerkleProof.verifyCalldata(proof, allowlistRoot, keccak256(abi.encodePacked(msg.sender)))) {
            revert BadProof();
        }
        _checkCap(qty);
        _mintMany(msg.sender, qty);
    }

    /// @notice Mint public.
    function mintPublic(uint256 qty) external {
        if (publicStart == 0 || block.timestamp < publicStart || block.timestamp >= mintEnd) {
            revert MintClosed();
        }
        if (reserveMinted < RESERVE) revert ReserveFirst();
        _checkCap(qty);
        _mintMany(msg.sender, qty);
    }

    /* ------------------------------------------------------------------ *
     *  Revelation de la graine
     * ------------------------------------------------------------------ */

    /**
     * @notice Fige la base de graine une fois la distribution terminee.
     * @dev    Melange le blockhash du bloc precedent, le timestamp et le
     *         nombre de tokens mintes. Le blockhash n'est PAS une source
     *         d'alea sure sur une chaine a sequenceur centralise - mais ici
     *         il n'y a rien a gagner a le manipuler : la graine est fixee
     *         une fois le mint termine, donc apres que les tokens ont ete
     *         distribues. Personne ne peut viser un token en particulier.
     *
     *         Ce n'est volontairement PAS le meme probleme qu'un tirage
     *         gacha, ou l'alea decide qui recoit quoi et doit etre verifiable.
     */
    function revealSeed() external onlyOwner {
        if (seedBase != bytes32(0)) revert SeedAlreadySet();
        // La seule condition qui compte est que la distribution soit finie.
        // On y arrive de deux facons : la fenetre se ferme, ou il ne reste
        // plus rien a minter. La seconde n'est pas un confort - la fenetre
        // de mint court jusqu'en 2036, et sans elle la collection resterait
        // en placeholder dix ans apres que la derniere piece a trouve
        // preneur.
        require(
            mintEnd != 0 && (block.timestamp >= mintEnd || totalMinted == MAX_SUPPLY),
            "Mint en cours"
        );
        seedBase = keccak256(
            abi.encodePacked(blockhash(block.number - 1), block.timestamp, totalMinted, address(this))
        );
        emit SeedRevealed(seedBase, block.number);
    }

    /// @notice Hash d'un token, dont derive toute la piece.
    function tokenHash(uint256 tokenId) public view returns (bytes32) {
        if (seedBase == bytes32(0)) revert SeedNotSet();
        return keccak256(abi.encodePacked(seedBase, tokenId));
    }

    /* ------------------------------------------------------------------ *
     *  Metadonnees
     * ------------------------------------------------------------------ */

    /**
     * @notice Metadonnees de la collection, lues par les marketplaces.
     * @dev    Nom, description, vignette et royalties de l'ENSEMBLE - la
     *         page de collection sur OpenSea, par opposition a tokenURI
     *         qui decrit une piece. Sans lui, la collection s'affiche
     *         sous une adresse de contrat et une image vide.
     *
     *         Le beneficiaire est lu depuis l'etat, pas fige : si
     *         setRoyaltyReceiver() est appele, les deux sources - EIP-2981
     *         et ce champ - restent d'accord.
     */
    function contractURI() external view returns (string memory) {
        return renderer.contractURI(royaltyReceiver, ROYALTY_BPS);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        // Avant revelation, on renvoie un placeholder plutot que de revenir
        // en erreur : une marketplace qui interroge un token non revele doit
        // afficher quelque chose, pas casser.
        if (seedBase == bytes32(0)) {
            return string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    _b64(
                        abi.encodePacked(
                            '{"name":"Hoodlrz Gen Kid #', _dec(tokenId),
                            '","description":"Graine non encore revelee. Les traits apparaitront a la fin du mint.","image":"data:image/svg+xml;base64,',
                            _b64(bytes(_placeholderSvg())),
                            '"}'
                        )
                    )
                )
            );
        }
        return renderer.tokenURI(tokenId, tokenHash(tokenId));
    }

    function _placeholderSvg() private pure returns (string memory) {
        return
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700" width="700" height="700">'
            '<rect width="700" height="700" fill="#000000"/>'
            '<text x="350" y="360" fill="#ffffff" font-family="monospace" font-size="34" text-anchor="middle">HOODLRZ KIDS</text>'
            '<text x="350" y="404" fill="#ff36c8" font-family="monospace" font-size="18" text-anchor="middle">graine non revelee</text>'
            "</svg>";
    }

    /* ------------------------------------------------------------------ *
     *  Royalties
     * ------------------------------------------------------------------ */

    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        override
        returns (address, uint256)
    {
        return (royaltyReceiver, (salePrice * ROYALTY_BPS) / 10_000);
    }

    function supportsInterface(bytes4 id) public view override(ERC721, IERC165) returns (bool) {
        return id == type(IERC2981).interfaceId || super.supportsInterface(id);
    }

    /* ------------------------------------------------------------------ *
     *  Utilitaires internes
     * ------------------------------------------------------------------ */

    function _b64(bytes memory data) private pure returns (string memory) {
        // On delegue a l'implementation d'OpenZeppelin via le renderer plutot
        // que de dupliquer une table Base64 : import direct ici pour rester
        // autonome si le renderer n'est pas encore branche.
        return _base64(data);
    }

    bytes private constant B64_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function _base64(bytes memory data) private pure returns (string memory) {
        if (data.length == 0) return "";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen + 32);
        bytes memory table = B64_TABLE;
        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            for { let i := 0 } lt(i, mload(data)) { i := add(i, 3) } {
                let input := and(mload(add(add(data, 0x20), i)), 0xffffff0000000000000000000000000000000000000000000000000000000000)
                let out := mload(add(tablePtr, and(shr(250, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(244, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(238, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(232, input), 0x3F))), 0xFF))
                out := shl(224, out)
                mstore(resultPtr, out)
                resultPtr := add(resultPtr, 4)
            }
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
            mstore(result, encodedLen)
        }
        return string(result);
    }

    function _dec(uint256 v) private pure returns (string memory) {
        if (v == 0) return "0";
        uint256 n = v;
        uint256 len;
        while (n != 0) { len++; n /= 10; }
        bytes memory b = new bytes(len);
        while (v != 0) { b[--len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}
