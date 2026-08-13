import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const getAllAndOverride = jest.fn();
  const reflector = { getAllAndOverride } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  function contextFor(role: UserRole) {
    return {
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => getAllAndOverride.mockReset());

  it('allows a user whose role is required', () => {
    getAllAndOverride.mockReturnValue([UserRole.ORGANIZER]);

    expect(guard.canActivate(contextFor(UserRole.ORGANIZER))).toBe(true);
  });

  it('denies a user whose role is not required', () => {
    getAllAndOverride.mockReturnValue([UserRole.GATE]);

    expect(() => guard.canActivate(contextFor(UserRole.CUSTOMER))).toThrow(
      ForbiddenException,
    );
  });

  it('allows authenticated access when no role restriction exists', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextFor(UserRole.CUSTOMER))).toBe(true);
  });
});
