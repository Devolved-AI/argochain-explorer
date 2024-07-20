import { Request, Response } from 'express';
import { query } from '../config/db';

// Handler to fetch a transaction by its hash
export const getTransactionByHash = async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;
    const result = await query('SELECT * FROM transactions WHERE tx_hash = $1', [txHash]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// Handler to list the latest 10 transactions
export const listTransactions = async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM transactions ORDER BY original_tx_hash DESC LIMIT 10');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};
