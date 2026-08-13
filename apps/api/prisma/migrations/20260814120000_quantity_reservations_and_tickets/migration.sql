CREATE TYPE "TicketTierType" AS ENUM ('GENERAL', 'PREMIUM');

CREATE TABLE "EventTicketTier" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "TicketTierType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTicketTier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EventTicketTier_capacity_positive" CHECK ("capacity" > 0),
    CONSTRAINT "EventTicketTier_available_quantity_valid"
      CHECK ("availableQuantity" >= 0 AND "availableQuantity" <= "capacity")
);

CREATE TABLE "ReservationItem" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReservationItem_quantity_positive" CHECK ("quantity" > 0)
);

ALTER TABLE "Ticket" ADD COLUMN "tierId" TEXT;

-- Existing and seed events receive an 80/20 split. Their public base price
-- remains the general-admission price; premium starts 60% above it. The
-- FLOOR-based stock split keeps both tiers within capacity even if an older
-- event has very little availability remaining.
INSERT INTO "EventTicketTier" (
  "id", "eventId", "type", "name", "description", "price", "capacity",
  "availableQuantity", "active", "createdAt", "updatedAt"
)
SELECT
  'tier_general_' || "id",
  "id",
  'GENERAL',
  'Pista',
  'Acesso a pista e a toda a programacao principal.',
  "price",
  GREATEST(1, FLOOR("capacity" * 0.8)::INTEGER),
  LEAST(
    GREATEST(1, FLOOR("capacity" * 0.8)::INTEGER),
    "availableQuantity"
  ),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Event";

INSERT INTO "EventTicketTier" (
  "id", "eventId", "type", "name", "description", "price", "capacity",
  "availableQuantity", "active", "createdAt", "updatedAt"
)
SELECT
  'tier_premium_' || "id",
  "id",
  'PREMIUM',
  'Pista Premium',
  'Area exclusiva mais proxima do palco, com entrada dedicada.',
  ROUND("price" * 1.6, 2),
  GREATEST(1, "capacity" - GREATEST(1, FLOOR("capacity" * 0.8)::INTEGER)),
  GREATEST(
    0,
    "availableQuantity" - LEAST(
      GREATEST(1, FLOOR("capacity" * 0.8)::INTEGER),
      "availableQuantity"
    )
  ),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Event";

CREATE UNIQUE INDEX "EventTicketTier_eventId_type_key"
ON "EventTicketTier"("eventId", "type");
CREATE INDEX "EventTicketTier_eventId_active_idx"
ON "EventTicketTier"("eventId", "active");
CREATE UNIQUE INDEX "ReservationItem_reservationId_tierId_key"
ON "ReservationItem"("reservationId", "tierId");
CREATE INDEX "ReservationItem_tierId_idx" ON "ReservationItem"("tierId");
CREATE INDEX "Ticket_tierId_idx" ON "Ticket"("tierId");

ALTER TABLE "EventTicketTier"
ADD CONSTRAINT "EventTicketTier_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReservationItem"
ADD CONSTRAINT "ReservationItem_reservationId_fkey"
FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReservationItem"
ADD CONSTRAINT "ReservationItem_tierId_fkey"
FOREIGN KEY ("tierId") REFERENCES "EventTicketTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_tierId_fkey"
FOREIGN KEY ("tierId") REFERENCES "EventTicketTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
