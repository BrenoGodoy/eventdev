import { apiBaseUrl } from "./api";
import { expireSession } from "./auth";
import { CatalogEvent } from "./events";

export type CatalogAttraction = {
  provider: "TICKETMASTER";
  externalId: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  category: string;
  genre: string | null;
  subGenre: string | null;
  sourceUrl: string | null;
  locale: string | null;
  upcomingEvents: number | null;
};

export type AttractionSearchResponse = {
  attractions: CatalogAttraction[];
  source: "TICKETMASTER" | "DEMO";
  notice: string | null;
};

export type CreateOrganizerEventInput = {
  externalId: string;
  title: string;
  description: string;
  category: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  price: string;
  capacity: string;
  availableQuantity: string;
};

export type UpdateOrganizerEventInput = Omit<
  CreateOrganizerEventInput,
  "externalId"
>;

export function searchCatalogAttractions(
  query: string,
  token: string,
  signal?: AbortSignal,
) {
  const url = new URL(`${apiBaseUrl}/catalog/attractions`);
  url.searchParams.set("query", query.trim());
  return authenticatedRequest<AttractionSearchResponse>(url, token, { signal });
}

export function fetchOrganizerEvents(token: string, signal?: AbortSignal) {
  return authenticatedRequest<{ events: CatalogEvent[]; total: number }>(
    new URL(`${apiBaseUrl}/organizer/events`),
    token,
    { signal },
  );
}

export function fetchOrganizerEvent(
  eventId: string,
  token: string,
  signal?: AbortSignal,
) {
  return authenticatedRequest<{ event: CatalogEvent }>(
    new URL(`${apiBaseUrl}/organizer/events/${encodeURIComponent(eventId)}`),
    token,
    { signal },
  );
}

export function createOrganizerEvent(
  input: CreateOrganizerEventInput,
  token: string,
) {
  return authenticatedRequest<{ event: CatalogEvent }>(
    new URL(`${apiBaseUrl}/organizer/events`),
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function updateOrganizerEvent(
  eventId: string,
  input: UpdateOrganizerEventInput,
  token: string,
) {
  return authenticatedRequest<{ event: CatalogEvent }>(
    new URL(`${apiBaseUrl}/organizer/events/${encodeURIComponent(eventId)}`),
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function cancelOrganizerEvent(eventId: string, token: string) {
  return authenticatedRequest<{ event: CatalogEvent }>(
    new URL(
      `${apiBaseUrl}/organizer/events/${encodeURIComponent(eventId)}/cancel`,
    ),
    token,
    { method: "POST" },
  );
}

async function authenticatedRequest<T>(
  url: URL,
  token: string,
  init: RequestInit = {},
) {
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
    throw new Error(message || "Não foi possível concluir a solicitação.");
  }

  return (await response.json()) as T;
}
