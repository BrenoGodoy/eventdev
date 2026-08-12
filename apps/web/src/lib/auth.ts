export type UserRole = 'ORGANIZER' | 'CUSTOMER' | 'GATE';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  scenario: string;
};

export type AuthSession = {
  token: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthUser;
};

export type DemoAccount = {
  role: UserRole;
  label: string;
  email: string;
  password: string;
};

export const demoAccounts: DemoAccount[] = [
  {
    role: 'ORGANIZER',
    label: 'Organizador',
    email: 'organizer@elite.dev',
    password: 'Elite123!',
  },
  {
    role: 'CUSTOMER',
    label: 'Cliente',
    email: 'cliente1@elite.dev',
    password: 'Elite123!',
  },
  {
    role: 'GATE',
    label: 'Portaria',
    email: 'portaria@elite.dev',
    password: 'Elite123!',
  },
];

const STORAGE_KEY = 'eventdev.session';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function login(email: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('E-mail ou senha invalidos.');
  }

  return (await response.json()) as AuthSession;
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawSession = window.localStorage.getItem(STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
