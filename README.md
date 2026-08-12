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

Use a senha `Elite123!` para as tres contas:

| Papel | E-mail |
| --- | --- |
| Organizador | `organizer@elite.dev` |
| Cliente | `cliente1@elite.dev` |
| Portaria | `portaria@elite.dev` |
