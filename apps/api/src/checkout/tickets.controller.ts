import { Controller, Get, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../auth/roles.decorator';
import { CheckoutService } from './checkout.service';

@Controller('tickets')
@Roles(UserRole.CUSTOMER)
export class TicketsController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get('mine')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.checkoutService.findMyTickets(request.user.id);
  }
}
