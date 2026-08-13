import { apiBaseUrl } from "./api";
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
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(message || "Nao foi possivel concluir a solicitacao.");
  }

  return (await response.json()) as T;
}
