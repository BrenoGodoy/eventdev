import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { OrganizerEventsController } from './organizer-events.controller';

@Module({
  imports: [PrismaModule, CatalogModule],
  controllers: [EventsController, OrganizerEventsController],
  providers: [EventsService],
})
export class EventsModule {}
