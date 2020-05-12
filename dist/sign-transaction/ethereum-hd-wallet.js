// import jQuery from "jquery";
// window.$ = window.jQuery = jQuery;
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// 1A) Restore HD Wallet from Existing Mnemonic
const ethers = require('ethers');
function restoreHDNode(mnemonic) {
    return ethers.utils.HDNode.fromMnemonic(mnemonic);
}
let mnemonic = "upset fuel enhance depart portion hope core animal innocent will athlete snack";
console.log("restoredHDNode :\n");
console.log(restoreHDNode(mnemonic));
// 1B) Restore HD Wallet from Existing Mnemonic
console.log();
function restoreHDWallet(mnemonic) {
    return ethers.Wallet.fromMnemonic(mnemonic);
}
console.log("restoredHDWallet :\n");
console.log(restoreHDWallet(mnemonic));
// 2A) Generate a New Random HD Wallet from Random Mnemonic
console.log();
function generateMnemonic() {
    let randomEntropyBytes = ethers.utils.randomBytes(16);
    return ethers.utils.HDNode.entropyToMnemonic(randomEntropyBytes);
}
function generateRandomHDNode() {
    let mnemonic = generateMnemonic();
    return ethers.utils.HDNode.fromMnemonic(mnemonic);
}
console.log("generateRandomHDNode :\n");
console.log(generateRandomHDNode());
console.log();
// // 2B) Generate a New Random HD Wallet from Random Mnemonic
function generateRandomWallet() {
    return ethers.Wallet.createRandom();
}
console.log("generateRandomWallet :\n");
console.log(generateRandomWallet());
console.log();
// // 3A) Save HD Wallet as JSON
function saveWalletAsJson(wallet, password) {
    return __awaiter(this, void 0, void 0, function* () {
        return wallet.encrypt(password);
    });
}
(() => __awaiter(this, void 0, void 0, function* () {
    let wallet = ethers.Wallet.createRandom();
    let password = "p@$$word";
    let json = yield saveWalletAsJson(wallet, password);
    console.log("Saved JSON :\n" + json);
}))();
console.log();
//console.log();
// 3B) Load HD Wallet from JSON
function decryptWallet(json, password) {
    return __awaiter(this, void 0, void 0, function* () {
        return ethers.Wallet.fromEncryptedJson(json, password);
    });
}
(() => __awaiter(this, void 0, void 0, function* () {
    let wallet = ethers.Wallet.createRandom();
    let password = "p@$$word";
    let json = yield saveWalletAsJson(wallet, password);
    let walletDecrypted = yield decryptWallet(json, password);
    console.log();
    console.log("walletDecrypted :\n");
    console.log(walletDecrypted);
}))();
console.log("");
// 4) Derive Keys from HD Wallet
function deriveFiveWalletsFromHdNode(mnemonic, derivationPath) {
    let wallets = [];
    for (let i = 0; i < 5; i++) {
        let hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic).derivePath(derivationPath + "/" + i);
        //console.log(hdNode);
        let wallet = new ethers.Wallet(hdNode.privateKey);
        //console.log("This is balance " + wallet.getBalance());
        wallets.push(wallet);
    }
    return wallets;
}
let derivationPath = "m/44'/60'/0'/0";
console.log("deriveFiveWalletsFromHdNode :\n");
console.log(deriveFiveWalletsFromHdNode(mnemonic, derivationPath));
console.log();
// console.log("This is balance" + wallets.balance);
// 5) Sign a Transaction
function signTransaction(wallet, toAddress, value) {
    return __awaiter(this, void 0, void 0, function* () {
        let transaction = {
            nonce: 0,
            gasLimit: 21000,
            gasPrice: ethers.utils.bigNumberify("2000000000"),
            to: toAddress,
            value: ethers.utils.parseEther(value.toString()),
            data: "0x"
        };
        return wallet.sign(transaction);
    });
}
let wallets = deriveFiveWalletsFromHdNode(mnemonic, derivationPath);
let wallet = wallets[1];
let recipient = "0x933b946c4fec43372c5580096408d25b3c7936c5";
let value = "1.0";
(() => __awaiter(this, void 0, void 0, function* () {
    let signedTransaction = yield signTransaction(wallet, recipient, value);
    console.log("Signed Transaction:\n" + signedTransaction);
    console.log("");
    console.log("Parsed Transaction:\n");
    console.log(ethers.utils.parseTransaction(signedTransaction));
}))();
//# sourceMappingURL=ethereum-hd-wallet.js.map