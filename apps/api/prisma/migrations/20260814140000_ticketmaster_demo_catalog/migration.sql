-- Replace only the legacy fixtures. User-created events and their operational
-- data must survive this catalog migration.
-- Attraction metadata was captured from the Ticketmaster Discovery API.
-- EventDev owns the demo dates, venues, prices and inventory.
DELETE FROM "GateCheck"
WHERE "eventId" IN (
  'evt_elite_dev_2026', 'evt_aurora_live', 'evt_noite_scifi',
  'evt_horizonte_conf', 'evt_cena_aberta', 'evt_pulso_urbano'
);
DELETE FROM "ShareToken"
WHERE "ticketId" IN (
  SELECT "id" FROM "Ticket" WHERE "eventId" IN (
    'evt_elite_dev_2026', 'evt_aurora_live', 'evt_noite_scifi',
    'evt_horizonte_conf', 'evt_cena_aberta', 'evt_pulso_urbano'
  )
);
DELETE FROM "Ticket"
WHERE "eventId" IN (
  'evt_elite_dev_2026', 'evt_aurora_live', 'evt_noite_scifi',
  'evt_horizonte_conf', 'evt_cena_aberta', 'evt_pulso_urbano'
);
DELETE FROM "ReservationItem"
WHERE "reservationId" IN (
  SELECT "id" FROM "Reservation" WHERE "eventId" IN (
    'evt_elite_dev_2026', 'evt_aurora_live', 'evt_noite_scifi',
    'evt_horizonte_conf', 'evt_cena_aberta', 'evt_pulso_urbano'
  )
);
DELETE FROM "Reservation"
WHERE "eventId" IN (
  'evt_elite_dev_2026', 'evt_aurora_live', 'evt_noite_scifi',
  'evt_horizonte_conf', 'evt_cena_aberta', 'evt_pulso_urbano'
);
DELETE FROM "EventSeat"
WHERE "eventId" IN (
  'evt_elite_dev_2026', 'evt_aurora_live', 'evt_noite_scifi',
  'evt_horizonte_conf', 'evt_cena_aberta', 'evt_pulso_urbano'
);
DELETE FROM "EventTicketTier"
WHERE "eventId" IN (
  'evt_elite_dev_2026', 'evt_aurora_live', 'evt_noite_scifi',
  'evt_horizonte_conf', 'evt_cena_aberta', 'evt_pulso_urbano'
);
DELETE FROM "Event"
WHERE "id" IN (
  'evt_elite_dev_2026', 'evt_aurora_live', 'evt_noite_scifi',
  'evt_horizonte_conf', 'evt_cena_aberta', 'evt_pulso_urbano'
);

