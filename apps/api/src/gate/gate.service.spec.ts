import {
  GateCheckResult,
  PaymentStatus,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { GateService } from './gate.service';

describe('GateService', () => {
  const eventFindFirst = jest.fn();
  const ticketFindUnique = jest.fn();
  const gateCheckCreate = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    event: { findFirst: eventFindFirst },
    ticket: { findUnique: ticketFindUnique },
    gateCheck: { create: gateCheckCreate },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new GateService(prisma);
  const gateUser: AuthUser = {
    id: 'gate-1',
    name: 'Portaria',
    email: 'gate@example.com',
    role: UserRole.GATE,
  };
  const selectedEvent = { id: 'event-1', title: 'Evento principal' };
  const ticket = {
    id: 'ticket-1',
    eventId: 'event-1',
    publicCode: 'ED-ABC123',
    signature: 'signature',
    nonce: 'nonce',
    ownerId: 'customer-1',
    status: TicketStatus.ACTIVE,
    usedAt: null,
    event: {
      id: 'event-1',
      slug: 'evento-principal',
      title: 'Evento principal',
      date: new Date('2099-10-20T22:00:00.000Z'),
      venue: 'Arena',
      city: 'São Paulo',
      state: 'SP',
    },
    tier: { name: 'Pista' },
    owner: { name: 'Cliente atual' },
    reservation: {
      paymentStatus: PaymentStatus.PAID,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eventFindFirst.mockResolvedValue(selectedEvent);
    gateCheckCreate.mockResolvedValue({ id: 'check-1' });
  });

  it('records an unknown manual code as invalid without a ticket relation', async () => {
    ticketFindUnique.mockResolvedValue(null);

    const result = await service.validate(gateUser, {
      eventId: selectedEvent.id,
      publicCode: 'ED-UNKNOWN',
    });

    expect(result.status).toBe('INVALID');
    expect(gateCheckCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: undefined,
        result: GateCheckResult.INVALID,
        codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });

  it('returns wrong event while preserving the real ticket context', async () => {
    ticketFindUnique.mockResolvedValue({
      ...ticket,
      eventId: 'event-2',
      event: { ...ticket.event, id: 'event-2', title: 'Outro evento' },
    });

    const result = await service.validate(gateUser, {
      eventId: selectedEvent.id,
      publicCode: ticket.publicCode,
    });

    expect(result.status).toBe('WRONG_EVENT');
    expect(result.message).toContain('Outro evento');
    expect(gateCheckCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: GateCheckResult.DENIED }),
    });
  });

  it('returns already used without trying to consume the ticket again', async () => {
    ticketFindUnique.mockResolvedValue({
      ...ticket,
      status: TicketStatus.USED,
      usedAt: new Date('2099-10-20T21:30:00.000Z'),
    });

    const result = await service.validate(gateUser, {
      eventId: selectedEvent.id,
      publicCode: ticket.publicCode,
    });

    expect(result.status).toBe('ALREADY_USED');
    expect(transaction).not.toHaveBeenCalled();
    expect(gateCheckCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: GateCheckResult.DUPLICATE }),
    });
  });

  it('consumes an active paid ticket and records the allowed check atomically', async () => {
    ticketFindUnique.mockResolvedValue(ticket);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({ id: 'check-1' });
    transaction.mockImplementation((callback) =>
      callback({
        ticket: { updateMany },
        gateCheck: { create },
      }),
    );

    const result = await service.validate(gateUser, {
      eventId: selectedEvent.id,
      publicCode: ticket.publicCode,
    });

    expect(result.status).toBe('VALID');
    expect(result.ticket?.holderName).toBe('Cliente atual');
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TicketStatus.ACTIVE,
          ownerId: ticket.ownerId,
          publicCode: ticket.publicCode,
          nonce: ticket.nonce,
          signature: ticket.signature,
        }),
        data: expect.objectContaining({ status: TicketStatus.USED }),
      }),
    );
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: GateCheckResult.ALLOWED }),
    });
  });

  it('returns already used when another reader wins the conditional update', async () => {
    ticketFindUnique.mockResolvedValue(ticket);
    const currentTicket = {
      ...ticket,
      status: TicketStatus.USED,
      usedAt: new Date(),
    };
    const create = jest.fn().mockResolvedValue({ id: 'check-2' });
    transaction.mockImplementation((callback) =>
      callback({
        ticket: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue(currentTicket),
        },
        gateCheck: { create },
      }),
    );

    const result = await service.validate(gateUser, {
      eventId: selectedEvent.id,
      publicCode: ticket.publicCode,
    });

    expect(result.status).toBe('ALREADY_USED');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: GateCheckResult.DUPLICATE }),
    });
  });

  it('rejects stale ticket credentials when a transfer wins concurrently', async () => {
    ticketFindUnique.mockResolvedValue(ticket);
    const transferredTicket = {
      ...ticket,
      ownerId: 'customer-2',
      owner: { name: 'Novo titular' },
      publicCode: 'ED-NEW123',
      nonce: 'new-nonce',
      signature: 'new-signature',
    };
    const create = jest.fn().mockResolvedValue({ id: 'check-3' });
    transaction.mockImplementation((callback) =>
      callback({
        ticket: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue(transferredTicket),
        },
        gateCheck: { create },
      }),
    );

    const result = await service.validate(gateUser, {
      eventId: selectedEvent.id,
      publicCode: ticket.publicCode,
    });

    expect(result.status).toBe('INVALID');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: GateCheckResult.INVALID }),
    });
  });
});
