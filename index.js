const  qs = require('qs');
const BigNumber = require('bignumber.js');
// top of index.js
let  currentTrade = {};
let  currentSelectSide;
let ZERO_EX_ADDRESS = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';
let network_tokens='https://tokens.coingecko.com/uniswap/all.json';
let network_domain='api.0x.org';

let tokenlist;

async function selNetwork() {
    let network_selection = document.getElementById("network_selection").value;
    console.log("network_selection:", network_selection);
    if (network_selection == 'Goerli') {
        network_tokens='./goerlitokens.json';
        listAvailableTokens();
        let parent = document.getElementById("token_list");
        parent.innerHTML='';
        network_domain='goerli.api.0x.org';
        ZERO_EX_ADDRESS = '0xf91bb752490473b8342a3e964e855b9f9a2a668e' //goerli ExchangeProxy
    } else if (network_selection == 'Mainnet') {
        network_tokens='https://tokens.coingecko.com/uniswap/all.json';
        listAvailableTokens();
        let parent = document.getElementById("token_list");
        parent.innerHTML='';
        network_domain='api.0x.org';
        ZERO_EX_ADDRESS = '0xdef1c0ded9bec7f1a1670819833240f027b25eff' //mainnet ExchangeProxy
    } 
}

async function init(){
    listAvailableTokens()
}

async function listAvailableTokens() {
    console.log("initializing");
    let response = await fetch(network_tokens);
    let tokenListJSON = await response.json();
    console.log("listing available tokens: ", tokenListJSON);
    tokens = tokenListJSON.tokens
    tokenlist = tokens;
    console.log("tokens:", tokens);
  
    // Create a token list for the modal
    let parent = document.getElementById("token_list");
    // Loop through all the tokens inside the token list JSON object
    for (const i in tokens){
      // Create a row for each token in the list
      let div = document.createElement("div");
      div.className = "token_row";
      // For each row, display the token image and symbol
      let html = `
      <img class="token_list_img" src="${tokens[i].logoURI}">
        <span class="token_list_text">${tokens[i].symbol}</span>
        `;
      div.innerHTML = html;
      // selectToken() will be called when a token is clicked
      div.onclick = () => {
        selectToken(tokens[i]);
      };
      parent.appendChild(div);
    }
}

//Filter down the long tokens list
async function filterTokens() {
    // Create a token list for the modal
    let parent = document.getElementById("token_list");
    parent.innerHTML = '';
    let text = document.getElementById("coin_filter").value;

    // Loop through all the tokens inside the token list JSON object
    for (const i in tokens){
        // Create a row for each token in the list
        let div = document.createElement("div");
        div.className = "token_row";
        // For each row, display the token image and symbol
        if (tokens[i].symbol.indexOf(text)==0) {
            let html = `
            <img class="token_list_img" src="${tokens[i].logoURI}">
                <span class="token_list_text">${tokens[i].symbol}</span>
                `;
            div.innerHTML = html;
            // selectToken() will be called when a token is clicked
            div.onclick = () => {
                selectToken(tokens[i]);
            };
            parent.appendChild(div);
        }
    }

}

async function connect() {
    /** MetaMask injects a global API into websites visited by its users at `window.ethereum`. This API allows websites to request users' Ethereum accounts, read data from blockchains the user is connected to, and suggest that the user sign messages and transactions. The presence of the provider object indicates an Ethereum user. Read more: https://ethereum.stackexchange.com/a/68294/85979**/
    
    // Check if MetaMask is installed, if it is, try connecting to an account
    if (typeof  window.ethereum !== "undefined") {
        try {
            console.log("connecting");
            // Requests that the user provides an Ethereum address to be identified by. The request causes a MetaMask popup to appear. Read more: https://docs.metamask.io/guide/rpc-api.html#eth-requestaccounts
            await  ethereum.request({ method:  "eth_requestAccounts" });
        } catch (error) {
            console.log(error);
        }
        // If connected, change button to "Connected"
        document.getElementById("login_button").innerHTML = "Connected";
        // If connected, enable "Swap" button
        document.getElementById("swap_button").disabled = false;
    } 
    // Ask user to install MetaMask if it's not detected 
    else {
        document.getElementById("login_button").innerHTML =
        "Please install MetaMask";
    }
}

function openModal(side){
    // Store whether the user has selected a token on the from or to side
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block";
}

function closeModal(){
    document.getElementById("token_modal").style.display = "none";
}

