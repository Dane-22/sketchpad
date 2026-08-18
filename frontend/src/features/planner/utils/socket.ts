import { io } from 'socket.io-client';

// In production behind Nginx reverse proxy or with Vite proxy, empty string or window.origin connects to same host
const SOCKET_URL = (import.meta as any).env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5005');

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We will connect when the canvas loads
  transports: ['websocket', 'polling'],
});
