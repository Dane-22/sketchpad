import { useState } from 'react';
import RibbonTab from './RibbonTab';
import RibbonPanel from './RibbonPanel';
import RibbonTool from './RibbonTool';
import { 
  Minus, Spline, PenLine, Eraser, Clock,
  Highlighter, Cloud, MessageSquareQuote, Type, Ruler, Stamp,
  ChevronDown, CheckCircle2, ArrowUpRight, Palette
} from 'lucide-react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { useToast } from '../ui/ToastProvider';

const RibbonMenu = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('Home');
  const [isStampDropdownOpen, setIsStampDropdownOpen] = useState(false);
  const [isHighlighterDropdownOpen, setIsHighlighterDropdownOpen] = useState(false);
  
  const { 
    activeTool, setActiveTool,
    activeStampType, setActiveStampType,
    highlighterColor, setHighlighterColor,
    setTextColor, textColor,
    eraserMode, setEraserMode
  } = useCanvasState();

  const [isInkDropdownOpen, setIsInkDropdownOpen] = useState(false);
  const [isEraserDropdownOpen, setIsEraserDropdownOpen] = useState(false);

  const tabs = ['Home', 'Insert', 'Annotate', 'Parametric', 'View', 'Manage', 'Output', 'Collaborate', 'Express Tools'];

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'Home' && tab !== 'Annotate') {
      showToast(`${tab} tools are coming soon!`);
    }
  };

  const stampOptions: Array<{ type: 'APPROVED' | 'REVISE & RESUBMIT' | 'FOR REVIEW' | 'REJECTED' | 'AS-BUILT' | 'HOLD'; label: string; color: string }> = [
    { type: 'APPROVED', label: 'APPROVED', color: '#10b981' },
    { type: 'REVISE & RESUBMIT', label: 'REVISE & RESUBMIT', color: '#f59e0b' },
    { type: 'FOR REVIEW', label: 'FOR REVIEW', color: '#3b82f6' },
    { type: 'REJECTED', label: 'REJECTED', color: '#ef4444' },
    { type: 'AS-BUILT', label: 'AS-BUILT', color: '#06b6d4' },
    { type: 'HOLD', label: 'HOLD', color: '#8b5cf6' },
  ];

  const highlighterColors = [
    { color: '#ffe600', label: 'Fluorescent Yellow' },
    { color: '#00ffcc', label: 'Neon Cyan' },
    { color: '#ff3b30', label: 'Redline Red' },
    { color: '#34c759', label: 'Emerald Green' },
    { color: '#ff2d55', label: 'Hot Pink' },
    { color: '#ff9500', label: 'Bright Orange' },
  ];

  const inkColors = [
    { color: '#ffffff', label: 'White' },
    { color: '#ef4444', label: 'Red' },
    { color: '#f59e0b', label: 'Orange' },
    { color: '#eab308', label: 'Yellow' },
    { color: '#10b981', label: 'Green' },
    { color: '#3b82f6', label: 'Blue' },
    { color: '#8b5cf6', label: 'Purple' },
    { color: '#ec4899', label: 'Pink' }
  ];

  return (
    <div className="flex flex-col bg-theme-surface border-b border-theme-border w-full z-40 transition-colors duration-300">
      {/* Ribbon Tabs Headers */}
      <div className="flex px-2 pt-1 gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-4 py-1 text-xs transition-colors rounded-t-sm whitespace-nowrap
              ${activeTab === tab 
                ? 'bg-theme-main text-theme-primary border border-b-0 border-theme-border font-medium' 
                : 'text-theme-muted hover:bg-theme-hover hover:text-theme-primary'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Ribbon Tab Content Area */}
      <div className="bg-theme-main border-t border-theme-border flex-1 min-h-[96px]">
        {activeTab === 'Home' ? (
          <RibbonTab id="Home" isActive={true}>
            {/* Draw Panel */}
            <RibbonPanel label="Draw">
              <RibbonTool 
                icon={<Minus size={24} />} 
                label="Line" 
                isActive={activeTool === 'line'} 
                onClick={() => { setActiveTool('line'); showToast("Click and drag to draw a line."); }} 
              />
              <RibbonTool 
                icon={<Spline size={24} />} 
                label="Polyline" 
                isActive={activeTool === 'polyline'} 
                onClick={() => { setActiveTool('polyline'); showToast("Click points to draw a polyline. Double-click or press Enter to finish."); }} 
              />
              <RibbonTool 
                icon={<ArrowUpRight size={24} />} 
                label="Arrow" 
                isActive={activeTool === 'arrow'} 
                onClick={() => { setActiveTool('arrow'); showToast("Click and drag to draw an arrow."); }} 
              />
              <RibbonTool 
                icon={<PenLine size={24} />} 
                label="Freehand" 
                isActive={activeTool === 'freehand'} 
                onClick={() => { setActiveTool('freehand'); showToast("Click and drag to draw freehand."); }} 
              />
              <div className="relative">
                <RibbonTool 
                  icon={<Palette size={24} style={{ color: textColor }} />} 
                  label="Ink Color" 
                  isActive={false} 
                  onClick={() => setIsInkDropdownOpen(!isInkDropdownOpen)} 
                />
                {isInkDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-theme-surface border border-theme-border shadow-2xl rounded-lg p-2 z-50 flex flex-col gap-1 w-32">
                    <span className="text-[10px] text-theme-muted font-semibold uppercase px-1">Ink Color</span>
                    {inkColors.map(c => (
                      <button
                        key={c.color}
                        onClick={() => {
                          setTextColor(c.color);
                          setIsInkDropdownOpen(false);
                          showToast(`Ink color changed to ${c.label}`);
                        }}
                        className="flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-white/10 text-theme-primary"
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: c.color }} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </RibbonPanel>

            {/* Modify Panel */}
            <RibbonPanel label="Modify">
              <div className="relative">
                <RibbonTool 
                  icon={<Eraser size={24} />} 
                  label={`Eraser`} 
                  isActive={activeTool === 'eraser'} 
                  onClick={() => {
                    if (activeTool === 'eraser') {
                      setIsEraserDropdownOpen(!isEraserDropdownOpen);
                    } else {
                      setActiveTool('eraser'); 
                      showToast(`Eraser active (${eraserMode} to erase)`); 
                    }
                  }} 
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEraserDropdownOpen(!isEraserDropdownOpen);
                  }}
                  className="absolute bottom-1 right-1 p-0.5 rounded hover:bg-white/10 text-theme-muted hover:text-white"
                  title="Change Eraser Mode"
                >
                  <ChevronDown size={12} />
                </button>
                {isEraserDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-theme-surface border border-theme-border shadow-2xl rounded-lg p-2 z-50 flex flex-col gap-1 w-36">
                    <span className="text-[10px] text-theme-muted font-semibold uppercase px-1">Eraser Mode</span>
                    <button
                      onClick={() => {
                        setEraserMode('hover');
                        setIsEraserDropdownOpen(false);
                        showToast(`Eraser mode changed to Hover`);
                      }}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-white/10 text-theme-primary"
                    >
                      <span>Hover to Erase</span>
                      {eraserMode === 'hover' && <CheckCircle2 size={14} className="ml-auto text-cyan-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setEraserMode('click');
                        setIsEraserDropdownOpen(false);
                        showToast(`Eraser mode changed to Click`);
                      }}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-white/10 text-theme-primary"
                    >
                      <span>Click to Erase</span>
                      {eraserMode === 'click' && <CheckCircle2 size={14} className="ml-auto text-cyan-400" />}
                    </button>
                  </div>
                )}
              </div>
            </RibbonPanel>
          </RibbonTab>
        ) : activeTab === 'Annotate' ? (
          <RibbonTab id="Annotate" isActive={true}>
            {/* Redline & Markup Tools */}
            <RibbonPanel label="Markup & Redline">
              <RibbonTool 
                icon={<PenLine size={24} className="text-red-400" />} 
                label="Redline Pen" 
                isActive={activeTool === 'freehand' && textColor === '#ff3333'} 
                onClick={() => { 
                  setTextColor('#ff3333');
                  setActiveTool('freehand'); 
                  showToast("Redline Pen active. Draw sketches directly over blueprints."); 
                }} 
              />
              <div className="relative">
                <RibbonTool 
                  icon={<Highlighter size={24} style={{ color: highlighterColor }} />} 
                  label="Highlighter" 
                  isActive={activeTool === 'highlighter'} 
                  onClick={() => { 
                    setActiveTool('highlighter'); 
                    showToast("Highlighter active. Draw translucent highlights over text & drawings."); 
                  }} 
                />
                <button
                  onClick={() => setIsHighlighterDropdownOpen(!isHighlighterDropdownOpen)}
                  className="absolute bottom-1 right-1 p-0.5 rounded hover:bg-white/10 text-theme-muted hover:text-white"
                  title="Change Highlighter Color"
                >
                  <ChevronDown size={12} />
                </button>
                {isHighlighterDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-theme-surface border border-theme-border shadow-2xl rounded-lg p-2 z-50 flex flex-col gap-1 w-40">
                    <span className="text-[10px] text-theme-muted font-semibold uppercase px-1">Highlighter Color</span>
                    {highlighterColors.map(c => (
                      <button
                        key={c.color}
                        onClick={() => {
                          setHighlighterColor(c.color);
                          setIsHighlighterDropdownOpen(false);
                          setActiveTool('highlighter');
                        }}
                        className="flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-white/10 text-theme-primary"
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: c.color }} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <RibbonTool 
                icon={<Cloud size={24} className="text-amber-400" />} 
                label="Rev Cloud" 
                isActive={activeTool === 'cloud'} 
                onClick={() => { 
                  setActiveTool('cloud'); 
                  showToast("Revision Cloud active. Drag or click points to create a cloud boundary."); 
                }} 
              />
            </RibbonPanel>

            {/* Callouts & Text Panel */}
            <RibbonPanel label="Callouts & Notes">
              <RibbonTool 
                icon={<MessageSquareQuote size={24} className="text-cyan-400" />} 
                label="Callout" 
                isActive={activeTool === 'callout'} 
                onClick={() => { 
                  setActiveTool('callout'); 
                  showToast("Callout active. Click arrow point then text position."); 
                }} 
              />
              <RibbonTool 
                icon={<Type size={24} />} 
                label="Text Note" 
                isActive={activeTool === 'text'} 
                onClick={() => { 
                  setActiveTool('text'); 
                  showToast("Click canvas to place text note."); 
                }} 
              />
              <RibbonTool 
                icon={<Ruler size={24} />} 
                label="Dimension" 
                isActive={activeTool === 'dimension'} 
                onClick={() => { 
                  setActiveTool('dimension'); 
                  showToast("Dimension tool active. Click point 1, point 2, then offset."); 
                }} 
              />
            </RibbonPanel>

            {/* Engineering Review Stamps */}
            <RibbonPanel label="Review Stamps">
              <div className="relative">
                <RibbonTool 
                  icon={<Stamp size={24} className="text-emerald-400" />} 
                  label={`Stamp: ${activeStampType.split(' ')[0]}`} 
                  isActive={activeTool === 'stamp'} 
                  onClick={() => { 
                    setActiveTool('stamp'); 
                    showToast(`Stamp active [${activeStampType}]. Click on document/blueprint to stamp.`); 
                  }} 
                />
                <button
                  onClick={() => setIsStampDropdownOpen(!isStampDropdownOpen)}
                  className="absolute bottom-1 right-1 p-0.5 rounded hover:bg-white/10 text-theme-muted hover:text-white"
                  title="Choose Stamp Type"
                >
                  <ChevronDown size={12} />
                </button>
                {isStampDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-theme-surface border border-theme-border shadow-2xl rounded-lg p-2 z-50 flex flex-col gap-1 w-48">
                    <span className="text-[10px] text-theme-muted font-semibold uppercase px-1">Select Stamp Type</span>
                    {stampOptions.map(st => (
                      <button
                        key={st.type}
                        onClick={() => {
                          setActiveStampType(st.type);
                          setIsStampDropdownOpen(false);
                          setActiveTool('stamp');
                          showToast(`Selected stamp: ${st.label}`);
                        }}
                        className={`flex items-center justify-between px-2 py-1.5 text-xs text-left rounded hover:bg-white/10 ${activeStampType === st.type ? 'bg-white/10 font-bold' : ''}`}
                      >
                        <span style={{ color: st.color }}>{st.label}</span>
                        {activeStampType === st.type && <CheckCircle2 size={12} className="text-theme-accent" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </RibbonPanel>
          </RibbonTab>
        ) : (
          <div className="h-[96px] bg-theme-surface flex items-center justify-center gap-3 px-6 select-none">
            <div className="p-2.5 rounded-lg bg-theme-hover text-theme-accent border border-theme-border flex items-center justify-center">
              <Clock size={20} className="text-theme-accent" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-theme-primary">{activeTab}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-hover text-theme-accent font-medium uppercase tracking-wider border border-theme-border">
                  Coming Soon
                </span>
              </div>
              <span className="text-[11px] text-theme-muted mt-0.5">
                Tools and features for the {activeTab} tab are currently under development.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RibbonMenu;

