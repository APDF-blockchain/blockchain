# Naivechain - a blockchain implementation in 200 lines of code

### Notice
This code was cloned from the "Simple Miner with Proof-of-Work in JS Extended" exercise 6 from 
MI1OD: Blockchain Essentials - USA Self-paced Sept 2019 assignment

### Motivation
All the current implementations of blockchains are tightly coupled with the larger context and problems they (e.g. Bitcoin or Ethereum) are trying to solve. This makes understanding blockchains a necessarily harder task, than it must be. Especially source-code-wisely. This project is an attempt to provide as concise and simple implementation of a blockchain as possible.

 
### What is blockchain
[From Wikipedia](https://en.wikipedia.org/wiki/Blockchain_(database)) : Blockchain is a distributed database that maintains a continuously-growing list of records called blocks secured from tampering and revision.

### Key concepts of Naivechain
Check also [this blog post](https://medium.com/@lhartikk/a-blockchain-in-200-lines-of-code-963cc1cc0e54#.dttbm9afr5) for a more detailed overview of the key concepts
* HTTP interface to control the node
* Use Websockets to communicate with other nodes (P2P)
* Super simple "protocols" in P2P communication
* Data is not persisted in nodes
* No proof-of-work or proof-of-stake: a block can be added to the blockchain without competition


![alt tag](naivechain_blockchain.png)

![alt tag](naivechain_components.png)


### Naivecoin
For a more extensive tutorial about blockchains, you can check the project [Naivecoin](https://lhartikk.github.io/). It is based on Naivechain and implements for instance Proof-of-work, transactions and wallets.

### Quick start
(set up two connected nodes and mine 1 block)
```
npm install
HTTP_PORT=3001 P2P_PORT=6001 npm start
HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock
```

### Quick start with Docker
(set up three connected nodes and mine a block)
###
```sh
docker-compose up
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock
```

### HTTP API
##### Get blockchain
```
curl http://localhost:3001/blocks
```
##### Create block
```
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock
``` 
##### Add peer
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3001/addPeer
```
#### Query connected peers
```
curl http://localhost:3001/peers
```

### NOTES

#### How to setup a GitHub organization, project and team

https://github.com/collab-uniba/socialcde4eclipse/wiki/How-to-setup-a-GitHub-organization,-project-and-team

#### Notes about the current implementation

1. There is no proof-of-work.  We will need to modify the calculateHash() to do this. -dmp
    It should be noted that the block hash has not yet nothing to do with mining, as there is no proof-of-work problem to solve. We use block hashes to preserve integrity of the block and to explicitly reference the previous block.

2. We will most likely want to use different values for the genisys block then what we have in the master branch.  I am not sure how to 
    generate the values for the timestamp or the nextHash for the genisys block. The timestamp should just be seconds since the UNIX
    epoch. -dmp
