import api from './api';
import { CanvasState } from '../types/canvas';

export const projectService = {
  async getProject(id: string) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async saveCanvas(id: string, canvasData: CanvasState) {
    const response = await api.put(`/projects/${id}/save`, canvasData);
    return response.data;
  }
};
