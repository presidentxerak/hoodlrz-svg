// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title  HoodlrzKidsConstants
 * @notice Tableaux et seuils du moteur generatif Hoodlrz Gen Kids.
 *
 * @dev    GENERE AUTOMATIQUEMENT par scripts/kids/derive-constants.mjs
 *         a partir de kids/engine/source.html. NE PAS EDITER A LA MAIN :
 *         toute divergence avec le moteur JS produit des attributs qui
 *         contredisent l'image affichee.
 *
 *         Les seuils SEUIL_* traduisent les comparaisons flottantes du
 *         moteur (`rng() < 0.3`) en comparaisons entieres exactes. Ils ont
 *         ete determines par dichotomie contre le comportement reel de
 *         JavaScript, pas calcules a la main : 0.3 n'etant pas representable
 *         en binaire, un arrondi approximatif changerait le trait des tokens
 *         situes sur la frontiere.
 */
library HoodlrzKidsConstants {
    /* ---------------------------------------------------------------- *
     *  Seuils de probabilite   (comparaison : raw < SEUIL)
     * ---------------------------------------------------------------- */
    uint32 internal constant SEUIL_P3 = 1288490189;
    uint32 internal constant SEUIL_P6 = 2576980378;
    uint32 internal constant SEUIL_P78 = 3350074491;
    uint32 internal constant SEUIL_P92 = 3951369913;
    uint32 internal constant SEUIL_P26 = 1116691497;
    uint32 internal constant SEUIL_P7 = 3006477108;
    uint32 internal constant SEUIL_P22 = 944892806;
    uint32 internal constant SEUIL_P34 = 1460288881;
    uint32 internal constant SEUIL_P28 = 1202590843;
    uint32 internal constant SEUIL_P24 = 1030792152;
    uint32 internal constant SEUIL_P5 = 2147483648;
    uint32 internal constant SEUIL_P9 = 3865470567;
    uint32 internal constant SEUIL_P55 = 2362232013;

    /* ---------------------------------------------------------------- *
     *  Longueurs des tableaux
     * ---------------------------------------------------------------- */
    uint256 internal constant N_FACE_COLORS = 1;
    uint256 internal constant N_HOOD_COLORS = 8;
    uint256 internal constant N_HAT_COLORS = 8;
    uint256 internal constant N_HAT_TYPES = 10;
    uint256 internal constant N_LABELS = 6;
    uint256 internal constant N_HAIR_STYLES = 5;
    uint256 internal constant N_NEON = 7;
    uint256 internal constant N_QUOTE_COLORS = 6;
    uint256 internal constant N_BOTTOM_WORDS = 7;
    uint256 internal constant N_PENDANTS = 4;
    uint256 internal constant N_BG_STYLES = 10;
    uint256 internal constant N_TAG_WORDS = 8;
    uint256 internal constant N_EXPRESSIONS = 10;

    /* ---------------------------------------------------------------- *
     *  Tableaux
     * ---------------------------------------------------------------- */
    function face_colors(uint256 i) internal pure returns (string memory) {
        string[1] memory a = [
            "#ffffff"
        ];
        return a[i];
    }

    function hood_colors(uint256 i) internal pure returns (string memory) {
        string[8] memory a = [
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#2f7bff",
            "#ffcf1a",
            "#22c55e"
        ];
        return a[i];
    }

    function hat_colors(uint256 i) internal pure returns (string memory) {
        string[8] memory a = [
            "#2f7bff",
            "#ff3b3b",
            "#ff36c8",
            "#22c55e",
            "#ff8a1e",
            "#00c2d1",
            "#ffcf1a",
            "#ffffff"
        ];
        return a[i];
    }

    function hat_types(uint256 i) internal pure returns (string memory) {
        string[10] memory a = [
            "snapback",
            "snapback",
            "fitted",
            "capback",
            "bucket",
            "beanie",
            "beaniePom",
            "cowboy",
            "crown",
            "visor"
        ];
        return a[i];
    }

    function labels(uint256 i) internal pure returns (string memory) {
        string[6] memory a = [
            "HOODLRZ",
            "HOODLRZ",
            "HOODLRZ",
            "HOODZ",
            "GM",
            "MINT"
        ];
        return a[i];
    }

    function hair_styles(uint256 i) internal pure returns (string memory) {
        string[5] memory a = [
            "none",
            "none",
            "strands",
            "sidebangs",
            "spikes"
        ];
        return a[i];
    }

    function neon(uint256 i) internal pure returns (string memory) {
        string[7] memory a = [
            "#2f7bff",
            "#ff36c8",
            "#ffcf1a",
            "#7b2fff",
            "#22c55e",
            "#00c2d1",
            "#ff5a3c"
        ];
        return a[i];
    }

    function quote_colors(uint256 i) internal pure returns (string memory) {
        string[6] memory a = [
            "#ff36c8",
            "#2f7bff",
            "#ffcf1a",
            "#7b2fff",
            "#22c55e",
            "#00c2d1"
        ];
        return a[i];
    }

    function bottom_words(uint256 i) internal pure returns (string memory) {
        string[7] memory a = [
            "MINT",
            "KID",
            "HODLRZ",
            "GM",
            "DEGEN",
            "BASED",
            "WAGMI"
        ];
        return a[i];
    }

    function pendants(uint256 i) internal pure returns (string memory) {
        string[4] memory a = [
            "$",
            "coin",
            "skull",
            "key"
        ];
        return a[i];
    }

    function bg_styles(uint256 i) internal pure returns (string memory) {
        string[10] memory a = [
            "bricks",
            "city",
            "miami",
            "club",
            "trading",
            "posters",
            "metro",
            "penthouse",
            "bricks",
            "city"
        ];
        return a[i];
    }

    function tag_words(uint256 i) internal pure returns (string memory) {
        string[8] memory a = [
            "HOODLRZ",
            "BURN",
            "MINT",
            "FORK",
            "WAGMI",
            "HODL",
            "REKT",
            "GM"
        ];
        return a[i];
    }

    function expressions(uint256 i) internal pure returns (string memory) {
        string[10] memory a = [
            "CHILL",
            "HYPED",
            "SHOOK",
            "SAD",
            "GREEDY",
            "DEAD",
            "SMUG",
            "GLITCH",
            "SLEEPY",
            "RAGE"
        ];
        return a[i];
    }
}
