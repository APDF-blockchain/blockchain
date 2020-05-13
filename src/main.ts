// This code was cloned from the "Simple Miner with Proof-of-Work in JS Extended" exercise 6 from 
// MI1OD: Blockchain Essentials - USA Self-paced Sept 2019 assignment
//import CryptoJS from 'Crypto-js';
import express from 'express';
import bodyParser from 'body-parser';
import WebSocket from 'ws';

import { BlockChain } from './block-chain/block-chain';

const http_port = process.env.HTTP_PORT || 3001;
const p2p_port = process.env.P2P_PORT || 6001;
const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];
const sockets = [];
const MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

const blockChainObject: BlockChain = new BlockChain();

const initConnection = (ws) => {
    sockets.push(ws);
    blockChainObject.addSocket(ws);
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
                write(ws, blockChainObject.responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                blockChainObject.handleBlockchainResponse(message);
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

const queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST });
const responseChainMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockChainObject.getBlockchain())
});

const write = (ws, message) => ws.send(JSON.stringify(message));

const connectToPeers = (newPeers) => {
    newPeers.forEach((peer) => {
        const ws = new WebSocket(peer);
        ws.on('open', () => initConnection(ws));
        ws.on('error', () => {
            console.log('connection failed')
        });
    });
};

const initHttpServer = () => {
    const app = express();
    app.use(bodyParser.json());

    app.get('/blocks', (req, res) => res.send(JSON.stringify(blockChainObject.getBlockchain())));
    app.post('/mineBlock', (req, res) => {
        const newBlock = blockChainObject.mineBlock(req.body.data);
        //const newBlock: Block = blockChainObject.generateNextBlock(req.body.data);
        blockChainObject.addBlock(newBlock);
        blockChainObject.broadcast(blockChainObject.responseLatestMsg());
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
    const server = new WebSocket.Server({ port: +p2p_port });
    server.on('connection', ws => initConnection(ws));
    console.log('listening websocket p2p port on: ' + p2p_port);

};

function testApp() {
    function showBlockchain(inputBlockchain) {
        for (let i = 0; i < inputBlockchain.length; i++) {
            console.log(inputBlockchain[i]);
        }
        console.log();
    }
    showBlockchain(blockChainObject.getBlockchain());
};

connectToPeers(initialPeers);
initHttpServer();
initP2PServer();
testApp();