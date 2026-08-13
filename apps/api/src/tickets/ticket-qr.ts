import { createHmac, timingSafeEqual } from 'node:crypto';

export type TicketQrClaims = {
  version: 1;
  ticketId: string;
  eventId: string;
  publicCode: string;
  nonce: string;
};

export type SignedTicketQr = TicketQrClaims & {
  signature: string;
};

export function signTicketClaims(claims: TicketQrClaims) {
  return createHmac('sha256', ticketSigningSecret())
    .update(ticketSignatureSource(claims))
    .digest('base64url');
}

export function createTicketQrPayload(
  claims: TicketQrClaims,
  signature = signTicketClaims(claims),
) {
  return JSON.stringify({
    ...claims,
    signature,
  });
}

export function parseTicketQrPayload(value: string): SignedTicketQr | null {
  if (!value || value.length > 4096) {
    return null;
  }

  try {
    const payload = JSON.parse(value) as Partial<SignedTicketQr>;
    const fields = [
      payload.ticketId,
      payload.eventId,
      payload.publicCode,
      payload.nonce,
      payload.signature,
    ];

    if (
      payload.version !== 1 ||
      fields.some(
        (field) =>
          typeof field !== 'string' || field.length === 0 || field.length > 256,
      )
    ) {
      return null;
    }

    return payload as SignedTicketQr;
  } catch {
    return null;
  }
}

export function verifyTicketQrPayload(payload: SignedTicketQr) {
  const expectedBuffer = Buffer.from(signTicketClaims(payload));
  const receivedBuffer = Buffer.from(payload.signature);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function ticketSignatureSource(claims: TicketQrClaims) {
  return `${claims.ticketId}.${claims.eventId}.${claims.publicCode}.${claims.nonce}`;
}

function ticketSigningSecret() {
  return (
    process.env.TICKET_SIGNING_SECRET ??
    process.env.JWT_SECRET ??
    'eventdev-local-ticket-signing-secret'
  );
}
