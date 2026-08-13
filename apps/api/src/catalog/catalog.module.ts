import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TicketmasterService } from './ticketmaster.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, TicketmasterService],
  exports: [CatalogService],
})
export class CatalogModule {}
