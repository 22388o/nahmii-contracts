/*
 * Hubii Nahmii
 *
 * Compliant with the Hubii Nahmii specification v0.12.
 *
 * Copyright (C) 2017-2018 Hubii AS
 */

pragma solidity ^0.4.25;
pragma experimental ABIEncoderV2;

import {Ownable} from "./Ownable.sol";
import {FraudChallengable} from "./FraudChallengable.sol";
import {ConfigurableOperational} from "./ConfigurableOperational.sol";
import {ValidatableV2} from "./ValidatableV2.sol";
import {SecurityBondable} from "./SecurityBondable.sol";
import {PaymentTypesLib} from "./PaymentTypesLib.sol";
import {TradeTypesLib} from "./TradeTypesLib.sol";

/**
 * @title FraudChallengeByDuplicateDriipNonceOfTradeAndPayment
 * @notice Where driips are challenged wrt fraud by duplicate drip nonce of trade and payment
 */
contract FraudChallengeByDuplicateDriipNonceOfTradeAndPayment is Ownable, FraudChallengable, ConfigurableOperational, ValidatableV2,
SecurityBondable {
    //
    // Events
    // -----------------------------------------------------------------------------------------------------------------
    event ChallengeByDuplicateDriipNonceOfTradeAndPaymentEvent(bytes32 tradeHash,
        bytes32 paymentHash, address challenger);

    //
    // Constructor
    // -----------------------------------------------------------------------------------------------------------------
    constructor(address deployer) Ownable(deployer) public {
    }

    //
    // Functions
    // -----------------------------------------------------------------------------------------------------------------
    /// @notice Submit one trade candidate and one payment candidate in continuous Fraud
    /// Challenge (FC) to be tested for duplicate driip nonce
    /// @param trade Trade with duplicate driip nonce
    /// @param payment Payment with duplicate driip nonce
    function challenge(
        TradeTypesLib.Trade trade,
        PaymentTypesLib.Payment payment
    )
    public
    onlyOperationalModeNormal
    onlySealedTrade(trade)
    onlySealedPayment(payment)
    {
        // Require existence of fraud signal
        require(trade.nonce == payment.nonce);

        // Toggle operational mode exit
        configuration.setOperationalModeExit();

        // Tag trades (hashes) as fraudulent
        fraudChallenge.addFraudulentTradeHash(trade.seal.hash);
        fraudChallenge.addFraudulentPaymentHash(payment.seals.operator.hash);

        // Reward stake fraction
        securityBond.rewardFractional(msg.sender, configuration.fraudStakeFraction(), 0);

        // Emit event
        emit ChallengeByDuplicateDriipNonceOfTradeAndPaymentEvent(
            trade.seal.hash, payment.seals.operator.hash, msg.sender
        );
    }
}