// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @dev Fixture de test, jamais deployee : un contrat qui tente de minter
 *      pour le compte de son appelant. C'est la brique de l'attaque « 304
 *      wallets en une transaction » que le mint public doit refuser.
 */
interface IKidsMint {
    function mintPublic(uint256 qty) external;
}

contract Sybil {
    IKidsMint public immutable kids;

    constructor(address kids_) {
        kids = IKidsMint(kids_);
    }

    function grab(uint256 qty) external {
        kids.mintPublic(qty);
    }
}
