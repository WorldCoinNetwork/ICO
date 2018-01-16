var $ = jQuery;
jQuery(document).ready(function($) {

    let web3 = null;
    let tokenContract = null;
    let crowdsaleContract = null;
    let partnerCrowdsaleContract = null;
    let nationalCoinContract = null;


    setTimeout(init, 1000);
    //$(window).on("load", init);
    $('#loadContractsBtn').click(init);

    function init(){
        web3 = loadWeb3();
        if(web3 == null) return;
        //console.log("web3: ",web3);
        loadContract('./build/contracts/WorldCoin.json', function(data){
            tokenContract = data;
            $('#tokenABI').text(JSON.stringify(data.abi));
        });
        loadContract('./build/contracts/WorldCoinCrowdsale.json', function(data){
            crowdsaleContract = data;
            $('#crowdsaleABI').text(JSON.stringify(data.abi));
        });
        loadContract('./build/contracts/WorldCoinPartnerCrowdsale.json', function(data){
            partnerCrowdsaleContract = data;
            $('#partnerCrowdsaleABI').text(JSON.stringify(data.abi));
        });
        loadContract('./build/contracts/WorldCoinPartnerCrowdsale.json', function(data){
            partnerCrowdsaleContract = data;
            $('#partnerCrowdsaleABI').text(JSON.stringify(data.abi));
        });
        loadContract('./build/contracts/NationalCoin.json', function(data){
            nationalCoinContract = data;
            $('#nationalCoinABI').text(JSON.stringify(data.abi));
        });
        initCrowdsaleForm();
        initManageForm();
        initManageNationalCoinForm();
    }
    function initManageForm(){
        let crowdsaleAddress = getUrlParam('crowdsale');
        if(web3.isAddress(crowdsaleAddress)){
            $('input[name=crowdsaleAddress]', '#manageCrowdsale').val(crowdsaleAddress);
            setTimeout(function(){$('#loadCrowdsaleInfo').click();}, 1000);
            $('input[name=crowdsaleAddress]', '#publishPartnerCrowdsaleForm').val(crowdsaleAddress);
        }
    }
    function initCrowdsaleForm(){
        let form = $('#publishContractsForm');
        let d = new Date();

        $('#crowdsaleRoundsForm tbody').html('');
        setInterval(function(){$('#clock').val( (new Date()).toISOString() )}, 1000);
        d.setDate(d.getDate()+1);d.setHours(0);
        let tomorrowTimestamp = d.setMinutes(0, 0, 0) - d.getTimezoneOffset()*60*1000;
        addCrowdsaleRound('Round 1', tomorrowTimestamp, tomorrowTimestamp+24*60*60*1000, 300/0.25);
        addCrowdsaleRound('Round 2',tomorrowTimestamp+24*60*60*1000, tomorrowTimestamp+7*24*60*60*1000, 300/0.50);
        addCrowdsaleRound('Round 3',tomorrowTimestamp+7*24*60*60*1000, tomorrowTimestamp+30*24*60*60*1000, 300/1.25);

        $('input[name=rate]', form).val(300);
        $('input[name=ownerBonus]', form).val(10);
        $('input[name=partnerBonus]', form).val(5);
        $('input[name=referralBonus]', form).val(5);
        $('input[name=hardCap]', form).val(100000000);

        function addCrowdsaleRound(roundName, startTimestamp, endTimestamp, rate){
            let tbody = $('#crowdsaleRoundsForm tbody');
            let roundNum = $('tr', tbody).length;
            //console.log('Add row', roundNum, startTimestamp, endTimestamp, rate);
            $('<tr></tr>').appendTo(tbody)
                .append('<td>'+roundName+'</td>')
                .append('<td><input type="text" name="startTime['+roundNum+']" value="'+timestmapToString(startTimestamp/1000)+'" class="time"></td>')
                .append('<td><input type="text" name="endTime['+roundNum+']" value="'+timestmapToString(endTimestamp/1000)+'" class="time"></td>')
                .append('</td><td><input type="text" name="rate['+roundNum+']" value="'+rate+'" class="number"></td>');
        }
    };
    $('#publishContracts').click(function(){
        if(crowdsaleContract == null) return;
        printError('');
        let form = $('#publishContractsForm');

        //let tokenAddress = $('input[name=tokenAddress]', form).val();

        // let startTimestamp = timeStringToTimestamp($('input[name=startTime]', form).val());
        // let endTimestamp  = timeStringToTimestamp($('input[name=endTime]', form).val());
        // let rate = $('input[name=rate]', form).val();
        let ownerBonus  = $('input[name=ownerBonus]', form).val();
        let partnerBonus  = $('input[name=partnerBonus]', form).val();
        let referralBonus  = $('input[name=referralBonus]', form).val();
        let hardCap  = web3.toWei($('input[name=hardCap]', form).val(), 'ether');

        let roundsTable = $('#crowdsaleRoundsForm');
        let roundStarts = new Array();
        let roundEnds = new Array();
        let roundRates = new Array();
        let rounds = $('tbody tr', roundsTable).length;
        for(let i = 0; i < rounds; i++){
            roundStarts[i] = timeStringToTimestamp($('input[name=startTime\\['+i+'\\]]', roundsTable).val());
            roundEnds[i] = timeStringToTimestamp($('input[name=endTime\\['+i+'\\]]', roundsTable).val());
            roundRates[i] = $('input[name=rate\\['+i+'\\]]', roundsTable).val();
        }

        publishContract(crowdsaleContract, 
            [ownerBonus, partnerBonus, referralBonus, hardCap, roundStarts, roundEnds, roundRates],
            function(tx){
                $('input[name=publishedTx]',form).val(tx);
            }, 
            function(contract){
                $('input[name=publishedAddress]',form).val(contract.address);
                $('input[name=crowdsaleAddress]', '#publishPartnerCrowdsaleForm').val(contract.address);
                $('input[name=crowdsaleAddress]', '#manageCrowdsale').val(contract.address);
                contract.token(function(error, result){
                    if(!!error) console.log('Can\'t get token address.\n', error);
                    $('input[name=tokenAddress]',form).val(result);
                    $('#loadCrowdsaleInfo').click();
                });
            }
        );
    });
    $('#publishPartnerCrowdsale').click(function(){
        if(partnerCrowdsaleContract == null) return;
        printError('');
        let form = $('#publishPartnerCrowdsaleForm');

        let crowdsaleAddress = $('input[name=crowdsaleAddress]', form).val();
        if(!web3.isAddress(crowdsaleAddress)){printError('Crowdsale address is not an Ethereum address'); return;}
        let partnerAddress = $('input[name=partnerAddress]', form).val();
        if(partnerAddress == ''){
            partnerAddress = web3.eth.accounts[0];
        }
        if(!web3.isAddress(crowdsaleAddress)){printError('Partner address is not an Ethereum address'); return;}

        publishContract(partnerCrowdsaleContract, 
            [crowdsaleAddress, partnerAddress],
            function(tx){
                $('input[name=publishedTx]',form).val(tx);
            }, 
            function(contract){
                $('input[name=publishedAddress]',form).val(contract.address);
            }
        );
    });
    $('#loadCrowdsaleInfo').click(function(){
        if(crowdsaleContract == null) return;
        printError('');
        let form = $('#manageCrowdsale');

        let crowdsaleAddress = $('input[name=crowdsaleAddress]', form).val();
        if(!web3.isAddress(crowdsaleAddress)){printError('Crowdsale address is not an Ethereum address'); return;}
        let crowdsaleInstance = web3.eth.contract(crowdsaleContract.abi).at(crowdsaleAddress);

        let tbody = $('#crowdsaleRoundsInfo tbody');
        tbody.empty();
        function loadRound(roundNum, roundName){
            return $.Deferred(function(def){
                crowdsaleInstance.rounds(roundNum, function(error, result){
                    if(!!error){console.log('Contract info loading error:\n', error); def.reject();}
                    //console.log(result);
                    $('<tr></tr>').appendTo(tbody)
                        .append('<td>'+roundName+'</td>')
                        .append('<td><input type="text" readonly name="startTime['+roundNum+']" value="'+timestmapToString(result[0].toNumber())+'" class="time"></td>')
                        .append('<td><input type="text" readonly name="endTime['+roundNum+']" value="'+timestmapToString(result[1].toNumber())+'" class="time"></td>')
                        .append('<td><input type="number" name="rate['+roundNum+']" value="'+result[2].toNumber()+'" class="number roundRateChangeInput"  data-loadedvalue="'+result[2].toNumber()+'" data-roundnum="'+roundNum+'"></td>')
                        .append('<td><input type="button" id="rateChangeBtn['+roundNum+']" data-roundnum="'+roundNum+'" value="Update" disabled class="roundUpdateBtn"></td>');
                    def.resolve();
                });
            }).promise();
        }
        loadRound(0, 'Round 1')
        .then(loadRound(1, 'Round 2'))
        .then(loadRound(2, 'Round 3'))
        .then(function(){
            $('input.roundRateChangeInput', tbody).change(function(){
                let roundNum = $(this).data('roundnum');
                let newVal = Number($(this).val());
                let loadedVal = Number($(this).data('loadedvalue'));
                $('#rateChangeBtn\\['+roundNum+'\\]').prop('disabled', (newVal == loadedVal));
                //console.log('Change rate: round = '+roundNum+', loaded = '+loadedVal+', new = '+newVal);
            });
            $('input.roundUpdateBtn', tbody).click(function(){
                let roundNum = $(this).data('roundnum');
                let newVal = Number($('input[name=rate\\['+roundNum+'\\]]', tbody).val());
                console.log('Update round '+roundNum+' rate to '+newVal);
                crowdsaleInstance.setRoundRate(roundNum, newVal, function(error, tx){
                    if(!!error){
                        console.log('Can\'t execute claim:\n', error);
                        printError(error.message.substr(0,error.message.indexOf("\n")));
                        return;
                    }
                    console.log('Change rate for round '+roundNum+' tx:', tx);
                    waitTxReceipt(tx, function(receipt){
                        console.log('Change rate for round '+roundNum+' tx mined', receipt);
                        $('#loadCrowdsaleInfo').click();    
                    });
                });
            });
        });

        crowdsaleInstance.owner(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=owner]', form).val(result);
        });
        crowdsaleInstance.founderPercent(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=ownerBonus]', form).val(result);
        });
        crowdsaleInstance.partnerBonusPercent(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=partnerBonus]', form).val(result);
        });
        crowdsaleInstance.referralBonusPercent(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=referralBonus]', form).val(result);
        });
        crowdsaleInstance.totalCollected(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=totalCollected]', form).val(web3.fromWei(result, 'ether').toNumber());
        });
        crowdsaleInstance.hardCap(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=hardCap]', form).val(web3.fromWei(result, 'ether').toNumber());
        });
        crowdsaleInstance.tokensMinted(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=tokensMinted]', form).val(web3.fromWei(result, 'ether').toNumber());
        });
        web3.eth.getBalance(crowdsaleAddress, function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=balance]', form).val(web3.fromWei(result, 'ether'));
        });
        crowdsaleInstance.currentRoundNum(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=currentRoundNum]', form).val(result);
        });
        crowdsaleInstance.currentRate(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=currentRate]', form).val(result);
        });
        crowdsaleInstance.crowdsaleRunning(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=crowdsaleRunning]', form).val(result?'yes':'no');
        });
        crowdsaleInstance.finalized(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=crowdsaleFinalized]', form).val(result?'yes':'no');
        });
        crowdsaleInstance.token(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=tokenAddress]', form).val(result);

            let tokenInstance = web3.eth.contract(tokenContract.abi).at(result);
            tokenInstance.totalSupply(function(error, result){
                if(!!error) console.log('Contract info loading error:\n', error);
                $('input[name=totalTokens]', form).val(web3.fromWei(result,'ether'));

            });
        });
    });
    $('#crowdsaleClaim').click(function(){
        if(crowdsaleContract == null) return;
        printError('');
        let form = $('#manageCrowdsale');

        let crowdsaleAddress = $('input[name=crowdsaleAddress]', form).val();
        if(!web3.isAddress(crowdsaleAddress)){printError('Crowdsale address is not an Ethereum address'); return;}
        let crowdsaleInstance = web3.eth.contract(crowdsaleContract.abi).at(crowdsaleAddress);

        crowdsaleInstance.claimEther(function(error, tx){
            if(!!error){
                console.log('Can\'t execute claim:\n', error);
                printError(error.message.substr(0,error.message.indexOf("\n")));
                return;
            }
            console.log('Claim tx:', tx);
            waitTxReceipt(tx, function(receipt){
                console.log('Claim tx mined', receipt);
                $('#loadCrowdsaleInfo').click();    
            });
        });

    });
    $('#crowdsaleFinalize').click(function(){
        if(crowdsaleContract == null) return;
        printError('');
        let form = $('#manageCrowdsale');

        let crowdsaleAddress = $('input[name=crowdsaleAddress]', form).val();
        if(!web3.isAddress(crowdsaleAddress)){printError('Crowdsale address is not an Ethereum address'); return;}
        let crowdsaleInstance = web3.eth.contract(crowdsaleContract.abi).at(crowdsaleAddress);

        crowdsaleInstance.finalizeCrowdsale(function(error, tx){
            if(!!error){
                console.log('Can\'t execute finalizeCrowdsale:\n', error);
                printError(error.message.substr(0,error.message.indexOf("\n")));
                return;
            }
            console.log('FinalizeCrowdsale tx:', tx);
            waitTxReceipt(tx, function(receipt){
                console.log('FinalizeCrowdsale tx mined', receipt);
                $('#loadCrowdsaleInfo').click();    
            });
        });

    });
    $('#nonEtherSaleMint').click(function(){
        if(crowdsaleContract == null) return;
        printError('');
        let form = $('#manageCrowdsale');

        let crowdsaleAddress = $('input[name=crowdsaleAddress]', form).val();
        if(!web3.isAddress(crowdsaleAddress)){printError('Crowdsale address is not an Ethereum address'); return;}
        let crowdsaleInstance = web3.eth.contract(crowdsaleContract.abi).at(crowdsaleAddress);

        let beneficiary  = $('input[name=beneficiary]', form).val();
        if(!web3.isAddress(beneficiary)){printError('Beneficiary address is not an Ethereum address'); return;}
        let amount  = web3.toWei($('input[name=amount]', form).val(), 'ether');
        let message  = $('input[name=message]', form).val();


        crowdsaleInstance.saleNonEther(beneficiary, amount, message, function(error, tx){
            if(!!error){
                console.log('Can\'t execute saleNonEther:\n', error);
                printError(error.message.substr(0,error.message.indexOf("\n")));
                return;
            }
            console.log('SaleNonEther tx:', tx);
            waitTxReceipt(tx, function(receipt){
                console.log('SaleNonEther tx mined', receipt);
                $('#loadCrowdsaleInfo').click();    
            });
        });
    });

    $('#publishNationalCoin').click(function(){
        if(nationalCoinContract == null) return;
        printError('');
        let form = $('#publishNationalCoinForm');

        let name = $('input[name=name]', form).val();
        let symbol = $('input[name=symbol]', form).val();

        publishContract(nationalCoinContract, 
            [name, symbol],
            function(tx){
                $('input[name=publishedTx]',form).val(tx);
            }, 
            function(contract){
                $('input[name=publishedAddress]',form).val(contract.address);
                $('input[name=nationalCoinAddress]','#manageNationalCoinForm').val(contract.address);
            }
        );
    });

    function initManageNationalCoinForm(){
        let form = $('#manageNationalCoinForm');
        
        let testProofUrl = window.location.href.substr(0,window.location.href.lastIndexOf('/'))+'/proof/proof-example.txt';
        $('input[name=proofUrl]', form).val(testProofUrl);
    }
    $('#loadNationalCoinInfo').click(function(){
        if(nationalCoinContract == null) return;
        printError('');
        let form = $('#manageNationalCoinForm');

        let nationalCoinAddress = $('input[name=nationalCoinAddress]', form).val();
        let nationalCoinInstance = web3.eth.contract(nationalCoinContract.abi).at(nationalCoinAddress);

        nationalCoinInstance.name(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=name]', form).val(result);
        });
        nationalCoinInstance.symbol(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=symbol]', form).val(result);
        });
        nationalCoinInstance.totalSupply(function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
            $('input[name=totalSupply]', form).val(web3.fromWei(result,'ether'));
        });

    });
    $('#generateProofHash').click(function(){
        let form = $('#manageNationalCoinForm');
        let proofUrl = $('input[name=proofUrl]', form).val();

        let jqxhr = $.get(proofUrl,function(data){
            let sha3 = web3.sha3(data);
            console.log('Proof loaded from '+proofUrl+'. Sha3: '+sha3+', data:\n', data);
            //console.log('Hex data:\n', web3.toHex(data));
            $('input[name=proofHash]', form).val(sha3);
        });

    });
    $('#mintNationalCoin').click(function(){
        if(nationalCoinContract == null) return;
        printError('');
        let form = $('#manageNationalCoinForm');

        let amount = web3.toWei($('input[name=amount]', form).val(), 'ether');
        let proofUrl = $('input[name=proofUrl]', form).val();
        if(proofUrl == ''){alert('Empty proof URL'); return;}
        let proofHash = $('input[name=proofHash]', form).val();
        if(proofHash == ''){alert('Empty proof hash'); return;}

        let nationalCoinAddress = $('input[name=nationalCoinAddress]', form).val();
        let nationalCoinInstance = web3.eth.contract(nationalCoinContract.abi).at(nationalCoinAddress);

        console.log('Minting tokens at '+nationalCoinAddress+'. Parameters:\n', amount, proofUrl, proofHash);
        nationalCoinInstance.mint(amount, proofUrl, proofHash, function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
        });
    });
    $('#burnNationalCoin').click(function(){
        if(nationalCoinContract == null) return;
        printError('');
        let form = $('#manageNationalCoinForm');

        let amount = web3.toWei($('input[name=amount]', form).val(), 'ether');
        let proofUrl = $('input[name=proofUrl]', form).val();
        if(proofUrl == ''){alert('Empty proof URL'); return;}
        let proofHash = $('input[name=proofHash]', form).val();
        if(proofHash == ''){alert('Empty proof hash'); return;}

        let nationalCoinAddress = $('input[name=nationalCoinAddress]', form).val();
        let nationalCoinInstance = web3.eth.contract(nationalCoinContract.abi).at(nationalCoinAddress);

        console.log('Burning tokens at '+nationalCoinAddress+'. Parameters:\n', amount, proofUrl, proofHash);
        nationalCoinInstance.burn(amount, proofUrl, proofHash, function(error, result){
            if(!!error) console.log('Contract info loading error:\n', error);
        });
    });
    //====================================================

    function loadWeb3(){
        if(typeof window.web3 == "undefined"){
            printError('No MetaMask found');
            return null;
        }
        let Web3 = require('web3');
        let web3 = new Web3();
        web3.setProvider(window.web3.currentProvider);

        if(typeof web3.eth.accounts[0] == 'undefined'){
            printError('Please, unlock MetaMask');
            return null;
        }
        web3.eth.defaultAccount =  web3.eth.accounts[0];
        return web3;
    }
    function loadContract(url, callback){
        $.ajax(url,{'dataType':'json', 'cache':'false', 'data':{'t':Date.now()}}).done(callback);
    }
    function publishContract(contractDef, arguments, txCallback, publishedCallback){
        let contractObj = web3.eth.contract(contractDef.abi);

        let logArgs = arguments.slice(0);
        logArgs.unshift('Creating contract '+contractDef.contract_name+' with arguments:\n');
        logArgs.push('\nABI:\n'+JSON.stringify(contractDef.abi));
        console.log.apply(console, logArgs);

        let bytecode = contractDef.bytecode?contractDef.bytecode:contractDef.unlinked_binary; //https://github.com/trufflesuite/truffle-contract-schema

        let publishArgs = arguments.slice(0);
        publishArgs.push({
                from: web3.eth.accounts[0], 
                data: bytecode,
        });
        publishArgs.push(function(error, result){
            waitForContractCreation(contractObj, error, result, txCallback, publishedCallback);
        });
        contractObj.new.apply(contractObj, publishArgs);
    }
    function waitForContractCreation(contractObj, error, result, txCallback, publishedCallback){
        if(!!error) {
            console.error('Publishing failed: ', error);
            printError(error.message.substr(0,error.message.indexOf("\n")));
            return;
        }
        if (typeof result.transactionHash !== 'undefined') {
            if(typeof txCallback == 'function'){
                txCallback(result.transactionHash);
            }
            waitTxReceipt(result.transactionHash, function(receipt){
                let contract = contractObj.at(receipt.contractAddress);
                console.log('Contract mined at: ' + receipt.contractAddress + ', tx: ' + result.transactionHash+'\n', 'Receipt:\n', receipt,  'Contract:\n',contract);
                if(typeof publishedCallback === 'function') publishedCallback(contract);
            });
            // let receipt; 
            // let timer = setInterval(function(){
            //     web3.eth.getTransactionReceipt(result.transactionHash, function(error2, result2){
            //         if(!!error2) {
            //             console.error('Can\'t get receipt for tx '+result.transactionHash+'.\n', error2, result2);
            //             return;
            //         }
            //         if(result2 != null){
            //             clearInterval(timer);
            //             if(typeof receipt !== 'undefined') return; //already executed;
            //             receipt = result2;
            //             let contract = contractObj.at(receipt.contractAddress);
            //             console.log('Contract mined at: ' + receipt.contractAddress + ', tx: ' + result.transactionHash+'\n', 'Receipt:\n', receipt,  'Contract:\n',contract);
            //             if(typeof publishedCallback === 'function') publishedCallback(contract);
            //         }
            //     });
            // }, 1000);
        }else{
            console.error('Unknown error. Result: ', result);
        }
    }
    function waitTxReceipt(tx, callback){
        let receipt; 
        let timer = setInterval(function(){
            web3.eth.getTransactionReceipt(tx, function(error, result){
                if(!!error) {
                    console.error('Can\'t get receipt for tx '+tx+'.\n', error, result);
                    return;
                }
                if(result != null){
                    clearInterval(timer);
                    if(typeof receipt !== 'undefined') return; //already executed;
                    receipt = result;
                    callback(receipt);
                    // let contract = contractObj.at(receipt.contractAddress);
                    // console.log('Contract mined at: ' + receipt.contractAddress + ', tx: ' + result.transactionHash+'\n', 'Receipt:\n', receipt,  'Contract:\n',contract);
                    // if(typeof publishedCallback === 'function') publishedCallback(contract);
                }
            });
        }, 1000);
    }

    function timeStringToTimestamp(str){
        return Math.round(Date.parse(str)/1000);
    }
    function timestmapToString(timestamp){
        return (new Date(timestamp*1000)).toISOString();
    }

    function printError(msg){
        if(msg == null || msg == ''){
            $('#errormsg').html('');    
        }else{
            console.error(msg);
            $('#errormsg').html(msg);
        }
    }
    function getUrlParam(name){
        if(window.location.search == '') return null;
        let params = window.location.search.substr(1).split('&').map(function(item){return item.split("=").map(decodeURIComponent);});
        let found = params.find(function(item){return item[0] == name});
        return (typeof found == "undefined")?null:found[1];
    }
});
