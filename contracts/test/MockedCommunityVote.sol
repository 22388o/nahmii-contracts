/*
 * Hubii Striim
 *
 * Compliant with the Hubii Striim specification v0.12.
 *
 * Copyright (C) 2017-2018 Hubii AS
 */
pragma solidity ^0.4.24;

//import {CommunityVote} from "../CommunityVote.sol";

/**
@title MockedCommunityVote
@notice Mocked implementation of community vote contract
*/
contract MockedCommunityVote /* is CommunityVote*/ {

    //
    // Variables
    // -----------------------------------------------------------------------------------------------------------------
    mapping(address => bool) internal doubleSpenderWalletsMap;
    uint256 internal maxDriipNonce;
    bool internal dataAvailable;

    //
    // Constructor
    // -----------------------------------------------------------------------------------------------------------------
    constructor(/*address owner*/) public /*CommunityVote(owner)*/ {
        reset();
    }

    //
    // Functions
    // -----------------------------------------------------------------------------------------------------------------
    function reset() public {
        maxDriipNonce = 0;
        dataAvailable = true;
    }

    function setDoubleSpenderWallet(address wallet, bool doubleSpender) public returns (address[3]) {
        doubleSpenderWalletsMap[wallet] = doubleSpender;
    }

    function isDoubleSpenderWallet(address wallet) public view returns (bool) {
        return doubleSpenderWalletsMap[wallet];
    }

    function setMaxDriipNonce(uint256 _maxDriipNonce) public returns (uint256) {
        return maxDriipNonce = _maxDriipNonce;
    }

    function getMaxDriipNonce() public view returns (uint256) {
        return maxDriipNonce;
    }

    function setDataAvailable(bool _dataAvailable) public returns (bool) {
        return dataAvailable = _dataAvailable;
    }

    function isDataAvailable() public view returns (bool) {
        return dataAvailable;
    }
}