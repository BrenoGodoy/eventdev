import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EventStatus,
  GateCheckResult,
  Prisma,
  TicketStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  parseTicketQrPayload,
  verifyTicketQrPayload,
} from '../tickets/ticket-qr';
import type { GateValidationStatus, ValidateTicketInput } from './gate.types';

const ticketForGateSelect = {
  id: true,
  eventId: true,
  publicCode: true,
  signature: true,
  nonce: true,
  status: true,
  usedAt: true,
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      state: true,
    },
  },
  tier: { select: { name: true } },
  reservation: {
    select: {
      user: { select: { name: true } },
      paymentStatus: true,
    },
  },
} satisfies Prisma.TicketSelect;

type GateTicket = Prisma.TicketGetPayload<{
  select: typeof ticketForGateSelect;
}>;

@Injectable()
export class GateService {
  constructor(private readonly prisma: PrismaService) {}

  async findEvents() {
    const events = await this.prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      orderBy: [{ date: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        date: true,
        venue: true,
        city: true,
        state: true,
        capacity: true,
        _count: {
          select: {
            tickets: true,
            gateChecks: { where: { result: GateCheckResult.ALLOWED } },
          },
        },
      },
    });

    return {
      events: events.map(({ _count, ...event }) => ({
        ...event,
        date: event.date.toISOString(),
        issuedTickets: _count.tickets,
        checkedIn: _count.gateChecks,
      })),
      total: events.length,
    };
  }

  async findChecks(gateUserId: string, eventId?: string) {
    const normalizedEventId = eventId?.trim();
    const checks = await this.prisma.gateCheck.findMany({
      where: {
        gateUserId,
        ...(normalizedEventId ? { eventId: normalizedEventId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        result: true,
        createdAt: true,
        event: { select: { id: true, title: true } },
        ticket: {
          select: {
            publicCode: true,
            tier: { select: { name: true } },
            reservation: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    return {
      checks: checks.map((check) => ({
        ...check,
        createdAt: check.createdAt.toISOString(),
      })),
      total: checks.length,
    };
  }

  async validate(gateUser: AuthUser, input: ValidateTicketInput) {
    const eventId = input?.eventId?.trim();
    const qrPayload = input?.qrPayload?.trim();
    const publicCode = input?.publicCode?.trim().toUpperCase();

    if (!eventId) {
      throw new BadRequestException('Selecione o evento da portaria.');
    }

    if (Boolean(qrPayload) === Boolean(publicCode)) {
      throw new BadRequestException(
        'Informe um QR ou um codigo de ingresso, mas nao os dois.',
      );
    }

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, status: EventStatus.PUBLISHED },
      select: { id: true, title: true },
    });

    if (!event) {
      throw new BadRequestException('Evento indisponivel para a portaria.');
    }

    const source = qrPayload ?? publicCode ?? '';
    const codeHash = createHash('sha256').update(source).digest('hex');
    let ticket: GateTicket | null = null;

    if (qrPayload) {
      const payload = parseTicketQrPayload(qrPayload);

      if (payload && verifyTicketQrPayload(payload)) {
        ticket = await this.prisma.ticket.findUnique({
          where: { id: payload.ticketId },
          select: ticketForGateSelect,
        });

        if (
          !ticket ||
          ticket.eventId !== payload.eventId ||
          ticket.publicCode !== payload.publicCode ||
          ticket.nonce !== payload.nonce ||
          ticket.signature !== payload.signature
        ) {
          ticket = null;
        }
      }
    } else if (publicCode) {
      ticket = await this.prisma.ticket.findUnique({
        where: { publicCode },
        select: ticketForGateSelect,
      });
    }

    if (!ticket) {
      return this.recordResult(gateUser.id, event, null, 'INVALID', codeHash);
    }

    if (ticket.eventId !== event.id) {
      return this.recordResult(
        gateUser.id,
        event,
        ticket,
        'WRONG_EVENT',
        codeHash,
      );
    }

    if (ticket.status === TicketStatus.USED) {
      return this.recordResult(
        gateUser.id,
        event,
        ticket,
        'ALREADY_USED',
        codeHash,
      );
    }

    if (
      ticket.status !== TicketStatus.ACTIVE ||
      ticket.reservation.paymentStatus !== 'PAID'
    ) {
      return this.recordResult(gateUser.id, event, ticket, 'INVALID', codeHash);
    }

    return this.prisma.$transaction(async (transaction) => {
      const checkedAt = new Date();
      const consumed = await transaction.ticket.updateMany({
        where: {
          id: ticket.id,
          eventId: event.id,
          status: TicketStatus.ACTIVE,
        },
        data: { status: TicketStatus.USED, usedAt: checkedAt },
      });

      if (consumed.count !== 1) {
        const current = await transaction.ticket.findUnique({
          where: { id: ticket.id },
          select: ticketForGateSelect,
        });

        return this.recordResult(
          gateUser.id,
          event,
          current ?? ticket,
          current?.status === TicketStatus.USED ? 'ALREADY_USED' : 'INVALID',
          codeHash,
          transaction,
        );
      }

      await transaction.gateCheck.create({
        data: {
          ticketId: ticket.id,
          eventId: event.id,
          gateUserId: gateUser.id,
          result: GateCheckResult.ALLOWED,
          codeHash,
          createdAt: checkedAt,
        },
      });

      return this.response('VALID', event, { ...ticket, usedAt: checkedAt });
    });
  }

  private async recordResult(
    gateUserId: string,
    event: { id: string; title: string },
    ticket: GateTicket | null,
    status: Exclude<GateValidationStatus, 'VALID'>,
    codeHash: string,
    database: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    await database.gateCheck.create({
      data: {
        ticketId: ticket?.id,
        eventId: event.id,
        gateUserId,
        result: this.gateResult(status),
        codeHash,
      },
    });

    return this.response(status, event, ticket);
  }

  private response(
    status: GateValidationStatus,
    selectedEvent: { id: string; title: string },
    ticket: GateTicket | null,
  ) {
    const messages: Record<GateValidationStatus, string> = {
      VALID: 'Entrada autorizada. Ingresso validado com sucesso.',
      INVALID: 'Entrada negada. Ingresso invalido ou cancelado.',
      ALREADY_USED: 'Entrada negada. Este ingresso ja foi utilizado.',
      WRONG_EVENT: `Entrada negada. Este ingresso pertence a ${ticket?.event.title ?? 'outro evento'}.`,
    };

    return {
      status,
      message: messages[status],
      checkedAt: new Date().toISOString(),
      selectedEvent,
      ticket: ticket
        ? {
            id: ticket.id,
            publicCode: ticket.publicCode,
            holderName: ticket.reservation.user.name,
            tierName: ticket.tier?.name ?? 'Ingresso',
            usedAt: ticket.usedAt?.toISOString() ?? null,
            event: {
              id: ticket.event.id,
              title: ticket.event.title,
            },
          }
        : null,
    };
  }

  private gateResult(status: Exclude<GateValidationStatus, 'VALID'>) {
    const results = {
      INVALID: GateCheckResult.INVALID,
      ALREADY_USED: GateCheckResult.DUPLICATE,
      WRONG_EVENT: GateCheckResult.DENIED,
    } as const;

    return results[status];
  }
}
