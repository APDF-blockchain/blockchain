export class Block {
    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public data: string;
    public difficulty: number;
    public nonce: number

    constructor(_index: number, _hash: string, _previousHash: string, _timestamp: number, _data: string, _difficulty: number, _nonce: number) {
        this.index = _index;
        this.hash = _hash;
        this.previousHash = _previousHash;
        this.timestamp = _timestamp;
        this.data = _data;
        this.difficulty = _difficulty;
        this.nonce = _nonce;
    }
}