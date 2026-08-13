import { apiBaseUrl } from "./api";

export type CatalogEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  imageUrl: string;
  imageAlt: string;
  catalogProvider: "TICKETMASTER" | null;
  catalogExternalId: string | null;
  mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  price: number;
  capacity: number;
  availableQuantity: number;
  featured: boolean;
  featuredOrder: number | null;
  status: "DRAFT" | "PUBLISHED" | "CANCELED" | "FINISHED";
  createdAt: string;
  ticketTiers: EventTicketTier[];
};

export type EventTicketTier = {
  id: string;
  type: "GENERAL" | "PREMIUM";
  name: string;
  description: string;
  price: number;
  capacity: number;
  availableQuantity: number;
};

export type EventFilters = {
  query?: string;
  state?: string;
  date?: string;
  maxPrice?: string;
};

type EventsResponse = {
  events: CatalogEvent[];
  total: number;
};

export async function fetchEvents(
  filters: EventFilters = {},
  signal?: AbortSignal,
) {
  const url = new URL(`${apiBaseUrl}/events`);

  Object.entries(filters).forEach(([key, value]) => {
    if (value?.trim()) {
      url.searchParams.set(key, value.trim());
    }
  });

  return requestEvents(url, signal);
}

export function fetchFeaturedEvents(signal?: AbortSignal) {
  return requestEvents(new URL(`${apiBaseUrl}/events/featured`), signal);
}

export async function fetchEventBySlug(slug: string, signal?: AbortSignal) {
  const response = await fetch(
    `${apiBaseUrl}/events/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
      signal,
    },
  );

  if (response.status === 404) {
    throw new EventNotFoundError();
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o evento.");
  }

  return (await response.json()) as { event: CatalogEvent };
}

export class EventNotFoundError extends Error {
  constructor() {
    super("Evento nao encontrado.");
    this.name = "EventNotFoundError";
  }
}

async function requestEvents(url: URL, signal?: AbortSignal) {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar os eventos.");
  }

  return (await response.json()) as EventsResponse;
}

const priceFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatEventPrice(price: number) {
  return priceFormatter.format(price);
}

export function formatEventDate(date: string) {
  return dateFormatter.format(new Date(date)).replaceAll(".", "");
}

export function formatEventTime(date: string) {
  return timeFormatter.format(new Date(date));
}
