// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHoodlrzLayerStore {
    /// @notice Get SVG data for a specific layer
    /// @param variant 0 = light, 1 = dark
    /// @param category Layer category index (0-6): wall, graffiti, hoodie, eyes, mouth, accessory, foreground
    /// @param index Trait index (1-based)
    /// @return svg The raw SVG content for this layer (inner elements only, no <svg> wrapper)
    function getLayer(uint8 variant, uint8 category, uint8 index) external view returns (string memory svg);
}
