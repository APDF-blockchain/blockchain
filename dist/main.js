"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Crypto_js_1 = __importDefault(require("Crypto-js"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const ws_1 = __importDefault(require("ws"));
console.log('ARGUMENTS ', process.argv);
const http_port = process.env.HTTP_PORT || 3001;
const p2p_port = process.env.P2P_PORT || 6001;
const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];
const difficulty = 4;
class Block {
    constructor(index, previousHash, timestamp, data, hash, difficulty, nonce) {
        this.index = index;
        this.previousHash = previousHash.toString();
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}
const sockets = [];
const MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};
const getGenesisBlock = () => {
    return new Block(0, "0", 1465154705, "my genesis block!!", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7", 0, 0);
};
let blockchain = [getGenesisBlock()];
const initHttpServer = () => {
    const app = express_1.default();
    app.use(body_parser_1.default.json());
    app.get('/blocks', (req, res) => res.send(JSON.stringify(blockchain)));
    app.post('/mineBlock', (req, res) => {
        const newBlock = mineBlock(req.body.data);
        //const newBlock = generateNextBlock(req.body.data);
        addBlock(newBlock);
        broadcast(responseLatestMsg());
        console.log('block added: ' + JSON.stringify(newBlock));
        res.send();
    });
    app.get('/peers', (req, res) => {
        res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    app.post('/addPeer', (req, res) => {
        connectToPeers([req.body.peer]);
        res.send();
    });
    app.listen(http_port, () => console.log('Listening http on port: ' + http_port));
};
const initP2PServer = () => {
    const server = new ws_1.default.Server({ port: +p2p_port });
    server.on('connection', ws => initConnection(ws));
    console.log('listening websocket p2p port on: ' + p2p_port);
};
const initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
};
const initMessageHandler = (ws) => {
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Received message' + JSON.stringify(message));
        switch (message.type) {
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                handleBlockchainResponse(message);
                break;
        }
    });
};
const initErrorHandler = (ws) => {
    const closeConnection = (ws) => {
        console.log('connection failed to peer: ' + ws.url);
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};
// const generateNextBlock = (blockData) => {
//     const previousBlock = getLatestBlock();
//     const nextIndex = previousBlock.index + 1;
//     const nextTimestamp = new Date().getTime() / 1000;
//     const nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, previousBlock.nonce);
//     return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash, difficulty, ++previousBlock.nonce);
// };
const calculateHashForBlock = (block) => {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.nonce);
};
const calculateHash = (index, previousHash, timestamp, data, nonce) => {
    // TODO: Proof Of Work is needed here.
    return Crypto_js_1.default.SHA256(index + previousHash + timestamp + data, nonce).toString();
};
const addBlock = (newBlock) => {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        blockchain.push(newBlock);
    }
};
const isValidNewBlock = (newBlock, previousBlock) => {
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    }
    else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    }
    else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        console.log('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    return true;
};
const connectToPeers = (newPeers) => {
    newPeers.forEach((peer) => {
        const ws = new ws_1.default(peer);
        ws.on('open', () => initConnection(ws));
        ws.on('error', () => {
            console.log('connection failed');
        });
    });
};
const handleBlockchainResponse = (message) => {
    const receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    const latestBlockHeld = getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            console.log("We can append the received block to our chain");
            blockchain.push(latestBlockReceived);
            broadcast(responseLatestMsg());
        }
        else if (receivedBlocks.length === 1) {
            console.log("We have to query the chain from our peer");
            broadcast(queryAllMsg());
        }
        else {
            console.log("Received blockchain is longer than current blockchain");
            replaceChain(receivedBlocks);
        }
    }
    else {
        console.log('received blockchain is not longer than current blockchain. Do nothing');
    }
};
const replaceChain = (newBlocks) => {
    if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        broadcast(responseLatestMsg());
    }
    else {
        console.log('Received blockchain invalid');
    }
};
const isValidChain = (blockchainToValidate) => {
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(getGenesisBlock())) {
        return false;
    }
    const tempBlocks = [blockchainToValidate[0]];
    for (let i = 1; i < blockchainToValidate.length; i++) {
        if (isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
            tempBlocks.push(blockchainToValidate[i]);
        }
        else {
            return false;
        }
    }
    return true;
};
const mineBlock = (blockData) => {
    const previousBlock = getLatestBlock();
    const nextIndex = previousBlock.index + 1;
    let nonce = 0;
    let nextTimestamp = new Date().getTime() / 1000;
    let nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, nonce);
    while (nextHash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
        nonce++;
        nextTimestamp = new Date().getTime() / 1000;
        nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, nonce);
        // Modified the console log because the output screws with the terminal.
        console.log("\"index\":" +
            nextIndex +
            // ",\"previousHash\":" +
            // previousBlock.hash +
            "\"timestamp\":" +
            nextTimestamp +
            // ",\"data\":" +
            // blockData +
            // ",\hex:lb[33mhash: " +
            // nextHash +
            // " \x1b(0m," +
            "\"difficulty\":" +
            difficulty +
            " nonce: " +
            nonce
        // " \x1b(0m "
        );
        // console.log("\"index\":" +
        //     nextIndex +
        //     ",\"previousHash\":"
        //     + previousBlock.hash +
        //     "\"timestamp\":" +
        //     nextTimestamp +
        //     ",\"data\":" +
        //     blockData +
        //     ",\hex:lb[33mhash: " +
        //     nextHash +
        //     " \x1b(0m," +
        //     "\"difficulty\":" +
        //     difficulty +
        //     " hex:lb[33mnonce: " +
        //     nonce +
        //     " \x1b(0m "
        // );
    }
    return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash, difficulty, nonce);
};
function testApp() {
    function showBlockchain(inputBlockchain) {
        for (let i = 0; i < inputBlockchain.length; i++) {
            console.log(inputBlockchain[i]);
        }
        console.log();
    }
    showBlockchain(blockchain);
}
;
const getLatestBlock = () => blockchain[blockchain.length - 1];
const queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST });
const queryAllMsg = () => ({ 'type': MessageType.QUERY_ALL });
const responseChainMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain)
});
const responseLatestMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify([getLatestBlock()])
});
const write = (ws, message) => ws.send(JSON.stringify(message));
const broadcast = (message) => sockets.forEach(socket => write(socket, message));
connectToPeers(initialPeers);
initHttpServer();
initP2PServer();
testApp();
//# sourceMappingURL=main.js.map