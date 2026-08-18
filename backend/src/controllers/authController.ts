import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'Email is already in use') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to register user' });
      }
    }
  },

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Invalid email or password') {
        res.status(401).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to login' });
      }
    }
  },

  async getMe(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user data' });
    }
  }
};
