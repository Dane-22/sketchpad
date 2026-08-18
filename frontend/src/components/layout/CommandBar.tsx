import { useState, useEffect, useRef } from 'react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';

const CommandBar = () => {
  const { commandMessage, gridVisible, orthoMode, snapMode, setGridVisible, setOrthoMode, setSnapMode, unitMode, setUnitMode, parseCommand, setActiveTool } = useCanvasState();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in another input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      
      // If user types a letter or number, focus the command bar
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (inputValue.trim()) {
        parseCommand(inputValue);
        setInputValue('');
      }
    } else if (e.key === 'Escape') {
      setActiveTool('select');
      setInputValue('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="h-12 bg-theme-surface/80 backdrop-blur-md border-t border-theme-border/50 flex items-center px-4 justify-between z-40 text-sm font-mono transition-all duration-300 relative shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
      <div className="flex items-center text-theme-primary flex-1 group focus-within:ring-1 focus-within:ring-theme-accent/50 rounded bg-white/5 px-2 py-1 transition-all duration-300">
        <span className="text-theme-accent mr-3 drop-shadow-md">{"\u276F"}</span>
        <span className="mr-2 opacity-75">{commandMessage}</span>
        <input 
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          className="bg-transparent border-none outline-none text-theme-primary flex-1 caret-theme-accent font-sans text-[15px]"
          placeholder="Type a command..."
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      
      <div className="flex items-center gap-4 text-theme-muted select-none ml-4 text-xs tracking-wider">
        <div 
          onClick={() => setUnitMode(unitMode === 'metric' ? 'imperial' : 'metric')}
          title="Toggle Units"
          className="cursor-pointer hover:text-theme-primary transition-all hover:-translate-y-[1px] text-theme-accent"
        >
          [UNITS: {unitMode === 'metric' ? 'MM/CM²' : 'IN/FT²'}]
        </div>
        <div 
          onClick={() => setGridVisible(!gridVisible)}
          title="Toggle Grid (F7)"
          className={`cursor-pointer hover:text-theme-primary transition-all hover:-translate-y-[1px] ${gridVisible ? 'text-theme-accent drop-shadow-sm' : ''}`}
        >
          [GRID: {gridVisible ? 'ON' : 'OFF'}]
        </div>
        <div 
          onClick={() => setOrthoMode(!orthoMode)}
          title="Toggle Ortho Mode (F8)"
          className={`cursor-pointer hover:text-theme-primary transition-all hover:-translate-y-[1px] ${orthoMode ? 'text-theme-accent drop-shadow-sm' : ''}`}
        >
          [ORTHO: {orthoMode ? 'ON' : 'OFF'}]
        </div>
        <div 
          onClick={() => setSnapMode(!snapMode)}
          title="Toggle Object Snap (F9)"
          className={`cursor-pointer hover:text-theme-primary transition-all hover:-translate-y-[1px] ${snapMode ? 'text-theme-accent drop-shadow-sm' : ''}`}
        >
          [SNAP: {snapMode ? 'ON' : 'OFF'}]
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
