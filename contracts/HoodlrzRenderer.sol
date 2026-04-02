// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IHoodlrzRenderer.sol";
import "./interfaces/IHoodlrzLayerStore.sol";
import "./HoodlrzOnChain.sol";

/**
 * @title HoodlrzRenderer
 * @notice Composes full on-chain SVG from stored layers + trait data.
 *         Generates ERC-721 compliant metadata with data URI.
 */
contract HoodlrzRenderer is IHoodlrzRenderer, Ownable {
    using Strings for uint256;
    using Strings for uint8;

    HoodlrzOnChain public nft;
    IHoodlrzLayerStore public layerStore;

    /* ── Trait name mappings ── */
    string[3] private _variantNames = ["Light", "Dark", ""];
    string[7] private _categoryNames = [
        "Wall", "Graffiti", "Hoodie", "Eyes", "Mouth", "Accessory", "Foreground"
    ];

    /* ── Rarity thresholds (same as JS: pct > 85 → legendary, etc.) ── */
    string[4] private _rarityNames = ["Common", "Uncommon", "Rare", "Legendary"];
    uint8[4] private _rarityScores = [10, 25, 55, 100];

    constructor(address _nft, address _layerStore) Ownable(msg.sender) {
        nft = HoodlrzOnChain(_nft);
        layerStore = IHoodlrzLayerStore(_layerStore);
    }

    function setNft(address _nft) external onlyOwner {
        nft = HoodlrzOnChain(_nft);
    }

    function setLayerStore(address _layerStore) external onlyOwner {
        layerStore = IHoodlrzLayerStore(_layerStore);
    }

    /* ════════════════════════════════════════════════════════════
       TOKEN URI — fully on-chain metadata + SVG
    ════════════════════════════════════════════════════════════ */

    function tokenURI(uint256 tokenId, uint256 seed)
        external
        view
        override
        returns (string memory)
    {
        uint8[8] memory traits = nft.getTraits(seed);
        string memory svg = _composeSVG(traits);
        string memory attributes = _buildAttributes(traits);
        (string memory rarityTier, uint256 rarityScore) = _calculateRarity(traits);

        string memory json = string(
            abi.encodePacked(
                '{"name":"Hoodlrz #',
                tokenId.toString(),
                '","description":"Hoodlrz On-Chain — Full on-chain SVG PFP. 10,000 unique hooded identities on Ethereum.","image":"data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '","attributes":[',
                attributes,
                ',{"trait_type":"Rarity Score","value":',
                rarityScore.toString(),
                '},{"trait_type":"Rarity Tier","value":"',
                rarityTier,
                '"}]}'
            )
        );

        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    /* ════════════════════════════════════════════════════════════
       SVG COMPOSITION
    ════════════════════════════════════════════════════════════ */

    function _composeSVG(uint8[8] memory traits) internal view returns (string memory) {
        uint8 variant = traits[0];
        string memory bgColor = variant == 0 ? "#ffffff" : "#000000";

        // Build layers back-to-front: wall, graffiti, hoodie, eyes, mouth, accessory, foreground
        string memory layers = "";
        for (uint8 i = 0; i < 7; i++) {
            if (traits[i + 1] > 0) {
                string memory layerSvg = layerStore.getLayer(variant, i, traits[i + 1]);
                layers = string(abi.encodePacked(layers, '<g>', layerSvg, '</g>'));
            }
        }

        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">',
                '<rect width="600" height="600" fill="',
                bgColor,
                '"/>',
                layers,
                '</svg>'
            )
        );
    }

    /* ════════════════════════════════════════════════════════════
       ATTRIBUTES
    ════════════════════════════════════════════════════════════ */

    function _buildAttributes(uint8[8] memory traits)
        internal
        view
        returns (string memory)
    {
        string memory result = string(
            abi.encodePacked(
                '{"trait_type":"Variant","value":"',
                _variantNames[traits[0]],
                '"}'
            )
        );

        // Layer counts for rarity name lookup
        uint8[7] memory lightCounts = [uint8(10), 23, 12, 21, 19, 17, 11];
        uint8[7] memory darkCounts  = [uint8(10), 24, 12, 21, 20, 17, 11];
        uint8[7] memory counts = traits[0] == 0 ? lightCounts : darkCounts;

        for (uint8 i = 0; i < 7; i++) {
            string memory rarity = _getTraitRarity(traits[i + 1], counts[i]);
            result = string(
                abi.encodePacked(
                    result,
                    ',{"trait_type":"',
                    _categoryNames[i],
                    '","value":"',
                    _categoryNames[i],
                    " #",
                    uint256(traits[i + 1]).toString(),
                    " (",
                    rarity,
                    ')"}'
                )
            );
        }

        return result;
    }

    function _getTraitRarity(uint8 index, uint8 count) internal view returns (string memory) {
        uint256 pct = uint256(index) * 100 / uint256(count);
        if (pct > 85) return _rarityNames[3]; // Legendary
        if (pct > 65) return _rarityNames[2]; // Rare
        if (pct > 35) return _rarityNames[1]; // Uncommon
        return _rarityNames[0];               // Common
    }

    /* ════════════════════════════════════════════════════════════
       RARITY CALCULATION (matches JS algorithm)
    ════════════════════════════════════════════════════════════ */

    function _calculateRarity(uint8[8] memory traits)
        internal
        view
        returns (string memory tier, uint256 score)
    {
        uint8[7] memory lightCounts = [uint8(10), 23, 12, 21, 19, 17, 11];
        uint8[7] memory darkCounts  = [uint8(10), 24, 12, 21, 20, 17, 11];
        uint8[7] memory counts = traits[0] == 0 ? lightCounts : darkCounts;

        uint256 totalScore;
        uint256 rareCount;

        for (uint8 i = 0; i < 7; i++) {
            uint256 pct = uint256(traits[i + 1]) * 100 / uint256(counts[i]);
            uint8 s;
            if (pct > 85) { s = 100; rareCount++; }
            else if (pct > 65) { s = 55; rareCount++; }
            else if (pct > 35) s = 25;
            else s = 10;
            totalScore += s;
        }

        uint256 avgScore = totalScore / 7;

        // Rarity bonus
        if (rareCount >= 3) avgScore += 15;
        else if (rareCount >= 2) avgScore += 8;

        score = avgScore > 100 ? 100 : avgScore;

        if (score >= 70) tier = _rarityNames[3];      // Legendary
        else if (score >= 45) tier = _rarityNames[2];  // Rare
        else if (score >= 25) tier = _rarityNames[1];  // Uncommon
        else tier = _rarityNames[0];                   // Common
    }
}
