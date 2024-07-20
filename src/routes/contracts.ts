import { Request, Response } from 'express';
import { query } from '../config/db';

// Handler to fetch a contract by its address
export const getContractByAddress = async (req: Request, res: Response) => {
  try {
    const { contractAddress } = req.params;
    const result = await query('SELECT * FROM contracts WHERE address = $1', [contractAddress]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// Handler to list the latest 10 contracts
export const listContracts = async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM contracts ORDER BY address DESC LIMIT 10');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};
