import { Request, Response } from 'express';
import { query } from '../config/db';

// Handler to fetch a block by its number
export const getBlockByNumber = async (req: Request, res: Response) => {
  try {
    const { blockNumber } = req.params;
    const result = await query('SELECT * FROM blocks WHERE block_number = $1', [blockNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Block not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// Handler to list the latest 10 blocks
export const listBlocks = async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM blocks ORDER BY block_number DESC LIMIT 10');
    res.status(200).json(result.rows);
} catch (error) {
res.status(500).json({ message: ‘Internal server error’, error });
}
};
