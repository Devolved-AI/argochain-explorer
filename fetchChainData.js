const { ApiPromise, WsProvider } = require('@polkadot/api');
const sqlite3 = require('sqlite3').verbose();
const async = require('async');
const crypto = require('crypto');

const wsProvider = new WsProvider('wss://rpc.devolvedai.com');
let db;

async function main() {
  const api = await ApiPromise.create({ provider: wsProvider });
  db = new sqlite3.Database('./substrate_data.db');

  const latestHeader = await api.rpc.chain.getHeader();
  const latestBlockNumber = latestHeader.number.toNumber();

  for (let blockNumber = 0; blockNumber <= latestBlockNumber; blockNumber++) {
    await processBlock(api, blockNumber);
  }

  db.close();
}

async function processBlock(api, blockNumber) {
  const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
  const signedBlock = await api.rpc.chain.getBlock(blockHash);
  const blockEvents = await api.query.system.events.at(blockHash);

  db.run("INSERT OR IGNORE INTO blocks (number, hash) VALUES (?, ?)", [blockNumber, blockHash.toHex()], function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Block ${blockNumber} (${blockHash}) inserted`);
    }
  });

  for (const extrinsic of signedBlock.block.extrinsics) {
    const { method: { method, section }, hash, signer, args } = extrinsic;

    if (section === 'balances' && method === 'transfer') {
      const [to, amount] = args;

      db.run("INSERT OR IGNORE INTO transactions (hash, block_number, from_address, to_address, amount, fee) VALUES (?, ?, ?, ?, ?, ?)", [
        hash.toHex(),
        blockNumber,
        signer.toString(),
        to.toString(),
        amount.toString(),
        '0'
      ], function(err) {
        if (err) {
          console.error(err.message);
        } else {
          console.log(`Transaction ${hash.toHex()} from block ${blockNumber} inserted`);
        }
      });

      await updateAccountBalance(api, signer.toString());
      await updateAccountBalance(api, to.toString());
    }
  }

  blockEvents.forEach((record, index) => {
    const { event, phase } = record;
    const types = event.typeDef;

    db.run("INSERT INTO events (block_number, section, method, data) VALUES (?, ?, ?, ?)", [
      blockNumber,
      event.section,
      event.method,
      JSON.stringify(event.data.map((data, i) => ({ type: types[i].type, value: data.toString() })))
    ], function(err) {
      if (err) {
        console.error(err.message);
      } else {
        console.log(`Event ${index} from block ${blockNumber} inserted`);
      }
    });
  });
}

async function updateAccountBalance(api, address) {
  const { data: { free: balance } } = await api.query.system.account(address);

  db.run("INSERT OR REPLACE INTO accounts (address, balance) VALUES (?, ?)", [address, balance.toString()], function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Balance for account ${address} updated`);
    }
  });
}

main().catch(console.error);
