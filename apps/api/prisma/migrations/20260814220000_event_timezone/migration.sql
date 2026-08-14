-- Existing Event dates were authored as local Brazilian wall-clock values.
-- Persist them as absolute instants using the product's official time zone.
ALTER TABLE "Event"
ALTER COLUMN "date" TYPE TIMESTAMPTZ(3)
USING "date" AT TIME ZONE 'America/Sao_Paulo';
