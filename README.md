# EventDev Tickets

Plataforma full-stack para descoberta, gestão, reserva, compra simulada, compartilhamento e validação de ingressos.

Este repositório contém minha solução para o **Desafio Elite Dev 2026 da Verzel**.

O projeto cobre o fluxo completo de uma plataforma de eventos a partir de três perfis:

- **Organizador:** cria, publica, edita e cancela eventos.
- **Cliente:** encontra eventos, reserva ingressos, realiza o checkout simulado e gerencia seus tickets.
- **Portaria:** valida ingressos na entrada por QR Code ou código manual.

A prioridade da implementação foi construir um fluxo funcional de ponta a ponta, com atenção especial às regras de negócio, integridade dos dados, segurança dos ingressos, organização do código e clareza da experiência.

> **Nota sobre os eventos de demonstração:** artistas e imagens são obtidos a partir de dados da Ticketmaster. Datas, locais, preços, capacidade e disponibilidade são fixtures do EventDev e não representam a agenda oficial dos artistas.

---

## Navegação

- [Visão geral](#visão-geral)
- [Cobertura dos requisitos](#cobertura-dos-requisitos)
- [Principais fluxos](#principais-fluxos)
- [Decisões de produto](#decisões-de-produto)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Modelo de dados e integridade](#modelo-de-dados-e-integridade)
- [Segurança dos ingressos](#segurança-dos-ingressos)
- [Integração com a Ticketmaster](#integração-com-a-ticketmaster)
- [Dados de demonstração](#dados-de-demonstração)
- [Como executar localmente](#como-executar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes e qualidade](#testes-e-qualidade)
- [Deploy](#deploy)
- [Uso de IA](#uso-de-ia)
- [Limitações e próximos passos](#limitações-e-próximos-passos)

---

## Visão geral

O EventDev Tickets permite que um organizador pesquise uma atração em um catálogo externo, complete as informações específicas de seu evento e publique uma nova experiência na plataforma.

Depois da publicação, todo o funcionamento passa a depender exclusivamente do EventDev.

O **PostgreSQL é a fonte de verdade** para:

- eventos publicados;
- capacidade e estoque;
- reservas;
- pagamentos simulados;
- ingressos;
- transferências;
- validações de portaria.

A Ticketmaster é utilizada somente durante a criação do evento como fonte de informações editoriais.

O fluxo principal é:

```text
Ticketmaster
    │
    ▼
Organizador
    │
    ▼
Criação do evento
    │
    ▼
PostgreSQL
    │
    ├── Catálogo
    ├── Reserva
    ├── Checkout
    ├── Ingresso
    ├── Transferência
    └── Portaria
```

---

## Principais fluxos

### Catálogo

A página pública apresenta eventos publicados pelo EventDev.

O catálogo `/eventos` permite combinar:

- busca textual;
- UF;
- data;
- preço máximo.

A página `/eventos/:slug` apresenta as principais informações do evento, descrição em Markdown e os setores disponíveis para compra.

Eventos cancelados, não publicados ou já encerrados não aparecem no catálogo do cliente.

---

### Organizador

O fluxo de criação foi dividido entre dados externos e dados pertencentes ao próprio EventDev.

1. O organizador acessa **Meus eventos**.
2. Inicia a criação de um evento.
3. Pesquisa uma atração no catálogo da Ticketmaster.
4. Seleciona uma atração.
5. O EventDev utiliza os dados externos para preencher informações como:
   - nome;
   - imagem;
   - categoria;
   - contexto editorial.
6. O organizador informa:
   - data;
   - horário;
   - local;
   - UF;
   - capacidade;
   - descrição;
   - setores;
   - preços;
   - estoque.
7. O evento é persistido no PostgreSQL e publicado no catálogo.

Depois da criação, o organizador pode editar os campos permitidos ou cancelar o evento.

#### Cancelamento

Cancelar um evento executa também as regras relacionadas ao restante do domínio:

- remove o evento do catálogo;
- remove o evento da seleção da portaria;
- encerra reservas abertas;
- cancela tickets ativos;
- invalida links de compartilhamento;
- marca pagamentos aprovados como reembolsados no simulador.

O objetivo foi tratar o cancelamento como uma operação de domínio, e não apenas como uma alteração visual de status.

---

### Reserva e checkout

O cliente seleciona uma quantidade de ingressos em um ou mais setores:

- Pista;
- Pista Premium.

Ao confirmar a seleção, a API cria uma reserva temporária.

Por padrão:

```env
RESERVATION_HOLD_MINUTES=10
```

Durante esse período, aquele estoque deixa de estar disponível para outras reservas.

O checkout oferece os dois cenários solicitados pelo desafio:

- pagamento aprovado;
- pagamento recusado.

#### Pagamento aprovado

Quando aprovado:

1. a reserva é confirmada;
2. o pagamento é registrado;
3. um `Ticket` é emitido para cada unidade adquirida;
4. cada ingresso recebe sua própria identificação e assinatura.

#### Pagamento recusado

Quando recusado:

1. o pagamento é registrado como recusado;
2. a reserva é encerrada;
3. o estoque volta a ficar disponível.

---

### Meus ingressos

Após uma compra aprovada, os ingressos ficam disponíveis na área **Meus ingressos**.

Cada ticket apresenta:

- evento;
- setor;
- proprietário;
- código público;
- QR Code;
- status.

O QR não contém apenas um identificador previsível do ingresso. Ele é protegido por assinatura criptográfica, descrita em [Segurança dos ingressos](#segurança-dos-ingressos).

---

### Compartilhamento

Um ingresso pode ser transferido para outro cliente por meio de um link temporário.

Regras principais:

- somente o proprietário atual pode gerar o link;
- o link expira em 30 minutos;
- o token bruto é entregue apenas na URL;
- somente o SHA-256 do token é persistido no banco;
- o destinatário precisa estar autenticado;
- um token não pode ser utilizado duas vezes.

Após a transferência:

1. a propriedade do ingresso muda;
2. o código público é rotacionado;
3. um novo nonce é criado;
4. uma nova assinatura é gerada.

Consequentemente, qualquer cópia do QR anterior deixa de ser válida.

---

### Portaria

O perfil `GATE` possui uma interface específica para validação dos ingressos.

O fluxo é:

1. selecionar o evento;
2. ler o QR Code pela câmera ou inserir o código manualmente;
3. enviar a leitura para a API;
4. validar ingresso, assinatura, evento e status;
5. registrar a tentativa;
6. apresentar o resultado.

Os possíveis retornos são:

- **Válido**
- **Inválido**
- **Já utilizado**
- **Evento errado**

A câmera utiliza `@zxing/browser`.

A digitação manual permanece disponível como fallback para situações em que a câmera não pode ser utilizada.

Cada tentativa gera um registro `GateCheck`.

Para códigos inexistentes ou inválidos, o valor digitado não é salvo diretamente. É persistido apenas seu hash, permitindo auditoria sem armazenar entradas arbitrárias fornecidas ao endpoint.

---

## Decisões de produto

Além dos requisitos obrigatórios, algumas decisões foram tomadas para transformar o desafio em um produto mais coerente.

### Identidade do EventDev

O nome **EventDev** foi criado especificamente para o projeto, combinando o contexto de eventos com o caráter técnico do desafio.

Utilizei parte da linguagem cromática da Verzel como referência visual para manter relação com o contexto da avaliação, mas a composição da interface, aplicação das cores e identidade do EventDev foram definidas para o projeto.

Algumas decisões próprias de interface foram:

- símbolo `ED` inspirado no formato de um ingresso;
- ticket visual na tela de autenticação;
- carrossel editorial para eventos em destaque;
- combinação de superfícies claras com áreas escuras;
- verde ácido reservado para ações e estados de destaque;
- violeta utilizado como cor de identidade e navegação.

As referências de plataformas como Sympla, Ingresse, Eventim e Cheers foram utilizadas para entender padrões de produto, não para reproduzir uma interface específica.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 |
| UI | React 19 + TypeScript |
| Estilização | CSS Modules + CSS Variables |
| Backend | NestJS 11 |
| Banco | PostgreSQL 16 |
| ORM | Prisma 7 |
| Autenticação | JWT + bcryptjs |
| QR | `qrcode.react` |
| Scanner | `@zxing/browser` |
| Markdown | `react-markdown` |
| Ícones | Lucide React |
| API externa | Ticketmaster Discovery API |
| Testes | Jest + Supertest |
| Ambiente local | Docker Compose |
| Frontend/API em produção | Vercel |
| PostgreSQL em produção | Neon |

### Por que monorepo

O projeto utiliza **npm workspaces**.

```text
eventdev/
├── apps/api
└── apps/web
```

Para o tamanho do desafio, um monorepo reduz o custo operacional e facilita:

- instalação das dependências;
- execução do projeto;
- Docker;
- migrations;
- versionamento;
- testes;
- entendimento das mudanças que atravessam frontend e backend.

A intenção foi manter a infraestrutura simples, sem adicionar ferramentas que não trariam benefício significativo para o escopo.

---

## Arquitetura

```text
eventdev/
├── apps/
│   ├── api/
│   │   ├── api/                 # Entrada da API na Vercel
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── auth/
│   │       ├── catalog/
│   │       ├── checkout/
│   │       ├── events/
│   │       ├── gate/
│   │       ├── prisma/
│   │       └── tickets/
│   │
│   └── web/
│       ├── public/
│       └── src/
│           ├── app/
│           ├── components/
│           └── lib/
│
├── docker-compose.yml
├── package.json
└── README.md
```

### Backend

A API utiliza a estrutura modular do NestJS.

#### `auth`

Responsável por:

- cadastro;
- login;
- JWT;
- autenticação;
- autorização por papel.

#### `catalog`

Responsável pela comunicação com a Ticketmaster.

#### `events`

Responsável pelo catálogo interno e pela gestão dos eventos do organizador.

#### `checkout`

Concentra regras relacionadas a:

- reservas;
- estoque;
- pagamento simulado;
- emissão dos ingressos.

#### `tickets`

Responsável por:

- tickets;
- assinatura;
- QR;
- compartilhamento;
- transferência.

#### `gate`

Responsável pela validação na entrada e auditoria das tentativas.

---

### Autorização

`AuthGuard` e `RolesGuard` são registrados globalmente no NestJS.

Rotas públicas recebem:

```ts
@Public()
```

As demais exigem autenticação.

Quando existe uma regra de perfil, a autorização também é verificada pelo backend.

Os três papéis são:

```ts
ORGANIZER
CUSTOMER
GATE
```

O frontend pode esconder ações que não fazem sentido para determinado perfil, mas isso é apenas uma decisão de interface.

A autorização real continua sendo responsabilidade da API.

---

### Frontend

O frontend utiliza o App Router do Next.js.

Chamadas HTTP, sessão, tipos e helpers ficam concentrados em:

```text
apps/web/src/lib
```

O objetivo é evitar que componentes de interface conheçam detalhes desnecessários de transporte, URLs ou headers de autenticação.

Componentes reutilizáveis ficam em:

```text
apps/web/src/components
```

Os estilos utilizam CSS Modules próximos dos componentes ou páginas responsáveis por eles.

Tokens globais ficam em:

```text
apps/web/src/app/globals.css
```

---

## Modelo de dados e integridade

O modelo completo está em:

```text
apps/api/prisma/schema.prisma
```

As principais entidades são:

### `User`

Representa uma conta do sistema.

Armazena:

- nome;
- e-mail;
- hash da senha;
- papel.

### `Event`

Representa um evento criado dentro do EventDev.

Contém:

- dados públicos;
- snapshot dos dados editoriais externos;
- local;
- data;
- capacidade;
- organizador;
- status.

### `EventTicketTier`

Representa os setores comercializados.

Nesta implementação:

- Pista;
- Pista Premium.

Cada setor possui preço e estoque próprios.

### `Reservation`

Representa uma reserva temporária.

### `ReservationItem`

Relaciona uma reserva às quantidades escolhidas por setor.

### `Ticket`

Representa uma unidade de ingresso emitida após a confirmação do pagamento.

### `ShareToken`

Controla links de transferência.

### `GateCheck`

Registra as tentativas realizadas pela portaria.

---

### Proteção contra overselling

Uma das regras mais sensíveis do projeto é impedir que duas compras consumam a mesma disponibilidade.

A criação das reservas utiliza transações e atualizações condicionais.

Em vez de:

```text
ler estoque
→ validar em memória
→ alterar estoque
```

a operação precisa garantir que o estoque ainda seja válido no momento da atualização.

Conceitualmente:

```sql
UPDATE ticket_tier
SET available = available - quantidade
WHERE
  id = setor
  AND available >= quantidade;
```

Se nenhuma linha puder ser alterada, a reserva falha.

Isso protege o estoque contra requisições concorrentes.

---

### Reserva temporária

O estoque é segurado durante o período configurado em:

```env
RESERVATION_HOLD_MINUTES
```

O estoque retorna quando a reserva:

- expira;
- é cancelada;
- resulta em pagamento recusado.

---

### Uso único

A entrada também utiliza atualização condicional.

Um ticket só pode mudar de:

```text
ACTIVE
```

para:

```text
USED
```

se ainda estiver ativo no momento da validação.

Assim, duas tentativas concorrentes não conseguem validar o mesmo ticket com sucesso.

---

### Datas

Eventos e reservas são persistidos utilizando `TIMESTAMPTZ`.

Nesta versão, a apresentação utiliza:

```text
America/Sao_Paulo
```

---

## Segurança dos ingressos

O QR Code não utiliza apenas um ID sequencial ou UUID como prova de autenticidade.

Cada ticket possui:

- código público;
- nonce;
- assinatura.

A assinatura utiliza HMAC com um segredo exclusivo:

```env
TICKET_SIGNING_SECRET
```

Esse segredo deve ser diferente de:

```env
JWT_SECRET
```

A validação verifica a integridade dos dados antes de aceitar o ingresso.

Um código inventado ou modificado sem conhecimento do segredo não produz uma assinatura válida.

### Rotação após transferência

Quando um ingresso muda de proprietário, seus dados de identificação são rotacionados.

Isso invalida imediatamente o QR anterior e reduz o risco de duas pessoas tentarem utilizar cópias diferentes do mesmo ticket depois de uma transferência.

---

## Integração com a Ticketmaster

O projeto utiliza somente a **Ticketmaster Discovery API**.

A API externa participa apenas da criação do evento.

Fluxo:

```text
Organizador
    │
    ▼
Pesquisa atração
    │
    ▼
NestJS
    │
    ▼
Ticketmaster Discovery API
    │
    ▼
Resultado normalizado
    │
    ▼
Formulário EventDev
    │
    ▼
PostgreSQL
```

Ao selecionar uma atração, alguns dados são utilizados como base para o novo evento:

- nome;
- imagem;
- categoria;
- informações editoriais.

Depois disso, o organizador define os dados pertencentes ao EventDev:

- data;
- horário;
- local;
- capacidade;
- descrição;
- setores;
- estoque;
- preço.

A partir da publicação, o funcionamento do evento não depende mais da Ticketmaster.

Isso significa que uma indisponibilidade da API externa não impede:

- navegação;
- reserva;
- compra;
- emissão de ingresso;
- transferência;
- validação.

Caso `TICKETMASTER_API_KEY` não esteja configurada, o ambiente de demonstração possui um catálogo local identificado na interface.

---

## Dados de demonstração

O ambiente possui dados suficientes para testar o fluxo completo sem configuração manual.

| Nome | Perfil | E-mail | Senha |
| --- | --- | --- | --- |
| Organizador Elite | Organizador | `organizer@elite.dev` | `Organizer123!` |
| Cliente Elite | Cliente | `cliente@elite.dev` | `Cliente123!` |
| Cliente Convidado | Cliente | `cliente2@elite.dev` | `Cliente2123!` |
| Portaria Elite | Portaria | `portaria@elite.dev` | `Portaria123!` |

> Essas credenciais existem exclusivamente para demonstração e avaliação do projeto.

Novos cadastros realizados pela interface recebem exclusivamente o papel:

```text
CUSTOMER
```

O ambiente possui seis eventos publicados inspirados em:

- Coldplay;
- Harry Styles;
- Guns N' Roses;
- The Mission;
- Pink Floyd;
- Fleetwood Mac.

Cada evento possui setores, preços, capacidade e estoque próprios.

---

## Como executar localmente

### Pré-requisitos

- Node.js 22+
- npm 10+
- Docker Desktop com Docker Compose v2

Para execução sem Docker:

- PostgreSQL 16+

---

### Opção recomendada: Docker Compose

Clone o projeto:

```bash
git clone https://github.com/BrenoGodoy/eventdev.git
cd eventdev
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Suba a aplicação:

```bash
npm run docker:dev
```

O comando inicia:

- PostgreSQL;
- NestJS;
- Next.js.

e aplica as migrations necessárias.

Depois da inicialização:

| Serviço | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| API | `http://localhost:3001/api` |
| PostgreSQL | `postgresql://eventdev:eventdev@localhost:5432/eventdev` |

Na primeira execução, a instalação das dependências dentro dos containers pode levar alguns minutos.

Aguarde a inicialização da API e da Web antes de acessar o navegador.

### Logs

```bash
docker compose logs -f web api
```

### Encerrar

```bash
npm run docker:down
```

O volume do PostgreSQL é preservado.

### Resetar completamente

> Este comando remove também o volume local do PostgreSQL.

```bash
docker compose down -v
npm run docker:dev
```

---

### Execução sem Docker

Instale as dependências:

```bash
npm install
```

Crie os arquivos de configuração:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Crie um banco PostgreSQL:

```bash
createdb eventdev
```

Configure `DATABASE_URL` em:

```text
apps/api/.env
```

Depois aplique as migrations:

```bash
npm run db:migrate
```

Inicie a API:

```bash
npm run dev:api
```

Em outro terminal:

```bash
npm run dev:web
```

Abra:

```text
http://localhost:3000
```

---

### Scripts

| Comando | Descrição |
| --- | --- |
| `npm run docker:dev` | Sobe Web, API e PostgreSQL. |
| `npm run docker:down` | Encerra os containers. |
| `npm run dev:web` | Executa o Next.js em desenvolvimento. |
| `npm run dev:api` | Executa o NestJS em watch mode. |
| `npm run db:migrate` | Aplica migrations pendentes. |
| `npm run prisma:generate` | Gera o Prisma Client. |
| `npm run lint` | Executa ESLint. |
| `npm run test` | Executa testes unitários. |
| `npm run test:e2e` | Executa testes E2E da API. |
| `npm run build` | Gera os builds de produção. |

---

## Variáveis de ambiente

Não versione arquivos `.env`, `.env.local` ou segredos de produção.

| Variável | Serviço | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `DATABASE_URL` | API | Sim | Conexão PostgreSQL. |
| `JWT_SECRET` | API | Produção | Segredo utilizado nos JWTs. |
| `TICKET_SIGNING_SECRET` | API | Produção | Segredo exclusivo para assinatura dos ingressos. |
| `TICKETMASTER_API_KEY` | API | Não | Consumer Key da Ticketmaster. |
| `RESERVATION_HOLD_MINUTES` | API | Não | Duração da reserva. Padrão: `10`. |
| `CORS_ORIGINS` | API | Produção | Origens permitidas. |
| `PORT` | API local | Não | Porta local. Padrão: `3001`. |
| `NEXT_PUBLIC_API_URL` | Web | Deploy | URL pública da API. |

Exemplo local:

```env
DATABASE_URL="postgresql://eventdev:eventdev@localhost:5432/eventdev?schema=public"

PORT=3001

JWT_SECRET="um-segredo-local-apenas-para-desenvolvimento"

TICKET_SIGNING_SECRET="outro-segredo-local-apenas-para-qr"

CORS_ORIGINS="http://localhost:3000"

TICKETMASTER_API_KEY=""

RESERVATION_HOLD_MINUTES=10
```

Em produção, `JWT_SECRET` e `TICKET_SIGNING_SECRET` devem:

- possuir pelo menos 32 caracteres;
- ser valores aleatórios;
- ser diferentes entre si.

---

## Testes e qualidade

Para executar as validações principais:

```bash
npm run lint
npm run test
npm run build
```

Com o ambiente Docker ativo:

```bash
docker compose exec api npm run test:e2e --workspace=api -- --runInBand --no-watchman
```

Os testes cobrem regras sensíveis relacionadas a:

- autenticação;
- autorização;
- eventos;
- reservas;
- estoque;
- pagamentos;
- ingressos;
- assinatura de QR;
- compartilhamento;
- portaria.

Além dos testes automatizados, o projeto utiliza:

- TypeScript;
- ESLint;
- DTOs;
- validação de entrada;
- guards;
- códigos de erro de domínio;
- migrations versionadas;
- constraints de banco;
- validação de variáveis críticas em produção.

---

## Deploy

A aplicação utiliza:

```text
Web         → Vercel
API         → Vercel
PostgreSQL  → Neon
```

Frontend e backend são projetos Vercel independentes apontando para o mesmo monorepo.

### 1. PostgreSQL no Neon

Crie um projeto no Neon e obtenha sua connection string PostgreSQL com SSL.

Depois aplique as migrations:

```bash
DATABASE_URL="<connection-string-do-neon>" npm run db:migrate
```

O comando utiliza:

```bash
prisma migrate deploy
```

Não utilize:

```bash
prisma migrate dev
```

contra o banco de produção.

---

### 2. API na Vercel

Crie um projeto Vercel apontando para o mesmo repositório.

Configuração:

| Campo | Valor |
| --- | --- |
| Production Branch | `main` |
| Root Directory | `apps/api` |
| Framework Preset | `Other` |
| Output Directory | `public` |
| Include source files outside Root Directory | Habilitado |

Variáveis:

```env
NODE_ENV=production

DATABASE_URL=<connection-string-do-neon>

JWT_SECRET=<segredo-aleatorio>

TICKET_SIGNING_SECRET=<outro-segredo-aleatorio>

TICKETMASTER_API_KEY=<consumer-key-opcional>

RESERVATION_HOLD_MINUTES=10

CORS_ORIGINS=https://<dominio-web>.vercel.app
```

Não configure `PORT` na Vercel.

A entrada da aplicação está em:

```text
apps/api/api
```

e o `vercel.json` encaminha `/api/*` para o NestJS.

Após o deploy:

```text
https://<dominio-api>.vercel.app/api/events
```

deve retornar o catálogo.

---

### 3. Web na Vercel

Crie um segundo projeto Vercel.

| Campo | Valor |
| --- | --- |
| Production Branch | `main` |
| Root Directory | `apps/web` |
| Framework Preset | `Next.js` |
| Build Command | Padrão |
| Output Directory | Não configurar |

Configure:

```env
NEXT_PUBLIC_API_URL=https://<dominio-api>.vercel.app/api
```

Como variáveis `NEXT_PUBLIC_*` são incorporadas ao build do Next.js, faça um novo deploy caso o endereço da API seja alterado.

Depois, configure a URL final da Web em:

```env
CORS_ORIGINS=https://<dominio-web>.vercel.app
```

na API.

### Verificação pós-deploy

```bash
curl -i https://<dominio-api>.vercel.app/api/events
```

```bash
curl -i https://<dominio-api>.vercel.app/api/events/featured
```

O primeiro endpoint deve retornar o catálogo publicado.

O segundo deve retornar somente os eventos em destaque.

---

## Uso de IA

O desafio permite e incentiva o uso transparente de inteligência artificial.

Utilizei o **GPT-5.6** como ferramenta de pair programming durante o desenvolvimento.

A IA foi utilizada principalmente para:

- acelerar implementação de CSS;
- revisar código;
- discutir regras de negócio;
- auxiliar na integração entre frontend e backend;
- gerar alternativas de microcopy;
- apoiar a implementação de testes;
- criar e refinar testes E2E;
- revisar responsividade e composição de algumas telas;
- auxiliar na identificação de casos de borda.

### Decisões que partiram de mim

Foram decisões minhas:

- nome **EventDev**;
- direção visual da aplicação;
- utilização das cores da Verzel como referência contextual;
- conceito do símbolo `ED`;
- conceito do ticket na tela de login;
- estrutura visual do catálogo;
- escolha de CSS Modules;
- utilização de um monorepo;
- arquitetura inicial da aplicação;
- modelagem inicial do banco;
- escolha por integração apenas com a Ticketmaster;
- escolha por ingressos por quantidade em vez de mapa de assentos;
- priorização do fluxo completo antes de funcionalidades periféricas;
- estratégia de deploy;
- definição do escopo final da entrega.

Também utilizei como referência produtos do mercado, principalmente:

- Sympla;
- Eventim;
- Ingresse;
- Cheers.

O objetivo foi estudar padrões conhecidos de plataformas de eventos sem reproduzir diretamente uma interface existente.

### Onde a IA teve maior participação

A IA teve participação mais direta em:

- implementação e refinamento de CSS a partir das direções visuais que defini;
- sugestões de microcopy;
- revisão de regras de reserva e transferência;
- apoio na proteção de estoque;
- integração de fluxos entre as camadas;
- elaboração dos testes E2E;
- apoio nos testes unitários.

Os testes E2E foram elaborados com apoio integral de IA e posteriormente executados e validados durante o desenvolvimento.

O projeto não foi gerado a partir de um único prompt. A IA foi utilizada de forma iterativa como ferramenta de implementação e revisão, enquanto decisões de produto, arquitetura, escopo e identidade foram conduzidas por mim.

---

## Limitações e próximos passos

Algumas decisões foram conscientemente mantidas fora do escopo da entrega.

### Pagamento real

O checkout atual é simulado para demonstrar os dois cenários exigidos:

- aprovado;
- recusado.

Uma evolução natural seria integrar um ambiente sandbox de:

- Stripe;
- Mercado Pago;
- outro provedor de pagamentos.

---

### Mapa de assentos

A implementação atual utiliza ingressos por quantidade em setores.

Isso atende especialmente a eventos com:

- Pista;
- Pista Premium.

Uma próxima evolução seria incluir mapas de assentos para cinema e teatro, mantendo as mesmas garantias transacionais contra dupla venda.

---

### Portaria por organizador

Nesta entrega, a conta de portaria é operacionalmente global.

Uma evolução seria permitir que cada organizador:

- criasse ou convidasse usuários de portaria;
- atribuísse eventos específicos;
- restringisse o acesso da equipe somente aos próprios eventos.

---

### Recuperação de senha e e-mail

Recuperação de senha e envio do ticket por e-mail ficaram fora do escopo principal.

São funcionalidades importantes para uma aplicação real, mas não necessárias para demonstrar o fluxo central do desafio.

---

### Mobile

A aplicação é responsiva.

Com mais tempo, uma próxima etapa seria realizar uma rodada exclusiva de otimização para telas pequenas, principalmente:

- densidade de informações;
- áreas de toque;
- formulários;
- carteira de ingressos;
- interface de portaria.

---

## Resultado

A implementação cobre o fluxo completo proposto:

```text
Organizador
    ↓
Criação do evento
    ↓
Publicação
    ↓
Cliente
    ↓
Reserva
    ↓
Pagamento simulado
    ↓
Emissão do ingresso
    ↓
Compartilhamento opcional
    ↓
Portaria
    ↓
Validação
```

A prioridade foi garantir que esse fluxo funcionasse de ponta a ponta antes de adicionar funcionalidades secundárias, mantendo regras de domínio, segurança, integridade dos dados e organização técnica como partes centrais da solução.
