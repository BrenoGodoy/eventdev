import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  const getAllAndOverride = jest.fn();
  const authenticate = jest.fn();
  const reflector = { getAllAndOverride } as unknown as Reflector;
  const authService = { authenticate } as unknown as AuthService;
  const guard = new AuthGuard(reflector, authService);

  function contextWithAuthorization(authorization?: string) {
    const request: {
      headers: { authorization?: string };
      user?: unknown;
    } = { headers: { authorization } };
    const context = {
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  beforeEach(() => {
    getAllAndOverride.mockReset();
    authenticate.mockReset();
  });

  it('skips authentication on public routes', async () => {
    getAllAndOverride.mockReturnValue(true);
    const { context } = contextWithAuthorization();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('authenticates and attaches the database user to protected requests', async () => {
    getAllAndOverride.mockReturnValue(false);
    const user = {
      id: 'usr_gate_001',
      name: 'Portaria Elite',
      email: 'portaria@elite.dev',
      role: UserRole.GATE,
    };
    authenticate.mockResolvedValue(user);
    const { context, request } = contextWithAuthorization('Bearer token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authenticate).toHaveBeenCalledWith('Bearer token');
    expect(request.user).toEqual(user);
  });
});
