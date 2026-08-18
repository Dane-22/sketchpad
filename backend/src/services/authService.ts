import { prisma } from '../config/db';
import { hashPassword, comparePassword } from '../utils/passwordHash';
import { generateToken } from '../utils/jwt';
import { cacheService } from '../config/redis';

const CACHE_TTL = 900; // 15 minutes

export const authService = {
  async register(data: any) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email is already in use');
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        role: data.role || 'ENGINEER',
      },
    });

    const { password, ...userWithoutPassword } = user;
    const token = generateToken({ userId: user.id, role: user.role });

    await cacheService.set(`user:${user.id}`, JSON.stringify(userWithoutPassword), CACHE_TTL);

    return { user: userWithoutPassword, token };
  },

  async login(data: any) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const { password, ...userWithoutPassword } = user;
    const token = generateToken({ userId: user.id, role: user.role });

    await cacheService.set(`user:${user.id}`, JSON.stringify(userWithoutPassword), CACHE_TTL);

    return { user: userWithoutPassword, token };
  },
};
