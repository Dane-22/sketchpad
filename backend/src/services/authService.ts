import { prisma } from '../config/db';
import { hashPassword, comparePassword } from '../utils/passwordHash';
import { generateToken } from '../utils/jwt';
import { cacheService } from '../config/redis';
import { notificationService, getSocketServer } from './notificationService';

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

    // If there are zero users in DB, first user automatically becomes approved SUPER_ADMIN
    const totalUsersCount = await prisma.user.count();
    const isFirstUser = totalUsersCount === 0;

    const user = await (prisma as any).user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        role: isFirstUser ? 'SUPER_ADMIN' : (data.role || 'ENGINEER'),
        status: isFirstUser ? 'APPROVED' : 'PENDING',
        approvedAt: isFirstUser ? new Date() : null,
      },
    });

    const { password, ...userWithoutPassword } = user;

    if (isFirstUser) {
      const token = generateToken({ userId: user.id, role: user.role });
      await cacheService.set(`user:${user.id}`, JSON.stringify(userWithoutPassword), CACHE_TTL);
      return { 
        message: 'Initial Super Admin account created and approved.', 
        status: 'APPROVED', 
        user: userWithoutPassword, 
        token 
      };
    }

    // Emit live socket event to Super Admin room / connected clients
    const io = getSocketServer();
    if (io) {
      io.emit('admin-user-registered', {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      });
    }

    // Dispatch push & in-app notifications to all Super Admins and Admins
    try {
      const admins = await (prisma as any).user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN'] },
          status: 'APPROVED',
        },
        select: { id: true },
      });

      for (const admin of admins) {
        await notificationService.dispatch({
          userId: admin.id,
          type: 'CHAT_MENTION',
          title: 'New Account Awaiting Approval',
          body: `${user.fullName} (${user.email}) submitted a registration request.`,
          data: { applicantId: user.id, applicantEmail: user.email },
        });
      }
    } catch (notifErr) {
      console.warn('Could not dispatch admin registration notifications:', notifErr);
    }

    return {
      message: 'Your registration has been submitted and is pending Super Admin review.',
      status: 'PENDING',
      user: userWithoutPassword,
    };
  },

  async login(data: any) {
    const user = await (prisma as any).user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Verify account status
    if (user.status === 'PENDING') {
      throw new Error('ACCOUNT_PENDING');
    }

    if (user.status === 'REJECTED') {
      const reason = user.rejectionReason ? `: ${user.rejectionReason}` : '';
      throw new Error(`ACCOUNT_REJECTED${reason}`);
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('ACCOUNT_SUSPENDED');
    }

    const { password, ...userWithoutPassword } = user;
    const token = generateToken({ userId: user.id, role: user.role });

    await cacheService.set(`user:${user.id}`, JSON.stringify(userWithoutPassword), CACHE_TTL);

    return { user: userWithoutPassword, token };
  },
};
