pragma solidity ^0.4.12;

import './zeppelin/token/MintableToken.sol';
import './zeppelin/ownership/HasNoContracts.sol';
import './zeppelin/ownership/HasNoTokens.sol';
import './BurnableToken.sol';

/**
 * @title WorldCoin token
 */
contract WorldCoin is BurnableToken, MintableToken, HasNoContracts, HasNoTokens { //MintableToken is StandardToken, Ownable
    using SafeMath for uint256;

    string public name = "World Coin Network";
    string public symbol = "WCN";
    uint256 public decimals = 18;


    /**
     * Allow transfer only after crowdsale finished
     */
    modifier canTransfer() {
        require(mintingFinished);
        _;
    }
    
    function transfer(address _to, uint256 _value) canTransfer public returns (bool) {
        return BurnableToken.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) canTransfer public returns (bool) {
        return BurnableToken.transferFrom(_from, _to, _value);
    }

}
