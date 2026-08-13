import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../auth/roles.decorator';
import { EventsService } from './events.service';
import type { CreateOrganizerEventInput } from './events.service';

@Controller('organizer/events')
@Roles(UserRole.ORGANIZER)
export class OrganizerEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findMine(@Req() request: AuthenticatedRequest) {
    return this.eventsService.findMine(request.user.id);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateOrganizerEventInput,
  ) {
    return this.eventsService.createForOrganizer(request.user, input);
  }
}
