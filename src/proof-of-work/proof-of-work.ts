// These functions were taken from https://lhartikk.github.io/jekyll/update/2017/07/13/chapter2.html
// in seconds
import { Utils } from '../utils/utils';
import { Block } from '../block-chain/block';

export class ProofOfWork {
    // in seconds
    private BLOCK_GENERATION_INTERVAL: number = 10;

    // in blocks
    private DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;
    //private DIFFICULTY_ADJUSTMENT_INTERVAL: number = 1;

    private utils:Utils = new Utils();

    constructor() {
    }

    public hashMatchesDifficulty(hash: string, difficulty: number): boolean {
        const hashInBinary: string = this.utils.hexToBinary(hash);
        const requiredPrefix: string = '0'.repeat(difficulty);
        return hashInBinary.startsWith(requiredPrefix);
    }

    public getDifficulty(aBlockchain: Block[]): number {
        const latestBlock: Block = aBlockchain[aBlockchain.length - 1];
        if (latestBlock.index % this.DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
            return this.getAdjustedDifficulty(latestBlock, aBlockchain);
        } else {
            return latestBlock.difficulty;
        }
    }

    public getAdjustedDifficulty(latestBlock: Block, aBlockchain: Block[]) {
        const prevAdjustmentBlock: Block = aBlockchain[aBlockchain.length - this.DIFFICULTY_ADJUSTMENT_INTERVAL];
        const timeExpected: number = this.BLOCK_GENERATION_INTERVAL * this.DIFFICULTY_ADJUSTMENT_INTERVAL;
        const timeTaken: number = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
        if (timeTaken < timeExpected / 2) {
            return prevAdjustmentBlock.difficulty + 1;
        } else if (timeTaken > timeExpected * 2) {
            return prevAdjustmentBlock.difficulty - 1;
        } else {
            return prevAdjustmentBlock.difficulty;
        }
    }
}