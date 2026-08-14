import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth-user';

type LoginInput = {
  email?: unknown;
  password?: unknown;
};

type RegisterCustomerInput = LoginInput & {
  name?: unknown;
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
        message: 'E-mail ou senha inválidos.',
      });
    }

    return this.createSession(user);
  }

  async registerCustomer(input: RegisterCustomerInput) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const email =
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';

    if (name.length < 2 || name.length > 80) {
      throw new BadRequestException({
        code: 'INVALID_NAME',
        message: 'Informe um nome entre 2 e 80 caracteres.',
      });
    }

    if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException({
        code: 'INVALID_EMAIL',
        message: 'Informe um e-mail válido.',
      });
    }

    if (
      password.length < 8 ||
      password.length > 72 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      throw new BadRequestException({
        code: 'INVALID_PASSWORD',
        message:
          'A senha deve ter entre 8 e 72 caracteres, com letra maiúscula, minúscula e número.',
      });
    }

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Este e-mail já está cadastrado.',
      });
    }

    let user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    };

    try {
      user = await this.prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await hash(password, 12),
          role: UserRole.CUSTOMER,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Este e-mail já está cadastrado.',
        });
      }

      throw error;
    }

    return this.createSession(user);
  }

  private async createSession(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }) {
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
        message: 'Sessão inválida ou expirada.',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'SESSION_USER_NOT_FOUND',
        message: 'Sessão inválida.',
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
        message: 'Token inválido.',
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
