import { Request, Response } from 'express';
import { query } from '../config/db';

// Handler to fetch a token by its ID
export const getTokenById = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const result = await query('SELECT * FROM tokens WHERE id = $1', [tokenId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Token not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// Handler to list the latest 10 tokens
export const listTokens = async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM tokens ORDER BY id DESC LIMIT 10');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};
