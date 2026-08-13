-- External catalog references remain editorial metadata. EventDev owns the
-- published event date, venue, price and inventory.
CREATE TYPE "CatalogProvider" AS ENUM ('TICKETMASTER');

ALTER TABLE "Event"
ADD COLUMN "catalogProvider" "CatalogProvider",
ADD COLUMN "catalogExternalId" TEXT,
ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN "availableQuantity" INTEGER NOT NULL DEFAULT 500;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_capacity_positive" CHECK ("capacity" > 0),
ADD CONSTRAINT "Event_available_quantity_valid"
CHECK ("availableQuantity" >= 0 AND "availableQuantity" <= "capacity");

CREATE INDEX "Event_catalogProvider_catalogExternalId_idx"
ON "Event"("catalogProvider", "catalogExternalId");
