"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = void 0;
const projectService_1 = require("../services/projectService");
exports.projectController = {
    async getAll(req, res) {
        try {
            const includeArchived = req.query.archived === 'true';
            const projects = await projectService_1.projectService.getAllProjects(includeArchived);
            res.status(200).json(projects);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch projects' });
        }
    },
    async getById(req, res) {
        try {
            const projectId = req.params.id;
            const project = await projectService_1.projectService.getProjectById(projectId);
            res.status(200).json(project);
        }
        catch (error) {
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else if (error.message === 'Unauthorized access to project') {
                res.status(403).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to fetch project' });
            }
        }
    },
    async getShared(req, res) {
        try {
            const projectId = req.params.id;
            const project = await projectService_1.projectService.getProjectById(projectId);
            if (!project.isPublic) {
                return res.status(403).json({ error: 'This project is not public' });
            }
            res.status(200).json(project);
        }
        catch (error) {
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to fetch shared project' });
            }
        }
    },
    async create(req, res) {
        try {
            const userId = req.user.id;
            const project = await projectService_1.projectService.createProject(req.body, userId);
            res.status(201).json(project);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create project' });
        }
    },
    async saveCanvas(req, res) {
        try {
            const userId = req.user.id;
            const projectId = req.params.id;
            const canvasData = req.body;
            const updatedProject = await projectService_1.projectService.updateProjectCanvas(projectId, canvasData, userId);
            res.status(200).json(updatedProject);
        }
        catch (error) {
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else if (error.message === 'Unauthorized access to project') {
                res.status(403).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to save canvas data' });
            }
        }
    },
    async delete(req, res) {
        try {
            const projectId = req.params.id;
            await projectService_1.projectService.deleteProject(projectId);
            res.status(204).send();
        }
        catch (error) {
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else if (error.message === 'Unauthorized access to project') {
                res.status(403).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to delete project' });
            }
        }
    },
    async rename(req, res) {
        try {
            const projectId = req.params.id;
            const { title } = req.body;
            if (!title || title.trim() === '') {
                return res.status(400).json({ error: 'Title is required' });
            }
            const updatedProject = await projectService_1.projectService.renameProject(projectId, title.trim());
            res.status(200).json(updatedProject);
        }
        catch (error) {
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to rename project' });
            }
        }
    },
    async archive(req, res) {
        try {
            const projectId = req.params.id;
            const { isArchived } = req.body;
            const updatedProject = await projectService_1.projectService.archiveProject(projectId, isArchived);
            res.status(200).json(updatedProject);
        }
        catch (error) {
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to archive project' });
            }
        }
    },
    async togglePublic(req, res) {
        try {
            const projectId = req.params.id;
            const { isPublic } = req.body;
            const updatedProject = await projectService_1.projectService.togglePublicProject(projectId, isPublic);
            res.status(200).json(updatedProject);
        }
        catch (error) {
            if (error.message === 'Project not found') {
                res.status(404).json({ error: error.message });
            }
            else {
                res.status(500).json({ error: 'Failed to toggle project visibility' });
            }
        }
    },
};
