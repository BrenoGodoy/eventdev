import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { Roles } from '../auth/roles.decorator';
import { GateService } from './gate.service';
import type { ValidateTicketInput } from './gate.types';

@Controller('gate')
@Roles(UserRole.GATE)
export class GateController {
  constructor(private readonly gateService: GateService) {}

  @Get('events')
  findEvents() {
    return this.gateService.findEvents();
  }

  @Get('checks')
  findChecks(
    @Req() request: AuthenticatedRequest,
    @Query('eventId') eventId?: string,
  ) {
    return this.gateService.findChecks(request.user.id, eventId);
  }

  @Post('validate')
  validate(
    @Req() request: AuthenticatedRequest,
    @Body() input: ValidateTicketInput,
  ) {
    return this.gateService.validate(request.user, input);
  }
}
