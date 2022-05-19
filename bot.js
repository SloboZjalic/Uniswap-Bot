const ethers = require('ethers');

const addresses = {
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    me: "wallet hash"
}

const mnemonic = "secret phrase"

const provider = new ethers.providers.WebSocketProvider("quicknodes - key")
const wallet = ethers.Wallet.fromMnemonic(mnemonic);
const account = wallet.connect(provider)

const factory = new ethers.Contract(
    addresses.factory,
    ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],
    account
);
const router = new ethers.Contract(
    addresses.router,
    [
        'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
        'function swapExactTokensForTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)',
    ],
    account
);

factory.on("PairCreated", async (token0, token1, addressPair) => {
    console.log(`
    ~~~~~~~~~~~~~~~~~~
    New pair detected
    ~~~~~~~~~~~~~~~~~~
    token0: ${token0}
    token1: ${token1}
    addressPair: ${addressPair}
    `);

    // This block ensures we pay with WBNB
    let buyToken, sellToken;
    if(token0 === addresses.WBNB) {
        buyToken = token0;
        sellToken = token1;
    }
    if (token1 === addresses.WBNB) {
        buyToken = token1;
        sellToken = token0;
    }
    // Neither token is WBNB and we cannot purchase
    if(typeof buyToken === "undefined") {
        return
    }
    const amountIn = ethers.utils.parseUnits('0.01', 'ether'); //ether is the measurement, not the coin
    const amounts = await router.getAmountsOut(amountIn, [buyToken, sellToken]);

    const amountOutMin = amounts[1].sub(amounts[1].div(10)); // math for Big numbers in JS
    console.log(`
    ~~~~~~~~~~~~~~~~~~~~
    Buying new token
    ~~~~~~~~~~~~~~~~~~~~
    buyToken: ${amountIn.toString()} ${buyToken} (WBNB)
    sellToken: ${amountOutMin.toString()} ${sellToken}
    `);
    const tx = await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [buyToken, sellToken],
        addresses.me,
        Date.now() + 1000 * 60 * 5 //5 minutes
    );
    const receipt = await tx.wait();
    console.log('Transaction receipt');
    console.log(receipt);
    }
)
