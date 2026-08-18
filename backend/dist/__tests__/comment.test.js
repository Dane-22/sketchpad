"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const mockPrisma_1 = require("./mockPrisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
describe('Comment Endpoints', () => {
    const userId = 'user-123';
    const token = jsonwebtoken_1.default.sign({ userId, role: 'ENGINEER' }, env_1.config.jwtSecret);
    const projectId = 'proj-456';
    const commentId = 'comm-789';
    beforeEach(() => {
        mockPrisma_1.prismaMock.user = {
            findUnique: jest.fn().mockResolvedValue({ id: userId, email: 'test@example.com', role: 'ENGINEER' })
        };
    });
    describe('GET /api/v1/projects/:projectId/comments', () => {
        it('should return comments list', async () => {
            mockPrisma_1.prismaMock.comment = {
                findMany: jest.fn().mockResolvedValue([
                    {
                        id: commentId,
                        projectId,
                        userId,
                        x: 100,
                        y: 200,
                        content: 'Check load beam',
                        isResolved: false,
                        user: { id: userId, fullName: 'Engineer Alex' },
                        replies: []
                    }
                ])
            };
            const res = await (0, supertest_1.default)(index_1.app)
                .get(`/api/v1/projects/${projectId}/comments`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].content).toBe('Check load beam');
        });
    });
    describe('POST /api/v1/projects/:projectId/comments', () => {
        it('should create a new comment pin', async () => {
            mockPrisma_1.prismaMock.comment = {
                create: jest.fn().mockResolvedValue({
                    id: commentId,
                    projectId,
                    userId,
                    x: 150,
                    y: 250,
                    content: 'New structural pin',
                    isResolved: false,
                    user: { id: userId, fullName: 'Engineer Alex' },
                    replies: []
                })
            };
            const res = await (0, supertest_1.default)(index_1.app)
                .post(`/api/v1/projects/${projectId}/comments`)
                .set('Authorization', `Bearer ${token}`)
                .send({ x: 150, y: 250, content: 'New structural pin' });
            expect(res.status).toBe(201);
            expect(res.body.content).toBe('New structural pin');
        });
    });
    describe('PATCH /api/v1/comments/:commentId/resolve', () => {
        it('should update comment resolve state', async () => {
            mockPrisma_1.prismaMock.comment = {
                findUnique: jest.fn().mockResolvedValue({
                    id: commentId,
                    isResolved: false
                }),
                update: jest.fn().mockResolvedValue({
                    id: commentId,
                    isResolved: true,
                    content: 'Resolved pin'
                })
            };
            const res = await (0, supertest_1.default)(index_1.app)
                .patch(`/api/v1/comments/${commentId}/resolve`)
                .set('Authorization', `Bearer ${token}`)
                .send({ isResolved: true });
            expect(res.status).toBe(200);
            expect(res.body.isResolved).toBe(true);
        });
    });
    describe('DELETE /api/v1/comments/:commentId', () => {
        it('should delete a comment', async () => {
            mockPrisma_1.prismaMock.commentReply = {
                deleteMany: jest.fn().mockResolvedValue({ count: 0 })
            };
            mockPrisma_1.prismaMock.comment = {
                deleteMany: jest.fn().mockResolvedValue({ count: 1 })
            };
            const res = await (0, supertest_1.default)(index_1.app)
                .delete(`/api/v1/comments/${commentId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Comment deleted successfully');
        });
    });
});
