import { useEffect } from 'react';
import { useCanvasState } from './useCanvasState';

export const useKeyboardShortcuts = () => {
  const { 
    setActiveTool, 
    setGridVisible, gridVisible,
    setOrthoMode, orthoMode,
    undo, redo,
    selectedElementIds, removeElements,
    isImportModalOpen, setIsImportModalOpen
  } = useCanvasState();

  useEffect(() => {
    let keyBuffer = '';
    let keyBufferTimeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();
      
      // Update key buffer for sequences
      keyBuffer += (e.key === 'Enter' ? 'enter' : key);
      clearTimeout(keyBufferTimeout);
      keyBufferTimeout = setTimeout(() => {
        keyBuffer = '';
      }, 1500); // 1.5 second buffer timeout

      // Sequences
      if (keyBuffer.endsWith('pl')) {
        setActiveTool('polyline');
        keyBuffer = '';
        return;
      }
      if (keyBuffer.endsWith('zenterte') || keyBuffer.endsWith('zentere')) {
        // Dispatch custom event for zoom extents
        window.dispatchEvent(new CustomEvent('zoom-extents'));
        keyBuffer = '';
        return;
      }

      // Single keys
      switch (key) {
        case 'e':
          setActiveTool('eraser');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'f':
          setActiveTool('freehand');
          break;
        case 'c':
          setActiveTool('circle');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'p':
          setActiveTool('select');
          break;
        case 'escape':
          setActiveTool('select');
          break;
        case 'f7':
          e.preventDefault();
          setGridVisible(!gridVisible);
          break;
        case 'f8':
          e.preventDefault();
          setOrthoMode(!orthoMode);
          break;
        case 'delete':
        case 'backspace':
          if (selectedElementIds.length > 0) {
            removeElements(selectedElementIds);
          }
          break;
        case 'o':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsImportModalOpen(true);
          }
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
          }
          break;
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            redo();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(keyBufferTimeout);
    };
  }, [
    setActiveTool, gridVisible, setGridVisible, orthoMode, setOrthoMode, 
    undo, redo, selectedElementIds, removeElements,
    isImportModalOpen, setIsImportModalOpen
  ]);
};
