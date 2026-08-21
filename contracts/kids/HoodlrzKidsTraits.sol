// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HoodlrzKidsConstants as K} from "./HoodlrzKidsConstants.sol";

/**
 * @title  HoodlrzKidsTraits
 * @notice Portage Solidity du generateur de traits du moteur Hoodlrz Kids.
 *
 * @dev    Ce contrat doit produire EXACTEMENT les memes traits que le
 *         JavaScript embarque on-chain. Toute divergence donne un token dont
 *         les attributs affiches sur la marketplace contredisent l'image.
 *         La parite est prouvee par test differentiel sur les 8888 tokens
 *         (voir test/kids/parity.test.mjs) - elle n'est pas supposee.
 *
 *         TROIS PIEGES, traites explicitement :
 *
 *         1. SEMANTIQUE 32 BITS DE JAVASCRIPT
 *            Le moteur utilise Math.imul, `| 0` et `>>>`, qui operent tous
 *            sur 32 bits avec debordement silencieux. On reproduit en uint32
 *            sous `unchecked` : les motifs de bits sont alors identiques.
 *            Travailler en uint256 donnerait des resultats differents des le
 *            premier debordement.
 *
 *         2. ORDRE DES TIRAGES
 *            Le generateur est sequentiel : chaque appel avance l'etat. Des
 *            accessoires desactives (lunettes, casque, cigarette, chaine,
 *            bombe) CONSOMMENT quand meme leur tirage dans le moteur avant
 *            d'etre forces a "off". Les omettre ici decalerait tout ce qui
 *            suit. On tire donc aussi les valeurs dont on ne fait rien -
 *            c'est intentionnel, pas un oubli.
 *
 *         3. NOMBRE DE TIRAGES VARIABLE
 *            Le bloc "mono" consomme deux tirages supplementaires. L'index
 *            d'expression n'est donc pas au meme rang selon la branche.
 *            La condition doit etre evaluee au meme endroit qu'en JS.
 */
