import WebSocket from 'ws';
import { query } from '../config/db';
import { generateECDSAHash } from '../utils/hash';

interface BlockData {
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  timestamp: number;
  events: any[];
  transactions: any[];
  extrinsics: any[];
  gasFees: any[];
}

// Helper function to convert asset values from Substrate's base unit (assuming 18 decimals)
const convertAssetValue = (value: string | number | bigint): number => Number(value) / 1e18;

// Helper function to extract block data from the WebSocket message
const extractBlockData = (data: any): BlockData => ({
  number: data.number,
  hash: data.hash,
  parentHash: data.parentHash,
  stateRoot: data.stateRoot,
  extrinsicsRoot: data.extrinsicsRoot,
  timestamp: new Date(data.timestamp).getTime(),
  events: data.events.map((event: any) => ({
    section: event.section,
    method: event.method,
    data: event.data,
  })),
  transactions: data.transactions.map((tx: any) => ({
    originalTxHash: tx.hash,
    fromAddress: tx.from,
    toAddress: tx.to,
    amount: convertAssetValue(tx.value),
    fee: convertAssetValue(tx.fee),
    gasFee: convertAssetValue(tx.gasFee),
    gasValue: convertAssetValue(tx.gasValue),
    method: tx.method,
    events: tx.events,
  })),
  extrinsics: data.extrinsics.map((extrinsic: any) => ({
    name: extrinsic.method,
    weight: extrinsic.weight,
  })),
  gasFees: data.gasFees.map((fee: any) => ({
    extrinsicId: fee.extrinsicId,
    gasFee: convertAssetValue(fee.gasFee),
  })),
});

// Establish WebSocket connection to the Substrate node
const ws = new WebSocket(process.env.WS_URL!);

// Handle WebSocket connection open event
ws.on('open', () => {
  console.log('Connected to WebSocket');
  ws.send(JSON.stringify({ method: 'subscribe', params: ['block'] }));
});

// Handle incoming messages from WebSocket
ws.on('message', async (data: WebSocket.Data) => {
  const blockData = extractBlockData(JSON.parse(data.toString()));

  try {
    await query('BEGIN');

    // Insert block data into PostgreSQL
    const blockQuery = `INSERT INTO blocks (block_number, block_hash, parent_hash, state_root, extrinsics_root, timestamp)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (block_number) DO NOTHING`;
    await query(blockQuery, [blockData.number, blockData.hash, blockData.parentHash, blockData.stateRoot, blockData.extrinsicsRoot, new Date(blockData.timestamp)]);

    // Insert event data into PostgreSQL
    for (const event of blockData.events) {
      const eventQuery = `INSERT INTO events (block_number, section, method, data) VALUES ($1, $2, $3, $4)`;
      await query(eventQuery, [blockData.number, event.section, event.method, event.data]);
    }

    // Insert transaction data into PostgreSQL
    for (const tx of blockData.transactions) {
      const ecdsaHash = generateECDSAHash(tx.fromAddress, tx.toAddress, tx.amount.toString(), tx.gasFee.toString());
      const txQuery = `INSERT INTO transactions (original_tx_hash, tx_hash, block_number, from_address, to_address, amount, fee, gas_fee, gas_value, method, events)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                       ON CONFLICT (original_tx_hash) DO NOTHING`;
      await query(txQuery, [tx.originalTxHash, ecdsaHash, blockData.number, tx.fromAddress, tx.toAddress, tx.amount, tx.fee, tx.gasFee, tx.gasValue, tx.method, tx.events]);
    }

    // Insert extrinsic data and associated gas fee data into PostgreSQL
    for (const extrinsic of blockData.extrinsics) {
      const extrinsicQuery = `INSERT INTO extrinsics (name, weight) VALUES ($1, $2) RETURNING id`;
      const res = await query(extrinsicQuery, [extrinsic.name, extrinsic.weight]);
      const extrinsicId = res.rows[0].id;

      for (const fee of blockData.gasFees) {
        if (fee.extrinsicId === extrinsicId) {
          const gasFeeQuery = `INSERT INTO gas_fees (extrinsic_id, gas_fee) VALUES ($1, $2)`;
          await query(gasFeeQuery, [extrinsicId, fee.gasFee]);
        }
      }
    }

    await query('COMMIT');
    console.log(`Block ${blockData.number} processed successfully`);
  } catch (err) {
    await query('ROLLBACK');
    console.error(`Error processing block ${blockData.number}:`, err);
  }
});

// Handle WebSocket errors
ws.on('error', console.error);

// Handle WebSocket close event
ws.on('close', () => console.log('WebSocket connection closed'));

export {};
