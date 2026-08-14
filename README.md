# EventDev Tickets

Plataforma de catálogo, venda, compartilhamento e validação de ingressos criada
para o Desafio Elite Dev 2026. O monorepo reúne uma aplicação Next.js, uma API
NestJS e PostgreSQL com Prisma.

## Execução rápida com Docker

Requisitos: Docker Desktop com Compose v2. A chave da Ticketmaster é opcional;
sem ela, o fluxo de criação usa um catálogo local identificado na interface.

```bash
cp .env.example .env
npm run docker:dev
```

| Serviço | URL |
| --- | --- |
| Web | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:3001/api](http://localhost:3001/api) |
| PostgreSQL | `localhost:5432` |

Para encerrar os contêineres sem apagar o banco, use `npm run docker:down`.
Para recriar os dados de demonstração, execute `docker compose down -v` e depois
`npm run docker:dev`. O primeiro comando é destrutivo e remove o volume local.

## Credenciais de demonstração

As contas são persistidas no PostgreSQL e as senhas ficam como hashes bcrypt.

| Nome | Papel | E-mail | Senha |
| --- | --- | --- | --- |
| Organizador Elite | Organizador | `organizer@elite.dev` | `Organizer123!` |
| Cliente Elite | Cliente | `cliente@elite.dev` | `Cliente123!` |
| Cliente Convidado | Cliente | `cliente2@elite.dev` | `Cliente2123!` |
| Portaria Elite | Portaria | `portaria@elite.dev` | `Portaria123!` |

Novos cadastros feitos pela tela de registro recebem sempre o papel Cliente.

## Configuração

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | API fora do Docker | Conexão PostgreSQL do Prisma |
| `JWT_SECRET` | Produção | Assinatura das sessões; mínimo de 32 caracteres |
| `TICKET_SIGNING_SECRET` | Produção | Assinatura independente dos QRs; mínimo de 32 caracteres |
| `TICKETMASTER_API_KEY` | Não | Consumer Key da Discovery API |
| `RESERVATION_HOLD_MINUTES` | Não | Duração da reserva; padrão de 10 minutos |
| `CORS_ORIGINS` | Produção | Origens web permitidas, separadas por vírgula |
| `NEXT_PUBLIC_API_URL` | Web publicada | URL pública da API com `/api` |

A API carrega `apps/api/.env` na execução local. Em produção, ela falha cedo se
os segredos estiverem ausentes, fracos ou forem iguais. Use
`apps/api/.env.example` e `apps/web/.env.local.example` como referência.

## Deploy da API na Vercel

A API possui uma Function Node explícita em `apps/api/api`, que inicializa o
NestJS uma vez por instância. Crie um projeto separado para a API, apontando
para o mesmo repositório, com estas configurações:

- **Production Branch:** `main`
- **Root Directory:** `apps/api`
- **Framework Preset:** Other
- **Build Command, Install Command e Output Directory:** padrões da Vercel
- **Include source files outside of the Root Directory:** habilitado

Configure as variáveis de ambiente do projeto da API:

```text
NODE_ENV=production
DATABASE_URL=<conexao-pooler-do-neon>
JWT_SECRET=<segredo-aleatorio-com-32-ou-mais-caracteres>
TICKET_SIGNING_SECRET=<outro-segredo-com-32-ou-mais-caracteres>
TICKETMASTER_API_KEY=<consumer-key>
RESERVATION_HOLD_MINUTES=10
CORS_ORIGINS=https://<dominio-da-web>
```

Não configure `PORT`: a Function não abre uma porta própria. As migrations
devem ser aplicadas de forma controlada com `npm run db:migrate`, e não durante
cada build. Após o primeiro deploy, teste `https://<api>/api` e configure na
Web `NEXT_PUBLIC_API_URL=https://<api>/api`, fazendo um novo deploy do frontend.

## Execução sem Docker

Requisitos: Node.js 22+, npm 10+ e PostgreSQL 16+.

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:migrate
npm run dev:api
```

Em outro terminal:

```bash
cp apps/web/.env.local.example apps/web/.env.local
npm run dev:web
```

## Qualidade

```bash
npm run lint
npm run test
npm run build
```

Os testes E2E usam PostgreSQL e os dados semeados. Com o Docker ativo:

```bash
docker compose exec api npm run test:e2e --workspace=api -- --runInBand --no-watchman
```

## Arquitetura

```text
eventdev/
├── apps/
│   ├── api/                 # NestJS, Prisma e regras de negócio
│   │   ├── prisma/          # schema e migrations versionadas
│   │   └── src/             # auth, catálogo, eventos, checkout e portaria
│   └── web/                 # Next.js App Router e CSS Modules
│       └── src/
│           ├── app/         # rotas e fluxos
│           ├── components/  # componentes compartilhados
│           └── lib/         # contratos e clientes HTTP
├── docker-compose.yml
└── package.json             # scripts do monorepo
```

Decisões centrais:

- Guards globais autenticam o JWT e autorizam por papel.
- O PostgreSQL é a fonte de verdade de todos os eventos publicados.
- A Ticketmaster fornece somente dados editoriais de atrações.
- Reservas e validações usam atualizações condicionais e transações para evitar
  overselling e dupla entrada.
- Transferências rotacionam código, nonce e assinatura do ingresso.
- Datas são persistidas como `TIMESTAMPTZ` e apresentadas em
  `America/Sao_Paulo`.

## Fluxos implementados

### Organizador

O organizador pesquisa uma atração na Ticketmaster, completa os dados do
EventDev e publica um evento no PostgreSQL. Em Meus eventos, pode abrir a página
pública, editar os dados ou cancelar o evento.

O cancelamento é definitivo: remove o evento do catálogo e da portaria, encerra
reservas abertas, cancela ingressos ativos, revoga links de transferência e
marca pagamentos aprovados como reembolsados no simulador.

- `/organizador/eventos`
- `/organizador/eventos/novo`
- `/organizador/eventos/:eventId/editar`

### Catálogo e checkout

O catálogo oferece busca livre e filtros por UF, data e preço. Eventos passados,
cancelados ou não publicados não aparecem para clientes. Cada evento possui os
lotes Pista e Pista Premium.

A reserva bloqueia estoque por dez minutos. O pagamento simulado aceita os
cenários aprovado e recusado; a aprovação emite um QR assinado por unidade.

### Compartilhamento

O titular pode gerar um link válido por 30 minutos. Somente o hash SHA-256 do
token fica no banco. Após autenticar, outro cliente aceita o link e recebe um
novo QR; o ingresso desaparece da carteira anterior.

### Portaria

A portaria seleciona o evento, lê o QR pela câmera ou digita o código público.
Os retornos são Válido, Inválido, Já utilizado e Evento errado. Todas as
tentativas geram um `GateCheck`; leituras desconhecidas armazenam apenas o hash.

## Dados de demonstração

As migrations criam um organizador, dois clientes, uma conta de portaria e seis
eventos inspirados em atrações reais da Ticketmaster: Coldplay, Harry Styles,
Guns N' Roses, The Mission, Pink Floyd e Fleetwood Mac. Datas, locais, preços e
estoques são fixtures do EventDev, não a agenda oficial dos artistas.

## Identidade visual

| Token | Cor | Uso principal |
| --- | --- | --- |
| Ink | `#0B1020` | Texto, fundos escuros e alto contraste |
| Paper | `#F7F8FB` | Fundo principal |
| Violet | `#7367F0` | Marca e destaques |
| Violet Dark | `#5548C9` | Ações com contraste acessível |
| Acid | `#B7E400` | Foco e indicadores de alta visibilidade |
| Success | `#1D8A5A` | Sucesso e validações positivas |
| Danger | `#C94242` | Erros, alertas e ações destrutivas |

Os tokens ficam em `apps/web/src/app/globals.css`; páginas e componentes usam
CSS Modules colocados ao lado de quem os utiliza.

## Limites conscientes

- Pagamento, estorno e reembolso são simulados.
- O catálogo externo usa atrações, nunca eventos completos da Ticketmaster.
- O produto usa `America/Sao_Paulo` como fuso oficial nesta versão.
- A leitura por câmera exige HTTPS ou `localhost`.

## Uso de IA

Ferramentas de IA foram usadas como apoio de pair programming em composição de
interface, revisão e geração de alternativas. Modelagem, regras de negócio,
integração, testes e decisões finais foram revisados no código do projeto.
