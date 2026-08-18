import { projectService } from '../services/projectService';
import { prisma } from '../config/db';
import { cacheService } from '../config/redis';

// Mock dependencies
jest.mock('../config/db', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../config/redis', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    isRedisActive: jest.fn().mockReturnValue(true),
  },
  redisClient: {
    isOpen: true,
  }
}));

describe('Project Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProjects', () => {
    it('should return cached projects if available', async () => {
      const cachedData = [{ id: '1', title: 'Cached Proj' }];
      (cacheService.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await projectService.getAllProjects();

      expect(cacheService.get).toHaveBeenCalledWith('projects:global:active');
      expect(result).toEqual(cachedData);
      expect(prisma.project.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from DB if cache is empty', async () => {
      const dbData = [{ id: '1', title: 'DB Proj', isArchived: false }];
      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.project.findMany as jest.Mock).mockResolvedValueOnce(dbData);

      const result = await projectService.getAllProjects(false);

      expect(cacheService.get).toHaveBeenCalledWith('projects:global:active');
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { isArchived: false },
        orderBy: { updatedAt: 'desc' },
      });
      expect(cacheService.set).toHaveBeenCalledWith('projects:global:active', JSON.stringify(dbData), 60);
      expect(result).toEqual(dbData);
    });
  });

  describe('createProject', () => {
    it('should create a project and invalidate global cache', async () => {
      const input = { title: 'New', description: 'Desc' };
      const created = { id: '1', ...input, userId: 'u1', isArchived: false, canvasData: {} };
      (prisma.project.create as jest.Mock).mockResolvedValueOnce(created);

      const result = await projectService.createProject(input, 'u1');

      expect(prisma.project.create).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledWith(['projects:global:active', 'projects:global:archived']);
      expect(result).toEqual(created);
    });
  });

  describe('updateProjectCanvas', () => {
    it('should update an existing project canvas', async () => {
      const existing = { id: 'p1', title: 'Existing' };
      (cacheService.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));
      const updated = { ...existing, canvasData: { elements: [] } };
      (prisma.project.update as jest.Mock).mockResolvedValueOnce(updated);

      const result = await projectService.updateProjectCanvas('p1', { elements: [] }, 'u1');

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { canvasData: { elements: [] } },
      });
      expect(cacheService.del).toHaveBeenCalledWith(['project:p1', 'projects:global:active', 'projects:global:archived']);
      expect(result).toEqual(updated);
    });
  });
});
