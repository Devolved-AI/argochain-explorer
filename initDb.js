const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./substrate_data.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS blocks (number INTEGER PRIMARY KEY, hash TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, block_number INTEGER, section TEXT, method TEXT, data TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS transactions (hash TEXT PRIMARY KEY, block_number INTEGER, from_address TEXT, to_address TEXT, amount TEXT, fee TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS accounts (address TEXT PRIMARY KEY, balance TEXT)");
});

db.close();
