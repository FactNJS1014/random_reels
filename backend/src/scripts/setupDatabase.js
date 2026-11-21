import '../config/env.js';
import sql from 'mssql';
import { baseConfig, closePool, database } from '../config/db.js';
import { ensureTables } from '../db/schema.js';

async function main() {
  const masterConfig = { ...baseConfig, database: 'master' };
  const master = await new sql.ConnectionPool(masterConfig).connect();

  try {
    const existing = await master
      .request()
      .input('name', sql.NVarChar(128), database)
      .query('SELECT name FROM sys.databases WHERE name = @name');

    if (existing.recordset.length === 0) {
      if (!/^[A-Za-z0-9_]+$/.test(database)) {
        throw new Error('Database name may only contain letters, numbers and underscores.');
      }
      await master.request().query(`CREATE DATABASE [${database}]`);
      console.log(`Database [${database}] created.`);
    } else {
      console.log(`Database [${database}] already exists.`);
    }
  } finally {
    await master.close();
  }

  await ensureTables();
  console.log('Tables dbo.COMMON_RANDOM and dbo.Member_common are ready.');
  await closePool();
}

main().catch(async (error) => {
  console.error('Database setup failed:', error.message);
  await closePool();
  process.exitCode = 1;
});
