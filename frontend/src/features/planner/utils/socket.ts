import { io } from 'socket.io-client';

// In production, this would be determined by environment variables
const SOCKET_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5005';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We will connect when the canvas loads
});
