import './config/env.js';
import app from './app.js';
import { closePool, database } from './config/db.js';
import { ensureTables } from './db/schema.js';

const requestedPort = Number(process.env.PORT);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536 ? requestedPort : 8080;

const server = app.listen(port, async () => {
  console.log(`AOTH GAMES RANDOM API on http://localhost:${port}`);
  console.log(`Database target: ${database} @ ${process.env.DB_SERVER || 'localhost'}:${process.env.DB_PORT || 1433}`);

  try {
    await ensureTables();
    console.log('SQL Server connected, tables verified.');
  } catch (error) {
    console.warn('SQL Server not ready yet:', error.message);
    console.warn('Run "npm run db:setup" after the database is reachable.');
  }
});

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
