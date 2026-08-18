import { create } from 'zustand';
import { useCanvasState } from '../../planner/hooks/useCanvasState';

interface AuthState {
  token: string | null;
  user: any | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Attempt to clear the planner cache
    try {
      useCanvasState.setState({ elements: [] }); // Reset canvas state elements
    } catch (e) {
      console.error("Failed to clear canvas state:", e);
    }
    
    set({ token: null, user: null });
  },
}));
