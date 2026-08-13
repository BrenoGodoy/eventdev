-- Event descriptions are stored as Markdown and rendered on the public detail page.
UPDATE "Event"
SET "description" = $markdown$
## Sobre a experiencia

O **Elite Dev Conf 2026** aproxima tecnologia, produto e pessoas em um dia de conteudo pratico e conversas que continuam depois do palco.

### O que voce encontra

- Palestras sobre engenharia e produto
- Networking com profissionais de diferentes mercados
- Espacos para trocar ideias e criar novas conexoes

Chegue cedo para aproveitar toda a programacao e conhecer a comunidade EventDev.
$markdown$
WHERE "slug" = 'elite-dev-conf-2026';

UPDATE "Event"
SET "description" = $markdown$
## Uma noite para sentir de perto

O **Aurora Live Sessions** mistura musica ao vivo, cenografia imersiva e artistas que estao abrindo novos caminhos na cena independente.

### Nesta edicao

- Shows em formato intimista
- Intervencoes visuais durante as apresentacoes
- Area de convivencia e gastronomia local

Os portoes abrem uma hora antes do primeiro show. A classificacao e de 18 anos.
$markdown$
WHERE "slug" = 'aurora-live-sessions';

UPDATE "Event"
SET "description" = $markdown$
## Cinema depois do anoitecer

A **Noite Sci-Fi 2049** transforma o rooftop em uma sala de cinema a ceu aberto, com trilha especial e experiencias para quem gosta de imaginar outros futuros.

### Prepare-se para

- Sessao comentada em tela ampla
- Instalacoes luminosas e espacos interativos
- Bar tematico durante toda a noite

Leve um agasalho leve. Em caso de chuva, a programacao acontece na area coberta.
$markdown$
WHERE "slug" = 'noite-sci-fi-2049';

UPDATE "Event"
SET "description" = $markdown$
## Ideias que ampliam horizontes

A **Horizonte Conference 2026** reune profissionais que constroem produtos digitais, lideram equipes e transformam negocios com tecnologia.

### O passe inclui

- Acesso a todos os palcos
- Trilhas de engenharia, design e negocios
- Almoco e espacos de networking

O credenciamento comeca as 8h. Tenha seu ingresso digital em maos.
$markdown$
WHERE "slug" = 'horizonte-conference-2026';

UPDATE "Event"
SET "description" = $markdown$
## O palco como ponto de encontro

**Cena Aberta** combina danca, teatro e performances autorais em uma programacao criada para aproximar artistas e publico.

### Programacao

- Tres obras curtas na mesma noite
- Conversa com os artistas depois das apresentacoes
- Bar e foyer abertos antes do espetaculo

A casa abre 45 minutos antes do inicio. A classificacao e de 14 anos.
$markdown$
WHERE "slug" = 'cena-aberta';

UPDATE "Event"
SET "description" = $markdown$
## A cidade em movimento

O **Pulso Urbano Festival** ocupa o Parque das Artes com musica, arte urbana e gastronomia independente do inicio da tarde ate a noite.

### Pelo parque

- Dois palcos com artistas nacionais
- Galeria ao ar livre e pintura ao vivo
- Feira criativa e cozinha de produtores locais

O evento e para todas as idades. Menores de 16 anos devem estar acompanhados por um responsavel.
$markdown$
WHERE "slug" = 'pulso-urbano-festival';
