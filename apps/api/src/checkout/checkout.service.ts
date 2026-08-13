import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import {
  EventStatus,
  PaymentStatus,
  Prisma,
  ReservationStatus,
  TicketStatus,
} from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateReservationInput,
  SimulatePaymentInput,
} from './checkout.types';

const MAX_TICKETS_PER_RESERVATION = 6;
const DEFAULT_HOLD_MINUTES = 10;

const reservationSelect = {
  id: true,
  status: true,
  paymentStatus: true,
  expiresAt: true,
  quantity: true,
  total: true,
  createdAt: true,
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      state: true,
      imageUrl: true,
      imageAlt: true,
    },
  },
  items: {
    orderBy: { unitPrice: 'asc' },
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      subtotal: true,
      tier: {
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
        },
      },
    },
  },
} satisfies Prisma.ReservationSelect;

const ticketSelect = {
  id: true,
  publicCode: true,
  signature: true,
  nonce: true,
  status: true,
  usedAt: true,
  createdAt: true,
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      state: true,
      imageUrl: true,
      imageAlt: true,
    },
  },
  tier: {
    select: {
      id: true,
      type: true,
      name: true,
    },
  },
  reservation: {
    select: {
      id: true,
      userId: true,
      total: true,
    },
  },
} satisfies Prisma.TicketSelect;

