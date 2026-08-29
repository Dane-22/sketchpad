import React from 'react';
import { useCanvasState } from '../../../features/planner/hooks/useCanvasState';

export const BrushQuickAccessToolbar: React.FC = () => {
  const { 
    activeTool, 
    brushSize, setBrushSize, 
    highlighterWidth, setHighlighterWidth 
  } = useCanvasState();

  if (activeTool !== 'freehand' && activeTool !== 'highlighter' && activeTool !== 'eraser') {
    return null;
  }

  const isHighlighter = activeTool === 'highlighter';
  const currentSize = isHighlighter ? highlighterWidth : brushSize;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      if (isHighlighter) {
        setHighlighterWidth(val);
      } else {
        setBrushSize(val);
      }
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
      <div className="bg-theme-elevated border border-theme-border rounded-full px-6 py-3 shadow-2xl backdrop-blur-md flex items-center gap-4">
        <span className="text-xs font-medium text-theme-muted uppercase tracking-wide">
          {isHighlighter ? 'Highlighter' : (activeTool === 'eraser' ? 'Eraser' : 'Brush')} Size
        </span>
        <input 
          type="range" 
          min="1" 
          max={isHighlighter ? "100" : "50"} 
          value={currentSize}
          onChange={handleChange}
          className="w-32 accent-theme-accent"
        />
        <span className="text-sm font-semibold text-theme-primary w-6 text-right">
          {currentSize}
        </span>
      </div>
    </div>
  );
};
