import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });

process.env.DATABASE_URL ??=
  'postgresql://eventdev:eventdev@localhost:5432/eventdev?schema=public';
process.env.JWT_SECRET ??= 'eventdev-e2e-jwt-secret-local-only';
process.env.TICKET_SIGNING_SECRET ??= 'eventdev-e2e-ticket-secret-local-only';
