import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(
    @Query()
    query: {
      query?: string;
      state?: string;
      date?: string;
      maxPrice?: string;
    },
  ) {
    return this.eventsService.findAll(query);
  }

  @Get('featured')
  findFeatured() {
    return this.eventsService.findFeatured();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.eventsService.findOne(slug);
  }
}
