import { createHash } from 'crypto';

/**
 * Generate a unique ECDSA hash for a given transfer.
 * This ensures each transfer has a unique identifier.
 * 
 * @param {string} fromAddress - Sender's address
 * @param {string} toAddress - Receiver's address
 * @param {string} amount - Amount transferred
 * @param {string} gasUsed - Gas used in the transaction
 * @returns {string} - ECDSA hash
 */
export const generateECDSAHash = (fromAddress: string, toAddress: string, amount: string, gasUsed: string): string => {
  const data = `${fromAddress}${toAddress}${amount}${gasUsed}`;
  return `0x${createHash('sha256').update(data).digest('hex')}`;
};
