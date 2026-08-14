import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { signTicketClaims } from './ticket-qr';

const SHARE_EXPIRATION_MINUTES = 30;

@Injectable()
export class TicketSharingService {
  constructor(private readonly prisma: PrismaService) {}

  async createShareToken(ownerId: string, ticketId: string) {
    const normalizedTicketId = ticketId?.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException('Ingresso não informado.');
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + SHARE_EXPIRATION_MINUTES * 60_000,
    );

    const ticket = await this.prisma.$transaction(async (transaction) => {
      const currentTicket = await transaction.ticket.findUnique({
        where: { id: normalizedTicketId },
        select: {
          id: true,
          ownerId: true,
          status: true,
          usedAt: true,
          event: { select: { title: true } },
        },
      });

      if (!currentTicket) {
        throw new NotFoundException('Ingresso não encontrado.');
      }

      if (currentTicket.ownerId !== ownerId) {
        throw new ForbiddenException(
          'Somente o titular pode compartilhar este ingresso.',
        );
      }

      if (
        currentTicket.status !== TicketStatus.ACTIVE ||
        currentTicket.usedAt
      ) {
        throw new ConflictException(
          'Apenas ingressos ativos podem ser compartilhados.',
        );
      }

      await transaction.shareToken.updateMany({
        where: {
          ticketId: currentTicket.id,
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: createdAt },
      });

      await transaction.shareToken.create({
        data: {
          ticketId: currentTicket.id,
          createdById: ownerId,
          tokenHash,
          expiresAt,
          createdAt,
        },
      });

      return currentTicket;
    });

    return {
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: SHARE_EXPIRATION_MINUTES * 60,
      ticket: {
        id: ticket.id,
        eventTitle: ticket.event.title,
      },
    };
  }

  async acceptShareToken(recipientId: string, rawToken: string) {
    const normalizedToken = rawToken?.trim();

    if (!normalizedToken || !/^[A-Za-z0-9_-]{32,128}$/.test(normalizedToken)) {
      throw new NotFoundException('Link de compartilhamento inválido.');
    }

    const tokenHash = this.hashToken(normalizedToken);
    const acceptedAt = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const share = await transaction.shareToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          ticketId: true,
          createdById: true,
          revokedAt: true,
          consumedAt: true,
          expiresAt: true,
          ticket: {
            select: {
              id: true,
              eventId: true,
              ownerId: true,
              status: true,
              usedAt: true,
              event: { select: { title: true } },
            },
          },
        },
      });

      if (!share) {
        throw new NotFoundException('Link de compartilhamento inválido.');
      }

      if (share.revokedAt || share.consumedAt) {
        throw new GoneException(
          'Este link já foi utilizado ou substituído por um novo.',
        );
      }

      if (share.expiresAt.getTime() <= acceptedAt.getTime()) {
        throw new GoneException(
          'Este link expirou. Solicite um novo compartilhamento.',
        );
      }

      if (share.createdById === recipientId) {
        throw new BadRequestException('Este ingresso já pertence à sua conta.');
      }

      if (
        share.ticket.ownerId !== share.createdById ||
        share.ticket.status !== TicketStatus.ACTIVE ||
        share.ticket.usedAt
      ) {
        throw new GoneException(
          'Este ingresso não está mais disponível para transferência.',
        );
      }

      const claim = await transaction.shareToken.updateMany({
        where: {
          id: share.id,
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: acceptedAt },
        },
        data: {
          acceptedById: recipientId,
          consumedAt: acceptedAt,
        },
      });

      if (claim.count !== 1) {
        throw new ConflictException(
          'Este link foi utilizado por outra pessoa.',
        );
      }

      const publicCode = `ED-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
      const nonce = randomUUID();
      const signature = signTicketClaims({
        version: 1,
        ticketId: share.ticket.id,
        eventId: share.ticket.eventId,
        publicCode,
        nonce,
      });

      const transferred = await transaction.ticket.updateMany({
        where: {
          id: share.ticket.id,
          ownerId: share.createdById,
          status: TicketStatus.ACTIVE,
          usedAt: null,
        },
        data: {
          ownerId: recipientId,
          publicCode,
          nonce,
          signature,
        },
      });

      if (transferred.count !== 1) {
        throw new ConflictException(
          'O ingresso já foi transferido ou não está mais ativo.',
        );
      }

      await transaction.shareToken.updateMany({
        where: {
          ticketId: share.ticketId,
          id: { not: share.id },
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: acceptedAt },
      });

      return {
        transferred: true as const,
        acceptedAt: acceptedAt.toISOString(),
        ticket: {
          id: share.ticket.id,
          eventTitle: share.ticket.event.title,
        },
      };
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