@Injectable()
export class CheckoutService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckoutService.name);
  private expirationTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.expirationTimer = setInterval(() => {
      void this.releaseExpiredReservations().catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.error(`Falha ao liberar reservas expiradas: ${message}`);
      });
    }, 30_000);
    this.expirationTimer.unref();
  }

  onModuleDestroy() {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
    }
  }

  async createReservation(user: AuthUser, input: CreateReservationInput) {
    const eventId = input?.eventId?.trim();

    if (!eventId) {
      throw new BadRequestException('Evento nao informado.');
    }

    const requestedItems = this.validateItems(input?.items);
    await this.releaseExpiredReservations(eventId);

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, status: EventStatus.PUBLISHED },
      select: {
        id: true,
        date: true,
        ticketTiers: {
          where: {
            id: { in: requestedItems.map((item) => item.tierId) },
            active: true,
          },
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    if (!event || event.date.getTime() <= Date.now()) {
      throw new NotFoundException('Evento indisponivel para reservas.');
    }

    if (event.ticketTiers.length !== requestedItems.length) {
      throw new BadRequestException('Um dos tipos de ingresso e invalido.');
    }

    const tiersById = new Map(event.ticketTiers.map((tier) => [tier.id, tier]));
    const items = requestedItems.map((item) => {
      const tier = tiersById.get(item.tierId);

      if (!tier) {
        throw new BadRequestException('Tipo de ingresso invalido.');
      }

      const unitPrice = Number(tier.price);
      return {
        ...item,
        unitPrice,
        subtotal: Math.round(unitPrice * item.quantity * 100) / 100,
      };
    });
    const quantity = items.reduce((total, item) => total + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const expiresAt = new Date(Date.now() + this.holdMinutes() * 60 * 1000);

    const reservation = await this.prisma.$transaction(async (transaction) => {
      for (const item of items) {
        const updatedTier = await transaction.eventTicketTier.updateMany({
          where: {
            id: item.tierId,
            eventId,
            active: true,
            availableQuantity: { gte: item.quantity },
          },
          data: { availableQuantity: { decrement: item.quantity } },
        });

        if (updatedTier.count !== 1) {
          throw new ConflictException(
            'Quantidade indisponivel. Atualize a selecao e tente novamente.',
          );
        }
      }

      const updatedEvent = await transaction.event.updateMany({
        where: {
          id: eventId,
          status: EventStatus.PUBLISHED,
          availableQuantity: { gte: quantity },
        },
        data: { availableQuantity: { decrement: quantity } },
      });

      if (updatedEvent.count !== 1) {
        throw new ConflictException(
          'Estoque do evento foi atualizado. Tente novamente.',
        );
      }

      return transaction.reservation.create({
        data: {
          userId: user.id,
          eventId,
          status: ReservationStatus.PENDING,
          expiresAt,
          quantity,
          total,
          paymentStatus: PaymentStatus.PENDING,
          items: {
            create: items.map((item) => ({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              tier: { connect: { id: item.tierId } },
            })),
          },
        },
        select: reservationSelect,
      });
    });

    return { reservation: this.serializeReservation(reservation) };
  }

  async findReservation(userId: string, reservationId: string) {
    await this.releaseReservationIfExpired(reservationId);

    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, userId },
      select: reservationSelect,
    });

    if (!reservation) {
      throw new NotFoundException('Reserva nao encontrada.');
    }

    return { reservation: this.serializeReservation(reservation) };
  }

  async simulatePayment(
    user: AuthUser,
    reservationId: string,
    input: SimulatePaymentInput,
  ) {
    if (input?.scenario !== 'APPROVED' && input?.scenario !== 'DECLINED') {
      throw new BadRequestException('Cenario deve ser APPROVED ou DECLINED.');
    }

    await this.releaseReservationIfExpired(reservationId);
    const current = await this.prisma.reservation.findFirst({
      where: { id: reservationId, userId: user.id },
      select: { id: true, status: true, expiresAt: true },
    });

    if (!current) {
      throw new NotFoundException('Reserva nao encontrada.');
    }

    if (
      current.status !== ReservationStatus.PENDING ||
      !current.expiresAt ||
      current.expiresAt.getTime() <= Date.now()
    ) {
      throw new GoneException('Reserva expirada ou ja processada.');
    }

    if (input.scenario === 'DECLINED') {
      const reservation = await this.prisma.$transaction(
        async (transaction) => {
          const declined = await transaction.reservation.updateMany({
            where: {
              id: current.id,
              userId: user.id,
              status: ReservationStatus.PENDING,
              expiresAt: { gt: new Date() },
            },
            data: { paymentStatus: PaymentStatus.FAILED },
          });

          if (declined.count !== 1) {
            throw new ConflictException('Reserva ja processada ou expirada.');
          }

          return transaction.reservation.findUniqueOrThrow({
            where: { id: current.id },
            select: reservationSelect,
          });
        },
      );

      return {
        outcome: 'DECLINED' as const,
        reservation: this.serializeReservation(reservation),
        tickets: [],
      };
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const confirmed = await transaction.reservation.updateMany({
        where: {
          id: current.id,
          userId: user.id,
          status: ReservationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: ReservationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      if (confirmed.count !== 1) {
        throw new ConflictException('Reserva ja processada ou expirada.');
      }

      const reservation = await transaction.reservation.findUniqueOrThrow({
        where: { id: current.id },
        select: {
          ...reservationSelect,
          eventId: true,
          items: {
            select: {
              quantity: true,
              tierId: true,
              unitPrice: true,
              subtotal: true,
              tier: {
                select: {
                  id: true,
                  type: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });
      const ticketsData = reservation.items.flatMap((item) =>
        Array.from({ length: item.quantity }, () =>
          this.createTicketData(current.id, reservation.eventId, item.tierId),
        ),
      );

      await transaction.ticket.createMany({ data: ticketsData });
      const tickets = await transaction.ticket.findMany({
        where: { reservationId: current.id },
        orderBy: { createdAt: 'asc' },
        select: ticketSelect,
      });

      return { reservation, tickets };
    });

    return {
      outcome: 'APPROVED' as const,
      reservation: this.serializeReservation(result.reservation),
      tickets: result.tickets.map((ticket) => this.serializeTicket(ticket)),
    };
  }

  async findMyTickets(userId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        reservation: { userId, paymentStatus: PaymentStatus.PAID },
      },
      orderBy: { createdAt: 'desc' },
      select: ticketSelect,
    });

    return {
      tickets: tickets.map((ticket) => this.serializeTicket(ticket)),
      total: tickets.length,
    };
  }

  async releaseExpiredReservations(eventId?: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        eventId,
        status: ReservationStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      take: 100,
      select: { id: true },
    });

    for (const reservation of reservations) {
      await this.releaseReservationIfExpired(reservation.id);
    }

    return reservations.length;
  }

  private async releaseReservationIfExpired(reservationId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const expired = await transaction.reservation.updateMany({
        where: {
          id: reservationId,
          status: ReservationStatus.PENDING,
          expiresAt: { lte: new Date() },
        },
        data: {
          status: ReservationStatus.EXPIRED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });

      if (expired.count !== 1) {
        return false;
      }

      const reservation = await transaction.reservation.findUniqueOrThrow({
        where: { id: reservationId },
        select: {
          eventId: true,
          quantity: true,
          items: { select: { tierId: true, quantity: true } },
        },
      });

      for (const item of reservation.items) {
        await transaction.eventTicketTier.update({
          where: { id: item.tierId },
          data: { availableQuantity: { increment: item.quantity } },
        });
      }

      await transaction.event.update({
        where: { id: reservation.eventId },
        data: { availableQuantity: { increment: reservation.quantity } },
      });

      return true;
    });
  }

  private validateItems(items: CreateReservationInput['items']) {
    if (!Array.isArray(items) || items.length === 0 || items.length > 2) {
      throw new BadRequestException('Selecione ao menos um tipo de ingresso.');
    }

    const normalized = items.map((item) => ({
      tierId: item?.tierId?.trim() ?? '',
      quantity: Number(item?.quantity),
    }));
    const uniqueTiers = new Set(normalized.map((item) => item.tierId));
    const quantity = normalized.reduce((sum, item) => sum + item.quantity, 0);

    if (
      uniqueTiers.size !== normalized.length ||
      normalized.some(
        (item) =>
          !item.tierId || !Number.isInteger(item.quantity) || item.quantity < 1,
      )
    ) {
      throw new BadRequestException('Selecao de ingressos invalida.');
    }

    if (quantity > MAX_TICKETS_PER_RESERVATION) {
      throw new BadRequestException(
        `Limite de ${MAX_TICKETS_PER_RESERVATION} ingressos por reserva.`,
      );
    }

    return normalized.sort((left, right) =>
      left.tierId.localeCompare(right.tierId),
    );
  }

  private createTicketData(
    reservationId: string,
    eventId: string,
    tierId: string,
  ) {
    const id = randomUUID();
    const publicCode = `ED-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const nonce = randomUUID();
    const signature = this.sign(`${id}.${eventId}.${publicCode}.${nonce}`);

    return {
      id,
      reservationId,
      eventId,
      tierId,
      publicCode,
      nonce,
      signature,
      status: TicketStatus.ACTIVE,
    };
  }

  private sign(payload: string) {
    const secret =
      process.env.TICKET_SIGNING_SECRET ??
      process.env.JWT_SECRET ??
      'eventdev-local-ticket-signing-secret';
    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  private holdMinutes() {
    const configured = Number(process.env.RESERVATION_HOLD_MINUTES);
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_HOLD_MINUTES;
  }

  private serializeReservation(reservation: {
    id: string;
    status: string;
    paymentStatus: string;
    expiresAt: Date | null;
    quantity: number;
    total: Prisma.Decimal;
    createdAt: Date;
    event: {
      id: string;
      slug: string;
      title: string;
      date: Date;
      venue: string;
      city: string;
      state: string;
      imageUrl: string;
      imageAlt: string;
    };
    items: Array<{
      id?: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      tier: {
        id: string;
        type: string;
        name: string;
        description: string;
      };
    }>;
  }) {
    return {
      ...reservation,
      expiresAt: reservation.expiresAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
      total: Number(reservation.total),
      event: {
        ...reservation.event,
        date: reservation.event.date.toISOString(),
      },
      items: reservation.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    };
  }

  private serializeTicket(ticket: {
    id: string;
    publicCode: string;
    signature: string;
    nonce: string;
    status: string;
    usedAt: Date | null;
    createdAt: Date;
    event: {
      id: string;
      slug: string;
      title: string;
      date: Date;
      venue: string;
      city: string;
      state: string;
      imageUrl: string;
      imageAlt: string;
    };
    tier: { id: string; type: string; name: string } | null;
    reservation: { id: string; userId: string; total: Prisma.Decimal };
  }) {
    return {
      id: ticket.id,
      publicCode: ticket.publicCode,
      status: ticket.status,
      usedAt: ticket.usedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
      event: { ...ticket.event, date: ticket.event.date.toISOString() },
      tier: ticket.tier,
      reservationId: ticket.reservation.id,
      qrPayload: JSON.stringify({
        version: 1,
        ticketId: ticket.id,
        eventId: ticket.event.id,
        publicCode: ticket.publicCode,
        nonce: ticket.nonce,
        signature: ticket.signature,
      }),
    };
  }
}
