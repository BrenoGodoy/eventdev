-- The original domain seed used placeholder ticket signatures before the
-- checkout signer existed. Keep event and user fixtures, but do not expose
-- unsigned placeholders in the customer wallet.
UPDATE "EventSeat"
SET "status" = 'AVAILABLE', "reservationId" = NULL, "updatedAt" = CURRENT_TIMESTAMP
WHERE "reservationId" = 'res_seed_001';

DELETE FROM "Reservation"
WHERE "id" = 'res_seed_001';
