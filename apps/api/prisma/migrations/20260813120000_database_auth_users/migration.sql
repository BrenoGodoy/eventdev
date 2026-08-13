-- Authentication users live in PostgreSQL and keep the stable IDs referenced by domain data.
ALTER TABLE "User" ADD COLUMN "name" TEXT;

UPDATE "User"
SET
  "name" = 'Organizador Elite',
  "email" = 'organizer@elite.dev',
  "passwordHash" = '$2b$12$b93BQhLpFdEkcD2Ti62JL.BIyAals2BuocU1jLQRrn0jFb4k/V.kK',
  "role" = 'ORGANIZER'
WHERE "id" = 'usr_organizer_001';

UPDATE "User"
SET
  "name" = 'Cliente Elite',
  "email" = 'cliente@elite.dev',
  "passwordHash" = '$2b$12$NQxi1XwEJdT6XTAn5z2ZyeoSBoMPIVbVYsIbIXeiwOYC44ZHZkpp6',
  "role" = 'CUSTOMER'
WHERE "id" = 'usr_customer_001';

UPDATE "User"
SET
  "name" = 'Portaria Elite',
  "email" = 'portaria@elite.dev',
  "passwordHash" = '$2b$12$C3UITT8zUAGDKB3xsctgqOJbl1DFCbbPumqDZaFv6HwaSdCD8RWiS',
  "role" = 'GATE'
WHERE "id" = 'usr_gate_001';

UPDATE "User"
SET "name" = split_part("email", '@', 1)
WHERE "name" IS NULL;

ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
