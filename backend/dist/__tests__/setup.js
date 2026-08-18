"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockCacheService = exports.mockRedisClient = void 0;
const mockPrisma_1 = require("./mockPrisma");
jest.mock('../config/db', () => ({
    prisma: mockPrisma_1.prismaMock,
}));
exports.mockRedisClient = {
    isOpen: false,
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn().mockResolvedValue(undefined),
};
exports.mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    isRedisActive: jest.fn().mockReturnValue(false),
};
jest.mock('../config/redis', () => ({
    redisClient: exports.mockRedisClient,
    cacheService: exports.mockCacheService,
}));
