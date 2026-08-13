import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CheckoutService } from './checkout.service';
import { ReservationsController } from './reservations.controller';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReservationsController, TicketsController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
