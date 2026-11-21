import './env.js';
import sql from 'mssql';

const database = process.env.DB_NAME || 'AOTH_GAMES_RANDOM';

const baseConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER || 'localhost',
  password: process.env.DB_PASSWORD ?? '',
  database,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 20000,
};

let poolPromise = null;

/**
 * Returns the shared SQL Server connection pool, creating it on first use.
 */
export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(baseConfig).connect().catch((error) => {
      // Allow a later request to retry the connection.
      poolPromise = null;
      throw error;
    });
  }

  return poolPromise;
}

export async function checkConnection() {
  const pool = await getPool();
  await pool.request().query('SELECT 1 AS OK');
  return true;
}

export async function closePool() {
  if (!poolPromise) return;

  try {
    const pool = await poolPromise;
    await pool.close();
  } catch {
    // Ignore errors while shutting down.
  } finally {
    poolPromise = null;
  }
}

export { sql, baseConfig, database };
