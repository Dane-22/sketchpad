import request from 'supertest';
import { app } from '../index';
import { prisma } from '../config/db';
import { generateToken } from '../utils/jwt';

describe('Chat & Messenger Endpoints', () => {
  let token: string;
  const mockUserId = 'user-chat-test-123';
  const mockProjectId = 'project-chat-test-123';
  const mockChannelId = 'channel-test-123';

  beforeAll(() => {
    token = generateToken({ userId: mockUserId, role: 'ENGINEER' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: mockUserId,
      email: 'engineer@example.com',
      fullName: 'Engineer Alex',
      role: 'ENGINEER',
    });
  });

  describe('GET /api/v1/projects/:projectId/channels', () => {
    it('should return channels for a project or auto-create defaults', async () => {
      (prisma as any).chatChannel.findMany.mockResolvedValueOnce([
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

      const res = await request(app)
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

      (prisma as any).chatChannel.create.mockResolvedValueOnce(newChannel);

      const res = await request(app)
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
      (prisma as any).chatChannel.findUnique.mockResolvedValueOnce({
        id: mockChannelId,
        name: 'general',
        projectId: mockProjectId
      });

      (prisma as any).chatMessage.create
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

      const res = await request(app)
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
