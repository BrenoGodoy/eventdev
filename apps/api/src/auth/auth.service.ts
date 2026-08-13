import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth-user';

type LoginInput = {
  email?: unknown;
  password?: unknown;
};

type TokenPayload = {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginInput) {
    const email =
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha invalidos.',
      });
    }

    const publicUser = this.toPublicUser(user);
    const expiresInSeconds = 60 * 60 * 8;
    const token = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: expiresInSeconds },
    );

    return {
      token,
      tokenType: 'Bearer',
      expiresInSeconds,
      user: publicUser,
    };
  }

  async authenticate(authorization?: string): Promise<AuthUser> {
    const token = this.extractBearerToken(authorization);
    let payload: TokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Sessao invalida ou expirada.',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'SESSION_USER_NOT_FOUND',
        message: 'Sessao invalida.',
      });
    }

    return this.toPublicUser(user);
  }

  private extractBearerToken(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'MISSING_TOKEN',
        message: 'Token ausente.',
      });
    }

    const token = authorization.slice('Bearer '.length);

    if (!token) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token invalido.',
      });
    }

    return token;
  }

  private toPublicUser(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
