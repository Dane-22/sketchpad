import axios from 'axios';

const API_URL = '/api/v1/auth'; // Adjust based on backend configuration

export const authApi = {
  login: async (credentials: any) => {
    const response = await axios.post(`${API_URL}/login`, credentials);
    return response.data;
  },
  register: async (userData: any) => {
    const response = await axios.post(`${API_URL}/register`, userData);
    return response.data;
  },
};