INSERT INTO "User" (
  "id", "name", "email", "passwordHash", "role", "createdAt", "updatedAt"
)
VALUES (
  'usr_customer_002',
  'Cliente Convidado',
  'cliente2@elite.dev',
  '$2b$12$6JnbMrshLYVJAolN0xovBOQbTy/GE3eo8klfXQj038uee1G9QZefK',
  'CUSTOMER',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET
  "name" = EXCLUDED."name",
  "passwordHash" = EXCLUDED."passwordHash",
  "role" = EXCLUDED."role",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Event" (
  "id", "slug", "title", "description", "category", "catalogSnapshot",
  "date", "venue", "city", "state", "imageUrl", "imageAlt",
  "catalogProvider", "catalogExternalId", "mode", "price", "capacity",
  "availableQuantity", "featured", "featuredOrder", "status", "organizerId",
  "createdAt", "updatedAt"
)
VALUES
  (
    'evt_tm_coldplay',
    'coldplay-a-sky-full-of-stars',
    'Coldplay - A Sky Full of Stars',
    $markdown$
## Uma noite de luz, cor e grandes canções

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Coldplay** consultada na Ticketmaster Discovery API.

### O que esperar

- Produção audiovisual de grande formato
- Pista e Pista Premium
- Entrada digital validada pela portaria EventDev

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$,
    'Rock',
    $json${"provider":"TICKETMASTER","source":"TICKETMASTER_DISCOVERY_API","importedAt":"2026-08-13T18:00:00.000Z","attraction":{"externalId":"K8vZ9171izV","name":"Coldplay","imageUrl":"https://s1.ticketm.net/dam/a/35d/83661bca-e5e4-44ea-86ac-1a27ebfaa35d_SOURCE","imageAlt":"Imagem oficial de Coldplay no catálogo Ticketmaster","category":"Rock","genre":"Rock","subGenre":"Alternative Rock","sourceUrl":"https://www.ticketmaster.com/coldplay-tickets/artist/806431","locale":"en-us","upcomingEvents":0}}$json$::jsonb,
    '2026-10-03 21:00:00',
    'Allianz Parque',
    'São Paulo',
    'SP',
    'https://s1.ticketm.net/dam/a/35d/83661bca-e5e4-44ea-86ac-1a27ebfaa35d_SOURCE',
    'Imagem oficial de Coldplay no catálogo Ticketmaster',
    'TICKETMASTER',
    'K8vZ9171izV',
    'IN_PERSON',
    249.90,
    3000,
    3000,
    true,
    1,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_tm_harry_styles',
    'harry-styles-love-on-tour',
    'Harry Styles - Love On Tour',
    $markdown$
## Pop, estilo e uma plateia inteira cantando junto

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Harry Styles** consultada na Ticketmaster Discovery API.

### Nesta noite

- Repertório pop em um palco imersivo
- Pista e Pista Premium
- Ingressos digitais com QR assinado

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$,
    'Pop',
    $json${"provider":"TICKETMASTER","source":"TICKETMASTER_DISCOVERY_API","importedAt":"2026-08-13T18:00:00.000Z","attraction":{"externalId":"K8vZ9174XZ0","name":"Harry Styles","imageUrl":"https://s1.ticketm.net/dam/a/99c/b7fb39e7-bc22-4f95-9d25-e57fcd83999c_SOURCE","imageAlt":"Imagem oficial de Harry Styles no catálogo Ticketmaster","category":"Pop","genre":"Pop","subGenre":"Pop Rock","sourceUrl":"https://www.ticketmaster.com/harry-styles-tickets/artist/2366444","locale":"en-us","upcomingEvents":36}}$json$::jsonb,
    '2026-10-17 20:30:00',
    'Farmasi Arena',
    'Rio de Janeiro',
    'RJ',
    'https://s1.ticketm.net/dam/a/99c/b7fb39e7-bc22-4f95-9d25-e57fcd83999c_SOURCE',
    'Imagem oficial de Harry Styles no catálogo Ticketmaster',
    'TICKETMASTER',
    'K8vZ9174XZ0',
    'IN_PERSON',
    219.90,
    2200,
    2200,
    true,
    2,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_tm_guns_n_roses',
    'guns-n-roses-live-in-brazil',
    'Guns N'' Roses - Live in Brazil',
    $markdown$
## Guitarras altas e clássicos de arena

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Guns N' Roses** consultada na Ticketmaster Discovery API.

### Prepare-se para

- Uma noite dedicada ao hard rock
- Dois setores por quantidade
- Acesso controlado por ingresso digital

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$,
    'Rock',
    $json${"provider":"TICKETMASTER","source":"TICKETMASTER_DISCOVERY_API","importedAt":"2026-08-13T18:00:00.000Z","attraction":{"externalId":"K8vZ9171C80","name":"Guns N' Roses","imageUrl":"https://s1.ticketm.net/dam/a/ff0/bfc0ce5a-c7ad-4584-a30e-795584aeeff0_SOURCE","imageAlt":"Imagem oficial de Guns N' Roses no catálogo Ticketmaster","category":"Rock","genre":"Rock","subGenre":"Pop","sourceUrl":"https://www.ticketmaster.com/guns-n-roses-tickets/artist/735218","locale":"en-us","upcomingEvents":20}}$json$::jsonb,
    '2026-11-07 21:00:00',
    'Arena do Grêmio',
    'Porto Alegre',
    'RS',
    'https://s1.ticketm.net/dam/a/ff0/bfc0ce5a-c7ad-4584-a30e-795584aeeff0_SOURCE',
    'Imagem oficial de Guns N Roses no catálogo Ticketmaster',
    'TICKETMASTER',
    'K8vZ9171C80',
    'IN_PERSON',
    289.90,
    3500,
    3500,
    true,
    3,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_tm_the_mission',
    'the-mission-deja-vu-tour',
    'The Mission - Deja Vu Tour',
    $markdown$
## Atmosfera pos-punk em uma noite especial

Uma experiência demonstrativa criada pelo EventDev a partir da atração **The Mission** consultada na Ticketmaster Discovery API.

### A experiência

- Rock alternativo em formato intimista
- Pista e área Premium
- Compra e entrada inteiramente digitais

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$,
    'Rock',
    $json${"provider":"TICKETMASTER","source":"TICKETMASTER_DISCOVERY_API","importedAt":"2026-08-13T18:00:00.000Z","attraction":{"externalId":"K8vZ917f3if","name":"The Mission","imageUrl":"https://s1.ticketm.net/dam/c/fbc/b293c0ad-c904-4215-bc59-8d7f2414dfbc_106141_TABLET_LANDSCAPE_LARGE_16_9.jpg","imageAlt":"Imagem oficial de The Mission no catálogo Ticketmaster","category":"Rock","genre":"Rock","subGenre":"Pop","sourceUrl":"https://www.ticketmaster.com/the-mission-tickets/artist/2204391","locale":"en-us","upcomingEvents":5}}$json$::jsonb,
    '2026-11-21 20:00:00',
    'Ópera de Arame',
    'Curitiba',
    'PR',
    'https://s1.ticketm.net/dam/c/fbc/b293c0ad-c904-4215-bc59-8d7f2414dfbc_106141_TABLET_LANDSCAPE_LARGE_16_9.jpg',
    'Imagem oficial de The Mission no catálogo Ticketmaster',
    'TICKETMASTER',
    'K8vZ917f3if',
    'IN_PERSON',
    159.90,
    1200,
    1200,
    true,
    4,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_tm_pink_floyd',
    'pink-floyd-echoes-experience',
    'Pink Floyd - Echoes Experience',
    $markdown$
## Uma viagem audiovisual pelo universo de Pink Floyd

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Pink Floyd** consultada na Ticketmaster Discovery API.

### No palco

- Clássicos do rock progressivo
- Projeções e iluminação imersiva
- Pista e Pista Premium

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$,
    'Rock',
    $json${"provider":"TICKETMASTER","source":"TICKETMASTER_DISCOVERY_API","importedAt":"2026-08-13T18:00:00.000Z","attraction":{"externalId":"K8vZ91712jV","name":"Pink Floyd","imageUrl":"https://s1.ticketm.net/dam/c/fbc/b293c0ad-c904-4215-bc59-8d7f2414dfbc_106141_TABLET_LANDSCAPE_LARGE_16_9.jpg","imageAlt":"Imagem oficial de Pink Floyd no catálogo Ticketmaster","category":"Rock","genre":"Rock","subGenre":"Pop","sourceUrl":"https://www.ticketmaster.com/pink-floyd-tickets/artist/768805","locale":"en-us","upcomingEvents":0}}$json$::jsonb,
    '2026-12-05 20:30:00',
    'Mineirão',
    'Belo Horizonte',
    'MG',
    'https://s1.ticketm.net/dam/c/fbc/b293c0ad-c904-4215-bc59-8d7f2414dfbc_106141_TABLET_LANDSCAPE_LARGE_16_9.jpg',
    'Imagem oficial de Pink Floyd no catálogo Ticketmaster',
    'TICKETMASTER',
    'K8vZ91712jV',
    'IN_PERSON',
    199.90,
    2800,
    2800,
    true,
    5,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'evt_tm_fleetwood_mac',
    'fleetwood-mac-dreams-live',
    'Fleetwood Mac - Dreams Live',
    $markdown$
## Harmonias e canções que atravessam gerações

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Fleetwood Mac** consultada na Ticketmaster Discovery API.

### Nesta edição

- Repertório dedicado aos grandes clássicos
- Dois setores com estoque independente
- QR assinado para entrada no evento

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$,
    'Rock',
    $json${"provider":"TICKETMASTER","source":"TICKETMASTER_DISCOVERY_API","importedAt":"2026-08-13T18:00:00.000Z","attraction":{"externalId":"K8vZ9171Ki7","name":"Fleetwood Mac","imageUrl":"https://s1.ticketm.net/dam/a/03e/154a8956-41a7-4508-a320-95f43764a03e_SOURCE","imageAlt":"Imagem oficial de Fleetwood Mac no catálogo Ticketmaster","category":"Rock","genre":"Rock","subGenre":"Pop","sourceUrl":"https://www.ticketmaster.com/fleetwood-mac-tickets/artist/735087","locale":"en-us","upcomingEvents":0}}$json$::jsonb,
    '2026-12-19 21:00:00',
    'Arena Fonte Nova',
    'Salvador',
    'BA',
    'https://s1.ticketm.net/dam/a/03e/154a8956-41a7-4508-a320-95f43764a03e_SOURCE',
    'Imagem oficial de Fleetwood Mac no catálogo Ticketmaster',
    'TICKETMASTER',
    'K8vZ9171Ki7',
    'IN_PERSON',
    229.90,
    2500,
    2500,
    true,
    6,
    'PUBLISHED',
    'usr_organizer_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

INSERT INTO "EventTicketTier" (
  "id", "eventId", "type", "name", "description", "price", "capacity",
  "availableQuantity", "active", "createdAt", "updatedAt"
)
VALUES
  ('tier_tm_coldplay_general', 'evt_tm_coldplay', 'GENERAL', 'Pista', 'Acesso à pista e a toda a programação principal.', 249.90, 2400, 2400, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_coldplay_premium', 'evt_tm_coldplay', 'PREMIUM', 'Pista Premium', 'Área exclusiva mais próxima do palco, com entrada dedicada.', 399.84, 600, 600, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_harry_general', 'evt_tm_harry_styles', 'GENERAL', 'Pista', 'Acesso à pista e a toda a programação principal.', 219.90, 1760, 1760, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_harry_premium', 'evt_tm_harry_styles', 'PREMIUM', 'Pista Premium', 'Área exclusiva mais próxima do palco, com entrada dedicada.', 351.84, 440, 440, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_guns_general', 'evt_tm_guns_n_roses', 'GENERAL', 'Pista', 'Acesso à pista e a toda a programação principal.', 289.90, 2800, 2800, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_guns_premium', 'evt_tm_guns_n_roses', 'PREMIUM', 'Pista Premium', 'Área exclusiva mais próxima do palco, com entrada dedicada.', 463.84, 700, 700, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_mission_general', 'evt_tm_the_mission', 'GENERAL', 'Pista', 'Acesso à pista e a toda a programação principal.', 159.90, 960, 960, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_mission_premium', 'evt_tm_the_mission', 'PREMIUM', 'Pista Premium', 'Área exclusiva mais próxima do palco, com entrada dedicada.', 255.84, 240, 240, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_floyd_general', 'evt_tm_pink_floyd', 'GENERAL', 'Pista', 'Acesso à pista e a toda a programação principal.', 199.90, 2240, 2240, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_floyd_premium', 'evt_tm_pink_floyd', 'PREMIUM', 'Pista Premium', 'Área exclusiva mais próxima do palco, com entrada dedicada.', 319.84, 560, 560, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_fleetwood_general', 'evt_tm_fleetwood_mac', 'GENERAL', 'Pista', 'Acesso à pista e a toda a programação principal.', 229.90, 2000, 2000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tier_tm_fleetwood_premium', 'evt_tm_fleetwood_mac', 'PREMIUM', 'Pista Premium', 'Área exclusiva mais próxima do palco, com entrada dedicada.', 367.84, 500, 500, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
