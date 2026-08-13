import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../auth/roles.decorator';
import { CheckoutService } from './checkout.service';
import type {
  CreateReservationInput,
  SimulatePaymentInput,
} from './checkout.types';

@Controller('reservations')
@Roles(UserRole.CUSTOMER)
export class ReservationsController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateReservationInput,
  ) {
    return this.checkoutService.createReservation(request.user, input);
  }

  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') reservationId: string,
  ) {
    return this.checkoutService.findReservation(request.user.id, reservationId);
  }

  @Post(':id/payment')
  simulatePayment(
    @Req() request: AuthenticatedRequest,
    @Param('id') reservationId: string,
    @Body() input: SimulatePaymentInput,
  ) {
    return this.checkoutService.simulatePayment(
      request.user,
      reservationId,
      input,
    );
  }
}
