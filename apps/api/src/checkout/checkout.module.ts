import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketSharingService } from '../tickets/ticket-sharing.service';
import { CheckoutService } from './checkout.service';
import { ReservationsController } from './reservations.controller';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReservationsController, TicketsController],
  providers: [CheckoutService, TicketSharingService],
})
export class CheckoutModule {}
