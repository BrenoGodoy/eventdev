import { apiBaseUrl } from "./api";

export type UserRole = "ORGANIZER" | "CUSTOMER" | "GATE";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSession = {
  token: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  user: AuthUser;
};

const STORAGE_KEY = "eventdev.session";

export async function login(email: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(
      await readAuthError(response, "E-mail ou senha inválidos."),
    );
  }

  return (await response.json()) as AuthSession;
}

export async function registerCustomer(
  name: string,
  email: string,
  password: string,
) {
  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    throw new Error(
      await readAuthError(response, "Não foi possível criar sua conta."),
    );
  }

  return (await response.json()) as AuthSession;
}

async function readAuthError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || fallback;
  } catch {
    return fallback;
  }
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") {
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
