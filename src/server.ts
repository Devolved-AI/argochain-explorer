import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { getBlockByNumber, listBlocks } from './routes/blocks';
import { getTransactionByHash, listTransactions } from './routes/transactions';
import { getTokenById, listTokens } from './routes/tokens';
import { getContractByAddress, listContracts } from './routes/contracts';

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.get('/api/blocks/:blockNumber', getBlockByNumber);
app.get('/api/blocks', listBlocks);
app.get('/api/transactions/:txHash', getTransactionByHash);
app.get('/api/transactions', listTransactions);
app.get('/api/tokens/:tokenId', getTokenById);
app.get('/api/tokens', listTokens);
app.get('/api/contracts/:contractAddress', getContractByAddress);
app.get('/api/contracts', listContracts);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
