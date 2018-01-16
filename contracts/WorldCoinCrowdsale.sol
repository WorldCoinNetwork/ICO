pragma solidity ^0.4.12;

import './zeppelin/math/SafeMath.sol';
import './zeppelin/ownership/Ownable.sol';
import './zeppelin/ownership/HasNoContracts.sol';
import './zeppelin/ownership/HasNoTokens.sol';
import './WorldCoin.sol';


/**
 * @title WorldCoin Crowdsale
 */
contract WorldCoinCrowdsale is Ownable, HasNoContracts, HasNoTokens {
    using SafeMath for uint256;

    uint32 private constant PERCENT_DIVIDER = 100;

    WorldCoin public token;

    struct Round {
        uint256 start;      //Timestamp of crowdsale round start
        uint256 end;        //Timestamp of crowdsale round end
        uint256 rate;       //Rate: how much TOKEN one will get fo 1 ETH during this round
    }
    Round[] public rounds;  //Array of crowdsale rounds


    uint256 public founderPercent;      //how many tokens will be sent to founder (percent of purshased token)
    uint256 public partnerBonusPercent; //referral partner bonus (percent of purshased token)
    uint256 public referralBonusPercent;//referral buyer bonus (percent of purshased token)
    uint256 public hardCap;             //Maximum amount of tokens mined
    uint256 public totalCollected;      //total amount of collected funds (in ethereum wei)
    uint256 public tokensMinted;        //total amount of minted tokens
    bool public finalized;              //crowdsale is finalized

    /**
     * @dev WorldCoin Crowdsale Contract
     * @param _founderPercent Amount of tokens sent to founder with each purshase (percent of purshased token)
     * @param _partnerBonusPercent Referral partner bonus (percent of purshased token)
     * @param _referralBonusPercent Referral buyer bonus (percent of purshased token)
     * @param _hardCap Maximum amount of ether (in wei) to be collected during crowdsale
     * @param roundStarts List of round start timestams
     * @param roundEnds List of round end timestams 
     * @param roundRates List of round rates (tokens for 1 ETH)
     */
    function WorldCoinCrowdsale (
        uint256 _founderPercent,
        uint256 _partnerBonusPercent,
        uint256 _referralBonusPercent,
        uint256 _hardCap,
        uint256[] roundStarts,
        uint256[] roundEnds,
        uint256[] roundRates
    ) public {

        //Check all paramaters are correct and create rounds
        require(_hardCap > 0);                    //Need something to sell
        require(
            (roundStarts.length > 0)  &&                //There should be at least one round
            (roundStarts.length == roundEnds.length) &&
            (roundStarts.length == roundRates.length)
        );                   
        uint256 prevRoundEnd = now;
        rounds.length = roundStarts.length;             //initialize rounds array
        for(uint8 i=0; i < roundStarts.length; i++){
            rounds[i] = Round(roundStarts[i], roundEnds[i], roundRates[i]);
            Round storage r = rounds[i];
            require(prevRoundEnd <= r.start);
            require(r.start < r.end);
            require(r.rate > 0);
            prevRoundEnd = rounds[i].end;
        }

        hardCap = _hardCap;
        partnerBonusPercent = _partnerBonusPercent;
        referralBonusPercent = _referralBonusPercent;
        founderPercent = _founderPercent;
        //founderPercentWithReferral = founderPercent * (rate + partnerBonusPercent + referralBonusPercent) / rate;  //Did not use SafeMath here, because this parameters defined by contract creator should not be malicious. Also have checked result on the next line.
        //assert(founderPercentWithReferral >= founderPercent);

        token = new WorldCoin();
    }

    /**
    * @dev Fetches current Round number
    * @return round number (index in rounds array + 1) or 0 if none
    */
    function currentRoundNum() constant public returns(uint8) {
        for(uint8 i=0; i < rounds.length; i++){
            if( (now > rounds[i].start) && (now <= rounds[i].end) ) return i+1;
        }
        return 0;
    }
    /**
    * @dev Fetches current rate (how many tokens you get for 1 ETH)
    * @return calculated rate or zero if no round of crowdsale is running
    */
    function currentRate() constant public returns(uint256) {
        uint8 roundNum = currentRoundNum();
        if(roundNum == 0) {
            return 0;
        }else{
            return rounds[roundNum-1].rate;
        }
    }

    function firstRoundStartTimestamp() constant public returns(uint256){
        return rounds[0].start;
    }
    function lastRoundEndTimestamp() constant public returns(uint256){
        return rounds[rounds.length - 1].end;
    }

    /**
    * @dev Shows if crowdsale is running
    */ 
    function crowdsaleRunning() constant public returns(bool){
        return !finalized && (tokensMinted < hardCap) && (currentRoundNum() > 0);
    }

    /**
    * @dev Buy WorldCoin tokens
    */
    function() payable public {
        sale(msg.sender, 0x0);
    } 

    /**
    * @dev Buy WorldCoin tokens witn referral program
    */
    function sale(address buyer, address partner) public payable {
        if(!crowdsaleRunning()) revert();
        require(msg.value > 0);
        uint256 rate = currentRate();
        assert(rate > 0);

        uint256 referralTokens; uint256 partnerTokens; uint256 ownerTokens;
        uint256 tokens = rate.mul(msg.value);
        assert(tokens > 0);
        totalCollected = totalCollected.add(msg.value);
        if(partner == 0x0){
            ownerTokens     = tokens.mul(founderPercent).div(PERCENT_DIVIDER);
            mintTokens(buyer, tokens);
            mintTokens(owner, ownerTokens);
        }else{
            partnerTokens   = tokens.mul(partnerBonusPercent).div(PERCENT_DIVIDER);
            referralTokens  = tokens.mul(referralBonusPercent).div(PERCENT_DIVIDER);
            ownerTokens     = (tokens.add(partnerTokens).add(referralTokens)).mul(founderPercent).div(PERCENT_DIVIDER);
            
            uint256 totalBuyerTokens = tokens.add(referralTokens);
            mintTokens(buyer, totalBuyerTokens);
            mintTokens(partner, partnerTokens);
            mintTokens(owner, ownerTokens);
        }
    }

    /**
    * @notice Mint tokens for purshases with Non-Ether currencies
    * @param beneficiary whom to send tokend
    * @param amount how much tokens to send
    * param message reason why we are sending tokens (not stored anythere, only in transaction itself)
    */
    function saleNonEther(address beneficiary, uint256 amount, string /*message*/) public onlyOwner {
        mintTokens(beneficiary, amount);
    }

    /**
    * @notice Updates rate for the round
    */
    function setRoundRate(uint32 roundNum, uint256 rate) public onlyOwner {
        require(roundNum < rounds.length);
        rounds[roundNum].rate = rate;
    }


    /**
    * @notice Sends collected funds to owner
    * May be executed only if goal reached and no refunds are possible
    */
    function claimEther() public onlyOwner {
        if(this.balance > 0){
            owner.transfer(this.balance);
        }
    }

    /**
    * @notice Finalizes ICO when one of conditions met:
    * - end time reached OR
    * - no more tokens available (cap reached) OR
    * - message sent by owner
    */
    function finalizeCrowdsale() public {
        require ( (now > lastRoundEndTimestamp()) || (totalCollected == hardCap) || (msg.sender == owner) );
        finalized = token.finishMinting();
        token.transferOwnership(owner);
        if(this.balance > 0){
            owner.transfer(this.balance);
        }
    }

    /**
    * @dev Helper function to mint tokens and increase tokensMinted counter
    */
    function mintTokens(address beneficiary, uint256 amount) internal {
        tokensMinted = tokensMinted.add(amount);
        require(tokensMinted <= hardCap);
        assert(token.mint(beneficiary, amount));
    }
}