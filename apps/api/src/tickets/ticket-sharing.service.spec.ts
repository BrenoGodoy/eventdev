import {
  ConflictException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketSharingService } from './ticket-sharing.service';

type CreateTicketRecord = {
  id: string;
  ownerId: string;
  status: TicketStatus;
  usedAt: Date | null;
  event: { title: string };
};

type ShareRecord = {
  id: string;
  ticketId: string;
  createdById: string;
  revokedAt: Date | null;
  consumedAt: Date | null;
  expiresAt: Date;
  ticket: {
    id: string;
    eventId: string;
    ownerId: string;
    status: TicketStatus;
    usedAt: Date | null;
    event: { title: string };
  };
};

type ShareUpdateArgs = {
  where: Record<string, unknown>;
  data: {
    acceptedById?: string;
    consumedAt?: Date;
    revokedAt?: Date;
  };
};

type ShareCreateArgs = {
  data: {
    ticketId: string;
    createdById: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  };
};

type TicketUpdateArgs = {
  where: {
    id?: string;
    ownerId?: string;
    status?: TicketStatus;
    usedAt?: null;
  };
  data: {
    ownerId?: string;
    publicCode?: string;
    nonce?: string;
    signature?: string;
  };
};

describe('TicketSharingService', () => {
  const ticketFindUnique =
    jest.fn<(args: unknown) => Promise<CreateTicketRecord | null>>();
  const ticketUpdateMany =
    jest.fn<(args: TicketUpdateArgs) => Promise<{ count: number }>>();
  const shareFindUnique =
    jest.fn<(args: unknown) => Promise<ShareRecord | null>>();
  const shareUpdateMany =
    jest.fn<(args: ShareUpdateArgs) => Promise<{ count: number }>>();
  const shareCreate =
    jest.fn<(args: ShareCreateArgs) => Promise<{ id: string }>>();
  const transactionClient = {
    ticket: {
      findUnique: ticketFindUnique,
      updateMany: ticketUpdateMany,
    },
    shareToken: {
      findUnique: shareFindUnique,
      updateMany: shareUpdateMany,
      create: shareCreate,
    },
  };
  const transaction = jest.fn(
    (callback: (client: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const service = new TicketSharingService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a 30-minute token for the current owner and stores only its hash', async () => {
    ticketFindUnique.mockResolvedValue({
      id: 'ticket-1',
      ownerId: 'owner-1',
      status: TicketStatus.ACTIVE,
      usedAt: null,
      event: { title: 'Evento' },
    });
    shareUpdateMany.mockResolvedValue({ count: 0 });
    let createdShare: ShareCreateArgs | undefined;
    shareCreate.mockImplementation((args: ShareCreateArgs) => {
      createdShare = args;
      return Promise.resolve({ id: 'share-1' });
    });

    const before = Date.now();
    const result = await service.createShareToken('owner-1', 'ticket-1');
    const after = Date.now();

    if (!createdShare) {
      throw new Error('O token não foi persistido.');
    }

    const storedData = createdShare.data;

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{32,128}$/);
    expect(result.expiresInSeconds).toBe(1800);
    expect(storedData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedData.tokenHash).not.toBe(result.token);
    expect(storedData.createdById).toBe('owner-1');
    expect(storedData.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 1_800_000,
    );
    expect(storedData.expiresAt.getTime()).toBeLessThanOrEqual(
      after + 1_800_000,
    );
  });

  it('does not let another customer generate a link', async () => {
    ticketFindUnique.mockResolvedValue({
      id: 'ticket-1',
      ownerId: 'owner-1',
      status: TicketStatus.ACTIVE,
      usedAt: null,
      event: { title: 'Evento' },
    });

    await expect(
      service.createShareToken('customer-2', 'ticket-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(shareCreate).not.toHaveBeenCalled();
  });

  it('claims the token and transfers ownership with fresh ticket credentials', async () => {
    shareFindUnique.mockResolvedValue({
      id: 'share-1',
      ticketId: 'ticket-1',
      createdById: 'owner-1',
      revokedAt: null,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      ticket: {
        id: 'ticket-1',
        eventId: 'event-1',
        ownerId: 'owner-1',
        status: TicketStatus.ACTIVE,
        usedAt: null,
        event: { title: 'Evento' },
      },
    });
    const shareUpdates: ShareUpdateArgs[] = [];
    let ticketUpdate: TicketUpdateArgs | undefined;
    shareUpdateMany.mockImplementation((args: ShareUpdateArgs) => {
      shareUpdates.push(args);
      return Promise.resolve({ count: shareUpdates.length === 1 ? 1 : 0 });
    });
    ticketUpdateMany.mockImplementation((args: TicketUpdateArgs) => {
      ticketUpdate = args;
      return Promise.resolve({ count: 1 });
    });

    const result = await service.acceptShareToken(
      'recipient-1',
      'a'.repeat(43),
    );

    expect(result.transferred).toBe(true);

    const claimedShare = shareUpdates[0];

    if (!claimedShare || !ticketUpdate) {
      throw new Error('A transferência não atualizou os registros esperados.');
    }

    expect(claimedShare.data.acceptedById).toBe('recipient-1');
    expect(claimedShare.data.consumedAt).toBeInstanceOf(Date);
    expect(ticketUpdate.where.id).toBe('ticket-1');
    expect(ticketUpdate.where.ownerId).toBe('owner-1');
    expect(ticketUpdate.data.ownerId).toBe('recipient-1');
    expect(ticketUpdate.data.publicCode).toMatch(/^ED-[A-F0-9]{12}$/);
    expect(typeof ticketUpdate.data.nonce).toBe('string');
    expect(typeof ticketUpdate.data.signature).toBe('string');
  });

  it('rejects an expired link without changing the ticket', async () => {
    shareFindUnique.mockResolvedValue({
      id: 'share-1',
      ticketId: 'ticket-1',
      createdById: 'owner-1',
      revokedAt: null,
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1),
      ticket: {
        id: 'ticket-1',
        eventId: 'event-1',
        ownerId: 'owner-1',
        status: TicketStatus.ACTIVE,
        usedAt: null,
        event: { title: 'Evento' },
      },
    });

    await expect(
      service.acceptShareToken('recipient-1', 'b'.repeat(43)),
    ).rejects.toBeInstanceOf(GoneException);

    expect(ticketUpdateMany).not.toHaveBeenCalled();
  });

  it('rolls back when another recipient transfers the ticket first', async () => {
    shareFindUnique.mockResolvedValue({
      id: 'share-1',
      ticketId: 'ticket-1',
      createdById: 'owner-1',
      revokedAt: null,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      ticket: {
        id: 'ticket-1',
        eventId: 'event-1',
        ownerId: 'owner-1',
        status: TicketStatus.ACTIVE,
        usedAt: null,
        event: { title: 'Evento' },
      },
    });
    shareUpdateMany.mockResolvedValue({ count: 1 });
    ticketUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.acceptShareToken('recipient-1', 'c'.repeat(43)),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
