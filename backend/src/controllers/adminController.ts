import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheService } from '../config/redis';
import { notificationService, getSocketServer } from '../services/notificationService';

export const adminController = {
  // 1. Get list of users with search and filter
  async getUsers(req: Request, res: Response) {
    try {
      const { status, role, search } = req.query;

      const where: any = {};

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (role && role !== 'ALL') {
        where.role = role;
      }

      if (search && typeof search === 'string' && search.trim() !== '') {
        where.OR = [
          { fullName: { contains: search.trim() } },
          { email: { contains: search.trim() } },
        ];
      }

      const users = await (prisma as any).user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          rejectionReason: true,
          approvedAt: true,
          approvedById: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ users, count: users.length });
    } catch (error: any) {
      console.error('Failed to get users:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  },

  // 2. Get high-level user statistics
  async getUserStats(_req: Request, res: Response) {
    try {
      const [total, pending, approved, rejected, suspended, superAdmins, admins] = await Promise.all([
        prisma.user.count(),
        (prisma as any).user.count({ where: { status: 'PENDING' } }),
        (prisma as any).user.count({ where: { status: 'APPROVED' } }),
        (prisma as any).user.count({ where: { status: 'REJECTED' } }),
        (prisma as any).user.count({ where: { status: 'SUSPENDED' } }),
        (prisma as any).user.count({ where: { role: 'SUPER_ADMIN' } }),
        (prisma as any).user.count({ where: { role: 'ADMIN' } }),
      ]);

      res.status(200).json({
        total,
        pending,
        approved,
        rejected,
        suspended,
        superAdmins,
        admins,
      });
    } catch (error: any) {
      console.error('Failed to get user stats:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch user statistics' });
    }
  },

  // 3. Approve a user registration
  async approveUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminUser = (req as any).user;

      const user = await (prisma as any).user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updateData: any = {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: adminUser.id,
        rejectionReason: null,
      };

      if (role && ['ENGINEER', 'ARCHITECT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        updateData.role = role;
      }

      const updatedUser = await (prisma as any).user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          approvedAt: true,
          createdAt: true,
        },
      });

      // Clear cache
      await cacheService.del(`user:${id}`);

      // Broadcast live event
      const io = getSocketServer();
      if (io) {
        io.emit('admin-user-status-changed', {
          userId: id,
          status: 'APPROVED',
          role: updatedUser.role,
        });
      }

      // Dispatch push / in-app notification to approved user
      try {
        await notificationService.dispatch({
          userId: id,
          type: 'CHAT_MENTION',
          title: 'Account Approved! 🎉',
          body: `Your account has been approved. You now have full access to ENG PLANNER.`,
          data: { status: 'APPROVED' },
        });
      } catch (err) {
        console.warn('Could not send approval notification to user:', err);
      }

      res.status(200).json({
        message: `User ${updatedUser.fullName} approved successfully.`,
        user: updatedUser,
      });
    } catch (error: any) {
      console.error('Failed to approve user:', error);
      res.status(500).json({ error: error.message || 'Failed to approve user' });
    }
  },

  // 4. Reject a user registration
  async rejectUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const user = await (prisma as any).user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await (prisma as any).user.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason || 'Application declined by Super Admin',
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          rejectionReason: true,
        },
      });

      // Clear cache
      await cacheService.del(`user:${id}`);

      // Broadcast live event
      const io = getSocketServer();
      if (io) {
        io.emit('admin-user-status-changed', {
          userId: id,
          status: 'REJECTED',
          reason: updatedUser.rejectionReason,
        });
      }

      res.status(200).json({
        message: `User ${updatedUser.fullName} registration rejected.`,
        user: updatedUser,
      });
    } catch (error: any) {
      console.error('Failed to reject user:', error);
      res.status(500).json({ error: error.message || 'Failed to reject user' });
    }
  },

  // 5. Update user role (Promote to Super Admin, Admin, Engineer, Architect)
  async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminUser = (req as any).user;

      if (!['ENGINEER', 'ARCHITECT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
      }

      // Only SUPER_ADMIN can grant SUPER_ADMIN role
      if (role === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only a Super Admin can promote another user to Super Admin' });
      }

      const user = await (prisma as any).user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await (prisma as any).user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
        },
      });

      // Clear cache
      await cacheService.del(`user:${id}`);

      // Broadcast live event
      const io = getSocketServer();
      if (io) {
        io.emit('admin-user-status-changed', {
          userId: id,
          status: user.status,
          role: updatedUser.role,
        });
      }

      res.status(200).json({
        message: `Role for ${updatedUser.fullName} updated to ${role}.`,
        user: updatedUser,
      });
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      res.status(500).json({ error: error.message || 'Failed to update user role' });
    }
  },

  // 6. Delete user permanently
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;

      if (id === adminUser.id) {
        return res.status(400).json({ error: 'You cannot delete your own admin account' });
      }

      const user = await (prisma as any).user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Delete dependencies
      await (prisma as any).pushSubscription.deleteMany({ where: { userId: id } });
      await (prisma as any).notification.deleteMany({ where: { userId: id } });
      await (prisma as any).notificationPreference.deleteMany({ where: { userId: id } });

      await (prisma as any).user.delete({ where: { id } });
      await cacheService.del(`user:${id}`);

      // Broadcast live event
      const io = getSocketServer();
      if (io) {
        io.emit('admin-user-deleted', { userId: id });
      }

      res.status(200).json({ message: `User ${user.fullName} deleted permanently.` });
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  },
};
