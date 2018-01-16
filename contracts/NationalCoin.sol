pragma solidity ^0.4.12;

import './zeppelin/token/StandardToken.sol';
import './zeppelin/ownership/Ownable.sol';
import './zeppelin/ownership/HasNoEther.sol';
import './zeppelin/ownership/HasNoContracts.sol';
import './zeppelin/ownership/HasNoTokens.sol';
import './BurnableToken.sol';

/**
 * @dev Template token contract for national coins
 */
contract NationalCoin is StandardToken, Ownable, HasNoEther, HasNoContracts, HasNoTokens {
    using SafeMath for uint256;

    string public name;
    string public symbol;
    uint256 public decimals = 18;


    event Mint(uint256 amount, string proofUrl, bytes32 proofHash);
    event Burn(uint256 amount, string proofUrl, bytes32 proofHash);


    /**
    * @dev Create a token for national coin
    * @param _name national coin name
    * @param _symbol national coin symbol
    */
    function NationalCoin(string _name, string _symbol) public {
        name = _name;
        symbol = _symbol;
    }


    /**
    * @dev Function to mint tokens
    * @param _amount The amount of tokens to mint.
    * @param _proofUrl Url of the document wich proves money was deposited to bank account 
    * @param _proofHash SHA3 hash of the _proofUrl document 
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(uint256 _amount, string _proofUrl, bytes32 _proofHash) public onlyOwner returns (bool) {
        require(_amount > 0);

        totalSupply = totalSupply.add(_amount);
        balances[owner] = balances[owner].add(_amount);
        Mint(_amount, _proofUrl, _proofHash);
        Transfer(0x0, owner, _amount);
        return true;
    }

    /**
    * @dev Function to mint tokens
    * @param _amount The amount of tokens to burn
    * @param _proofUrl Url of the document wich proves money was deposited to bank account 
    * @param _proofHash SHA3 hash of the _proofUrl document 
    */
    function burn(uint _amount, string _proofUrl, bytes32 _proofHash) public onlyOwner returns (bool) {
        require(_amount > 0);

        balances[owner] = balances[owner].sub(_amount);
        totalSupply = totalSupply.sub(_amount);
        Burn(_amount, _proofUrl, _proofHash);
        Transfer(owner, 0x0, _amount);
        return true;
    }
}