library HoodlrzKidsTraits {
    /* ------------------------------------------------------------------ *
     *  Resultat
     * ------------------------------------------------------------------ */
    struct Traits {
        uint8 hat;          // index HAT_TYPES
        uint8 hair;         // index HAIR_STYLES
        uint8 backdrop;     // index BG_STYLES
        uint8 expression;   // index EXPRESSIONS
        bool skull;         // visage plein (features noires)
        bool mono;          // palette mono-accent
        uint8 accent;       // index NEON, significatif si mono
        uint8 hatColorIdx;  // index HAT_COLORS, significatif si !mono
        uint8 hoodColorIdx; // index HOOD_COLORS, significatif si !mono
        uint8 eqColorIdx;   // index NEON, significatif si !mono
        bool hoodWhite;     // si mono : capuche blanche plutot qu'accent
    }

    /* ------------------------------------------------------------------ *
     *  Generateur - portage de mulberry32
     * ------------------------------------------------------------------ */

    /// @dev Math.imul : multiplication 32 bits tronquee. Le passage par
    ///      uint64 avant troncature reproduit le debordement de JS.
    function _imul(uint32 x, uint32 y) private pure returns (uint32) {
        unchecked {
            return uint32(uint64(x) * uint64(y));
        }
    }

    /// @dev Un tirage. Retourne la valeur brute uint32 : le moteur JS la
    ///      divise par 2^32 pour obtenir un flottant dans [0,1), ce qu'on ne
    ///      peut pas faire ici. Les helpers _pick et _below travaillent
    ///      directement sur cette valeur brute, en arithmetique exacte.
    function _next(uint32 state) private pure returns (uint32 newState, uint32 raw) {
        unchecked {
            uint32 a = state + 0x6D2B79F5;
            newState = a;
            uint32 t = _imul(a ^ (a >> 15), 1 | a);
            t = (t + _imul(t ^ (t >> 7), 61 | t)) ^ t;
            raw = t ^ (t >> 14);
        }
    }

    /// @dev Equivalent de `arr[(rng() * len) | 0]`.
    ///
    ///      En JS : raw/2^32 est exact (raw tient sur 32 bits, le diviseur est
    ///      une puissance de deux), et le produit par une longueur inferieure a
    ///      16 tient largement dans les 53 bits de mantisse d'un double. La
    ///      multiplication flottante est donc exacte, et la troncature `| 0`
    ///      equivaut a la division entiere ci-dessous. Ce n'est pas une
    ///      approximation.
    function _pick(uint32 raw, uint256 len) private pure returns (uint8) {
        unchecked {
            return uint8((uint64(raw) * uint64(len)) >> 32);
        }
    }

    /// @dev Equivalent de `rng() < p`, ou le seuil entier a ete determine
    ///      par dichotomie contre le comportement reel de JavaScript.
    function _below(uint32 raw, uint32 seuil) private pure returns (bool) {
        return raw < seuil;
    }

    /* ------------------------------------------------------------------ *
     *  Graine - portage de seedFromHash
     * ------------------------------------------------------------------ */

    /// @dev Le moteur derive la graine des CARACTERES de la chaine de hash,
    ///      pas de sa valeur numerique. La representation compte donc :
    ///      le contrat doit fournir la meme chaine que celle injectee dans
    ///      le HTML - hexadecimal minuscule, prefixe 0x, 66 caracteres.
    ///      Une majuscule donnerait une autre graine, donc un autre token.
    /// @dev Forme canonique du hash : "0x" suivi de 64 caracteres hexadecimaux
    ///      MINUSCULES. C'est cette chaine exacte qui est injectee dans le HTML
    ///      et qui sert de graine. Elle fait partie de la specification du
    ///      token au meme titre que le moteur : la changer changerait tous
    ///      les traits.
    function toHashString(bytes32 v) internal pure returns (string memory) {
        bytes memory HEX = "0123456789abcdef";
        bytes memory out = new bytes(66);
        out[0] = "0";
        out[1] = "x";
        unchecked {
            for (uint256 i = 0; i < 32; ++i) {
                uint8 b = uint8(v[i]);
                out[2 + i * 2] = HEX[b >> 4];
                out[3 + i * 2] = HEX[b & 0x0f];
            }
        }
        return string(out);
    }

    function seedFromHash(string memory hashStr) internal pure returns (uint32 h) {
        bytes memory b = bytes(hashStr);
        unchecked {
            h = uint32(1779033703) ^ uint32(b.length);
            for (uint256 i = 0; i < b.length; ++i) {
                h = _imul(h ^ uint32(uint8(b[i])), 3432918353);
                h = (h << 13) | (h >> 19);
            }
            h = h ^ (h >> 16);
        }
    }

    /* ------------------------------------------------------------------ *
     *  Derivation
     * ------------------------------------------------------------------ */

    /**
     * @notice Derive les traits d'un token depuis sa chaine de hash.
     * @param  hashStr Le hash tel qu'injecte dans le HTML (0x + 64 hex minuscules).
     * @dev    L'ordre des tirages ci-dessous suit ligne a ligne celui de
     *         createToken() dans le moteur. Les commentaires numerotes
     *         renvoient au rang du tirage : c'est ce qui rend la relecture
     *         possible, et c'est ce que le test differentiel verifie.
     */
    function derive(string memory hashStr) internal pure returns (Traits memory t) {
        uint32 s = seedFromHash(hashStr);
        uint32 r;

        (s, r) = _next(s);                                   // 01 faceColor (ignore)
        (s, r) = _next(s); t.hoodColorIdx = _pick(r, K.N_HOOD_COLORS);   // 02
        (s, r) = _next(s); t.hat          = _pick(r, K.N_HAT_TYPES);     // 03
        (s, r) = _next(s); t.hatColorIdx  = _pick(r, K.N_HAT_COLORS);    // 04
        (s, r) = _next(s); t.skull        = _below(r, K.SEUIL_P3);       // 05
        (s, r) = _next(s);                                   // 06 label (ignore)
        (s, r) = _next(s); t.hair         = _pick(r, K.N_HAIR_STYLES);   // 07

        // 08-16 : accessoires desactives par le moteur juste apres leur
        // tirage. On consomme les memes valeurs pour ne pas decaler la suite.
        (s, r) = _next(s);                                   // 08 glassesType
        (s, r) = _next(s);                                   // 09 headphones
        (s, r) = _next(s);                                   // 10 ears
        (s, r) = _next(s);                                   // 11 cig
        (s, r) = _next(s);                                   // 12 chain
        (s, r) = _next(s);                                   // 13 pendant
        (s, r) = _next(s);                                   // 14 earring
        (s, r) = _next(s);                                   // 15 sprayCan
        (s, r) = _next(s);                                   // 16 sprayColor

        (s, r) = _next(s);                                   // 17 faceLong
        (s, r) = _next(s);                                   // 18 strings
        (s, r) = _next(s);                                   // 19 stringLen
        (s, r) = _next(s);                                   // 20 quoteColor
        (s, r) = _next(s);                                   // 21 bottomWord
        (s, r) = _next(s);                                   // 22 bottomColor
        (s, r) = _next(s);                                   // 23 lineBase
        (s, r) = _next(s);                                   // 24 boilAmp

        (s, r) = _next(s); t.backdrop     = _pick(r, K.N_BG_STYLES);     // 25
        (s, r) = _next(s);                                   // 26 bgAccent
        (s, r) = _next(s);                                   // 27 tagWord
        (s, r) = _next(s); t.eqColorIdx   = _pick(r, K.N_NEON);          // 28

        // 29 : bascule mono. Deux tirages de plus si elle passe - c'est ce
        // qui deplace le rang de l'expression selon la branche.
        (s, r) = _next(s); t.mono = _below(r, K.SEUIL_P55);              // 29
        if (t.mono) {
            (s, r) = _next(s); t.accent    = _pick(r, K.N_NEON);         // 30
            (s, r) = _next(s); t.hoodWhite = _below(r, K.SEUIL_P7);      // 31
        }

        (s, r) = _next(s); t.expression   = _pick(r, K.N_EXPRESSIONS);   // 32 (ou 30)
    }

    /* ------------------------------------------------------------------ *
     *  Resolution des couleurs
     * ------------------------------------------------------------------ *
     *  En mode mono, le moteur ecrase quatre couleurs par un accent unique.
     *  Ces trois fonctions reproduisent cette resolution pour l'affichage.
     */

    function hatColor(Traits memory t) internal pure returns (string memory) {
        return t.mono ? K.neon(t.accent) : K.hat_colors(t.hatColorIdx);
    }

    function hoodColor(Traits memory t) internal pure returns (string memory) {
        if (!t.mono) return K.hood_colors(t.hoodColorIdx);
        return t.hoodWhite ? "#ffffff" : K.neon(t.accent);
    }

    function eqColor(Traits memory t) internal pure returns (string memory) {
        return t.mono ? K.neon(t.accent) : K.neon(t.eqColorIdx);
    }

    function faceLabel(Traits memory t) internal pure returns (string memory) {
        return t.skull ? "Skull" : "Classic";
    }

    function paletteLabel(Traits memory t) internal pure returns (string memory) {
        return t.mono ? "Mono" : "Multi";
    }
}