function selectToken(token) {
    // When a token is selected, automatically close the modal
    closeModal();
    // Track which side of the trade we are on - from/to
    currentTrade[currentSelectSide] = token;
    // Log the selected token
    console.log("currentTrade:" , currentTrade);
    // Display token image and symbol in swapbox
    renderInterface();
}

// Function to display the image and token symbols 
function renderInterface(){
    if (currentTrade.from) {
      console.log(currentTrade.from)
      // Set the from token image
      document.getElementById("from_token_img").src = currentTrade.from.logoURI;
       // Set the from token symbol text
      document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
    }
    if (currentTrade.to) {
        // Set the to token image
      document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        // Set the to token symbol text
      document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    }
}

function getSources(swapPriceJSON) {
    let sources = swapPriceJSON.sources;
    let summary = '';
    for (const i in sources){
        if (sources[i].proportion>0) {
            summary += sources[i].proportion * 100 +'% ' + sources[i].name +',';
        }
    }
    return summary;
}

//Show estimated gas in $
async function getGasUsd(swapPriceJSON){
    const params = {
        ids: 'weth',
        vs_currencies: 'usd',
    }
    // Fetch the token price in usd.
    const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?${qs.stringify(params)}`
    );
    // Await and parse the JSON response 
    tokenPriceJSON = await response.json();
    weth = tokenPriceJSON.weth.usd;
    console.log("tokenPriceJSON", weth);
    gas = swapPriceJSON.gas;
    gasPrice = swapPriceJSON.gasPrice;
    gasUsd = weth*gas*gasPrice/(1000000000*1000000000)

    console.log("gasUsd", gasUsd);
    return gasUsd;
}

async function getPrice(){
    console.log("Getting Price");
    // Only fetch price if from token, to token, and from token amount have been filled in 
    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;
    // The amount is calculated from the smallest base unit of the token. We get this by multiplying the (from amount) x (10 to the power of the number of decimal places)
    let  amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);
    const params = {
        sellToken: currentTrade.from.address,
        buyToken: currentTrade.to.address,
        sellAmount: amount,
    }
    // Fetch the swap price.
    const response = await fetch(
        `https://${network_domain}/swap/v1/price?${qs.stringify(params)}`
    );
    // Await and parse the JSON response 
    swapPriceJSON = await response.json();
    console.log("Price: ", swapPriceJSON);
    // Use the returned values to populate the buy Amount and the estimated gas in the UI
    document.getElementById("to_amount").value = swapPriceJSON.buyAmount / (10 ** currentTrade.to.decimals);
    document.getElementById("gas_estimate").innerHTML = swapPriceJSON.estimatedGas;
    document.getElementById("gas_usd").innerHTML = await getGasUsd(swapPriceJSON);
    document.getElementById("price_source").innerHTML = getSources(swapPriceJSON);
}

//Calculate price when a user enters new “to” token
async function getPriceTo(){
    console.log("Getting Price");
    // Only fetch price if from token, to token, and from token amount have been filled in 
    if (!currentTrade.from || !currentTrade.to || !document.getElementById("to_amount").value) return;
    // The amount is calculated from the smallest base unit of the token. We get this by multiplying the (from amount) x (10 to the power of the number of decimal places)
    let  amount = Number(document.getElementById("to_amount").value * 10 ** currentTrade.to.decimals);
    const params = {
        sellToken: currentTrade.from.address,
        buyToken: currentTrade.to.address,
        buyAmount: amount,
    }
    // Fetch the swap price.
    const response = await fetch(
        `https://${network_domain}/swap/v1/price?${qs.stringify(params)}`
    );
    // Await and parse the JSON response 
    swapPriceJSON = await response.json();
    console.log("Price: ", swapPriceJSON);
    // Use the returned values to populate the buy Amount and the estimated gas in the UI
    document.getElementById("from_amount").value = swapPriceJSON.sellAmount / (10 ** currentTrade.from.decimals);
    document.getElementById("gas_estimate").innerHTML = swapPriceJSON.estimatedGas;
    document.getElementById("gas_usd").innerHTML = await getGasUsd(swapPriceJSON);
    document.getElementById("price_source").innerHTML = getSources(swapPriceJSON);
}

