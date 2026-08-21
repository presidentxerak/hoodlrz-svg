// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {HoodlrzKidsTraits as T} from "./HoodlrzKidsTraits.sol";
import {HoodlrzKidsConstants as K} from "./HoodlrzKidsConstants.sol";
import {HoodlrzKidsEngine} from "./HoodlrzKidsEngine.sol";

/**
 * @title  HoodlrzKidsRenderer
 * @notice Construit le tokenURI entierement on-chain.
 *
 * @dev    Le JSON renvoye contient trois choses :
 *
 *         - `attributes`   : les traits, recalcules ici par la bibliotheque
 *                            Solidity. Leur parite avec le moteur JS est
 *                            prouvee par test differentiel sur les 8888
 *                            tokens, pas supposee.
 *
 *         - `animation_url`: le HTML complet en data URI, avec le hash du
 *                            token injecte. C'est l'oeuvre elle-meme.
 *
 *         - `image`        : une affiche SVG generee ici.
 *
 *         POURQUOI UNE AFFICHE SVG
 *         Les marketplaces affichent une vignette statique dans leurs
 *         grilles. Trois options existaient : pointer vers un service de
 *         rendu (ce qui reintroduit un serveur, donc une dependance
 *         mortelle), ne rien mettre (vignette vide, redhibitoire), ou
 *         dessiner une affiche on-chain. L'art etant du trait pur sur fond
 *         noir, la troisieme voie est realiste et garde la collection
 *         autonome de bout en bout.
 *
 *         L'affiche n'essaie PAS d'imiter le rendu Canvas - elle en reprend
 *         la grammaire : fond noir, silhouette de capuche, couleur d'accent
 *         du token, mot du bas. Elle signale ce qu'est la piece et renvoie
 *         vers l'animation.
 */
