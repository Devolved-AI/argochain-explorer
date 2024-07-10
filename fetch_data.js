const { ApiPromise, WsProvider } = require('@polkadot/api');
const sqlite3 = require('sqlite3').verbose();
const async = require('async');

const wsProvider = new WsProvider('wss://rpc.devolvedai.com');
let db;

async function main() {
  const api = await ApiPromise.create({ provider: wsProvider });
  db = new sqlite3.Database('./argochain_data.db');

  const latestHeader = await api.rpc.chain.getHeader();
  const latestBlockNumber = latestHeader.number.toNumber();
  const batchSize = 10; // Adjust batch size based on your requirements

  const blockNumbers = Array.from({ length: latestBlockNumber + 1 }, (_, i) => i);

  async.eachLimit(blockNumbers, batchSize, async (blockNumber) => {
    await processBlock(api, blockNumber);
  }, (err) => {
    if (err) {
      console.error('Error processing blocks:', err);
    } else {
      console.log('All blocks processed successfully');
    }
    db.close();
  });
}

async function processBlock(api, blockNumber) {
  const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
  const signedBlock = await api.rpc.chain.getBlock(blockHash);
  const blockEvents = await api.query.system.events.at(blockHash);

  console.log(`Processing Block ${blockNumber} (${blockHash})`);

  db.serialize(() => {
    db.run("INSERT OR IGNORE INTO blocks (number, hash) VALUES (?, ?)", [blockNumber, blockHash.toHex()]);

    signedBlock.block.extrinsics.forEach(async (extrinsic) => {
      const { method: { method, section }, hash, signer, args } = extrinsic;

      if (section === 'balances' && method === 'transfer') {
        const [to, amount] = args;

        console.log(`Transaction: ${hash.toHex()} from ${signer.toString()} to ${to.toString()} amount ${amount.toString()}`);

        db.run("INSERT OR IGNORE INTO transactions (hash, block_number, from_address, to_address, amount, fee) VALUES (?, ?, ?, ?, ?, ?)", [
          hash.toHex(),
          blockNumber,
          signer.toString(),
          to.toString(),
          amount.toString(),
          '0'
        ]);

        await updateAccountBalance(api, signer.toString());
        await updateAccountBalance(api, to.toString());
      }
    });

    blockEvents.forEach((record, index) => {
      const { event, phase } = record;
      const types = event.typeDef;

      db.run("INSERT INTO events (block_number, section, method, data) VALUES (?, ?, ?, ?)", [
        blockNumber,
        event.section,
        event.method,
        JSON.stringify(event.data.map((data, i) => ({ type: types[i].type, value: data.toString() })))
      ]);
    });
  });
}

async function updateAccountBalance(api, address) {
  const { data: { free: balance } } = await api.query.system.account(address);

  console.log(`Updating balance for ${address}: ${balance.toString()}`);

  db.run("INSERT OR REPLACE INTO accounts (address, balance) VALUES (?, ?)", [address, balance.toString()]);

  await fetchTransactionHistory(api, address);
}

async function fetchTransactionHistory(api, address) {
  const latestHeader = await api.rpc.chain.getHeader();
  const latestBlockNumber = latestHeader.number.toNumber();
  const batchSize = 10; // Adjust batch size based on your requirements

  const blockNumbers = Array.from({ length: latestBlockNumber + 1 }, (_, i) => i);

  async.eachLimit(blockNumbers, batchSize, async (blockNumber) => {
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const signedBlock = await api.rpc.chain.getBlock(blockHash);

    signedBlock.block.extrinsics.forEach((extrinsic) => {
      const { method: { method, section }, hash, signer, args } = extrinsic;

      if (section === 'balances' && method === 'transfer') {
        const [to, amount] = args;

        if (signer.toString() === address || to.toString() === address) {
          console.log(`Historical Transaction: ${hash.toHex()} from ${signer.toString()} to ${to.toString()} amount ${amount.toString()}`);

          db.run("INSERT OR IGNORE INTO transactions (hash, block_number, from_address, to_address, amount, fee) VALUES (?, ?, ?, ?, ?, ?)", [
            hash.toHex(),
            blockNumber,
            signer.toString(),
            to.toString(),
            amount.toString(),
            '0'
          ]);
        }
      }
    });
  }, (err) => {
    if (err) {
      console.error(`Error fetching transaction history for ${address}:`, err);
    } else {
      console.log(`Transaction history for ${address} fetched successfully`);
    }
  });
}

main().catch(console.error);
