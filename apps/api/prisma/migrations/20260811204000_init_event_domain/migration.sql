-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ORGANIZER', 'CUSTOMER', 'GATE');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELED', 'FINISHED');

-- CreateEnum
CREATE TYPE "EventSeatStatus" AS ENUM ('AVAILABLE', 'HELD', 'RESERVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "GateCheckResult" AS ENUM ('ALLOWED', 'DENIED', 'DUPLICATE', 'INVALID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "catalogSnapshot" JSONB NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "mode" "EventMode" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSeat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "EventSeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "holdExpiresAt" TIMESTAMP(3),
    "reservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "seatId" TEXT,
    "publicCode" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GateCheck" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "gateUserId" TEXT NOT NULL,
    "result" "GateCheckResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareToken" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_organizerId_idx" ON "Event"("organizerId");

-- CreateIndex
CREATE INDEX "EventSeat_reservationId_idx" ON "EventSeat"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSeat_eventId_row_number_key" ON "EventSeat"("eventId", "row", "number");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_eventId_idx" ON "Reservation"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_seatId_key" ON "Ticket"("seatId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_publicCode_key" ON "Ticket"("publicCode");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_nonce_key" ON "Ticket"("nonce");

-- CreateIndex
CREATE INDEX "Ticket_reservationId_idx" ON "Ticket"("reservationId");

-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "Ticket"("eventId");

-- CreateIndex
CREATE INDEX "GateCheck_ticketId_idx" ON "GateCheck"("ticketId");

-- CreateIndex
CREATE INDEX "GateCheck_eventId_idx" ON "GateCheck"("eventId");

-- CreateIndex
CREATE INDEX "GateCheck_gateUserId_idx" ON "GateCheck"("gateUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareToken_tokenHash_key" ON "ShareToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareToken_ticketId_idx" ON "ShareToken"("ticketId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeat" ADD CONSTRAINT "EventSeat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeat" ADD CONSTRAINT "EventSeat_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "EventSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateCheck" ADD CONSTRAINT "GateCheck_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateCheck" ADD CONSTRAINT "GateCheck_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateCheck" ADD CONSTRAINT "GateCheck_gateUserId_fkey" FOREIGN KEY ("gateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SeedData
INSERT INTO "User" ("id", "email", "passwordHash", "role", "createdAt", "updatedAt")
VALUES
  ('usr_organizer_001', 'organizer@elite.dev', '$2b$10$eventdev.organizer.hash', 'ORGANIZER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usr_customer_001', 'cliente1@elite.dev', '$2b$10$eventdev.customer.hash', 'CUSTOMER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usr_gate_001', 'portaria@elite.dev', '$2b$10$eventdev.gate.hash', 'GATE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Event" ("id", "slug", "catalogSnapshot", "date", "venue", "mode", "price", "status", "organizerId", "createdAt", "updatedAt")
VALUES (
  'evt_elite_dev_2026',
  'elite-dev-conf-2026',
  '{"title":"Elite Dev Conf 2026","description":"Evento seed para validar catalogo, compra, ingresso e portaria.","currency":"BRL","ticketTypes":[{"name":"Entrada geral","price":129.90}]}'::jsonb,
  '2026-10-15 19:00:00',
  'Centro de Convencoes EventDev',
  'IN_PERSON',
  129.90,
  'PUBLISHED',
  'usr_organizer_001',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "Reservation" ("id", "userId", "eventId", "status", "expiresAt", "quantity", "total", "paymentStatus", "createdAt", "updatedAt")
VALUES (
  'res_seed_001',
  'usr_customer_001',
  'evt_elite_dev_2026',
  'CONFIRMED',
  NULL,
  2,
  259.80,
  'PAID',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "EventSeat" ("id", "eventId", "row", "number", "status", "holdExpiresAt", "reservationId", "createdAt", "updatedAt")
VALUES
  ('seat_a_001', 'evt_elite_dev_2026', 'A', 1, 'RESERVED', NULL, 'res_seed_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seat_a_002', 'evt_elite_dev_2026', 'A', 2, 'RESERVED', NULL, 'res_seed_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seat_a_003', 'evt_elite_dev_2026', 'A', 3, 'AVAILABLE', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Ticket" ("id", "reservationId", "eventId", "seatId", "publicCode", "signature", "nonce", "usedAt", "status", "createdAt", "updatedAt")
VALUES
  ('tck_seed_001', 'res_seed_001', 'evt_elite_dev_2026', 'seat_a_001', 'EVT-2026-A001', 'seed-signature-001', 'seed-nonce-001', NULL, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tck_seed_002', 'res_seed_001', 'evt_elite_dev_2026', 'seat_a_002', 'EVT-2026-A002', 'seed-signature-002', 'seed-nonce-002', CURRENT_TIMESTAMP, 'USED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "ShareToken" ("id", "ticketId", "tokenHash", "revokedAt", "expiresAt", "createdAt")
VALUES
  ('shr_seed_001', 'tck_seed_001', 'sha256:seed-token-active', NULL, '2026-10-15 23:59:59', CURRENT_TIMESTAMP),
  ('shr_seed_002', 'tck_seed_002', 'sha256:seed-token-revoked', CURRENT_TIMESTAMP, '2026-10-15 23:59:59', CURRENT_TIMESTAMP);

INSERT INTO "GateCheck" ("id", "ticketId", "eventId", "gateUserId", "result", "createdAt")
VALUES
  ('gate_seed_001', 'tck_seed_002', 'evt_elite_dev_2026', 'usr_gate_001', 'ALLOWED', CURRENT_TIMESTAMP);
