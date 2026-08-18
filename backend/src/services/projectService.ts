import { prisma } from '../config/db';
import { cacheService } from '../config/redis';

const CACHE_TTL = 60; // 60 seconds

// Helper to gracefully use cache
const getCached = async (key: string) => {
  try {
    const data = await cacheService.get(key);
    if (data) return JSON.parse(data);
  } catch (err) {
    // Ignore parse errors
  }
  return null;
};

const setCached = async (key: string, value: any, ttl = CACHE_TTL) => {
  try {
    await cacheService.set(key, JSON.stringify(value), ttl);
  } catch (err) {
    // Ignore cache set errors
  }
};

const invalidateCache = async (keys: string[]) => {
  try {
    await cacheService.del(keys);
  } catch (err) {
    // Ignore cache delete errors
  }
};

export const projectService = {
  async getAllProjects(includeArchived: boolean = false) {
    const cacheKey = includeArchived ? `projects:global:archived` : `projects:global:active`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return cached;
    }

    const projects = await (prisma.project as any).findMany({
      where: { isArchived: includeArchived },
      orderBy: { updatedAt: 'desc' },
    });

    await setCached(cacheKey, projects);
    return projects;
  },

  async getProjectById(id: string) {
    const cacheKey = `project:${id}`;
    const cached = await getCached(cacheKey);
    let project;

    if (cached) {
      project = cached;
    } else {
      project = await prisma.project.findUnique({
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

  async createProject(data: any, userId: string) {
    const project = await (prisma.project as any).create({
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

  async updateProjectCanvas(id: string, canvasData: any, userId: string) {
    let result;
    if (id === 'draft-project-123') {
      result = await prisma.project.upsert({
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
    } else {
      const project = await this.getProjectById(id);

      result = await prisma.project.update({
        where: { id: project.id },
        data: {
          canvasData,
        },
      });
    }

    await invalidateCache([`project:${id}`, `projects:global:active`, `projects:global:archived`]);
    return result;
  },

  async deleteProject(id: string) {
    const project = await this.getProjectById(id);

    const result = await prisma.project.delete({
      where: { id: project.id },
    });

    await invalidateCache([`project:${id}`, `projects:global:active`, `projects:global:archived`]);
    return result;
  },

  async archiveProject(id: string, isArchived: boolean) {
    const project = await this.getProjectById(id);

    const result = await (prisma.project as any).update({
      where: { id: project.id },
      data: { isArchived },
    });
    
    await invalidateCache([`project:${id}`, `projects:global:active`, `projects:global:archived`]);
    return project;
  },

  async togglePublicProject(id: string, isPublic: boolean) {
    const project = await prisma.project.update({
      where: { id },
      data: { isPublic },
    });
    
    await invalidateCache([`project:${id}`]);
    return project;
  },

  async renameProject(id: string, title: string) {
    const project = await this.getProjectById(id);

    const result = await prisma.project.update({
      where: { id: project.id },
      data: { title },
    });

    await invalidateCache([`project:${id}`, `projects:global:active`, `projects:global:archived`]);
    return result;
  },
};
