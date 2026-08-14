import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../auth/roles.decorator';
import { EventsService } from './events.service';
import type { CreateOrganizerEventInput } from './events.service';
import type { UpdateOrganizerEventInput } from './events.service';

@Controller('organizer/events')
@Roles(UserRole.ORGANIZER)
export class OrganizerEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findMine(@Req() request: AuthenticatedRequest) {
    return this.eventsService.findMine(request.user.id);
  }

  @Get(':eventId')
  findMineById(
    @Req() request: AuthenticatedRequest,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.findMineById(request.user.id, eventId);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateOrganizerEventInput,
  ) {
    return this.eventsService.createForOrganizer(request.user, input);
  }

  @Patch(':eventId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Body() input: UpdateOrganizerEventInput,
  ) {
    return this.eventsService.updateForOrganizer(
      request.user.id,
      eventId,
      input,
    );
  }

  @Post(':eventId/cancel')
  @HttpCode(200)
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.cancelForOrganizer(request.user.id, eventId);
  }
}