// Function to get a quote using /swap/v1/quote. We will pass in the user's MetaMask account to use as the takerAddress
async function getQuote(account){
    console.log("Getting Quote");
  
    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);
  
    const params = {
      sellToken: currentTrade.from.address,
      buyToken: currentTrade.to.address,
      sellAmount: amount,
      // Set takerAddress to account 
      takerAddress: account,
    }
  
    // Fetch the swap quote.
    const response = await fetch(
      `https://${network_domain}/swap/v1/quote?${qs.stringify(params)}`
      );
    
    swapQuoteJSON = await response.json();
    console.log("Quote: ", swapQuoteJSON);
    
    document.getElementById("to_amount").value = swapQuoteJSON.buyAmount / (10 ** currentTrade.to.decimals);
    document.getElementById("gas_estimate").innerHTML = swapQuoteJSON.estimatedGas;
    document.getElementById("gas_usd").innerHTML = getGasUsd(swapPriceJSON);
    document.getElementById("price_source").innerHTML = getSources(swapPriceJSON);

    return swapQuoteJSON;
}

async function trySwap(){
    console.log("Getting trySwap");
    // The address, if any, of the most recently used account that the caller is permitted to access
    let accounts = await ethereum.request({ method: "eth_accounts" });
    let takerAddress = accounts[0];
    // Log the the most recently used address in our MetaMask wallet
    console.log("takerAddress: ", takerAddress);
    // Pass this as the account param into getQuote() we built out earlier. This will return a JSON object trade order. 
    let swapQuoteJSON = await getQuote(takerAddress);

    if (swapQuoteJSON.code == 105) {
        // Setup the erc20abi in json format so we can interact with the approve method below
        const erc20abi= [{ "inputs": [ { "internalType": "string", "name": "name", "type": "string" }, { "internalType": "string", "name": "symbol", "type": "string" }, { "internalType": "uint256", "name": "max_supply", "type": "uint256" } ], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" } ], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" } ], "name": "Transfer", "type": "event" }, { "inputs": [ { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" } ], "name": "allowance", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "approve", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "account", "type": "address" } ], "name": "balanceOf", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "account", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "burnFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [ { "internalType": "uint8", "name": "", "type": "uint8" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "subtractedValue", "type": "uint256" } ], "name": "decreaseAllowance", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "addedValue", "type": "uint256" } ], "name": "increaseAllowance", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "transfer", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "transferFrom", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }]
        // Set up approval amount for the token we want to trade from
        const fromTokenAddress = currentTrade.from.address;
        // In order for us to interact with a ERC20 contract's method's, need to create a web3 object. This web3.eth.Contract object needs a erc20abi which we can get from any erc20 abi as well as the specific token address we are interested in interacting with, in this case, it's the fromTokenAddrss
        // Read More: https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html#web3-eth-contract
        const  web3 = new Web3(Web3.givenProvider);
        const ERC20TokenContract = new web3.eth.Contract(erc20abi, fromTokenAddress);
        console.log("setup ERC20TokenContract: ", ERC20TokenContract);
    
        // The max approval is set here. Using Bignumber to handle large numbers and account for overflow (https://github.com/MikeMcl/bignumber.js/)
        // const maxApproval = new BigNumber(2).pow(256).minus(1);
        //only approves just the amount needed.
        let maxApproval = new BigNumber(Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals));
        console.log("approval amount: ", maxApproval);
        // Grant the allowance target (the 0x Exchange Proxy) an  allowance to spend our tokens. Note that this is a txn that incurs fees. 
        const tx = await ERC20TokenContract.methods.approve(
            // swapQuoteJSON.allowanceTarget,
            ZERO_EX_ADDRESS,
            maxApproval,
        )
        .send({ from: takerAddress })
        .then(tx => {
            console.log("tx: ", tx)
        });
        swapQuoteJSON = await getQuote(takerAddress);
        console.log("swapQuoteJSON", swapQuoteJSON);
    }

    // Perform the swap
    const receipt = await web3.eth.sendTransaction(swapQuoteJSON);
    console.log("receipt: ", receipt);
}

// Add init() call
init();

// Call the connect function when the login_button is clicked
document.getElementById("login_button").onclick = connect;
document.getElementById("from_token_select").onclick = () => {
    openModal("from");
};
document.getElementById("to_token_select").onclick = () => {
    openModal("to");
};
document.getElementById("modal_close").onclick = closeModal;
// at the bottom of index.js add this
document.getElementById("from_amount").onblur = getPrice;
document.getElementById("to_amount").onblur = getPriceTo;
document.getElementById("swap_button").onclick = trySwap;
document.getElementById("coin_filter").oninput = filterTokens;
document.getElementById("network_selection").oninput = selNetwork;