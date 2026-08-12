import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email?: unknown; password?: unknown }) {
    return this.authService.login(body);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.me(authorization);
  }
}
