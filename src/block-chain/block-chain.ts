// This code was cloned from the "Simple Miner with Proof-of-Work in JS Extended" exercise 6 from 
// MI1OD: Blockchain Essentials - USA Self-paced Sept 2019 assignment
import CryptoJS from 'Crypto-js';

import { Block } from './block';
import { ProofOfWork } from '../proof-of-work/proof-of-work';
import { Utils } from '../utils/utils';
import { removeAllListeners } from 'cluster';

const MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
}

export class BlockChain {
    private difficulty: number = 4;
    private blockchain: Block[] = [];
    private genesisBlock: Block;
    private proofofwork: ProofOfWork;
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
        //const newBlock: Block = this.mineBlock(blockData);
        // this.addBlock(newBlock);
        // this.broadcastLatest();
        return newBlock;
    }

    public getBlockchain(): Block[] { return this.blockchain }

    public getLatestBlock(): Block { return this.blockchain[this.blockchain.length - 1] }

    public calculateHashForBlock(block: Block): string {
        let rVal: string = this.calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);
        //return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data, difficulty, block.nonce);
        return rVal;
    }

    public calculateHash(index: number, previousHash: string, timestamp: number, data: string, difficulty: number, nonce: string | number | CryptoJS.WordArray): string {
        return CryptoJS.SHA256(index + previousHash + timestamp + difficulty + data, nonce).toString();
    }

    // public findBlock(index: number, previousHash: string, timestamp: number, data: string, difficulty: number): Block {
    //     return this.mineBlock(data);
    // }
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
        let rVal: boolean = this.isValidNewBlock(newBlock, this.getLatestBlock());
        //if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
        //rVal = true;
        if (rVal === true) {
            this.blockchain.push(newBlock);
        }
    }

    public isValidBlockStructure(block: Block): boolean {
        let rVal: boolean = (typeof block.index === 'number'
            && typeof block.hash === 'string'
            && typeof block.previousHash === 'string'
            && typeof block.timestamp === 'number'
            && typeof block.data === 'string');
        return rVal
    }

    public isValidNewBlock(newBlock: Block, previousBlock: Block) {
        if (!this.isValidBlockStructure(newBlock)) {
            console.log('invalid structure');
            return false;
        }
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
        const isValidGenesis = (block: Block): boolean => {
            return JSON.stringify(block) === JSON.stringify(this.getGenesisBlock());
        };

        if (!isValidGenesis(blockchainToValidate[0])) {
            return false;
        }

        for (let i = 1; i < blockchainToValidate.length; i++) {
            if (!this.isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
                return false;
            }
        }
        return true;
    }

    public mineBlock(blockData: any): Block {
        const previousBlock: Block = this.getLatestBlock();
        const nextIndex = previousBlock.index + 1;
        let nonce: number = 0;
        let nextTimestamp: number = Math.round(new Date().getTime() / 1000);
        let nextHash: string = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, this.difficulty, nonce);
        while (nextHash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join("0")) {
            nonce++;
            nextTimestamp = Math.round(new Date().getTime() / 1000);
            nextHash = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData, this.difficulty, nonce);
            // Modified the console log because the output screws with the terminal.
            console.log("\"index\":" +
                nextIndex +
                // ",\"previousHash\":" +
                // previousBlock.hash +
                ",\"nextHash\":" +
                nextHash +
                ",\"timestamp\":" +
                nextTimestamp +
                // ",\"data\":" +
                // blockData +
                // ",\hex:lb[33mhash: " +
                // nextHash +
                // " \x1b(0m," +
                ",\"difficulty\":" +
                this.difficulty +
                ", nonce: " +
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
        return new Block(nextIndex, nextHash, previousBlock.hash, nextTimestamp, blockData, this.difficulty, nonce);
    }
}