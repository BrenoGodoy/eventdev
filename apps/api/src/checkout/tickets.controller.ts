import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../auth/roles.decorator';
import { TicketSharingService } from '../tickets/ticket-sharing.service';
import { CheckoutService } from './checkout.service';

@Controller('tickets')
@Roles(UserRole.CUSTOMER)
export class TicketsController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly ticketSharingService: TicketSharingService,
  ) {}

  @Get('mine')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.checkoutService.findMyTickets(request.user.id);
  }

  @Post(':ticketId/share')
  createShare(
    @Req() request: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketSharingService.createShareToken(
      request.user.id,
      ticketId,
    );
  }

  @Post('shares/:token/accept')
  acceptShare(
    @Req() request: AuthenticatedRequest,
    @Param('token') token: string,
  ) {
    return this.ticketSharingService.acceptShareToken(request.user.id, token);
  }
}
