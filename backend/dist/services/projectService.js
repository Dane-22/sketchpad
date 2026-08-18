"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = void 0;
const db_1 = require("../config/db");
const redis_1 = require("../config/redis");
const CACHE_TTL = 60; // 60 seconds
// Helper to gracefully use cache
const getCached = async (key) => {
    try {
        const data = await redis_1.cacheService.get(key);
        if (data)
            return JSON.parse(data);
    }
    catch (err) {
        // Ignore parse errors
    }
    return null;
};
const setCached = async (key, value, ttl = CACHE_TTL) => {
    try {
        await redis_1.cacheService.set(key, JSON.stringify(value), ttl);
    }
    catch (err) {
        // Ignore cache set errors
    }
};
const invalidateCache = async (keys) => {
    try {
        await redis_1.cacheService.del(keys);
    }
    catch (err) {
        // Ignore cache delete errors
    }
};
exports.projectService = {
    async getAllProjects(includeArchived = false) {
        const cacheKey = includeArchived ? `projects:global:archived` : `projects:global:active`;
        const cached = await getCached(cacheKey);
        if (cached) {
            return cached;
        }
        const projects = await db_1.prisma.project.findMany({
            where: { isArchived: includeArchived },
            orderBy: { updatedAt: 'desc' },
        });
        await setCached(cacheKey, projects);
        return projects;
    },
    async getProjectById(id) {
        const cacheKey = `project:${id}`;
        const cached = await getCached(cacheKey);
        let project;
        if (cached) {
            project = cached;
        }
        else {
            project = await db_1.prisma.project.findUnique({
                where: { id },
            });
            if (project) {
                await setCached(cacheKey, project);
            }
        }
        if (!project) {
            throw new Error('Project not found');
        }
        return project;
    },
    async createProject(data, userId) {
        const project = await db_1.prisma.project.create({
            data: {
                title: data.title,
                description: data.description,
                canvasData: data.canvasData || {},
                thumbnail: data.thumbnail || null,
                userId,
                isArchived: false,
            },
        });
        await invalidateCache([`projects:global:active`, `projects:global:archived`]);
        return project;
    },
    async updateProjectCanvas(id, canvasData, userId) {
        let result;
        if (id === 'draft-project-123') {
            result = await db_1.prisma.project.upsert({
                where: { id },
                update: { canvasData },
                create: {
                    id,
                    title: 'Draft Project',
                    description: 'Auto-saved draft prototype',
                    canvasData,
                    userId,
                },
            });
        }
        else {
            const project = await this.getProjectById(id);
            result = await db_1.prisma.project.update({
                where: { id: project.id },
                data: {
                    canvasData,
                },
            });
        }
        await invalidateCache([`project:${id}`, `projects:global:active`, `projects:global:archived`]);
        return result;
    },
    async deleteProject(id) {
        const project = await this.getProjectById(id);
        const result = await db_1.prisma.project.delete({
            where: { id: project.id },
        });
        await invalidateCache([`project:${id}`, `projects:global:active`, `projects:global:archived`]);
        return result;
    },
    async archiveProject(id, isArchived) {
        const project = await this.getProjectById(id);
        const result = await db_1.prisma.project.update({
            where: { id: project.id },
            data: { isArchived },
        });
        await invalidateCache([`project:${id}`, `projects:global:active`, `projects:global:archived`]);
        return project;
    },
    async togglePublicProject(id, isPublic) {
        const project = await db_1.prisma.project.update({
            where: { id },
            data: { isPublic },
        });
        await invalidateCache([`project:${id}`]);
        return project;
    },
    async renameProject(id, title) {
        const project = await this.getProjectById(id);
        const result = await db_1.prisma.project.update({
            where: { id: project.id },
            data: { title },
        });
        await invalidateCache([`project:${id}`, `projects:global:active`, `projects:global:archived`]);
        return result;
    },
};
