import { useEffect, useRef, useState, useCallback } from 'react';
import { projectService } from '../../../services/projectService';
import { CanvasState } from '../../../types/canvas';

export const useAutoSave = (
  projectId: string,
  canvasState: CanvasState,
  enabled: boolean = true,
  delay: number = 400
) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef<CanvasState>(canvasState);
  const hasPendingSaveRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  latestStateRef.current = canvasState;

  const saveImmediate = useCallback(async () => {
    if (!projectId || !enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      isSavingRef.current = true;
      setIsSaving(true);
      setError(null);
      hasPendingSaveRef.current = false;
      await projectService.saveCanvas(projectId, latestStateRef.current);
      setLastSaved(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to auto-save');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [projectId, enabled]);

  // Trigger debounced auto-save on state change
  useEffect(() => {
    if (!projectId || !enabled) return;

    hasPendingSaveRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveImmediate();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [projectId, canvasState, enabled, delay, saveImmediate]);

  // Flush pending save before browser refresh or page close
  useEffect(() => {
    if (!projectId || !enabled) return;

    const handleBeforeUnload = () => {
      if (hasPendingSaveRef.current) {
        const token = localStorage.getItem('token');

        const payload = JSON.stringify(latestStateRef.current);
        const url = `/api/v1/projects/${projectId}/save`;

        try {
          fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: payload,
            keepalive: true
          });
        } catch {
          // Ignore sync send error on unload
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Flush on unmount if still pending
      if (hasPendingSaveRef.current && !isSavingRef.current) {
        saveImmediate();
      }
    };
  }, [projectId, enabled, saveImmediate]);

  return { isSaving, lastSaved, error, saveImmediate };
};
