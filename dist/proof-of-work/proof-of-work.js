"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofOfWork = void 0;
// These functions were taken from https://lhartikk.github.io/jekyll/update/2017/07/13/chapter2.html
// in seconds
const utils_1 = require("../utils/utils");
class ProofOfWork {
    constructor() {
        // in seconds
        this.BLOCK_GENERATION_INTERVAL = 10;
        // in blocks
        this.DIFFICULTY_ADJUSTMENT_INTERVAL = 10;
        this.utils = new utils_1.Utils();
    }
    hashMatchesDifficulty(hash, difficulty) {
        const hashInBinary = this.utils.hexToBinary(hash);
        const requiredPrefix = '0'.repeat(difficulty);
        return hashInBinary.startsWith(requiredPrefix);
    }
    getDifficulty(aBlockchain) {
        const latestBlock = aBlockchain[aBlockchain.length - 1];
        if (latestBlock.index % this.DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
            return this.getAdjustedDifficulty(latestBlock, aBlockchain);
        }
        else {
            return latestBlock.difficulty;
        }
    }
    getAdjustedDifficulty(latestBlock, aBlockchain) {
        const prevAdjustmentBlock = aBlockchain[aBlockchain.length - this.DIFFICULTY_ADJUSTMENT_INTERVAL];
        const timeExpected = this.BLOCK_GENERATION_INTERVAL * this.DIFFICULTY_ADJUSTMENT_INTERVAL;
        const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
        if (timeTaken < timeExpected / 2) {
            return prevAdjustmentBlock.difficulty + 1;
        }
        else if (timeTaken > timeExpected * 2) {
            return prevAdjustmentBlock.difficulty - 1;
        }
        else {
            return prevAdjustmentBlock.difficulty;
        }
    }
}
exports.ProofOfWork = ProofOfWork;
//# sourceMappingURL=proof-of-work.js.map