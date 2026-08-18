import { useCanvasState } from '../../../features/planner/hooks/useCanvasState';

const UcsIcon = () => {
  const { stageRotation, stagePitch } = useCanvasState();

  return (
    <div className="absolute bottom-6 left-6 pointer-events-none z-10 w-16 h-16 opacity-80 flex items-center justify-center">
      <div 
        className="w-full h-full transform-gpu transition-transform duration-75"
        style={{ transformStyle: 'preserve-3d', transform: `perspective(300px) rotateX(${stagePitch}deg) rotateZ(${-stageRotation}deg)` }}
      >
        <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          {/* Origin Square */}
          <rect x="8" y="48" width="8" height="8" strokeWidth="1.5" className="text-theme-primary" />
          
          {/* Y Axis Line (Green) */}
          <line x1="12" y1="48" x2="12" y2="12" strokeWidth="1.5" stroke="#4ade80" />
          
          {/* X Axis Line (Red) */}
          <line x1="16" y1="52" x2="52" y2="52" strokeWidth="1.5" stroke="#f87171" />
          
          {/* Y Label */}
          <path d="M7 6 L12 12 M17 6 L12 12 M12 12 L12 18" strokeWidth="1.5" stroke="#4ade80" />
          
          {/* X Label */}
          <path d="M54 44 L62 52 M62 44 L54 52" strokeWidth="1.5" stroke="#f87171" />
        </svg>
      </div>
    </div>
  );
};

export default UcsIcon;
