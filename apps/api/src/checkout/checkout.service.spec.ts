import { BadRequestException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutService } from './checkout.service';

describe('CheckoutService', () => {
  const reservationFindMany = jest.fn();
  const reservationFindFirst = jest.fn();
  const eventFindFirst = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    reservation: {
      findMany: reservationFindMany,
      findFirst: reservationFindFirst,
    },
    event: { findFirst: eventFindFirst },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new CheckoutService(prisma);
  const customer = {
    id: 'customer-1',
    name: 'Cliente',
    email: 'customer@example.com',
    role: UserRole.CUSTOMER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reservationFindMany.mockResolvedValue([]);
  });

  it('enforces the maximum number of tickets per reservation', async () => {
    await expect(
      service.createReservation(customer, {
        eventId: 'event-1',
        items: [{ tierId: 'tier-1', quantity: 7 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(eventFindFirst).not.toHaveBeenCalled();
  });

  it('fails atomically when the conditional stock update cannot reserve the quantity', async () => {
    eventFindFirst.mockResolvedValue({
      id: 'event-1',
      date: new Date('2099-09-20T22:00:00.000Z'),
      ticketTiers: [{ id: 'tier-1', name: 'Pista', price: 100 }],
    });
    const tierUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    transaction.mockImplementation((callback) =>
      callback({ eventTicketTier: { updateMany: tierUpdateMany } }),
    );

    await expect(
      service.createReservation(customer, {
        eventId: 'event-1',
        items: [{ tierId: 'tier-1', quantity: 2 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tierUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'tier-1',
          availableQuantity: { gte: 2 },
        }),
        data: { availableQuantity: { decrement: 2 } },
      }),
    );
  });

  it('keeps a declined reservation pending for another attempt', async () => {
    const expiresAt = new Date('2099-09-20T22:00:00.000Z');
    const releaseTransaction = jest.fn().mockResolvedValue({ count: 0 });
    const declineTransaction = jest.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = jest.fn().mockResolvedValue({
      id: 'reservation-1',
      status: 'PENDING',
      paymentStatus: 'FAILED',
      expiresAt,
      quantity: 1,
      total: 100,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      event: {
        id: 'event-1',
        slug: 'evento',
        title: 'Evento',
        date: new Date('2099-09-20T22:00:00.000Z'),
        venue: 'Arena',
        city: 'São Paulo',
        state: 'SP',
        imageUrl: '/event.png',
        imageAlt: 'Evento',
      },
      items: [],
    });
    transaction
      .mockImplementationOnce((callback) =>
        callback({ reservation: { updateMany: releaseTransaction } }),
      )
      .mockImplementationOnce((callback) =>
        callback({
          reservation: {
            updateMany: declineTransaction,
            findUniqueOrThrow,
          },
        }),
      );
    reservationFindFirst.mockResolvedValue({
      id: 'reservation-1',
      status: 'PENDING',
      expiresAt,
    });

    const result = await service.simulatePayment(customer, 'reservation-1', {
      scenario: 'DECLINED',
    });

    expect(result.outcome).toBe('DECLINED');
    expect(result.reservation.status).toBe('PENDING');
    expect(result.reservation.paymentStatus).toBe('FAILED');
    expect(result.tickets).toEqual([]);
    expect(declineTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          expiresAt: { gt: expect.any(Date) },
        }),
      }),
    );
  });
});
