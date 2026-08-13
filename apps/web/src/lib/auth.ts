import { apiBaseUrl } from "./api";

export type UserRole = 'ORGANIZER' | 'CUSTOMER' | 'GATE';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
    password: 'Organizer123!',
  },
  {
    role: 'CUSTOMER',
    label: 'Cliente principal',
    email: 'cliente@elite.dev',
    password: 'Cliente123!',
  },
  {
    role: 'CUSTOMER',
    label: 'Cliente convidado',
    email: 'cliente2@elite.dev',
    password: 'Cliente2123!',
  },
  {
    role: 'GATE',
    label: 'Portaria',
    email: 'portaria@elite.dev',
    password: 'Portaria123!',
  },
];

const STORAGE_KEY = 'eventdev.session';

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
