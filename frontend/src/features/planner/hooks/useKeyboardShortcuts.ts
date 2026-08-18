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
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input field (if any added later)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'e':
          setActiveTool('eraser');
          break;
        case 'l':
          setActiveTool('line');
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setActiveTool, gridVisible, setGridVisible, orthoMode, setOrthoMode, 
    undo, redo, selectedElementIds, removeElements,
    isImportModalOpen, setIsImportModalOpen
  ]);
};
