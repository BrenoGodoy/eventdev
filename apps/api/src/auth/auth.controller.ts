import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth-user';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: { email?: unknown; password?: unknown }) {
    return this.authService.login(body);
  }

  @Roles(UserRole.ORGANIZER, UserRole.CUSTOMER, UserRole.GATE)
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }
}
