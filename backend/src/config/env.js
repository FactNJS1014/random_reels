import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Load backend/.env no matter which directory the process was started from.
// override: true so a stray empty PORT/DB_* in the host shell cannot win over
// the project's local configuration.
dotenv.config({ path: path.join(backendRoot, '.env'), override: true });
