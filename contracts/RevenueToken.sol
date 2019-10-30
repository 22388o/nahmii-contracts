/*
 * Hubii Nahmii
 *
 * Compliant with the Hubii Nahmii specification v0.12.
 *
 * Copyright (C) 2017-2018 Hubii AS
 */

pragma solidity >=0.4.25 <0.6.0;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/math/Math.sol';
import {BalanceRecordable} from './BalanceRecordable.sol';

/**
 * @title RevenueToken
 * @dev Implementation of the EIP20 standard token (also known as ERC20 token) with added
 * calculation of balance blocks at every transfer.
 */
contract RevenueToken is ERC20Mintable, BalanceRecordable {
    using SafeMath for uint256;
    using Math for uint256;

    struct BalanceRecord {
        uint256 blockNumber;
        uint256 balance;
    }

    mapping(address => BalanceRecord[]) public balanceRecords;

    address[] public holders;
    mapping(address => uint256) public holderIndices;

    bool public mintingDisabled;

    event DisableMinting();

    /**
     * @notice Disable further minting
     * @dev This operation can not be undone
     */
    function disableMinting()
    public
    onlyMinter
    {
        // Disable minting
        mintingDisabled = true;

        // Emit event
        emit DisableMinting();
    }

    /**
     * @notice Mint tokens
     * @param to The address that will receive the minted tokens.
     * @param value The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 value)
    public
    onlyMinter
    returns (bool)
    {
        // Require that minting has not been disabled
        require(!mintingDisabled, "Minting disabled [RevenueToken.sol:66]");

        // Call super's mint, including event emission
        bool minted = super.mint(to, value);

        // If minted...
        if (minted) {
            // Add balance record
            _addBalanceRecord(to);

            // Add recipient to the token holders list
            _addToHolders(to);
        }

        // Return the minted flag
        return minted;
    }

    /**
     * @notice Transfer token for a specified address
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     * @return A boolean that indicates if the operation was successful.
     */
    function transfer(address to, uint256 value)
    public
    returns (bool)
    {
        // Call super's transfer, including event emission
        bool transferred = super.transfer(to, value);

        // If funds were transferred...
        if (transferred) {
            // Add balance records
            _addBalanceRecord(msg.sender);
            _addBalanceRecord(to);

            // Remove sender from the holders list if no more balance
            if (0 == balanceOf(msg.sender))
                _removeFromHolders(msg.sender);

            // Add recipient to the token holders list
            _addToHolders(to);
        }

        // Return the transferred flag
        return transferred;
    }

    /**
     * @notice Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     * @dev Beware that to change the approve amount you first have to reduce the addresses'
     * allowance to zero by calling `approve(spender, 0)` if it is not already 0 to mitigate the race
     * condition described here:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     */
    function approve(address spender, uint256 value)
    public
    returns (bool)
    {
        // Prevent the update of non-zero allowance
        require(
            0 == value || 0 == allowance(msg.sender, spender),
            "Value or allowance non-zero [RevenueToken.sol:129]"
        );

        // Call super's approve, including event emission
        return super.approve(spender, value);
    }

    /**
     * @dev Transfer tokens from one address to another
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param value uint256 the amount of tokens to be transferred
     * @return A boolean that indicates if the operation was successful.
     */
    function transferFrom(address from, address to, uint256 value)
    public
    returns (bool)
    {
        {
            // Call super's transferFrom, including event emission
            bool transferred = super.transferFrom(from, to, value);

            // If funds were transferred...
            if (transferred) {
                // Add balance records
                _addBalanceRecord(from);
                _addBalanceRecord(to);

                // Remove sender from the holders list if no more balance
                if (0 == balanceOf(from))
                    _removeFromHolders(from);

                // Add recipient to the token holders list
                _addToHolders(to);
            }

            // Return the transferred flag
            return transferred;
        }
    }

    /**
     * @notice Get the count of balance records for the given account
     * @param account The concerned account
     * @return The count of balance updates
     */
    function balanceRecordsCount(address account)
    public
    view
    returns (uint256)
    {
        return balanceRecords[account].length;
    }

    /**
     * @notice Get the balance record balance for the given account and balance record index
     * @param account The concerned account
     * @param index The concerned index
     * @return The balance record balance
     */
    function recordBalance(address account, uint256 index)
    public
    view
    returns (uint256)
    {
        return balanceRecords[account][index].balance;
    }

    /**
     * @notice Get the balance record block number for the given account and balance record index
     * @param account The concerned account
     * @param index The concerned index
     * @return The balance record block number
     */
    function recordBlockNumber(address account, uint256 index)
    public
    view
    returns (uint256)
    {
        return balanceRecords[account][index].blockNumber;
    }

    /**
     * @notice Get the index of the balance record containing the given block number,
     * or -1 if the given block number is below the smallest balance record block number
     * @param account The concerned account
     * @param blockNumber The concerned block number
     * @return The count of balance updates
     */
    function recordIndexByBlockNumber(address account, uint256 blockNumber)
    public
    view
    returns (int256)
    {
        for (uint256 i = balanceRecords[account].length; i > 0;) {
            i = i.sub(1);
            if (balanceRecords[account][i].blockNumber <= blockNumber)
                return int256(i);
        }
        return - 1;
    }

    /**
     * @notice Get the count of holders
     * @return The count of holders
     */
    function holdersCount()
    public
    view
    returns (uint256)
    {
        return holders.length;
    }

    /**
     * @notice Get the subset of holders in the given 0 based index range
     * @param low The lower inclusive index
     * @param up The upper inclusive index
     * @return The subset of registered holders in the given range
     */
    function holdersByIndices(uint256 low, uint256 up)
    public
    view
    returns (address[] memory)
    {
        // Clamp up to the highest index of holders
        up = up.min(holders.length.sub(1));

        // Require that lower index is not strictly greater than upper index
        require(low <= up, "Bounds parameters mismatch [RevenueToken.sol:260]");

        // Get the length of the return array
        uint256 length = up.sub(low).add(1);

        // Initialize return array
        address[] memory _holders = new address[](length);

        // Populate the return array
        uint256 j = 0;
        for (uint256 i = low; i <= up; i = i.add(1))
            _holders[j++] = holders[i];

        // Return subset of holders
        return _holders;
    }

    /**
     * @dev Add balance record for the given account
     */
    function _addBalanceRecord(address account)
    private
    {
        balanceRecords[account].push(BalanceRecord(block.number, balanceOf(account)));
    }

    /**
     * @dev Add the given account to the store of holders if not already present
     */
    function _addToHolders(address account)
    private
    {
        if (0 == holderIndices[account]) {
            holders.push(account);
            holderIndices[account] = holders.length;
        }
    }

    /**
     * @dev Remove the given account from the store of holders if already present
     */
    function _removeFromHolders(address account)
    private
    {
        if (0 < holderIndices[account]) {
            if (holderIndices[account] < holders.length) {
                holders[holderIndices[account].sub(1)] = holders[holders.length.sub(1)];
                holderIndices[holders[holders.length.sub(1)]] = holderIndices[account];
            }
            holders.length--;
            holderIndices[account] = 0;
        }
    }
}