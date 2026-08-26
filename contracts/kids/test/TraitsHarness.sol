// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HoodlrzKidsTraits as T} from "../HoodlrzKidsTraits.sol";

/**
 * @title  TraitsHarness
 * @notice Expose la bibliotheque de traits pour le test differentiel.
 *
 * @dev    Contrat de TEST uniquement, jamais deploye en production.
 *
 *         Le test compare 3333 tokens entre le moteur JS et l'EVM. Un appel
 *         par token serait trop lent : on renvoie donc les traits d'une plage
 *         entiere en un seul appel, chaque token empaquete dans un uint256.
 *         Le decodage cote JS suit le meme ordre de champs.
 */
contract TraitsHarness {
    /// @notice Hash canonique d'un token, tel qu'injecte dans le HTML.
    function hashOf(bytes32 seedBase, uint256 tokenId) public pure returns (string memory) {
        return T.toHashString(keccak256(abi.encodePacked(seedBase, tokenId)));
    }

    /// @notice Graine 32 bits derivee d'une chaine, pour tester seedFromHash isolement.
    function seedOf(string memory hashStr) public pure returns (uint32) {
        return T.seedFromHash(hashStr);
    }

    /// @dev Empaquetage : 1 octet par champ, dans l'ordre du struct.
    ///      hat | hair | backdrop | expression | skull | mono | accent |
    ///      hatColorIdx | hoodColorIdx | eqColorIdx | hoodWhite
    function _pack(T.Traits memory t) private pure returns (uint256 p) {
        p = uint256(t.hat);
        p = (p << 8) | uint256(t.hair);
        p = (p << 8) | uint256(t.backdrop);
        p = (p << 8) | uint256(t.expression);
        p = (p << 8) | (t.skull ? 1 : 0);
        p = (p << 8) | (t.mono ? 1 : 0);
        p = (p << 8) | uint256(t.accent);
        p = (p << 8) | uint256(t.hatColorIdx);
        p = (p << 8) | uint256(t.hoodColorIdx);
        p = (p << 8) | uint256(t.eqColorIdx);
        p = (p << 8) | (t.hoodWhite ? 1 : 0);
    }

    /// @notice Traits empaquetes pour une plage de tokens.
    function probeRange(bytes32 seedBase, uint256 start, uint256 count)
        public
        pure
        returns (uint256[] memory out)
    {
        out = new uint256[](count);
        for (uint256 i = 0; i < count; ++i) {
            string memory h = T.toHashString(keccak256(abi.encodePacked(seedBase, start + i)));
            out[i] = _pack(T.derive(h));
        }
    }

    /// @notice Traits empaquetes pour des chaines de hash arbitraires.
    ///         Sert a tester des formes de hash que keccak ne produirait pas.
    function probeHashes(string[] memory hashes) public pure returns (uint256[] memory out) {
        out = new uint256[](hashes.length);
        for (uint256 i = 0; i < hashes.length; ++i) {
            out[i] = _pack(T.derive(hashes[i]));
        }
    }

    /// @notice Couleurs resolues, pour verifier la logique mono.
    function colorsOf(string memory hashStr)
        public
        pure
        returns (string memory hat, string memory hood, string memory eq, string memory face, string memory palette)
    {
        T.Traits memory t = T.derive(hashStr);
        return (T.hatColor(t), T.hoodColor(t), T.eqColor(t), T.faceLabel(t), T.paletteLabel(t));
    }
}
