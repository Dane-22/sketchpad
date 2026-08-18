import { useEffect, useState, useRef, useCallback } from 'react';
import { socket } from '../utils/socket';
import { useCanvasState } from './useCanvasState';

export interface RemoteCursor {
  socketId: string;
  x: number;
  y: number;
  userId?: string;
  userName?: string;
  color?: string;
}

export const useCollaboration = () => {
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const { setElements, updateElement, removeElement } = useCanvasState();
  const lastEmitRef = useRef<number>(0);

  useEffect(() => {
    socket.connect();

    socket.on('elements-changed', (elements) => {
      setElements(elements, false, true);
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
      socket.off('elements-changed');
      socket.off('element-updated');
      socket.off('element-removed');
      socket.off('cursor-moved');
      socket.off('user-disconnected');
      socket.disconnect();
    };
  }, [setElements, updateElement, removeElement]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    const now = performance.now();
    if (now - lastEmitRef.current > 40) {
      lastEmitRef.current = now;
      socket.emit('cursor-moved', { x, y });
    }
  }, []);

  return { remoteCursors, emitCursorMove };
};
