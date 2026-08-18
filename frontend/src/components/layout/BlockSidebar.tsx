import { X, Save, Box } from 'lucide-react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';

const SYMBOLS = [
  { id: 'door', name: 'Door', svg: 'M10 90 L10 10 A40 40 0 0 1 90 90 L10 90 Z', category: 'Architectural' },
  { id: 'window', name: 'Window', svg: 'M10 10 L90 10 L90 30 L10 30 Z M10 15 L90 15 M10 25 L90 25 M50 10 L50 30', category: 'Architectural' },
  { id: 'column', name: 'Column', svg: 'M10 10 L40 10 L40 40 L10 40 Z M10 10 L40 40 M10 40 L40 10', category: 'Architectural' },
  { id: 'beam', name: 'Beam (I-Section)', svg: 'M10 10 L90 10 L90 20 L55 20 L55 80 L90 80 L90 90 L10 90 L10 80 L45 80 L45 20 L10 20 Z', category: 'Civil' },
  { id: 'rebar', name: 'Rebar', svg: 'M10 50 L90 50 M20 45 L20 55 M40 45 L40 55 M60 45 L60 55 M80 45 L80 55', category: 'Civil' },
  { id: 'outlet', name: 'Outlet', svg: 'M50 50 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0 M35 50 L35 70 M65 50 L65 70 M50 20 L50 80', category: 'Electrical' },
];

const BlockSidebar = () => {
  const { 
    isSidebarOpen, setIsSidebarOpen, setActiveTool, 
    customSymbols, setCustomSymbols, 
    selectedElementIds, elements 
  } = useCanvasState();

  if (!isSidebarOpen) return null;

  const handleSaveSelection = () => {
    if (selectedElementIds.length === 0) return;
    
    const name = prompt('Enter a name for this custom block:');
    if (!name) return;
    
    const selectedEls = elements.filter(el => selectedElementIds.includes(el.id) || (el.groupId && selectedElementIds.some(selId => elements.find(e => e.id === selId)?.groupId === el.groupId)));
    
    const newSymbol = {
      id: `custom-${Date.now()}`,
      name,
      elements: selectedEls
    };
    
    setCustomSymbols([...customSymbols, newSymbol]);
  };

  return (
    <div className="w-64 bg-theme-surface/80 backdrop-blur-xl border-l border-theme-border/50 h-full overflow-y-auto z-40 absolute right-0 top-0 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.3)] transition-all duration-300">
      <div className="p-4 border-b border-theme-border/50 flex justify-between items-center sticky top-0 bg-theme-surface/90 backdrop-blur-md transition-all duration-300 z-10">
        <h2 className="font-bold text-theme-primary tracking-wide">Block Library</h2>
        <button onClick={() => setIsSidebarOpen(false)} className="text-theme-muted hover:text-theme-primary transition-all hover:scale-110 active:scale-95 bg-white/5 hover:bg-white/10 p-1 rounded-full">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-6">
        
        {selectedElementIds.length > 0 && (
          <button 
            onClick={handleSaveSelection}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2 px-4 rounded shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all hover:-translate-y-[1px] active:translate-y-[1px]"
          >
            <Save size={16} />
            <span>Save Selection</span>
          </button>
        )}

        {customSymbols.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-theme-accent uppercase mb-3">Custom Symbols</h3>
            <div className="grid grid-cols-2 gap-3">
              {customSymbols.map(sym => (
                <div 
                  key={sym.id}
                  className="bg-theme-main/50 border border-theme-border/50 rounded-lg p-2 flex flex-col items-center gap-2 cursor-grab hover:border-theme-accent hover:shadow-[0_0_15px_rgba(0,255,204,0.2)] hover:-translate-y-1 transition-all duration-300 group"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'custom_symbol', elements: sym.elements }));
                    setActiveTool('symbol');
                  }}
                >
                  <Box className="w-8 h-8 text-theme-primary/80 group-hover:text-theme-accent transition-colors duration-300 drop-shadow-sm" />
                  <span className="text-xs text-theme-muted text-center truncate w-full group-hover:text-theme-primary transition-colors" title={sym.name}>{sym.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {['Architectural', 'Civil', 'Electrical'].map((category) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-theme-accent uppercase mb-3">{category}</h3>
            <div className="grid grid-cols-2 gap-3">
              {SYMBOLS.filter(s => s.category === category).map(sym => (
                <div 
                  key={sym.id}
                  className="bg-theme-main/50 border border-theme-border/50 rounded-lg p-2 flex flex-col items-center gap-2 cursor-grab hover:border-theme-accent hover:shadow-[0_0_15px_rgba(0,255,204,0.2)] hover:-translate-y-1 transition-all duration-300 group"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'symbol', svgData: sym.svg }));
                    setActiveTool('symbol');
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-12 h-12 stroke-current text-theme-primary/80 group-hover:text-theme-accent stroke-2 fill-none transition-colors duration-300 drop-shadow-sm">
                    <path d={sym.svg} />
                  </svg>
                  <span className="text-xs text-theme-muted text-center group-hover:text-theme-primary transition-colors">{sym.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockSidebar;
