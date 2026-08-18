import request from 'supertest';
import { app } from '../index';
import { prismaMock } from './mockPrisma';
import bcrypt from 'bcryptjs';

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock the Prisma user.findUnique to return null (user doesn't exist)
      prismaMock.user.findUnique.mockResolvedValue(null);
      
      // Mock the Prisma user.create to return a new user
      const mockUser: any = {
        id: 'user-123',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        fullName: 'Test User',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      prismaMock.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          fullName: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id', 'user-123');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      
      // Verify Prisma was called correctly
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(prismaMock.user.create).toHaveBeenCalled();
    });
  });
});
