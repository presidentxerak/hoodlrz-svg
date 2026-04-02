// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IHoodlrzRenderer {
    function tokenURI(uint256 tokenId, uint256 seed) external view returns (string memory);
}
