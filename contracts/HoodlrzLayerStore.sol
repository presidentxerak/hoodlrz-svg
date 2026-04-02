// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IHoodlrzLayerStore.sol";

/**
 * @title HoodlrzLayerStore
 * @notice Stores all SVG layer data on-chain using SSTORE2-style storage.
 *         Layers are uploaded in batches by the owner after deployment.
 *
 *         Storage layout:
 *         layers[variant][category][index] = SVG inner content
 *         variant: 0=light, 1=dark
 *         category: 0=wall, 1=graffiti, 2=hoodie, 3=eyes, 4=mouth, 5=accessory, 6=foreground
 *         index: 1-based trait index
 */
contract HoodlrzLayerStore is IHoodlrzLayerStore, Ownable {

    /// @dev layers[variant][category][index] = address of SSTORE2 pointer
    ///      We store SVG data as contract code for gas efficiency.
    mapping(uint8 => mapping(uint8 => mapping(uint8 => address))) private _pointers;

    /// @dev Track which layers have been uploaded
    mapping(uint8 => mapping(uint8 => uint8)) public layerCount;

    bool public locked;

    event LayerStored(uint8 variant, uint8 category, uint8 index);
    event StoreLocked();

    constructor() Ownable(msg.sender) {}

    /* ════════════════════════════════════════════════════════════
       SSTORE2: Write data as contract bytecode (cheaper reads)
    ════════════════════════════════════════════════════════════ */

    function _sstore2Write(bytes memory data) internal returns (address pointer) {
        bytes memory code = abi.encodePacked(
            hex"00",  // STOP opcode (prevents execution)
            data
        );
        assembly {
            pointer := create(0, add(code, 0x20), mload(code))
        }
        require(pointer != address(0), "SSTORE2: deployment failed");
    }

    function _sstore2Read(address pointer) internal view returns (bytes memory data) {
        require(pointer != address(0), "SSTORE2: no data");
        uint256 size;
        assembly { size := extcodesize(pointer) }
        require(size > 1, "SSTORE2: empty");

        data = new bytes(size - 1); // skip STOP opcode
        assembly {
            extcodecopy(pointer, add(data, 0x20), 1, sub(size, 1))
        }
    }

    /* ════════════════════════════════════════════════════════════
       LAYER UPLOAD (owner only, before lock)
    ════════════════════════════════════════════════════════════ */

    /**
     * @notice Upload a single SVG layer's inner content.
     * @param variant 0=light, 1=dark
     * @param category 0-6 (wall, graffiti, hoodie, eyes, mouth, accessory, foreground)
     * @param index 1-based trait index
     * @param svgData The SVG inner elements (paths, groups) — no outer <svg> tag
     */
    function storeLayer(
        uint8 variant,
        uint8 category,
        uint8 index,
        bytes calldata svgData
    ) external onlyOwner {
        require(!locked, "Store is locked");
        require(variant <= 1, "Invalid variant");
        require(category <= 6, "Invalid category");
        require(index >= 1, "Index must be >= 1");

        _pointers[variant][category][index] = _sstore2Write(svgData);

        if (index > layerCount[variant][category]) {
            layerCount[variant][category] = index;
        }

        emit LayerStored(variant, category, index);
    }

    /**
     * @notice Batch upload multiple layers in a single transaction.
     */
    function storeLayerBatch(
        uint8[] calldata variants,
        uint8[] calldata categories,
        uint8[] calldata indices,
        bytes[] calldata svgDatas
    ) external onlyOwner {
        require(!locked, "Store is locked");
        uint256 len = variants.length;
        require(
            categories.length == len && indices.length == len && svgDatas.length == len,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < len; i++) {
            require(variants[i] <= 1, "Invalid variant");
            require(categories[i] <= 6, "Invalid category");
            require(indices[i] >= 1, "Index must be >= 1");

            _pointers[variants[i]][categories[i]][indices[i]] = _sstore2Write(svgDatas[i]);

            if (indices[i] > layerCount[variants[i]][categories[i]]) {
                layerCount[variants[i]][categories[i]] = indices[i];
            }

            emit LayerStored(variants[i], categories[i], indices[i]);
        }
    }

    /**
     * @notice Lock the store permanently. No more uploads after this.
     */
    function lock() external onlyOwner {
        locked = true;
        emit StoreLocked();
    }

    /* ════════════════════════════════════════════════════════════
       READ
    ════════════════════════════════════════════════════════════ */

    function getLayer(
        uint8 variant,
        uint8 category,
        uint8 index
    ) external view override returns (string memory) {
        address ptr = _pointers[variant][category][index];
        require(ptr != address(0), "Layer not found");
        return string(_sstore2Read(ptr));
    }

    function hasLayer(uint8 variant, uint8 category, uint8 index) external view returns (bool) {
        return _pointers[variant][category][index] != address(0);
    }
}
