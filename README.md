# EventDev

EventDev é uma plataforma completa de gerenciamento de eventos e venda de ingressos desenvolvida como solução para o Desafio Elite Dev 2026 da Verzel.

## Identidade visual

Estas são as cores oficiais da aplicação e devem ser preservadas em novas telas e componentes:

| Token | Cor | Uso principal |
| --- | --- | --- |
| Ink | `#0B1020` | Texto, fundos escuros e alto contraste |
| Paper | `#F7F8FB` | Fundo principal da aplicação |
| Violet | `#7367F0` | Ações primárias e destaques da marca |
| Acid | `#B7E400` | Acentos, foco e indicadores de alta visibilidade |
| Success | `#1D8A5A` | Estados de sucesso e validações positivas |
| Danger | `#C94242` | Erros, alertas e ações destrutivas |

Os tokens ficam centralizados em `apps/web/src/app/globals.css`. Esse arquivo contém somente a fundação global da interface: paleta, tipografia, medidas compartilhadas, reset e estilos de elementos HTML. Estilos de páginas e componentes usam CSS Modules colocados ao lado do código que os utiliza.

```text
apps/web/src/
├── app/
│   ├── globals.css          # tokens, reset e estilos globais
│   ├── page.module.css      # Home
│   └── login/
│       └── page.module.css  # Login
└── components/
    ├── brand/               # marca compartilhada
    └── ui/                  # estilos visuais reutilizáveis
```

## Credenciais demo

As contas abaixo são criadas no PostgreSQL pelas migrations. Cada uma possui um
papel distinto e deve ser usada apenas para desenvolvimento e avaliação local.

| Nome | Papel | E-mail | Senha | Acesso esperado |
| --- | --- | --- | --- | --- |
| Organizador Elite | Organizador | `organizer@elite.dev` | `Organizer123!` | Criar e gerenciar eventos |
| Cliente Elite | Cliente | `cliente@elite.dev` | `Cliente123!` | Reservar, pagar e acessar ingressos |
| Cliente Convidado | Cliente | `cliente2@elite.dev` | `Cliente2123!` | Percorrer uma segunda jornada de compra independente |
| Portaria Elite | Portaria | `portaria@elite.dev` | `Portaria123!` | Validar ingressos na entrada |

As senhas são armazenadas exclusivamente como hashes bcrypt. Após o login, a API
emite um JWT de oito horas. Rotas protegidas recarregam o usuário do banco e aplicam
o papel atual por meio dos guards globais de autenticação e autorização.

## Integracao com a Ticketmaster

O fluxo do organizador usa a Discovery API para pesquisar **atracoes**. A
Ticketmaster fornece a identidade editorial inicial (nome, imagem e
classificacao), enquanto data, horario, local, descricao, preco e estoque sao
definidos no EventDev e persistidos no PostgreSQL.

Crie uma chave no portal de desenvolvedores da Ticketmaster e informe-a antes
de subir o ambiente:

```bash
export TICKETMASTER_API_KEY="sua-chave"
npm run docker:dev
```

Para execucao local da API, a mesma variavel pode ser adicionada a
`apps/api/.env`. Sem a chave, o backend ativa um catalogo local sinalizado na
interface, permitindo testar criacao e publicacao sem simular uma chamada
externa. Eventos so entram no catalogo publico depois que o organizador os
publica; a atracao externa, sozinha, nunca vira um evento do EventDev.

O banco de demonstracao inclui seis eventos publicados baseados em atracoes
reais consultadas na Discovery API: Coldplay, Harry Styles, Guns N' Roses, The
Mission, Pink Floyd e Fleetwood Mac. Nome editorial, imagem e classificacao
ficam preservados no `catalogSnapshot`; datas, locais, precos e estoques sao
fixtures do EventDev e nao representam uma agenda oficial dos artistas. Todos
os eventos possuem lotes **Pista** e **Pista Premium** com ingressos disponiveis
para percorrer o fluxo completo.

Rotas do organizador:

- `/organizador/eventos/novo`: busca uma atracao e publica um evento.
- `/organizador/eventos`: lista apenas os eventos do organizador autenticado.

## Reservas e ingressos

Eventos publicados possuem dois lotes por quantidade: **Pista** e **Pista
Premium**. Cada reserva bloqueia o estoque por dez minutos. A baixa usa uma
atualizacao condicional dentro de uma transacao PostgreSQL, impedindo duas
reservas concorrentes de consumir as mesmas unidades. Reservas expiradas
devolvem o estoque de cada lote automaticamente.

O pagamento e simulado com cenarios aprovado e recusado. A recusa permite nova
tentativa durante o prazo da reserva; a aprovacao confirma a compra e emite um
ingresso por unidade. Cada QR inclui um codigo publico, nonce e assinatura HMAC
gerada exclusivamente pela API.

Variaveis opcionais para desenvolvimento:

```env
RESERVATION_HOLD_MINUTES=10
TICKET_SIGNING_SECRET="um-segredo-diferente-do-jwt"
```

Rotas do cliente:

- `/eventos/:slug/checkout`: selecao, reserva e pagamento simulado.
- `/meus-ingressos`: carteira com os QRs assinados do cliente autenticado.

### Compartilhamento de ingresso

Na carteira, o titular pode gerar um link de transferência válido por 30
minutos. O token bruto aparece somente no link; o banco armazena seu hash
SHA-256. O destinatário precisa entrar com uma conta de cliente e o primeiro
aceite válido transfere o ingresso em uma transação atômica.

Depois da transferência, o ingresso sai da carteira anterior e recebe novo
QR, código público, nonce e assinatura. Links anteriores são revogados e não
podem ser reutilizados.

Rotas protegidas de compartilhamento:

- `POST /api/tickets/:ticketId/share`: gera um link para o titular atual.
- `POST /api/tickets/shares/:token/accept`: aceita o link e transfere o ingresso.
- `/compartilhar/:token`: conclui o aceite após a autenticação do destinatário.

## Portaria

O perfil de portaria acessa `/portaria`, seleciona o evento em operacao e pode
ler o QR pela camera ou digitar o codigo publico do ingresso. O backend valida a
assinatura HMAC do QR, compara o evento e consome o ingresso em uma transacao
condicional. Duas leituras concorrentes nunca autorizam duas entradas.

Os retornos operacionais sao **Ingresso valido**, **Ingresso invalido**, **Ja
utilizado** e **Evento errado**. Todas as tentativas ficam registradas em
`GateCheck`; entradas desconhecidas armazenam somente o hash SHA-256 do valor
lido, sem persistir o conteudo bruto do QR.

O acesso a camera exige `localhost` durante o desenvolvimento ou HTTPS no
ambiente publicado. Se a permissao for negada ou nao houver camera, o codigo
manual continua disponivel.

Rotas protegidas da portaria:

- `GET /api/gate/events`: eventos disponiveis e contagem de entradas.
- `POST /api/gate/validate`: valida QR ou codigo publico e registra a tentativa.
- `GET /api/gate/checks`: ultimas leituras do operador autenticado.
