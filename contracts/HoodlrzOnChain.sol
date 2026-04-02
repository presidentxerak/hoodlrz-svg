// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./interfaces/IHoodlrzRenderer.sol";

/**
 * @title HoodlrzOnChain
 * @notice Full on-chain ERC-721 NFT — 10,000 unique SVG PFPs generated deterministically.
 *         Uses the same FNV-1a + Mulberry32 PRNG as the off-chain Hoodlrz protocol,
 *         so identical seeds produce identical trait selections.
 *         Implements EIP-2981 royalties (10%).
 */
contract HoodlrzOnChain is ERC721, ERC2981, Ownable {
    using Strings for uint256;

    /* ── Constants ── */
    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant MAX_PER_TX = 10;

    /* ── State ── */
    uint256 public totalSupply;
    uint256 public mintPrice;
    IHoodlrzRenderer public renderer;

    bool public mintActive;
    bool public whitelistActive;
    mapping(address => bool) public whitelist;

    /// @dev tokenId → seed (deterministic, set at mint)
    mapping(uint256 => uint256) public tokenSeed;

    /* ── Events ── */
    event MintPriceUpdated(uint256 newPrice);
    event RendererUpdated(address renderer);
    event MintToggled(bool active);
    event WhitelistToggled(bool active);

    /* ── Constructor ── */
    constructor(
        uint256 _mintPrice,
        address _renderer,
        address _royaltyReceiver
    ) ERC721("Hoodlrz On-Chain", "HOODLRZ") Ownable(msg.sender) {
        mintPrice = _mintPrice;
        renderer = IHoodlrzRenderer(_renderer);
        // 10% royalties (1000 basis points) on secondary sales
        _setDefaultRoyalty(_royaltyReceiver, 1000);
    }

    /* ════════════════════════════════════════════════════════════
       ERC-165: support both ERC-721 and ERC-2981
    ════════════════════════════════════════════════════════════ */

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /* ════════════════════════════════════════════════════════════
       MINTING
    ════════════════════════════════════════════════════════════ */

    function mint(uint256 quantity) external payable {
        require(mintActive, "Minting not active");
        require(quantity > 0 && quantity <= MAX_PER_TX, "Invalid quantity");
        require(totalSupply + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");

        if (whitelistActive) {
            require(whitelist[msg.sender], "Not on whitelist");
        }

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            totalSupply = tokenId;

            // Deterministic seed from tokenId + block data + minter
            tokenSeed[tokenId] = uint256(
                keccak256(
                    abi.encodePacked(tokenId, block.prevrandao, msg.sender, block.timestamp)
                )
            );

            _safeMint(msg.sender, tokenId);
        }
    }

    /* ════════════════════════════════════════════════════════════
       METADATA (fully on-chain)
    ════════════════════════════════════════════════════════════ */

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return renderer.tokenURI(tokenId, tokenSeed[tokenId]);
    }

    /* ════════════════════════════════════════════════════════════
       TRAIT GENERATION (matches JS implementation exactly)
    ════════════════════════════════════════════════════════════ */

    /**
     * @notice FNV-1a hash — same as the JS `seedToNumber()`.
     *         `seed` here is already a uint256, so we hash its bytes.
     */
    function fnv1a(uint256 seed) public pure returns (uint32) {
        bytes memory data = abi.encodePacked(seed);
        uint32 hash = 0x811c9dc5; // FNV offset basis
        for (uint256 i = 0; i < data.length; i++) {
            hash ^= uint32(uint8(data[i]));
            hash *= 0x01000193; // FNV prime
        }
        return hash;
    }

    /**
     * @notice Mulberry32 PRNG — single step.
     *         Returns (nextState, randomValue) where randomValue is in [0, 2^32).
     */
    function mulberry32(uint32 state) public pure returns (uint32 nextState, uint32 value) {
        unchecked {
            uint32 z = state + 0x6D2B79F5;
            nextState = z;
            z = (z ^ (z >> 15)) * (z | 1);
            z ^= z + (z ^ (z >> 7)) * (z | 61);
            value = z ^ (z >> 14);
        }
    }

    /**
     * @notice Generate all 8 traits for a given seed (variant + 7 layers).
     * @return traits Array of 8 trait indices:
     *         [0] variant (0=light, 1=dark)
     *         [1] wall (1-10)
     *         [2] graffiti (1-23 or 1-24 depending on variant)
     *         [3] hoodie (1-12)
     *         [4] eyes (1-21)
     *         [5] mouth (1-20, with gaps depending on variant)
     *         [6] accessory (1-17)
     *         [7] foreground (1-11)
     */
    function getTraits(uint256 seed) public pure returns (uint8[8] memory traits) {
        uint32 state = fnv1a(seed);
        uint32 val;

        // Trait 0: variant (50/50)
        (state, val) = mulberry32(state);
        uint8 variant = (val % 2 == 0) ? 0 : 1; // 0=light, 1=dark
        traits[0] = variant;

        // Layer counts per variant
        // [walls, graffitis, hoodies, eyes, mouths, accessories, foregrounds]
        uint8[7] memory lightCounts = [uint8(10), 23, 12, 21, 19, 17, 11];
        uint8[7] memory darkCounts  = [uint8(10), 24, 12, 21, 20, 17, 11];
        uint8[7] memory counts = variant == 0 ? lightCounts : darkCounts;

        // Pick one trait per layer using weighted random (rarity system)
        for (uint256 i = 0; i < 7; i++) {
            (state, val) = mulberry32(state);
            traits[i + 1] = _pickWeightedTrait(counts[i], val);
        }
    }

    /**
     * @notice Pick a trait index using rarity weights.
     *         Mirrors the JS rarity system:
     *         - index/count <= 0.35 → common (weight 40)
     *         - index/count <= 0.65 → uncommon (weight 25)
     *         - index/count <= 0.85 → rare (weight 10)
     *         - index/count >  0.85 → legendary (weight 5)
     */
    function _pickWeightedTrait(uint8 count, uint32 rand) internal pure returns (uint8) {
        // Build cumulative weights
        uint256 totalWeight;
        for (uint8 i = 1; i <= count; i++) {
            totalWeight += _getWeight(i, count);
        }

        uint256 r = uint256(rand) % totalWeight;
        uint256 cumulative;
        for (uint8 i = 1; i <= count; i++) {
            cumulative += _getWeight(i, count);
            if (r < cumulative) return i;
        }
        return count;
    }

    function _getWeight(uint8 index, uint8 count) internal pure returns (uint256) {
        // pct = index * 100 / count (scaled to avoid floats)
        uint256 pct = uint256(index) * 100 / uint256(count);
        if (pct > 85) return 5;    // legendary
        if (pct > 65) return 10;   // rare
        if (pct > 35) return 25;   // uncommon
        return 40;                  // common
    }

    /* ════════════════════════════════════════════════════════════
       OWNER FUNCTIONS
    ════════════════════════════════════════════════════════════ */

    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
        emit MintPriceUpdated(_price);
    }

    function setRenderer(address _renderer) external onlyOwner {
        renderer = IHoodlrzRenderer(_renderer);
        emit RendererUpdated(_renderer);
    }

    function toggleMint(bool _active) external onlyOwner {
        mintActive = _active;
        emit MintToggled(_active);
    }

    function toggleWhitelist(bool _active) external onlyOwner {
        whitelistActive = _active;
        emit WhitelistToggled(_active);
    }

    function addToWhitelist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
    }

    function removeFromWhitelist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = false;
        }
    }

    function setRoyalty(address receiver, uint96 feeBasisPoints) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBasisPoints);
    }

    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Transfer failed");
    }
}
