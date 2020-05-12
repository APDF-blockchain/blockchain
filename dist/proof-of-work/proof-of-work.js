"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashMatchesDifficulty = void 0;
// These functions were taken from https://lhartikk.github.io/jekyll/update/2017/07/13/chapter2.html
const utils_1 = require("../utils/utils");
const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = utils_1.hexToBinary(hash);
    const requiredPrefix = '0'.repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
};
exports.hashMatchesDifficulty = hashMatchesDifficulty;
//# sourceMappingURL=proof-of-work.js.map