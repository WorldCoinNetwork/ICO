pragma solidity ^0.4.12;

import './WorldCoinCrowdsale.sol';


/**
 * @title WorldCoin Crowdsale for Partners
 */
contract WorldCoinPartnerCrowdsale {
  WorldCoinCrowdsale public crowdsale;
  address public partner;

  function WorldCoinPartnerCrowdsale(WorldCoinCrowdsale _crowdsale, address _partner) public {
    crowdsale = _crowdsale;
    partner = _partner;
  }

  function() payable public {
    crowdsale.sale.value(msg.value)(msg.sender, partner);
  }
}