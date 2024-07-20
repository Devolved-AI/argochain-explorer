import { Pool } from 'pg';

// Initialize a connection pool to the PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper function to execute database queries
export const query = (text: string, params?: any[]) => pool.query(text, params);
