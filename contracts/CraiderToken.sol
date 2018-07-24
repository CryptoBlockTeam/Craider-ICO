pragma solidity ^0.4.23;

/**
* CRAIDER (RAID) ERC20 Token Smart Contract implementation.
*
* Copyright © 2018 by Craider Technologies.
*
* Developed By: NewCryptoBlock.
*
* Licensed under the Apache License, Version 2.0 (the "License").
* You may not use this file except in compliance with the License.
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND (express or implied).
*/

import "./lib/token/ERC20Basic.sol";
import "./lib/token/StandardToken.sol";
import "./lib/ownership/DelayedClaimable.sol";

/**
 * @author Craider team (https://craider.com/)
 * @dev The Craider token smart contract based on ERC20
 */
contract CraiderToken is StandardToken, DelayedClaimable {

  // Set the token name
  string public constant name = "Craider Token";

  // Set the token symbol
  string public constant symbol = "RAID";

  // Define token decimals
  uint8 public constant decimals = 18;

  // Define the total token supply
  uint256 public constant TOTAL_SUPPLY = 1500000000 * (10 ** uint256(decimals));

  // Token version
  string public version = "1.0";

  /**
   * @notice Creates the CraiderToken smart contract instance
   */
  constructor() public {
    // Set token supply
    totalSupply_ = TOTAL_SUPPLY;

    // Transfer all tokens to the owner
    balances[msg.sender] = TOTAL_SUPPLY;

    // Emit transfer event
    emit Transfer(0x0, msg.sender, TOTAL_SUPPLY);
  }

  /**
   * @dev Used to claim tokens send to wrong address
   * @param _token The address that holds the tokens.
   * @param _to The address that is claiming ownership of tokens.
   */
  function claimTokens(address _token, address _to) onlyOwner public returns (bool) {
    ERC20Basic token = ERC20Basic(_token);
    uint256 balance = token.balanceOf(this);
    return token.transfer(_to, balance);
  }

  /**
   * Temporary freeze token transfers
   */
  function freezeTransfers () onlyOwner public {
    if (!transfersFrozen) {
      transfersFrozen = true;
      emit Freeze(msg.sender);
    }
  }

  /**
   * Unfreeze token transfers.
   */
  function unfreezeTransfers () onlyOwner public {
    if (transfersFrozen) {
      transfersFrozen = false;
      emit Unfreeze(msg.sender);
    }
  }

  event Freeze (address indexed owner);
  event Unfreeze (address indexed owner);
}
