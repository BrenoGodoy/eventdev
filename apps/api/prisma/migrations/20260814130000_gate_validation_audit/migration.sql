ALTER TABLE "GateCheck"
ALTER COLUMN "ticketId" DROP NOT NULL,
ADD COLUMN "codeHash" CHAR(64);

CREATE INDEX "GateCheck_eventId_createdAt_idx"
ON "GateCheck"("eventId", "createdAt");
