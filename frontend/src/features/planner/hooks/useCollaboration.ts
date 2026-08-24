import { useEffect, useState, useRef, useCallback } from 'react';
import { socket } from '../utils/socket';
import { useCanvasState } from './useCanvasState';
import { useAuthStore } from '../../auth/store/useAuthStore';

export interface RemoteCursor {
  socketId: string;
  x: number;
  y: number;
  userId?: string;
  userName?: string;
  color?: string;
}

export const useCollaboration = (projectId?: string) => {
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const { setElements, addElement, updateElement, removeElement, setActiveProjectId } = useCanvasState();
  const lastEmitRef = useRef<number>(0);
  const lastEmitPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId, setActiveProjectId]);

  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      if (projectId) {
        socket.emit('join-project', projectId);
        
        // Announce our presence immediately (so existing users see us)
        const user = useAuthStore.getState().user;
        const color = useCanvasState.getState().userColor;
        socket.emit('cursor-moved', { 
          projectId, 
          x: lastEmitPosRef.current.x, 
          y: lastEmitPosRef.current.y,
          userId: user?.id,
          userName: user?.fullName || localStorage.getItem('user_name') || 'Engineer',
          color
        });
      }
    };

    socket.on('connect', handleConnect);

    if (projectId && socket.connected) {
      handleConnect();
    }

    socket.on('elements-changed', (elements) => {
      setElements(elements, false, true, false);
    });

    socket.on('element-added', (element) => {
      addElement(element, false, true);
    });

    socket.on('element-updated', ({ id, updates }) => {
      updateElement(id, updates, false, true);
    });

    socket.on('element-removed', (id) => {
      removeElement(id, false, true);
    });

    socket.on('color-assigned', (color: string) => {
      useCanvasState.getState().setUserColor(color);
    });

    socket.on('cursor-moved', (cursor: RemoteCursor) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [cursor.socketId]: cursor,
      }));
    });

    socket.on('user-disconnected', (socketId) => {
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    socket.on('user-joined', () => {
      // Announce our presence to the newly joined user
      const user = useAuthStore.getState().user;
      const color = useCanvasState.getState().userColor;
      socket.emit('cursor-moved', { 
        projectId, 
        x: lastEmitPosRef.current.x, 
        y: lastEmitPosRef.current.y,
        userId: user?.id,
        userName: user?.fullName || localStorage.getItem('user_name') || 'Engineer',
        color
      });
    });

    return () => {
      if (projectId) {
        socket.emit('leave-project', projectId);
      }
      socket.off('connect', handleConnect);
      socket.off('elements-changed');
      socket.off('element-added');
      socket.off('element-updated');
      socket.off('element-removed');
      socket.off('cursor-moved');
      socket.off('user-disconnected');
      socket.off('user-joined');
      socket.disconnect();
    };
  }, [projectId, setElements, addElement, updateElement, removeElement]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    lastEmitPosRef.current = { x, y };
    const now = performance.now();
    if (now - lastEmitRef.current > 40) {
      lastEmitRef.current = now;
      const user = useAuthStore.getState().user;
      const color = useCanvasState.getState().userColor;
      
      socket.emit('cursor-moved', { 
        projectId, 
        x, 
        y,
        userId: user?.id,
        userName: user?.fullName || localStorage.getItem('user_name') || 'Engineer',
        color
      });
    }
  }, [projectId]);

  return { remoteCursors, emitCursorMove };
};

