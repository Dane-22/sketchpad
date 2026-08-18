import { prismaMock } from './mockPrisma';

jest.mock('../config/db', () => ({
  prisma: prismaMock,
}));

export const mockRedisClient = {
  isOpen: false,
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

export const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  isRedisActive: jest.fn().mockReturnValue(false),
};

jest.mock('../config/redis', () => ({
  redisClient: mockRedisClient,
  cacheService: mockCacheService,
}));
