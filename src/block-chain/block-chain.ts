// This code was cloned from the "Simple Miner with Proof-of-Work in JS Extended" exercise 6 from 
// MI1OD: Blockchain Essentials - USA Self-paced Sept 2019 assignment
import CryptoJS from 'Crypto-js';
//import express from 'express';
//import bodyParser from 'body-parser';
//import WebSocket from 'ws';

import { Block } from './block';
import { ProofOfWork } from '../proof-of-work/proof-of-work';
import { Utils } from '../utils/utils';

// const http_port = process.env.HTTP_PORT || 3001;
// const p2p_port = process.env.P2P_PORT || 6001;
// const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];
const difficulty = 4
const MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
}

export class BlockChain {
    // public index: number;
    // public hash: string;
    // public previousHash: string;
    // public timestamp: number;
    // public data: any;
    // public difficulty: number;
    // public nonce: number;
    private blockchain: Block[] = [];
    private genesisBlock: Block;
    //private proofofwork: ProofOfWork = new ProofOfWork();
    private proofofwork: ProofOfWork;
    //private utils = new Utils();
    private utils: Utils;
    private sockets = [];

    constructor() {
        if (this.blockchain.length === 0) {
            this.genesisBlock = new Block(
                0, '816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7', '', 1465154705, 'my genesis block!!', 0, 0
            );
            this.blockchain.push(this.genesisBlock);
            this.proofofwork = new ProofOfWork();
            this.utils = new Utils();
        }
    }
    // constructor(index: number, hash: string, previousHash: string,
    //     timestamp: number, data: string, difficulty: number, nonce: number) {
    //     this.index = index;
    //     this.previousHash = previousHash;
    //     this.timestamp = timestamp;
    //     this.data = data;
    //     this.hash = hash;
    //     this.difficulty = difficulty;
    //     this.nonce = nonce;
    //     if (this.blockchain.length === 0) {
    //         this.genesisBlock = new Block(
    //             0, '816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7', '', 1465154705, 'my genesis block!!', 0, 0
    //         );
    //         this.blockchain.push(this.genesisBlock);
    //         this.proofofwork = new ProofOfWork();
    //         this.utils = new Utils();
    //     }
    // }

    public addSocket(ws: any) {
        this.sockets.push(ws)
    }
    public getGenesisBlock(): Block {
        return this.genesisBlock;
    }

    public generateNextBlock(blockData: string) {
        const previousBlock: Block = this.getLatestBlock();
        const difficulty: number = this.proofofwork.getDifficulty(this.getBlockchain());
        console.log('difficulty: ' + difficulty);
        const nextIndex: number = previousBlock.index + 1;
        const nextTimestamp: number = this.utils.getCurrentTimestamp();
        const newBlock: Block = this.findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
        this.addBlock(newBlock);
        this.broadcastLatest();
        return newBlock;
    }

    public getBlockchain(): Block[] { return this.blockchain }

    public getLatestBlock(): Block { return this.blockchain[this.blockchain.length - 1] }

    //const getBlockchain = (): Block[] => blockchain;

    //const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

    // const generateNextBlock = (blockData) => {
    //     const previousBlock = getLatestBlock();
    //     const nextIndex = previousBlock.index + 1;
    //     const nextTimestamp: number = new Date().getTime() / 1000;
    //     const nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty, previousBlock.nonce);
    //     return new Block(nextIndex, previousBlock.hash, nextTimestamp.toString(), blockData, nextHash, difficulty, this.nonce);
    // };
    ;

    public calculateHashForBlock(block: Block): string {
        return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data, difficulty, block.nonce);
    }

    public calculateHash(index: number, previousHash: string, timestamp: number, data: string, difficulty: number, nonce: string | number | CryptoJS.WordArray): string {
        return CryptoJS.SHA256(index + previousHash + timestamp + difficulty + data, nonce).toString();
    }

    // const findBlock = (index: number, previousHash: string, timestamp: number, data: string, difficulty: number): Block => {
    //     let nonce = 0;
    //     while (true) {
    //         const hash: string = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
    //         if (hashMatchesDifficulty(hash, difficulty)) {
    //             return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
    //         }
    //         nonce++;
    //     }
    // };
    public findBlock(index: number, previousHash: string, timestamp: number, data: string, difficulty: number): Block {
        let nonce = 0;
        while (true) {
            const hash: string = this.calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
            if (this.proofofwork.hashMatchesDifficulty(hash, difficulty)) {
                return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
            }
            nonce++;
        }
    }

    public addBlock(newBlock: Block) {
        if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
            this.blockchain.push(newBlock);
        }
    }

    public isValidNewBlock(newBlock: Block, previousBlock: Block) {
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('invalid index');
            return false;
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.log('invalid previoushash');
            return false;
        } else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
            console.log(typeof (newBlock.hash) + ' ' + typeof this.calculateHashForBlock(newBlock));
            console.log('invalid hash: ' + this.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
            return false;
        }
        return true;
    }

    public write(ws: WebSocket, message: any) { ws.send(JSON.stringify(message)); }
    public broadcast(message: any) { this.sockets.forEach(socket => this.write(socket, message)); }
    public broadcastLatest(): void {
        this.broadcast(this.responseLatestMsg());
    }

    public queryAllMsg(): any { return { 'type': MessageType.QUERY_ALL, 'data': null }; }

    public responseLatestMsg() {
        return {
            'type': MessageType.RESPONSE_BLOCKCHAIN,
            'data': JSON.stringify([this.getLatestBlock()])
        }
    }

    public handleBlockchainResponse(message: any) {
        const receivedBlocks = JSON.parse(message.data).sort((b1: { index: number; }, b2: { index: number; }) => (b1.index - b2.index));
        const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        const latestBlockHeld = this.getLatestBlock();
        if (latestBlockReceived.index > latestBlockHeld.index) {
            console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
            if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
                console.log("We can append the received block to our chain");
                this.blockchain.push(latestBlockReceived);
                this.broadcast(this.responseLatestMsg());
            } else if (receivedBlocks.length === 1) {
                console.log("We have to query the chain from our peer");
                this.broadcast(this.queryAllMsg());
            } else {
                console.log("Received blockchain is longer than current blockchain");
                this.replaceChain(receivedBlocks);
            }
        } else {
            console.log('received blockchain is not longer than current blockchain. Do nothing');
        }
    }

    public replaceChain(newBlocks: Block[]) {
        if (this.isValidChain(newBlocks) && newBlocks.length > this.blockchain.length) {
            console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
            this.blockchain = newBlocks;
            this.broadcast(this.responseLatestMsg());
        } else {
            console.log('Received blockchain invalid');
        }
    }

    public isValidChain(blockchainToValidate: Block[]): boolean {
        if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(this.getGenesisBlock())) {
            return false;
        }
        const tempBlocks = [blockchainToValidate[0]];
        for (let i = 1; i < blockchainToValidate.length; i++) {
            if (this.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
                tempBlocks.push(blockchainToValidate[i]);
            } else {
                return false;
            }
        }
        return true;
    }

    public mineBlock(blockData: any): Block {
        const previousBlock: Block = this.getLatestBlock();
        const nextIndex = previousBlock.index + 1;
        let nonce: number = 0;
        let nextTimestamp: number = new Date().getTime() / 1000;
        let nextHash: string = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty, nonce);
        while (nextHash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            nonce++;
            nextTimestamp = new Date().getTime() / 1000;
            nextHash = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty, nonce);
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
        return new Block(nextIndex, nextHash, previousBlock.hash, nextTimestamp, blockData, difficulty, nonce);
    }
}