import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/db';
import { cacheService } from '../config/redis';

const CACHE_TTL = 900; // 15 minutes

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Exclude specific public routes if needed, e.g. convert API that doesn't need auth
    if (req.originalUrl.includes('convert')) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const cacheKey = `user:${decoded.userId}`;
    let userWithoutPassword = null;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      try {
        userWithoutPassword = JSON.parse(cached);
      } catch {
        userWithoutPassword = null;
      }
    }

    if (!userWithoutPassword) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }

      const { password, ...rest } = user;
      userWithoutPassword = rest;

      await cacheService.set(cacheKey, JSON.stringify(userWithoutPassword), CACHE_TTL);
    }

    (req as any).user = userWithoutPassword;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
