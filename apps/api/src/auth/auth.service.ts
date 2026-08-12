import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DEMO_USERS, DemoUser } from './demo-users';

type LoginInput = {
  email?: unknown;
  password?: unknown;
};

type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: DemoUser['role'];
  iat: number;
  exp: number;
};

type PublicUser = Omit<DemoUser, 'password'>;

@Injectable()
export class AuthService {
  private readonly jwtSecret =
    process.env.JWT_SECRET ?? 'eventdev-local-demo-secret';

  login(input: LoginInput) {
    const email = typeof input.email === 'string' ? input.email.trim() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    const user = DEMO_USERS.find((candidate) => candidate.email === email);

    if (!user || user.password !== password) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha invalidos.',
      });
    }

    const publicUser = this.toPublicUser(user);
    const expiresInSeconds = 60 * 60 * 8;
    const token = this.signToken(publicUser, expiresInSeconds);

    return {
      token,
      tokenType: 'Bearer',
      expiresInSeconds,
      user: publicUser,
    };
  }

  me(authorization?: string) {
    const payload = this.verifyAuthorizationHeader(authorization);
    const user = DEMO_USERS.find((candidate) => candidate.id === payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        code: 'SESSION_USER_NOT_FOUND',
        message: 'Sessao invalida.',
      });
    }

    return { user: this.toPublicUser(user) };
  }

  private toPublicUser(user: DemoUser): PublicUser {
    const { password: _password, ...publicUser } = user;

    return publicUser;
  }

  private signToken(user: PublicUser, expiresInSeconds: number): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.encodeJson({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encodeJson({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: now,
      exp: now + expiresInSeconds,
    });
    const body = `${header}.${payload}`;
    const signature = this.sign(body);

    return `${body}.${signature}`;
  }

  private verifyAuthorizationHeader(authorization?: string): TokenPayload {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'MISSING_TOKEN',
        message: 'Token ausente.',
      });
    }

    const token = authorization.slice('Bearer '.length);
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token invalido.',
      });
    }

    const expectedSignature = this.sign(`${header}.${payload}`);
    const received = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN_SIGNATURE',
        message: 'Assinatura invalida.',
      });
    }

    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as TokenPayload;

    if (decoded.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException({
        code: 'TOKEN_EXPIRED',
        message: 'Sessao expirada.',
      });
    }

    return decoded;
  }

  private encodeJson(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private sign(value: string): string {
    return createHmac('sha256', this.jwtSecret)
      .update(value)
      .digest('base64url');
  }
}
