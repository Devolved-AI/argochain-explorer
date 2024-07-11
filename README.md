# argochain explorer
An explorer made specifically for the Argochain ecosystem.

Let's break down the implementation into separate scripts for better manageability: 

1. **Database Schema Initialization**
2. **Fetch and Store Chain Data**
3. **Query Functions**

### Step 1: Database Schema Initialization

Create a script to set up the database schema. Save this as `initDb.js`.

```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./substrate_data.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS blocks (number INTEGER PRIMARY KEY, hash TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, block_number INTEGER, section TEXT, method TEXT, data TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS transactions (hash TEXT PRIMARY KEY, block_number INTEGER, from_address TEXT, to_address TEXT, amount TEXT, fee TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS accounts (address TEXT PRIMARY KEY, balance TEXT)");
});

db.close();
```

Run this script to initialize the database:

```sh
node initDb.js
```

### Step 2: Fetch and Store Chain Data

Create a script to fetch and store the entire chain’s history. Save this as `fetchChainData.js`.

```javascript
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
```

Run this script to fetch and store the chain data:

```sh
node fetchChainData.js
```

### Step 3: Query Functions

Create a script to query the stored data. Save this as `queryData.js`.

```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./substrate_data.db');

function queryAccountBalance(address) {
  db.get("SELECT * FROM accounts WHERE address = ?", [address], (err, row) => {
    if (err) {
      console.error(err.message);
    } else if (row) {
      console.log(`Account Balance:
        Address: ${row.address}
        Balance: ${row.balance}`);
    } else {
      console.log(`Account with address ${address} not found.`);
    }
  });
}

function queryTokenHoldings(address) {
  db.all("SELECT * FROM transactions WHERE from_address = ? OR to_address = ?", [address, address], (err, rows) => {
    if (err) {
      console.error(err.message);
    } else if (rows.length > 0) {
      console.log(`Token Holdings for ${address}:`);
      rows.forEach(row => {
        console.log(`Transaction Hash: ${row.hash}
          Block Number: ${row.block_number}
          From: ${row.from_address}
          To: ${row.to_address}
          Amount: ${row.amount}
          Fee: ${row.fee}`);
      });
    } else {
      console.log(`No token holdings found for address ${address}.`);
    }
  });
}

function queryTransactionByHash(hash) {
  db.get("SELECT * FROM transactions WHERE hash = ?", [hash], (err, row) => {
    if (err) {
      console.error(err.message);
    } else if (row) {
      console.log(`Transaction Details:
        Hash: ${row.hash}
        Block Number: ${row.block_number}
        From: ${row.from_address}
        To: ${row.to_address}
        Amount: ${row.amount}
        Fee: ${row.fee}`);
    } else {
      console.log(`Transaction with hash ${hash} not found.`);
    }
  });
}

// Examples to query specific data
queryAccountBalance('0xYourAccountAddress');
queryTokenHoldings('0xYourAccountAddress');
queryTransactionByHash('0xYourTransactionHash');

db.close();
```

Run this script to query the data:

```sh
node queryData.js
```
