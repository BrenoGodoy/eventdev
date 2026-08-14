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
export const SESSION_EXPIRED_EVENT = "eventdev:session-expired";

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
    const session = JSON.parse(rawSession) as AuthSession;

    if (!isValidSession(session) || tokenExpirationMs(session.token) <= Date.now()) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function expireSession() {
  if (typeof window === "undefined") {
    return;
  }

  clearSession();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function tokenExpirationMs(token: string) {
  try {
    const encodedPayload = token.split(".")[1];
    const normalizedPayload = encodedPayload
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    const payload = JSON.parse(
      window.atob(
        normalizedPayload.padEnd(
          Math.ceil(normalizedPayload.length / 4) * 4,
          "=",
        ),
      ),
    ) as { exp?: unknown };

    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function isValidSession(value: AuthSession) {
  return Boolean(
    value &&
      typeof value.token === "string" &&
      value.tokenType === "Bearer" &&
      typeof value.user?.id === "string" &&
      typeof value.user?.name === "string" &&
      typeof value.user?.email === "string" &&
      ["ORGANIZER", "CUSTOMER", "GATE"].includes(value.user?.role),
  );
}
