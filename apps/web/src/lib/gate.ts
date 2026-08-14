import { apiBaseUrl } from "./api";
import { expireSession } from "./auth";

export type GateEvent = {
  id: string;
  slug: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  capacity: number;
  issuedTickets: number;
  checkedIn: number;
};

export type GateValidationStatus =
  "VALID" | "INVALID" | "ALREADY_USED" | "WRONG_EVENT";

export type GateValidation = {
  status: GateValidationStatus;
  message: string;
  checkedAt: string;
  selectedEvent: { id: string; title: string };
  ticket: {
    id: string;
    publicCode: string;
    holderName: string;
    tierName: string;
    usedAt: string | null;
    event: { id: string; title: string };
  } | null;
};

export type GateCheck = {
  id: string;
  result: "ALLOWED" | "DENIED" | "DUPLICATE" | "INVALID";
  createdAt: string;
  event: { id: string; title: string };
  ticket: {
    publicCode: string;
    tier: { name: string } | null;
    owner: { name: string };
  } | null;
};

export function fetchGateEvents(token: string, signal?: AbortSignal) {
  return gateRequest<{ events: GateEvent[]; total: number }>(
    `${apiBaseUrl}/gate/events`,
    token,
    { signal },
  );
}

export function fetchGateChecks(
  token: string,
  eventId?: string,
  signal?: AbortSignal,
) {
  const url = new URL(`${apiBaseUrl}/gate/checks`);
  if (eventId) {
    url.searchParams.set("eventId", eventId);
  }

  return gateRequest<{ checks: GateCheck[]; total: number }>(
    url.toString(),
    token,
    { signal },
  );
}

export function validateGateTicket(
  token: string,
  input: { eventId: string; qrPayload?: string; publicCode?: string },
) {
  return gateRequest<GateValidation>(`${apiBaseUrl}/gate/validate`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

async function gateRequest<T>(url: string, token: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      expireSession();
    }
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(message || "Não foi possível concluir a leitura.");
  }

  return (await response.json()) as T;
}