contract HoodlrzKidsRenderer {
    using Strings for uint256;

    HoodlrzKidsEngine public immutable engine;

    string private constant DESCRIPTION =
        "Hoodlrz Kids - collection generative integralement on-chain. "
        "Le moteur de rendu est stocke dans la blockchain, pas sur un serveur : "
        "chaque piece se regenere depuis sa graine, indefiniment. "
        "Touchez l'image pour changer la punchline. XERAK.";

    constructor(address engineAddress) {
        engine = HoodlrzKidsEngine(engineAddress);
    }

    /* ------------------------------------------------------------------ *
     *  Affiche SVG
     * ------------------------------------------------------------------ */

    function _svg(T.Traits memory t) internal pure returns (string memory) {
        string memory hood = T.hoodColor(t);
        string memory hat = T.hatColor(t);
        string memory eq = T.eqColor(t);
        // Le visage skull est blanc plein avec features noires ; sinon
        // silhouette noire et trait clair, comme dans le moteur.
        string memory faceFill = t.skull ? "#ffffff" : "#000000";
        string memory faceLine = t.skull ? "#000000" : "#ffffff";

        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700" width="700" height="700">',
                '<rect width="700" height="700" fill="#000000"/>',
                // barres d'equalizer, teintees de la couleur EQ du token
                _bars(eq),
                // capuche : deux courbes descendantes + epaules
                '<path d="M175 660 C175 300 240 190 350 190 C460 190 525 300 525 660 Z" fill="#000000" stroke="',
                hood,
                '" stroke-width="9" stroke-linejoin="round"/>',
                // visage
                '<ellipse cx="350" cy="360" rx="118" ry="132" fill="',
                faceFill,
                '" stroke="',
                faceLine,
                '" stroke-width="7"/>',
                // casquette / couvre-chef, simplifie en une visiere
                '<path d="M232 268 C250 196 450 196 468 268 Z" fill="#000000" stroke="',
                hat,
                '" stroke-width="9" stroke-linejoin="round"/>',
                '<path d="M214 272 L494 272" stroke="',
                hat,
                '" stroke-width="9" stroke-linecap="round"/>',
                _face(t, faceLine),
                '</svg>'
            )
        );
    }

    /// @dev Yeux et bouche, choisis d'apres l'expression du token.
    function _face(T.Traits memory t, string memory line) private pure returns (string memory) {
        // Regroupement volontaire : l'affiche distingue trois familles
        // d'expression plutot que dix, pour rester lisible en vignette.
        uint8 e = t.expression;
        string memory eyes;
        if (e == 5) {
            // DEAD : croix
            eyes = string(abi.encodePacked(
                '<path d="M300 340 l34 34 M334 340 l-34 34 M366 340 l34 34 M400 340 l-34 34" stroke="',
                line, '" stroke-width="9" stroke-linecap="round"/>'
            ));
        } else if (e == 8) {
            // SLEEPY : yeux fermes
            eyes = string(abi.encodePacked(
                '<path d="M296 356 q22 -18 44 0 M360 356 q22 -18 44 0" stroke="',
                line, '" stroke-width="9" fill="none" stroke-linecap="round"/>'
            ));
        } else if (e == 9) {
            // RAGE : sourcils bas
            eyes = string(abi.encodePacked(
                '<path d="M292 330 l46 22 M408 330 l-46 22" stroke="', line,
                '" stroke-width="9" stroke-linecap="round"/>',
                '<ellipse cx="316" cy="364" rx="11" ry="14" fill="', line, '"/>',
                '<ellipse cx="384" cy="364" rx="11" ry="14" fill="', line, '"/>'
            ));
        } else {
            // Par defaut : les grands ovales caracteristiques.
            eyes = string(abi.encodePacked(
                '<ellipse cx="313" cy="352" rx="15" ry="20" fill="', line, '"/>',
                '<ellipse cx="387" cy="352" rx="15" ry="20" fill="', line, '"/>'
            ));
        }
        string memory mouth = string(abi.encodePacked(
            '<path d="M312 424 q38 ', (e == 3 ? "-26" : "26"), ' 76 0" stroke="',
            line, '" stroke-width="8" fill="none" stroke-linecap="round"/>'
        ));
        return string(abi.encodePacked(eyes, mouth));
    }

    /// @dev Barres d'equalizer de part et d'autre, hauteurs fixes : l'affiche
    ///      est statique, l'animation vit dans animation_url.
    function _bars(string memory color) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<g fill="', color, '" opacity="0.85">',
                '<rect x="24"  y="560" width="16" height="100"/>',
                '<rect x="48"  y="600" width="16" height="60"/>',
                '<rect x="72"  y="530" width="16" height="130"/>',
                '<rect x="96"  y="596" width="16" height="64"/>',
                '<rect x="588" y="596" width="16" height="64"/>',
                '<rect x="612" y="530" width="16" height="130"/>',
                '<rect x="636" y="600" width="16" height="60"/>',
                '<rect x="660" y="560" width="16" height="100"/>',
                '</g>'
            )
        );
    }

    /* ------------------------------------------------------------------ *
     *  Attributs
     * ------------------------------------------------------------------ */

    function _attr(string memory k, string memory v) private pure returns (string memory) {
        return string(abi.encodePacked('{"trait_type":"', k, '","value":"', v, '"}'));
    }

    function _attributes(T.Traits memory t) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                "[",
                _attr("Hat", K.hat_types(t.hat)), ",",
                _attr("Hat Color", T.hatColor(t)), ",",
                _attr("Hood Color", T.hoodColor(t)), ",",
                _attr("Face", T.faceLabel(t)), ",",
                _attr("Hair", K.hair_styles(t.hair)), ",",
                _attr("Backdrop", K.bg_styles(t.backdrop)), ",",
                _attr("Palette", T.paletteLabel(t)), ",",
                _attr("EQ Color", T.eqColor(t)), ",",
                _attr("Expression", K.expressions(t.expression)),
                "]"
            )
        );
    }

    /* ------------------------------------------------------------------ *
     *  tokenURI
     * ------------------------------------------------------------------ */

    /**
     * @notice Metadonnees completes d'un token, tout on-chain.
     * @param  tokenId  Numero du token, pour le nom affiche.
     * @param  tokenHash Hash du token (bytes32) dont derive toute la piece.
     */
    function tokenURI(uint256 tokenId, bytes32 tokenHash) external view returns (string memory) {
        string memory hashStr = T.toHashString(tokenHash);
        T.Traits memory t = T.derive(hashStr);

        string memory json = string(
            abi.encodePacked(
                '{"name":"Hoodlrz Kid #', tokenId.toString(),
                '","description":"', DESCRIPTION,
                '","image":"data:image/svg+xml;base64,', Base64.encode(bytes(_svg(t))),
                '","animation_url":"data:text/html;base64,',
                Base64.encode(bytes(engine.documentFor(hashStr))),
                '","attributes":', _attributes(t),
                ',"hoodlrz_hash":"', hashStr, '"}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /// @notice Affiche SVG seule, pratique pour verifier le rendu sans
    ///         decoder tout le tokenURI.
    function posterFor(bytes32 tokenHash) external pure returns (string memory) {
        return _svg(T.derive(T.toHashString(tokenHash)));
    }

    /// @notice Traits d'un token, exposes pour l'outillage et les tests.
    function traitsFor(bytes32 tokenHash) external pure returns (T.Traits memory) {
        return T.derive(T.toHashString(tokenHash));
    }
}
