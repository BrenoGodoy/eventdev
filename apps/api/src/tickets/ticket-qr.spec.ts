import {
  createTicketQrPayload,
  parseTicketQrPayload,
  verifyTicketQrPayload,
} from './ticket-qr';

describe('ticket QR signature', () => {
  const claims = {
    version: 1 as const,
    ticketId: 'ticket-1',
    eventId: 'event-1',
    publicCode: 'ED-ABC123',
    nonce: 'nonce-1',
  };

  it('signs and verifies a QR payload', () => {
    const payload = parseTicketQrPayload(createTicketQrPayload(claims));

    expect(payload).not.toBeNull();
    expect(payload && verifyTicketQrPayload(payload)).toBe(true);
  });

  it('rejects modified QR claims', () => {
    const payload = parseTicketQrPayload(createTicketQrPayload(claims));

    expect(
      payload &&
        verifyTicketQrPayload({ ...payload, eventId: 'another-event' }),
    ).toBe(false);
  });

  it('rejects malformed content', () => {
    expect(parseTicketQrPayload('not-json')).toBeNull();
  });
});
