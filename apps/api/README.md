# EventDev API

API NestJS com autenticação JWT, autorização por papel, Prisma e PostgreSQL. A
documentação de instalação, variáveis e credenciais está no
[README principal](../../README.md).

```bash
npm run start:dev --workspace=api
npm run build --workspace=api
npm run start:prod --workspace=api
npm run lint --workspace=api
npm test --workspace=api -- --runInBand --no-watchman
```

As migrations são aplicadas com `npm run prisma:migrate --workspace=api`.
