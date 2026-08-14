import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { jwtSecret } from '../config/environment';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: { algorithm: 'HS256' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
