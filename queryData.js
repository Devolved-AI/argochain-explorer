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
