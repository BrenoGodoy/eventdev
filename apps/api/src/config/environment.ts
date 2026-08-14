const LOCAL_JWT_SECRET = 'eventdev-local-demo-secret';
const LOCAL_TICKET_SECRET = 'eventdev-local-ticket-signing-secret';

export function jwtSecret() {
  return process.env.JWT_SECRET?.trim() || LOCAL_JWT_SECRET;
}

export function ticketSigningSecret() {
  return process.env.TICKET_SIGNING_SECRET?.trim() || LOCAL_TICKET_SECRET;
}

export function corsOrigins() {
  const configured =
    process.env.CORS_ORIGINS ?? process.env.WEB_URL ?? 'http://localhost:3000';

  return configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function validateEnvironment() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const secrets = [
    ['JWT_SECRET', process.env.JWT_SECRET],
    ['TICKET_SIGNING_SECRET', process.env.TICKET_SIGNING_SECRET],
  ] as const;

  for (const [name, value] of secrets) {
    if (!value || value.trim().length < 32 || value.includes('change-me')) {
      throw new Error(
        `${name} deve ser configurado com pelo menos 32 caracteres em produção.`,
      );
    }
  }

  if (process.env.JWT_SECRET === process.env.TICKET_SIGNING_SECRET) {
    throw new Error(
      'JWT_SECRET e TICKET_SIGNING_SECRET devem ser segredos distintos em produção.',
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL deve ser configurada em produção.');
  }
}
