import { useState } from 'react';
import RibbonTab from './RibbonTab';
import RibbonPanel from './RibbonPanel';
import RibbonTool from './RibbonTool';
import { 
  Minus, Spline, Circle, PenLine, Square, Eraser, Clock
} from 'lucide-react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { useToast } from '../ui/ToastProvider';

const RibbonMenu = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('Home');
  const { activeTool, setActiveTool } = useCanvasState();

  const tabs = ['Home', 'Insert', 'Annotate', 'Parametric', 'View', 'Manage', 'Output', 'Collaborate', 'Express Tools'];

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'Home') {
      showToast(`${tab} tools are coming soon!`);
    }
  };

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
                onClick={() => { setActiveTool('polyline'); showToast("Click points to draw a polyline. Double-click to finish."); }} 
              />
              <RibbonTool 
                icon={<Circle size={24} />} 
                label="Circle" 
                isActive={activeTool === 'circle'} 
                onClick={() => { setActiveTool('circle'); showToast("Click and drag to draw a circle."); }} 
              />
              <RibbonTool 
                icon={<PenLine size={24} />} 
                label="Freehand" 
                isActive={activeTool === 'freehand'} 
                onClick={() => { setActiveTool('freehand'); showToast("Click and drag to draw freehand."); }} 
              />
              <RibbonTool 
                icon={<Square size={24} />} 
                label="Rectangle" 
                isActive={activeTool === 'rectangle'} 
                onClick={() => { setActiveTool('rectangle'); showToast("Click and drag to draw a rectangle."); }} 
              />
            </RibbonPanel>

            {/* Modify Panel */}
            <RibbonPanel label="Modify">
              <RibbonTool 
                icon={<Eraser size={24} />} 
                label="Eraser" 
                isActive={activeTool === 'eraser'} 
                onClick={() => { setActiveTool('eraser'); showToast("Click on an element to delete it."); }} 
              />
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

