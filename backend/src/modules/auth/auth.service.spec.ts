import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked-jwt-token'),
    };

    authService = new AuthService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  it('registers a new user and returns access token', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    prismaService.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      role: UserRole.USER,
    });

    const result = await authService.register({
      email: 'Test@example.com',
      password: 'password123',
    });

    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(prismaService.user.create).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'mocked-jwt-token',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.USER,
      },
    });
  });

  it('throws ConflictException when email already exists', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      email: 'test@example.com',
    });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in an existing user and returns access token', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash:
        '$2b$10$g840JMFqFrJc0cP/8znEfeKRJsuywBuaXmK4MK2nkt5K169iF3pzG',
      role: UserRole.USER,
    });

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(result.accessToken).toBe('mocked-jwt-token');
    expect(result.user.email).toBe('test@example.com');
  });

  it('throws UnauthorizedException for invalid password', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash:
        '$2b$10$g840JMFqFrJc0cP/8znEfeKRJsuywBuaXmK4MK2nkt5K169iF3pzG',
      role: UserRole.USER,
    });

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
