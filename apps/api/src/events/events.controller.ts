import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Public()
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
  @Public()
  findFeatured() {
    return this.eventsService.findFeatured();
  }

  @Get(':slug')
  @Public()
  findOne(@Param('slug') slug: string) {
    return this.eventsService.findOne(slug);
  }
}
