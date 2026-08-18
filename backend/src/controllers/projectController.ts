import { Request, Response } from 'express';
import { projectService } from '../services/projectService';

export const projectController = {
  async getAll(req: Request, res: Response) {
    try {
      const includeArchived = req.query.archived === 'true';
      const projects = await projectService.getAllProjects(includeArchived);
      res.status(200).json(projects);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const projectId = req.params.id;
      const project = await projectService.getProjectById(projectId);
      res.status(200).json(project);
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Unauthorized access to project') {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch project' });
      }
    }
  },

  async getShared(req: Request, res: Response) {
    try {
      const projectId = req.params.id;
      const project = await projectService.getProjectById(projectId);
      if (!project.isPublic) {
        return res.status(403).json({ error: 'This project is not public' });
      }
      res.status(200).json(project);
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch shared project' });
      }
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user!.id;
      const project = await projectService.createProject(req.body, userId);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create project' });
    }
  },

  async saveCanvas(req: Request, res: Response) {
    try {
      const userId = (req as any).user!.id;
      const projectId = req.params.id;
      const canvasData = req.body;
      
      const updatedProject = await projectService.updateProjectCanvas(projectId, canvasData, userId);
      res.status(200).json(updatedProject);
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Unauthorized access to project') {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to save canvas data' });
      }
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const projectId = req.params.id;
      
      await projectService.deleteProject(projectId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Unauthorized access to project') {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete project' });
      }
    }
  },

  async rename(req: Request, res: Response) {
    try {
      const projectId = req.params.id;
      const { title } = req.body;
      
      if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
      }

      const updatedProject = await projectService.renameProject(projectId, title.trim());
      res.status(200).json(updatedProject);
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to rename project' });
      }
    }
  },

  async archive(req: Request, res: Response) {
    try {
      const projectId = req.params.id;
      const { isArchived } = req.body;

      const updatedProject = await projectService.archiveProject(projectId, isArchived);
      res.status(200).json(updatedProject);
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to archive project' });
      }
    }
  },

  async togglePublic(req: Request, res: Response) {
    try {
      const projectId = req.params.id;
      const { isPublic } = req.body;

      const updatedProject = await projectService.togglePublicProject(projectId, isPublic);
      res.status(200).json(updatedProject);
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to toggle project visibility' });
      }
    }
  },
};
