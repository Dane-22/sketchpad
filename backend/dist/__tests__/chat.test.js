"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const db_1 = require("../config/db");
const jwt_1 = require("../utils/jwt");
describe('Chat & Messenger Endpoints', () => {
    let token;
    const mockUserId = 'user-chat-test-123';
    const mockProjectId = 'project-chat-test-123';
    const mockChannelId = 'channel-test-123';
    beforeAll(() => {
        token = (0, jwt_1.generateToken)({ userId: mockUserId, role: 'ENGINEER' });
    });
    beforeEach(() => {
        jest.clearAllMocks();
        db_1.prisma.user.findUnique.mockResolvedValue({
            id: mockUserId,
            email: 'engineer@example.com',
            fullName: 'Engineer Alex',
            role: 'ENGINEER',
        });
    });
    describe('GET /api/v1/projects/:projectId/channels', () => {
        it('should return channels for a project or auto-create defaults', async () => {
            db_1.prisma.chatChannel.findMany.mockResolvedValueOnce([
                {
                    id: mockChannelId,
                    projectId: mockProjectId,
                    name: 'general',
                    topic: 'General discussion',
                    isDefault: true,
                    members: [{ userId: mockUserId, role: 'ADMIN', user: { fullName: 'Engineer Alex' } }],
                    messages: [],
                }
            ]);
            const res = await (0, supertest_1.default)(index_1.app)
                .get(`/api/v1/projects/${mockProjectId}/channels`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].name).toBe('general');
        });
    });
    describe('POST /api/v1/projects/:projectId/channels', () => {
        it('should create a new channel with members', async () => {
            const newChannel = {
                id: 'new-channel-id',
                projectId: mockProjectId,
                name: 'structural-review',
                topic: 'Load calculations and beam alignments',
                isDefault: false,
                members: [{ userId: mockUserId, role: 'ADMIN' }],
                messages: [],
            };
            db_1.prisma.chatChannel.create.mockResolvedValueOnce(newChannel);
            const res = await (0, supertest_1.default)(index_1.app)
                .post(`/api/v1/projects/${mockProjectId}/channels`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                name: 'Structural Review',
                topic: 'Load calculations and beam alignments',
                memberIds: ['user-2', 'user-3']
            });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('structural-review');
        });
    });
    describe('POST /api/v1/channels/:channelId/messages', () => {
        it('should send a message and trigger @ai response', async () => {
            db_1.prisma.chatChannel.findUnique.mockResolvedValueOnce({
                id: mockChannelId,
                name: 'general',
                projectId: mockProjectId
            });
            db_1.prisma.chatMessage.create
                .mockResolvedValueOnce({
                id: 'msg-1',
                channelId: mockChannelId,
                userId: mockUserId,
                isAi: false,
                content: 'Hello team and @ai can you verify dimensions?',
                user: { fullName: 'Engineer Alex' }
            })
                .mockResolvedValueOnce({
                id: 'ai-msg-2',
                channelId: mockChannelId,
                userId: null,
                isAi: true,
                content: '### 🤖 EngiAI Copilot\n\nVerified dimensions against standards.',
            });
            const res = await (0, supertest_1.default)(index_1.app)
                .post(`/api/v1/channels/${mockChannelId}/messages`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                content: 'Hello team and @ai can you verify dimensions?',
                context: { elementCount: 15, comments: [] }
            });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('userMessage');
            expect(res.body).toHaveProperty('aiMessage');
            expect(res.body.aiMessage.isAi).toBe(true);
        });
    });
});
