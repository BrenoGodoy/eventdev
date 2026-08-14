-- Normalize Portuguese copy in the six demonstration events without touching
-- user-created records or operational data.
UPDATE "Event"
SET
  "city" = 'São Paulo',
  "imageAlt" = 'Imagem oficial de Coldplay no catálogo Ticketmaster'
WHERE "id" = 'evt_tm_coldplay';

UPDATE "Event"
SET "imageAlt" = 'Imagem oficial de Harry Styles no catálogo Ticketmaster'
WHERE "id" = 'evt_tm_harry_styles';

UPDATE "Event"
SET
  "venue" = 'Arena do Grêmio',
  "imageAlt" = 'Imagem oficial de Guns N Roses no catálogo Ticketmaster'
WHERE "id" = 'evt_tm_guns_n_roses';

UPDATE "Event"
SET
  "venue" = 'Ópera de Arame',
  "imageAlt" = 'Imagem oficial de The Mission no catálogo Ticketmaster'
WHERE "id" = 'evt_tm_the_mission';

UPDATE "Event"
SET
  "venue" = 'Mineirão',
  "imageAlt" = 'Imagem oficial de Pink Floyd no catálogo Ticketmaster'
WHERE "id" = 'evt_tm_pink_floyd';

UPDATE "Event"
SET "imageAlt" = 'Imagem oficial de Fleetwood Mac no catálogo Ticketmaster'
WHERE "id" = 'evt_tm_fleetwood_mac';

UPDATE "Event"
SET "catalogSnapshot" = jsonb_set(
  "catalogSnapshot",
  '{attraction,imageAlt}',
  to_jsonb("imageAlt"),
  false
)
WHERE "id" IN (
  'evt_tm_coldplay',
  'evt_tm_harry_styles',
  'evt_tm_guns_n_roses',
  'evt_tm_the_mission',
  'evt_tm_pink_floyd',
  'evt_tm_fleetwood_mac'
);

UPDATE "Event"
SET "description" = CASE "id"
  WHEN 'evt_tm_coldplay' THEN $markdown$
## Uma noite de luz, cor e grandes canções

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Coldplay** consultada na Ticketmaster Discovery API.

### O que esperar

- Produção audiovisual de grande formato
- Pista e Pista Premium
- Entrada digital validada pela portaria EventDev

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$
  WHEN 'evt_tm_harry_styles' THEN $markdown$
## Pop, estilo e uma plateia inteira cantando junto

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Harry Styles** consultada na Ticketmaster Discovery API.

### Nesta noite

- Repertório pop em um palco imersivo
- Pista e Pista Premium
- Ingressos digitais com QR assinado

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$
  WHEN 'evt_tm_guns_n_roses' THEN $markdown$
## Guitarras altas e clássicos de arena

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Guns N' Roses** consultada na Ticketmaster Discovery API.

### Prepare-se para

- Uma noite dedicada ao hard rock
- Dois setores por quantidade
- Acesso controlado por ingresso digital

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$
  WHEN 'evt_tm_the_mission' THEN $markdown$
## Atmosfera pós-punk em uma noite especial

Uma experiência demonstrativa criada pelo EventDev a partir da atração **The Mission** consultada na Ticketmaster Discovery API.

### A experiência

- Rock alternativo em formato intimista
- Pista e área Premium
- Compra e entrada inteiramente digitais

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$
  WHEN 'evt_tm_pink_floyd' THEN $markdown$
## Uma viagem audiovisual pelo universo de Pink Floyd

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Pink Floyd** consultada na Ticketmaster Discovery API.

### No palco

- Clássicos do rock progressivo
- Projeções e iluminação imersiva
- Pista e Pista Premium

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$
  WHEN 'evt_tm_fleetwood_mac' THEN $markdown$
## Harmonias e canções que atravessam gerações

Uma experiência demonstrativa criada pelo EventDev a partir da atração **Fleetwood Mac** consultada na Ticketmaster Discovery API.

### Nesta edição

- Repertório dedicado aos grandes clássicos
- Dois setores com estoque independente
- QR assinado para entrada no evento

Data, local, preço e disponibilidade pertencem exclusivamente a este evento de demonstração do EventDev.
$markdown$
  ELSE "description"
END
WHERE "id" IN (
  'evt_tm_coldplay',
  'evt_tm_harry_styles',
  'evt_tm_guns_n_roses',
  'evt_tm_the_mission',
  'evt_tm_pink_floyd',
  'evt_tm_fleetwood_mac'
);

UPDATE "EventTicketTier"
SET "description" = CASE "type"
  WHEN 'GENERAL' THEN 'Acesso à pista e a toda a programação principal.'
  WHEN 'PREMIUM' THEN 'Área exclusiva mais próxima do palco, com entrada dedicada.'
  ELSE "description"
END
WHERE "eventId" IN (
  'evt_tm_coldplay',
  'evt_tm_harry_styles',
  'evt_tm_guns_n_roses',
  'evt_tm_the_mission',
  'evt_tm_pink_floyd',
  'evt_tm_fleetwood_mac'
);
