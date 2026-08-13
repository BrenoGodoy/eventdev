CREATE INDEX "Reservation_status_expiresAt_idx"
ON "Reservation"("status", "expiresAt");

ALTER TABLE "EventTicketTier"
ADD CONSTRAINT "EventTicketTier_price_non_negative" CHECK ("price" >= 0);

ALTER TABLE "ReservationItem"
ADD CONSTRAINT "ReservationItem_values_non_negative"
CHECK ("unitPrice" >= 0 AND "subtotal" >= 0);

ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_quantity_positive" CHECK ("quantity" > 0),
ADD CONSTRAINT "Reservation_total_non_negative" CHECK ("total" >= 0);
