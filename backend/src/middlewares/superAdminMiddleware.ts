import { Request, Response, NextFunction } from 'express';

export const superAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Super Admin or Admin privileges required' });
  }

  next();
};
