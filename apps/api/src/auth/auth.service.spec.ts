import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const findUnique = jest.fn();
  const signAsync = jest.fn();
  const verifyAsync = jest.fn();
  const prisma = {
    user: { findUnique },
  } as unknown as PrismaService;
  const jwtService = {
    signAsync,
    verifyAsync,
  } as unknown as JwtService;
  const service = new AuthService(prisma, jwtService);

  beforeEach(() => {
    findUnique.mockReset();
    signAsync.mockReset();
    verifyAsync.mockReset();
  });

  it('authenticates a database user without exposing the password hash', async () => {
    findUnique.mockResolvedValue({
      id: 'usr_customer_001',
      name: 'Cliente Elite',
      email: 'cliente@elite.dev',
      passwordHash: await hash('Cliente123!', 4),
      role: UserRole.CUSTOMER,
    });
    signAsync.mockResolvedValue('signed-token');

    const result = await service.login({
      email: ' CLIENTE@elite.dev ',
      password: 'Cliente123!',
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'cliente@elite.dev' },
    });
    expect(result).toEqual({
      token: 'signed-token',
      tokenType: 'Bearer',
      expiresInSeconds: 28800,
      user: {
        id: 'usr_customer_001',
        name: 'Cliente Elite',
        email: 'cliente@elite.dev',
        role: UserRole.CUSTOMER,
      },
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects an invalid password', async () => {
    findUnique.mockResolvedValue({
      id: 'usr_customer_001',
      name: 'Cliente Elite',
      email: 'cliente@elite.dev',
      passwordHash: await hash('Cliente123!', 4),
      role: UserRole.CUSTOMER,
    });

    await expect(
      service.login({
        email: 'cliente@elite.dev',
        password: 'senha-incorreta',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('reloads the current user and role from the database', async () => {
    verifyAsync.mockResolvedValue({
      sub: 'usr_organizer_001',
      role: UserRole.CUSTOMER,
    });
    findUnique.mockResolvedValue({
      id: 'usr_organizer_001',
      name: 'Organizador Elite',
      email: 'organizer@elite.dev',
      passwordHash: 'not-returned',
      role: UserRole.ORGANIZER,
    });

    await expect(
      service.authenticate('Bearer valid-token'),
    ).resolves.toEqual({
      id: 'usr_organizer_001',
      name: 'Organizador Elite',
      email: 'organizer@elite.dev',
      role: UserRole.ORGANIZER,
    });
  });

  it('rejects a missing bearer token', async () => {
    await expect(service.authenticate()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
