-- Track the current owner independently from the original reservation so a
-- single ticket from a multi-ticket purchase can be transferred safely.
ALTER TABLE "Ticket" ADD COLUMN "ownerId" TEXT;

UPDATE "Ticket" AS ticket
SET "ownerId" = reservation."userId"
FROM "Reservation" AS reservation
WHERE ticket."reservationId" = reservation."id";

ALTER TABLE "Ticket" ALTER COLUMN "ownerId" SET NOT NULL;

-- Keep an audit trail for token creation and consumption.
ALTER TABLE "ShareToken"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "acceptedById" TEXT,
ADD COLUMN "consumedAt" TIMESTAMP(3);

UPDATE "ShareToken" AS share
SET "createdById" = ticket."ownerId"
FROM "Ticket" AS ticket
WHERE share."ticketId" = ticket."id";

UPDATE "ShareToken"
SET "expiresAt" = "createdAt" + INTERVAL '30 minutes'
WHERE "expiresAt" IS NULL;

ALTER TABLE "ShareToken" ALTER COLUMN "createdById" SET NOT NULL;
ALTER TABLE "ShareToken" ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");
CREATE INDEX "ShareToken_createdById_idx" ON "ShareToken"("createdById");
CREATE INDEX "ShareToken_acceptedById_idx" ON "ShareToken"("acceptedById");
CREATE INDEX "ShareToken_expiresAt_idx" ON "ShareToken"("expiresAt");

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShareToken"
ADD CONSTRAINT "ShareToken_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShareToken"
ADD CONSTRAINT "ShareToken_acceptedById_fkey"
FOREIGN KEY ("acceptedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
