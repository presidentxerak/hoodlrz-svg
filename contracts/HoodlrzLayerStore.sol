// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IHoodlrzLayerStore.sol";

/**
 * @title HoodlrzLayerStore
 * @notice Stores all SVG layer data on-chain using SSTORE2-style storage.
 *         Supports chunked storage for layers exceeding 24KB (EIP-170).
 *
 *         Storage layout:
 *         _chunks[variant][category][index] = address[] of SSTORE2 pointers
 *         variant: 0=light, 1=dark
 *         category: 0=wall, 1=graffiti, 2=hoodie, 3=eyes, 4=mouth, 5=accessory, 6=foreground
 *         index: 1-based trait index
 */
contract HoodlrzLayerStore is IHoodlrzLayerStore, Ownable {

    /// @dev layers[variant][category][index] = array of SSTORE2 chunk pointers
    mapping(uint8 => mapping(uint8 => mapping(uint8 => address[]))) private _chunks;

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
        bytes memory creationCode = abi.encodePacked(
            hex"61",                        // PUSH2
            bytes2(uint16(data.length + 1)),// runtime length (STOP + data)
            hex"80",                        // DUP1
            hex"600c",                      // PUSH1 12
            hex"6000",                      // PUSH1 0
            hex"39",                        // CODECOPY
            hex"6000",                      // PUSH1 0
            hex"f3",                        // RETURN
            hex"00",                        // STOP (first byte of runtime)
            data                            // content
        );

        assembly {
            pointer := create(0, add(creationCode, 0x20), mload(creationCode))
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

    function _validateParams(uint8 variant, uint8 category, uint8 index) internal pure {
        require(variant <= 1, "Invalid variant");
        require(category <= 6, "Invalid category");
        require(index >= 1, "Index must be >= 1");
    }

    function _updateLayerCount(uint8 variant, uint8 category, uint8 index) internal {
        if (index > layerCount[variant][category]) {
            layerCount[variant][category] = index;
        }
    }

    /**
     * @notice Upload a single SVG layer (must be < 24KB).
     *         Replaces any previous data for this layer.
     */
    function storeLayer(
        uint8 variant,
        uint8 category,
        uint8 index,
        bytes calldata svgData
    ) external onlyOwner {
        require(!locked, "Store is locked");
        _validateParams(variant, category, index);

        // Clear old chunks if any
        delete _chunks[variant][category][index];

        _chunks[variant][category][index].push(_sstore2Write(svgData));
        _updateLayerCount(variant, category, index);

        emit LayerStored(variant, category, index);
    }

    /**
     * @notice Append a chunk to a layer. Use for large SVGs (> 24KB).
     *         Call multiple times with chunkIndex 0, 1, 2... in order.
     */
    function storeLayerChunk(
        uint8 variant,
        uint8 category,
        uint8 index,
        uint8 chunkIndex,
        bytes calldata svgData
    ) external onlyOwner {
        require(!locked, "Store is locked");
        _validateParams(variant, category, index);

        address[] storage chunks = _chunks[variant][category][index];

        // Must upload chunks in order
        require(chunkIndex == chunks.length, "Chunk index mismatch");

        chunks.push(_sstore2Write(svgData));
        _updateLayerCount(variant, category, index);

        emit LayerStored(variant, category, index);
    }

    /**
     * @notice Batch upload multiple single-chunk layers.
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
            _validateParams(variants[i], categories[i], indices[i]);

            delete _chunks[variants[i]][categories[i]][indices[i]];
            _chunks[variants[i]][categories[i]][indices[i]].push(_sstore2Write(svgDatas[i]));
            _updateLayerCount(variants[i], categories[i], indices[i]);

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
        address[] storage chunks = _chunks[variant][category][index];
        require(chunks.length > 0, "Layer not found");

        if (chunks.length == 1) {
            return string(_sstore2Read(chunks[0]));
        }

        // Multi-chunk: concatenate all parts
        bytes memory result;
        for (uint256 i = 0; i < chunks.length; i++) {
            result = abi.encodePacked(result, _sstore2Read(chunks[i]));
        }
        return string(result);
    }

    function hasLayer(uint8 variant, uint8 category, uint8 index) external view returns (bool) {
        return _chunks[variant][category][index].length > 0;
    }

    function chunkCount(uint8 variant, uint8 category, uint8 index) external view returns (uint256) {
        return _chunks[variant][category][index].length;
    }
}
