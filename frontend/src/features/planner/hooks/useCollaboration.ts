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
  const { setElements, addElement, updateElement, removeElement, setActiveProjectId, textColor } = useCanvasState();
  const currentUser = useAuthStore((state) => state.user);
  const lastEmitRef = useRef<number>(0);

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId, setActiveProjectId]);

  useEffect(() => {
    socket.connect();

    if (projectId) {
      socket.emit('join-project', projectId);
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

    return () => {
      if (projectId) {
        socket.emit('leave-project', projectId);
      }
      socket.off('elements-changed');
      socket.off('element-added');
      socket.off('element-updated');
      socket.off('element-removed');
      socket.off('cursor-moved');
      socket.off('user-disconnected');
      socket.disconnect();
    };
  }, [projectId, setElements, addElement, updateElement, removeElement]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    const now = performance.now();
    if (now - lastEmitRef.current > 40) {
      lastEmitRef.current = now;
      const user = useAuthStore.getState().user;
      
      socket.emit('cursor-moved', { 
        projectId, 
        x, 
        y,
        userId: user?.id,
        userName: user?.fullName || localStorage.getItem('user_name') || 'Engineer',
        color: textColor
      });
    }
  }, [projectId, textColor]);

  return { remoteCursors, emitCursorMove };
};

