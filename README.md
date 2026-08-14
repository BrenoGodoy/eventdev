# EventDev Tickets

Plataforma full stack para descoberta, gestão, reserva, compra simulada,
compartilhamento e validação de ingressos. Este repositório é a minha solução
para o **Desafio Elite Dev 2026 da Verzel**.

A aplicação parte de três personas: quem organiza o evento, quem compra o
ingresso e quem faz a validação na entrada. A intenção foi entregar um fluxo
inteiro e coerente, priorizando regras de negócio, clareza de interface e uma
identidade própria em vez de uma coleção de telas isoladas.

> **Nota sobre os eventos de demonstração:** artistas e imagens vêm de dados da
> Ticketmaster. Datas, locais, preços, capacidade e disponibilidade são fixtures
> do EventDev e não representam agenda oficial dos artistas.

## Navegação

- [Visão geral](#visão-geral)
- [Requisitos do desafio e cobertura](#requisitos-do-desafio-e-cobertura)
- [Experiência e fluxos](#experiência-e-fluxos)
- [Marca EventDev](#marca-eventdev)
- [Tecnologias e decisões](#tecnologias-e-decisões)
- [Arquitetura](#arquitetura)
- [Modelo de dados e integridade](#modelo-de-dados-e-integridade)
- [API externa: Ticketmaster](#api-externa-ticketmaster)
- [Dados de demonstração](#dados-de-demonstração)
- [Como executar localmente](#como-executar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes e qualidade](#testes-e-qualidade)
- [Deploy: Vercel e Neon](#deploy-vercel-e-neon)
- [Uso de IA](#uso-de-ia)
- [Limites e próximos passos](#limites-e-próximos-passos)

---

## Visão geral

O EventDev Tickets permite que um organizador consulte uma atração externa,
complete os dados que pertencem ao seu próprio evento e o publique. Clientes
encontram eventos no catálogo, escolhem quantidades de ingresso por setor,
fazem uma reserva temporária, simulam uma decisão de pagamento e recebem QR
Codes assinados. A portaria valida os ingressos por câmera ou código manual,
registrando todas as tentativas.

O fluxo não depende da Ticketmaster depois que o evento é publicado: o
**PostgreSQL é a fonte de verdade** do catálogo público, estoque, reservas,
pagamentos simulados, tickets e validações.

### Perfis

| Perfil | Responsabilidade principal |
| --- | --- |
| **Organizador** | Pesquisa atrações, cria, edita, publica, consulta e cancela seus eventos. |
| **Cliente** | Pesquisa eventos, reserva setores, simula o pagamento, consulta seus ingressos e transfere um ticket. |
| **Portaria** | Seleciona um evento e valida QR Code pela câmera ou código digitado. |

---

## Requisitos do desafio e cobertura

| Requisito | Implementação no EventDev |
| --- | --- |
| Navegação, busca e filtro de eventos | Catálogo público com busca livre, UF, data e preço máximo. |
| Criação e gestão pelo organizador | Busca de atrações, formulário de criação, listagem de eventos próprios, edição e cancelamento. |
| Reserva por mapa ou quantidade | Implementado por **quantidade**, com os setores Pista e Pista Premium. |
| Pagamento aprovado e recusado | Checkout simulado com ambos os cenários e feedback de status. |
| Meus ingressos e QR Code | Carteira do cliente com QR assinado, setor, código público e status explícito. |
| Portaria | Leitura por câmera ou digitação manual, com retorno Válido, Inválido, Já utilizado e Evento errado. |
| API externa | Integração server-side com a Ticketmaster Discovery API para pesquisa de atrações. |
| Três papéis de autenticação | JWT, guards globais e autorização por papel: \`ORGANIZER\`, \`CUSTOMER\` e \`GATE\`. |
| Persistência | PostgreSQL + Prisma, migrations versionadas e dados de demonstração. |
| Não vender duas vezes | Atualizações condicionais e transações protegem capacidade, estoque por setor e uso único do ticket. |
| QR que não possa ser forjado | Código público, nonce e assinatura HMAC independente da sessão. |
| Compartilhamento por link | Link de 30 minutos, token armazenado como hash e rotação do QR na transferência. |
| Dados de teste | Um organizador, dois clientes, uma conta de portaria e seis eventos publicados. |
| Diferenciais | Docker Compose, deploy, filtros, gestão de eventos, cancelamento, CSS Modules, testes e identidade visual própria. |

---

## Experiência e fluxos

### Área pública e catálogo

- A home apresenta eventos em destaque vindos da API e um carrossel navegável.
- O catálogo \`/eventos\` mantém o header e permite combinar busca textual, UF,
  data e preço.
- Ao abrir \`/eventos/:slug\`, a página mostra imagem, dados essenciais,
  conteúdo em Markdown e lotes disponíveis.
- Eventos não publicados, cancelados ou já ocorridos não entram no catálogo do
  cliente.

### Organizador

1. Acessa **Meus eventos**.
2. Cria um evento e pesquisa uma atração no catálogo Ticketmaster.
3. Seleciona uma atração para pré-preencher título, categoria, imagem e contexto
   editorial.
4. Define os dados próprios do EventDev: data, horário, local, UF, capacidade,
   preço, descrição Markdown, estoque e preço dos setores.
5. Publica o evento no PostgreSQL.
6. Posteriormente pode editar dados permitidos ou cancelar o evento.

O cancelamento tira o evento do catálogo e da portaria, encerra reservas em
aberto, cancela tickets ativos, invalida links de compartilhamento e marca
pagamentos aprovados como reembolsados no simulador.

### Reserva, checkout e emissão

1. O cliente informa a quantidade de **Pista** e/ou **Pista Premium**.
2. A API reserva o estoque por \`RESERVATION_HOLD_MINUTES\` (10 minutos por
   padrão).
3. O checkout oferece uma escolha didática entre pagamento aprovado ou recusado.
4. No cenário aprovado, a reserva é confirmada e é emitido um ingresso por
   unidade comprada.
5. Cada ticket recebe código público, nonce e assinatura, apresentados como QR
   Code na área **Meus ingressos**.

### Compartilhamento de ingresso

- Somente o titular do ticket pode gerar o link.
- O link expira em 30 minutos.
- O token bruto aparece apenas na URL; no banco é armazenado exclusivamente o
  SHA-256 do token.
- A pessoa destinatária precisa se autenticar antes de aceitar.
- Ao aceitar, a propriedade muda de conta e o ticket recebe novo código, nonce
  e assinatura. Assim, um QR anterior deixa de ser válido.

### Portaria

1. A pessoa de portaria seleciona o evento correto.
2. Lê o QR pela câmera com \`@zxing/browser\` ou digita o código público.
3. A API valida assinatura, status, evento selecionado e uso prévio.
4. A interface devolve um resultado claro: **Válido**, **Inválido**, **Já
   utilizado** ou **Evento errado**.
5. Cada tentativa gera um \`GateCheck\`; para códigos inexistentes, somente o
   hash do valor informado é persistido.

---

## Marca EventDev

### Ideia central

O nome **EventDev** foi uma decisão minha: ele une o universo de eventos ao
processo de construção e organização de experiências digitais. A marca foi
pensada para ser energética, técnica e objetiva - uma plataforma de tickets,
não uma identidade genérica de festa.

Usei a linguagem cromática da Verzel como ponto de partida por ela combinar com
o contexto do desafio, mas defini a seleção de cores e a aplicação delas para o
EventDev. A paleta escura dá palco às imagens de eventos; o verde ácido funciona
como sinal de ação e contraste; o violeta organiza interações, estados e o
caráter digital do produto.

### Símbolo ED

O símbolo proprietário não é um quadrado com letras: ele foi desenhado como um
bilhete digital estilizado. A base possui o recorte de ticket, o canto violeta
sugere a dobra/perfuração de um ingresso e a sombra verde ácido cria a sensação
de peça destacada do fundo. Dentro dele, as letras \`E\` e \`D\` formam o
monograma que acompanha o nome **EventDev Tickets**.

Essa construção permite que o símbolo funcione tanto como marca completa no
header quanto como um identificador compacto em contextos menores. O hover é
sutil, com pequena elevação e rotação, para reforçar a natureza de interface sem
transformar o logo em um elemento decorativo excessivo.

### Linguagem visual

| Elemento | Decisão |
| --- | --- |
| Tom de voz | Editorial, direto e voltado a experiências: "Bilheteria editorial", "Entrar na plataforma" e "Acesse sua conta". |
| Tipografia | \`Space Grotesk\` para títulos e marca, por trazer presença sem perder legibilidade; \`Inter\`/system UI para leitura e formulários. |
| Superfícies | Fundo claro para tarefas e leitura; Ink para áreas de impacto, branding e tickets. |
| Formas | Raios discretos (\`4px\` e \`8px\`) e linhas técnicas, evitando cards excessivamente arredondados. |
| Interação | Foco visível, transições curtas, ícones Lucide e movimentos reduzidos quando o sistema operacional solicita. |

### Tokens de cor

| Token | Valor | Papel na interface |
| --- | --- | --- |
| Ink | \`#0B1020\` | Fundo escuro, texto principal e contraste. |
| Paper | \`#F7F8FB\` | Fundo predominante das áreas de produto. |
| Surface | \`#FFFFFF\` | Campos, tickets claros e superfícies elevadas. |
| Violet | \`#7367F0\` | Destaques de marca e elementos de navegação. |
| Violet Dark | \`#5548C9\` | Ações primárias e texto com contraste. |
| Acid | \`#B7E400\` | Chamadas de atenção, indicadores e foco. |
| Success | \`#1D8A5A\` | Estados aprovados e validações positivas. |
| Danger | \`#C94242\` | Erros, recusas e ações destrutivas. |

Os tokens globais vivem em
[\`apps/web/src/app/globals.css\`](apps/web/src/app/globals.css). O restante do
estilo é encapsulado em CSS Modules junto de cada página ou componente, para
manter o projeto pequeno, profissional e fácil de alterar sem concentrar a
interface em um arquivo global.

### Peças de interface com identidade própria

- **Carrossel de destaque:** composição inspirada na ideia de vitrines de
  plataformas de eventos, mas adaptada à paleta e ao ritmo visual do EventDev.
- **Ticket da tela de login:** transforma o antigo banner em um ingresso digital
  com área principal, stub, recortes, data, QR decorativo, código e dados da
  experiência.
- **Cards e catálogo:** imagem, local, data e valor são apresentados de forma
  rápida para o usuário comparar eventos sem abrir cada detalhe.

---

## Tecnologias e decisões

| Camada | Tecnologia | Por que foi escolhida |
| --- | --- | --- |
| Frontend | Next.js 16, React 19 e TypeScript | App Router, roteamento por arquivos, boa experiência de desenvolvimento e composição de páginas de produto. |
| Estilização | CSS Modules + tokens CSS | Escopo local, baixo custo de manutenção e sem a sobrecarga de criar um design system grande para este escopo. |
| UI | Lucide React, \`qrcode.react\`, \`@zxing/browser\`, \`react-markdown\` | Ícones consistentes, QR visual, leitura de câmera e descrição editorial renderizada. |
| Backend | NestJS 11 + TypeScript | Módulos, controllers, guards, DTOs e estrutura clara para regras de negócio. |
| Persistência | PostgreSQL 16 + Prisma 7 | Relacionamentos, transações, constraints, migrations versionadas e consultas tipadas. |
| Autenticação | JWT + bcryptjs | Sessões sem estado no backend e hashes de senha sem persistir senha em texto puro. |
| Catálogo externo | Ticketmaster Discovery API | Pesquisa de atrações, imagens e categorias para iniciar a criação de um evento. |
| Ambiente local | Docker Compose | Web, API e PostgreSQL sobem juntos com um comando e com banco reproduzível. |
| Produção | Vercel e Neon | Deploy simples para avaliação, HTTPS para câmera e PostgreSQL gerenciado. |
| Qualidade | ESLint, Jest, Supertest e TypeScript | Validação estática, testes de regras e integração da API. |

### Por que monorepo

Escolhi um monorepo com npm workspaces para manter frontend, backend e banco no
mesmo contexto de desenvolvimento. Isso simplifica comandos locais, Docker,
migrations, versionamento e o entendimento de quais alterações afetam um fluxo
completo. Para o tamanho do desafio, a estrutura reduz atrito sem criar uma
camada de infraestrutura desnecessária.

---

## Arquitetura

\`\`\`text
eventdev/
├── apps/
│   ├── api/
│   │   ├── api/                 # Handler Node e roteamento da Vercel
│   │   ├── prisma/              # Schema, migrations e dados de demonstração
│   │   ├── src/
│   │   │   ├── auth/            # JWT, login, cadastro, guards e papéis
│   │   │   ├── catalog/         # Ticketmaster e catálogo de atrações
│   │   │   ├── checkout/        # Reservas, pagamento e tickets
│   │   │   ├── events/          # Catálogo e gestão do organizador
│   │   │   ├── gate/            # Validação de entrada e auditoria
│   │   │   ├── prisma/          # Cliente Prisma
│   │   │   └── tickets/         # Assinatura QR e compartilhamento
│   │   └── Dockerfile
│   └── web/
│       ├── public/              # Assets locais
│       ├── src/
│       │   ├── app/             # Rotas do Next.js
│       │   ├── components/      # Brand, header, carrossel, ticket e cards
│       │   └── lib/             # Clientes HTTP, tipos, sessão e helpers
│       └── Dockerfile
├── docker-compose.yml
├── package.json                 # Scripts do monorepo
└── README.md
\`\`\`

### Autorização e interface

\`AuthGuard\` e \`RolesGuard\` são registrados globalmente no Nest. Rotas
públicas recebem o decorator \`@Public()\`; as demais exigem JWT válido e, quando
necessário, o papel correto. Esconder um botão no frontend nunca é a única
barreira de permissão.

No frontend, chamadas HTTP e contratos ficam em \`apps/web/src/lib\`, evitando
que componentes de página conheçam URLs ou headers de autenticação. Componentes
possuem responsabilidades pequenas e CSS Modules ao lado do código que possuem.

---

## Modelo de dados e integridade

Os modelos principais estão em
[\`apps/api/prisma/schema.prisma\`](apps/api/prisma/schema.prisma):

- \`User\`: nome, e-mail único, hash de senha e papel.
- \`Event\`: dados publicados, snapshot editorial externo, capacidade, local,
  preço, estado, organizador e status.
- \`EventTicketTier\`: setores Pista e Pista Premium, cada um com estoque e
  preço próprios.
- \`Reservation\` e \`ReservationItem\`: reserva temporária e quantidades por
  setor.
- \`Ticket\`: proprietário atual, código público, assinatura, nonce, status e
  possível vínculo com assento futuro.
- \`GateCheck\`: auditoria de cada leitura da portaria.
- \`ShareToken\`: hash do token, expiração, revogação, consumo e pessoas
  envolvidas na transferência.

### Proteções importantes

- **Overselling:** a criação de reserva é transacional e reduz estoque apenas
  quando há disponibilidade suficiente. O estoque volta quando a reserva expira,
  falha ou é cancelada.
- **Uso único:** ao validar, a API altera o ticket de \`ACTIVE\` para \`USED\`
  condicionalmente. Uma segunda leitura retorna duplicidade.
- **QR assinado:** o QR combina identificador público, nonce e assinatura HMAC;
  não basta adivinhar um código de ingresso.
- **Transferência segura:** o link tem vida curta, seu valor não é persistido em
  texto puro e o ticket é reemitido após a aceitação.
- **Dados temporais:** eventos e reservas são persistidos como \`TIMESTAMPTZ\`;
  a apresentação usa \`America/Sao_Paulo\` nesta versão.

---

## API externa: Ticketmaster

Optei por integrar apenas a **Ticketmaster Discovery API**. O enunciado permite
Ticketmaster, TMDb ou ambas; escolher uma fonte reduziu o escopo e manteve o
produto coerente com a marca de eventos e shows.

O uso é deliberadamente editorial:

1. o organizador pesquisa uma atração, como Coldplay ou Harry Styles;
2. o backend consulta a Ticketmaster;
3. a seleção preenche título, imagem e categoria;
4. o organizador define o que é exclusivamente EventDev: data, local,
   capacidade, preço, descrição e estoque;
5. ao publicar, um novo \`Event\` é persistido no PostgreSQL.

Reservas, pagamentos, tickets, compartilhamentos e portaria nunca dependem da
Ticketmaster. Se a API externa estiver indisponível, eventos já publicados
continuam navegáveis e vendáveis. Sem \`TICKETMASTER_API_KEY\`, a criação usa um
catálogo local identificado na interface para permitir a demonstração.

Para obter uma chave, crie uma conta no
[Ticketmaster Developer](https://developer.ticketmaster.com/), crie uma
aplicação e copie a **Consumer Key** para \`TICKETMASTER_API_KEY\`.

---

## Dados de demonstração

As migrations deixam o ambiente pronto para uma avaliação end-to-end sem criar
contas ou eventos manualmente.

| Nome | Papel | E-mail | Senha |
| --- | --- | --- | --- |
| Organizador Elite | Organizador | \`organizer@elite.dev\` | \`Organizer123!\` |
| Cliente Elite | Cliente | \`cliente@elite.dev\` | \`Cliente123!\` |
| Cliente Convidado | Cliente | \`cliente2@elite.dev\` | \`Cliente2123!\` |
| Portaria Elite | Portaria | \`portaria@elite.dev\` | \`Portaria123!\` |

Novos cadastros feitos pela tela recebem exclusivamente o papel **Cliente**.

Há seis eventos publicados e disponíveis, inspirados nas atrações Coldplay,
Harry Styles, Guns N' Roses, The Mission, Pink Floyd e Fleetwood Mac. Cada um
possui Pista e Pista Premium, preço, capacidade e estoque próprios.

---

## Como executar localmente

### Pré-requisitos

- [Node.js 22+](https://nodejs.org/)
- npm 10+
- Para a opção recomendada: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  com Docker Compose v2
- Para execução sem Docker: PostgreSQL 16+

### Opção recomendada: Docker Compose

Este é o caminho mais rápido para uma avaliação completa. Ele inicia PostgreSQL,
API NestJS e Next.js juntos; executa migrations e preserva os dados no volume
local.

\`\`\`bash
git clone https://github.com/BrenoGodoy/eventdev.git
cd eventdev
cp .env.example .env
npm run docker:dev
\`\`\`

Após a primeira subida:

| Serviço | Endereço |
| --- | --- |
| Web | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:3001/api](http://localhost:3001/api) |
| PostgreSQL | \`postgresql://eventdev:eventdev@localhost:5432/eventdev\` |

Comandos úteis:

\`\`\`bash
# Acompanhar logs
docker compose logs -f web api

# Encerrar sem apagar banco e dados
npm run docker:down

# Reiniciar do zero, inclusive o volume PostgreSQL (destrutivo)
docker compose down -v
npm run docker:dev
\`\`\`

> No primeiro \`docker:dev\`, a instalação dentro dos contêineres pode levar
> alguns minutos. Aguarde as mensagens da API e da Web antes de abrir o browser.

### Opção alternativa: execução nativa

1. Crie um banco PostgreSQL local chamado \`eventdev\`.

   \`\`\`bash
   createdb eventdev
   \`\`\`

2. Instale dependências e crie os arquivos de ambiente.

   \`\`\`bash
   npm install
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.local.example apps/web/.env.local
   \`\`\`

3. Em \`apps/api/.env\`, ajuste \`DATABASE_URL\` caso usuário, senha ou porta
   sejam diferentes do exemplo.

4. Aplique as migrations, que também incluem os dados de demonstração.

   \`\`\`bash
   npm run db:migrate
   \`\`\`

5. Em um terminal, inicie a API.

   \`\`\`bash
   npm run dev:api
   \`\`\`

6. Em outro terminal, inicie a Web.

   \`\`\`bash
   npm run dev:web
   \`\`\`

Abra [http://localhost:3000](http://localhost:3000). Para restaurar um banco
nativo local, remova e recrie o banco e execute as migrations novamente.

### Scripts do monorepo

| Comando | Descrição |
| --- | --- |
| \`npm run docker:dev\` | Sobe Web, API e PostgreSQL com Docker Compose. |
| \`npm run docker:down\` | Encerra os contêineres, preservando o volume. |
| \`npm run dev:web\` | Inicia apenas a Web em desenvolvimento. |
| \`npm run dev:api\` | Inicia apenas a API Nest em watch mode. |
| \`npm run db:migrate\` | Aplica migrations pendentes no banco configurado. |
| \`npm run prisma:generate\` | Gera o Prisma Client. |
| \`npm run lint\` | Executa ESLint na API e na Web. |
| \`npm run test\` | Executa testes unitários da API. |
| \`npm run test:e2e\` | Executa testes de integração/end-to-end da API. |
| \`npm run build\` | Gera builds de produção da API e da Web. |

---

## Variáveis de ambiente

Não versione \`.env\`, \`.env.local\` ou qualquer segredo de produção.

| Variável | Onde é usada | Obrigatória | Descrição |
| --- | --- | --- | --- |
| \`DATABASE_URL\` | API / Prisma | Sim fora do Docker | String de conexão PostgreSQL. |
| \`JWT_SECRET\` | API | Sim em produção | Assina sessões; mínimo de 32 caracteres. |
| \`TICKET_SIGNING_SECRET\` | API | Sim em produção | Assina QR Codes; mínimo de 32 caracteres e diferente do JWT. |
| \`TICKETMASTER_API_KEY\` | API | Não | Consumer Key da Ticketmaster Discovery API. |
| \`RESERVATION_HOLD_MINUTES\` | API | Não | Validade da reserva; padrão \`10\`. |
| \`CORS_ORIGINS\` | API | Sim em produção | Origens autorizadas, separadas por vírgula. |
| \`PORT\` | API local | Não | Porta da API; padrão \`3001\`. |
| \`NEXT_PUBLIC_API_URL\` | Web | Sim no deploy | URL pública da API, terminando em \`/api\`. |

Exemplo para desenvolvimento nativo da API:

\`\`\`env
DATABASE_URL="postgresql://eventdev:eventdev@localhost:5432/eventdev?schema=public"
PORT=3001
JWT_SECRET="um-segredo-local-apenas-para-desenvolvimento"
TICKET_SIGNING_SECRET="outro-segredo-local-apenas-para-qr"
CORS_ORIGINS="http://localhost:3000"
TICKETMASTER_API_KEY=""
RESERVATION_HOLD_MINUTES=10
\`\`\`

---

## Testes e qualidade

\`\`\`bash
npm run lint
npm run test
npm run build
\`\`\`

Com Docker ativo, os testes end-to-end podem ser executados com:

\`\`\`bash
docker compose exec api npm run test:e2e --workspace=api -- --runInBand --no-watchman
\`\`\`

Os testes unitários foram construídos em conjunto, cobrindo regras sensíveis de
autenticação, autorização, eventos, reservas, portaria, QR e compartilhamento.
Os testes E2E foram elaborados com apoio integral de IA e validados durante a
execução do projeto. Mantenho essa distinção explícita para que a avaliação tenha
visibilidade honesta do processo.

Além dos testes, o projeto usa TypeScript, ESLint, validação de DTOs, erros com
códigos de domínio e verificações de ambiente em produção para segredos e banco.

---

## Deploy: Vercel e Neon

O deploy está dividido em dois projetos Vercel apontando para o mesmo
repositório: um para a Web Next.js e outro para a API NestJS. O PostgreSQL está
no Neon.

### 1. Criar o banco no Neon

1. Crie um projeto PostgreSQL no [Neon](https://neon.tech/).
2. Copie a connection string do pooler com SSL.
3. Em uma máquina local, configure \`DATABASE_URL\` com essa string.
4. Aplique as migrations de modo controlado:

   \`\`\`bash
   DATABASE_URL="<connection-string-do-neon>" npm run db:migrate
   \`\`\`

Não execute \`prisma migrate dev\` contra produção. O projeto usa migrations
versionadas; \`db:migrate\` executa \`prisma migrate deploy\`.

### 2. Publicar a API NestJS na Vercel

Crie um novo projeto Vercel a partir deste repositório e configure:

| Campo da Vercel | Valor |
| --- | --- |
| Production Branch | \`main\` |
| Root Directory | \`apps/api\` |
| Framework Preset | \`Other\` |
| Output Directory | \`public\` |
| Include source files outside Root Directory | Habilitado |

Adicione estas variáveis ao ambiente **Production** da API:

\`\`\`env
NODE_ENV=production
DATABASE_URL=<connection-string-do-neon>
JWT_SECRET=<segredo-aleatorio-com-32-ou-mais-caracteres>
TICKET_SIGNING_SECRET=<outro-segredo-aleatorio-com-32-ou-mais-caracteres>
TICKETMASTER_API_KEY=<consumer-key-opcional>
RESERVATION_HOLD_MINUTES=10
CORS_ORIGINS=https://<dominio-da-web>.vercel.app
\`\`\`

Não defina \`PORT\` na Vercel. A API usa Functions Node em \`apps/api/api\`; o
\`vercel.json\` encaminha todas as rotas \`/api/*\` à aplicação Nest. Após o
deploy, teste \`https://<dominio-da-api>.vercel.app/api/events\`.

### 3. Publicar a Web Next.js na Vercel

Crie outro projeto Vercel com:

| Campo da Vercel | Valor |
| --- | --- |
| Production Branch | \`main\` |
| Root Directory | \`apps/web\` |
| Framework Preset | \`Next.js\` |
| Build Command | Padrão da Vercel |
| Output Directory | Não configurar |

Configure:

\`\`\`env
NEXT_PUBLIC_API_URL=https://<dominio-da-api>.vercel.app/api
\`\`\`

\`NEXT_PUBLIC_API_URL\` é incorporada no build do Next.js. Sempre que ela mudar,
faça um novo deploy da Web. Depois, copie a URL exata da Web para
\`CORS_ORIGINS\` da API, sem barra ao final, e redeploy a API.

### Verificação pós-deploy

\`\`\`bash
curl -i https://<dominio-da-api>.vercel.app/api/events
curl -i https://<dominio-da-api>.vercel.app/api/events/featured
\`\`\`

A primeira resposta deve conter o catálogo; a segunda deve retornar somente os
eventos em destaque. Para validar credenciais, use as contas da seção
[Dados de demonstração](#dados-de-demonstração).

---

## Uso de IA

O desafio solicita transparência sobre o uso de IA. Usei o **GPT-5.6** como
apoio de pair programming, principalmente para acelerar implementação de CSS,
refinamento de regras de negócio, revisão de código, testes E2E e iterações de
layout. A ferramenta foi um acelerador de execução, não uma fonte autônoma de
decisões de produto.

### O que partiu de decisões minhas

- O nome **EventDev** e a decisão de usar as cores de referência da Verzel como
  base contextual do desafio.
- A direção cromática, a ideia do monograma \`ED\` e a necessidade de criar uma
  marca consistente antes de expandir as telas.
- A arquitetura visual: identidade escura/editorial, CSS Modules, formulário de
  login equilibrado com o ticket, carrossel de destaque e composição geral.
- A decisão de buscar inspiração em produtos como Sympla, Ingresse, Eventim e
  Cheers sem copiar uma interface específica, combinando padrões em uma solução
  com a minha própria leitura do produto.
- A priorização para caber no prazo: catálogo, criação, reserva, pagamento,
  ticket, transferência e portaria antes de expansões periféricas.
- A estruturação inicial de pastas, a escolha do monorepo e a modelagem inicial
  do banco de dados. O schema evoluiu conforme novas regras surgiram.

### Onde a IA ajudou diretamente

- Construção e refinamento de CSS a partir de direções visuais específicas, para
  evitar que as telas parecessem um template genérico.
- Geração de alternativas para frases de marca e microcopy, que depois foram
  selecionadas e ajustadas de acordo com o tom desejado.
- Apoio na implementação de regras de reserva, estados de ticket,
  compartilhamento, proteção de estoque e integração das camadas.
- Elaboração dos testes E2E e apoio nos testes unitários.
- Revisões de responsividade, espaçamento, carrossel e composição do ingresso
  visual da tela de login - áreas em que também fiz ajustes manuais até chegar
  ao resultado pretendido.

Minha preocupação foi usar IA para acelerar tarefas repetitivas e explorar
opções, mantendo escolhas de escopo, produto, identidade e composição sob meu
controle. O resultado não nasceu de um único prompt: foi iterado com critérios
visuais e funcionais definidos ao longo do desenvolvimento.

---

## Limites e próximos passos

### Limites conscientes desta entrega

- **Pagamento simulado:** a decisão de aprovar ou recusar o pagamento demonstra
  os dois ramos do requisito sem processar dinheiro real.
- **Somente Ticketmaster:** escolhi não integrar TMDb para manter o foco em
  eventos e shows, sem dispersar esforço em dois catálogos.
- **Ingressos por quantidade:** Pista e Pista Premium resolvem o requisito;
  ainda não há mapa visual de assentos para cinema ou teatro.
- **Estrutura operacional de demonstração:** há um organizador e uma conta de
  portaria sem vínculo operacional exclusivo entre si.
- **Mobile:** a aplicação é responsiva, mas eu dedicaria mais uma rodada de
  refinamento a layouts mobile específicos se houvesse mais tempo.

### Evoluções priorizadas

1. **Checkout sandbox:** integrar Stripe, Mercado Pago ou outro provedor em
   ambiente de testes, substituindo a escolha manual de aprovação/recusa.
2. **Multi-organizador e portaria por evento:** permitir criar mais
   organizadores; fazer o organizador convidar e gerir contas de portaria,
   restringindo cada equipe somente aos próprios eventos.
3. **Mapa de assentos:** suportar cinema e teatro com seleção em tempo real,
   mantendo a proteção transacional contra dupla venda.
4. **Recuperação de senha e envio de ingresso por e-mail:** importantes para uso
   público real, mas fora do escopo obrigatório.
5. **Polimento mobile adicional:** revisar densidade, áreas de toque e layouts
   compactos em telas pequenas.

Mesmo com esses próximos passos, a entrega atual cobre o fluxo completo pedido:
do organizador ao cliente, do pagamento simulado à entrada validada na portaria.
