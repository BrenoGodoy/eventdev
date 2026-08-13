-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "title" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "category" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" CHAR(2),
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageAlt" TEXT,
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featuredOrder" INTEGER;

-- Backfill the original event before making the catalog fields required.
UPDATE "Event"
SET
  "title" = COALESCE("catalogSnapshot"->>'title', 'Elite Dev Conf 2026'),
  "description" = COALESCE("catalogSnapshot"->>'description', 'Encontro de tecnologia, produto e experiencias digitais.'),
  "category" = 'Conferencia',
  "city" = 'Sao Paulo',
  "state" = 'SP',
  "imageUrl" = '/events/horizonte-conference.png',
  "imageAlt" = 'Auditorio moderno com palco geometrico branco, violeta e verde acido'
WHERE "id" = 'evt_elite_dev_2026';

ALTER TABLE "Event"
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL,
ALTER COLUMN "imageUrl" SET NOT NULL,
ALTER COLUMN "imageAlt" SET NOT NULL;

-- Featured catalog. Every event rendered by the web application is persisted here.
INSERT INTO "Event" (
  "id", "slug", "title", "description", "category", "catalogSnapshot",
  "date", "venue", "city", "state", "imageUrl", "imageAlt", "mode",
  "price", "featured", "featuredOrder", "status", "organizerId",
  "createdAt", "updatedAt"
)
VALUES
  (
    'evt_aurora_live',
    'aurora-live-sessions',
    'Aurora Live Sessions',
    'Uma noite de musica ao vivo com cenografia imersiva e novos artistas.',
    'Show',
    '{"title":"Aurora Live Sessions","description":"Uma noite de musica ao vivo com cenografia imersiva e novos artistas.","currency":"BRL","ticketTypes":[{"name":"Entrada geral","price":129.00}]}'::jsonb,
    '2026-10-22 20:30:00',
    'Arena Leste',
    'Rio de Janeiro',
    'RJ',
    '/events/aurora-live.png',
    'Palco contemporaneo iluminado em violeta e verde durante um show ao vivo',
    'IN_PERSON',
    129.00,
    true,
    1,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_noite_scifi',
    'noite-sci-fi-2049',
    'Noite Sci-Fi 2049',
    'Cinema ao ar livre, trilha especial e experiencias para fas de ficcao cientifica.',
    'Cinema',
    '{"title":"Noite Sci-Fi 2049","description":"Cinema ao ar livre, trilha especial e experiencias para fas de ficcao cientifica.","currency":"BRL","ticketTypes":[{"name":"Entrada geral","price":89.00}]}'::jsonb,
    '2026-10-15 19:00:00',
    'Cine Rooftop Central',
    'Sao Paulo',
    'SP',
    '/events/noite-sci-fi.png',
    'Cinema ao ar livre em um terraco sob o ceu estrelado e luzes verdes',
    'IN_PERSON',
    89.00,
    true,
    2,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_horizonte_conf',
    'horizonte-conference-2026',
    'Horizonte Conference 2026',
    'Conteudo, networking e tecnologia para profissionais que constroem o futuro.',
    'Conferencia',
    '{"title":"Horizonte Conference 2026","description":"Conteudo, networking e tecnologia para profissionais que constroem o futuro.","currency":"BRL","ticketTypes":[{"name":"Passe completo","price":210.00}]}'::jsonb,
    '2026-11-06 09:00:00',
    'Centro de Convencoes Aurora',
    'Curitiba',
    'PR',
    '/events/horizonte-conference.png',
    'Auditorio moderno com palco geometrico branco, violeta e verde acido',
    'IN_PERSON',
    210.00,
    true,
    3,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_cena_aberta',
    'cena-aberta',
    'Cena Aberta',
    'Danca, teatro e performances autorais ocupam o palco em uma noite especial.',
    'Teatro',
    '{"title":"Cena Aberta","description":"Danca, teatro e performances autorais ocupam o palco em uma noite especial.","currency":"BRL","ticketTypes":[{"name":"Plateia","price":72.00}]}'::jsonb,
    '2026-11-08 18:00:00',
    'Teatro Estacao',
    'Belo Horizonte',
    'MG',
    '/events/cena-aberta.png',
    'Dancarina em um palco escuro iluminado por um foco diante de cortinas vermelhas',
    'IN_PERSON',
    72.00,
    true,
    4,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_pulso_urbano',
    'pulso-urbano-festival',
    'Pulso Urbano Festival',
    'Festival ao ar livre com musica, arte urbana e gastronomia independente.',
    'Festival',
    '{"title":"Pulso Urbano Festival","description":"Festival ao ar livre com musica, arte urbana e gastronomia independente.","currency":"BRL","ticketTypes":[{"name":"Primeiro lote","price":159.00}]}'::jsonb,
    '2026-11-14 16:00:00',
    'Parque das Artes',
    'Sao Paulo',
    'SP',
    '/events/pulso-urbano.png',
    'Festival de musica ao ar livre com palco violeta e estruturas verde acido',
    'IN_PERSON',
    159.00,
    true,
    5,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- CreateIndex
CREATE INDEX "Event_status_date_idx" ON "Event"("status", "date");
CREATE INDEX "Event_state_date_idx" ON "Event"("state", "date");
CREATE INDEX "Event_featured_featuredOrder_idx" ON "Event"("featured", "featuredOrder");
