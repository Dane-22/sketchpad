"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const mockPrisma_1 = require("./mockPrisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
describe('Auth Endpoints', () => {
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            // Mock the Prisma user.findUnique to return null (user doesn't exist)
            mockPrisma_1.prismaMock.user.findUnique.mockResolvedValue(null);
            // Mock the Prisma user.create to return a new user
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: await bcryptjs_1.default.hash('password123', 10),
                fullName: 'Test User',
                role: 'USER',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockPrisma_1.prismaMock.user.create.mockResolvedValue(mockUser);
            const response = await (0, supertest_1.default)(index_1.app)
                .post('/api/v1/auth/register')
                .send({
                email: 'test@example.com',
                password: 'password123',
                fullName: 'Test User'
            });
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('status', 'PENDING');
            expect(response.body.user).toHaveProperty('id', 'user-123');
            expect(response.body.user).toHaveProperty('email', 'test@example.com');
            // Verify Prisma was called correctly
            expect(mockPrisma_1.prismaMock.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' }
            });
            expect(mockPrisma_1.prismaMock.user.create).toHaveBeenCalled();
        });
    });
});
