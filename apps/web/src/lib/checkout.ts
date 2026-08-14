import { apiBaseUrl } from "./api";

export type ReservationItem = {
  id?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  tier: {
    id: string;
    type: "GENERAL" | "PREMIUM";
    name: string;
    description: string;
  };
};

export type CheckoutReservation = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "EXPIRED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  expiresAt: string | null;
  quantity: number;
  total: number;
  createdAt: string;
  event: {
    id: string;
    slug: string;
    title: string;
    date: string;
    venue: string;
    city: string;
    state: string;
    imageUrl: string;
    imageAlt: string;
  };
  items: ReservationItem[];
};

export type EventTicket = {
  id: string;
  publicCode: string;
  qrPayload: string;
  status: "ACTIVE" | "USED" | "CANCELED" | "TRANSFERRED";
  usedAt: string | null;
  createdAt: string;
  reservationId: string;
  event: CheckoutReservation["event"];
  tier: {
    id: string;
    type: "GENERAL" | "PREMIUM";
    name: string;
  } | null;
};

export type TicketShareLink = {
  token: string;
  expiresAt: string;
  expiresInSeconds: number;
  ticket: {
    id: string;
    eventTitle: string;
  };
};

export type AcceptedTicketShare = {
  transferred: true;
  acceptedAt: string;
  ticket: {
    id: string;
    eventTitle: string;
  };
};

export function createReservation(
  eventId: string,
  items: Array<{ tierId: string; quantity: number }>,
  token: string,
) {
  return authenticatedRequest<{ reservation: CheckoutReservation }>(
    `${apiBaseUrl}/reservations`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, items }),
    },
  );
}

export function fetchReservation(
  reservationId: string,
  token: string,
  signal?: AbortSignal,
) {
  return authenticatedRequest<{ reservation: CheckoutReservation }>(
    `${apiBaseUrl}/reservations/${encodeURIComponent(reservationId)}`,
    token,
    { signal },
  );
}

export function simulatePayment(
  reservationId: string,
  scenario: "APPROVED" | "DECLINED",
  token: string,
) {
  return authenticatedRequest<{
    outcome: "APPROVED" | "DECLINED";
    reservation: CheckoutReservation;
    tickets: EventTicket[];
  }>(
    `${apiBaseUrl}/reservations/${encodeURIComponent(reservationId)}/payment`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    },
  );
}

export function fetchMyTickets(token: string, signal?: AbortSignal) {
  return authenticatedRequest<{ tickets: EventTicket[]; total: number }>(
    `${apiBaseUrl}/tickets/mine`,
    token,
    { signal },
  );
}

export function createTicketShare(ticketId: string, token: string) {
  return authenticatedRequest<TicketShareLink>(
    `${apiBaseUrl}/tickets/${encodeURIComponent(ticketId)}/share`,
    token,
    { method: "POST" },
  );
}

export function acceptTicketShare(shareToken: string, token: string) {
  return authenticatedRequest<AcceptedTicketShare>(
    `${apiBaseUrl}/tickets/shares/${encodeURIComponent(shareToken)}/accept`,
    token,
    { method: "POST" },
  );
}

async function authenticatedRequest<T>(
  url: string,
  token: string,
  init: RequestInit,
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
