"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const projectService_1 = require("../services/projectService");
const db_1 = require("../config/db");
const redis_1 = require("../config/redis");
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
            redis_1.cacheService.get.mockResolvedValueOnce(JSON.stringify(cachedData));
            const result = await projectService_1.projectService.getAllProjects();
            expect(redis_1.cacheService.get).toHaveBeenCalledWith('projects:global:active');
            expect(result).toEqual(cachedData);
            expect(db_1.prisma.project.findMany).not.toHaveBeenCalled();
        });
        it('should fetch from DB if cache is empty', async () => {
            const dbData = [{ id: '1', title: 'DB Proj', isArchived: false }];
            redis_1.cacheService.get.mockResolvedValueOnce(null);
            db_1.prisma.project.findMany.mockResolvedValueOnce(dbData);
            const result = await projectService_1.projectService.getAllProjects(false);
            expect(redis_1.cacheService.get).toHaveBeenCalledWith('projects:global:active');
            expect(db_1.prisma.project.findMany).toHaveBeenCalledWith({
                where: { isArchived: false },
                orderBy: { updatedAt: 'desc' },
            });
            expect(redis_1.cacheService.set).toHaveBeenCalledWith('projects:global:active', JSON.stringify(dbData), 60);
            expect(result).toEqual(dbData);
        });
    });
    describe('createProject', () => {
        it('should create a project and invalidate global cache', async () => {
            const input = { title: 'New', description: 'Desc' };
            const created = { id: '1', ...input, userId: 'u1', isArchived: false, canvasData: {} };
            db_1.prisma.project.create.mockResolvedValueOnce(created);
            const result = await projectService_1.projectService.createProject(input, 'u1');
            expect(db_1.prisma.project.create).toHaveBeenCalled();
            expect(redis_1.cacheService.del).toHaveBeenCalledWith(['projects:global:active', 'projects:global:archived']);
            expect(result).toEqual(created);
        });
    });
    describe('updateProjectCanvas', () => {
        it('should update an existing project canvas', async () => {
            const existing = { id: 'p1', title: 'Existing' };
            redis_1.cacheService.get.mockResolvedValueOnce(JSON.stringify(existing));
            const updated = { ...existing, canvasData: { elements: [] } };
            db_1.prisma.project.update.mockResolvedValueOnce(updated);
            const result = await projectService_1.projectService.updateProjectCanvas('p1', { elements: [] }, 'u1');
            expect(db_1.prisma.project.update).toHaveBeenCalledWith({
                where: { id: 'p1' },
                data: { canvasData: { elements: [] } },
            });
            expect(redis_1.cacheService.del).toHaveBeenCalledWith(['project:p1', 'projects:global:active', 'projects:global:archived']);
            expect(result).toEqual(updated);
        });
    });
});
