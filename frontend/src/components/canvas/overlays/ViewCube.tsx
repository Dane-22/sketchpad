import React, { useEffect, useRef, useState } from 'react';
import { useCanvasState } from '../../../features/planner/hooks/useCanvasState';
import { RotateCcw, RotateCw, Home, ChevronDown } from 'lucide-react';
import { useToast } from '../../ui/ToastProvider';

const ViewCube = () => {
  const { setStagePos, setStageScale, stageRotation, setStageRotation, stagePitch, setStagePitch } = useCanvasState();
  const { showToast } = useToast();
  
  const isDraggingCompass = useRef(false);
  const lastAngleRef = useRef<number>(0);
  const compassRef = useRef<HTMLDivElement>(null);
  const wcsDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isWcsOpen, setIsWcsOpen] = useState(false);
  const [showPivot, setShowPivot] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wcsDropdownRef.current && !wcsDropdownRef.current.contains(event.target as Node)) {
        setIsWcsOpen(false);
      }
    };
    if (isWcsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWcsOpen]);

  const handleRotateMath = (angleDelta: number) => {
    const state = useCanvasState.getState();
    const currentRotation = state.stageRotation;
    const currentPos = state.stagePos;
    const scale = state.stageScale;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const dx = (cx - currentPos.x) / scale;
    const dy = (cy - currentPos.y) / scale;
    
    const rad = -currentRotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const worldX = dx * cos - dy * sin;
    const worldY = dx * sin + dy * cos;

    const newRotation = (currentRotation + angleDelta) % 360;

    const newRad = newRotation * Math.PI / 180;
    const nCos = Math.cos(newRad);
    const nSin = Math.sin(newRad);

    const scaledX = worldX * scale;
    const scaledY = worldY * scale;

    const rotatedX = scaledX * nCos - scaledY * nSin;
    const rotatedY = scaledX * nSin + scaledY * nCos;

    state.setStageRotation(newRotation);
    state.setStagePos({
      x: cx - rotatedX,
      y: cy - rotatedY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingCompass.current || !compassRef.current) return;
      
      const rect = compassRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      let delta = angle - lastAngleRef.current;
      
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      
      if (Math.abs(delta) > 0.1) {
        lastAngleRef.current = angle;
        handleRotateMath(delta);
      }
    };
    
    const handleMouseUp = () => {
      isDraggingCompass.current = false;
      setShowPivot(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handlePan = (e: React.MouseEvent, dx: number, dy: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    const state = useCanvasState.getState();
    const rad = state.stageRotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const rotatedDx = dx * cos - dy * sin;
    const rotatedDy = dx * sin + dy * cos;
    
    setStagePos({
      x: state.stagePos.x + rotatedDx,
      y: state.stagePos.y + rotatedDy,
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    
    setStageScale(1);
    setStageRotation(0);
    setStagePitch(0);
    setStagePos({ x: cx, y: cy }); // Centers the 0,0 origin to the screen center
  };

  const handle3DView = (e: React.MouseEvent, rotation: number, pitch: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    setStageRotation(rotation);
    setStagePitch(pitch);
    
    // Auto-center when changing primary viewing modes
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    setStagePos({ x: cx, y: cy });
  };

  const handleRotate = (e: React.MouseEvent, angleDelta: number) => {
    e.stopPropagation();
    e.preventDefault();
    handleRotateMath(angleDelta);
  };

  const handleCompassMouseDown = (e: React.MouseEvent) => {
    if (!compassRef.current) return;
    isDraggingCompass.current = true;
    setShowPivot(true);
    
    const rect = compassRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    lastAngleRef.current = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  };

  return (
    <>
    {/* Pivot Indicator */}
    {showPivot && (
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none flex flex-col items-center justify-center">
        <span className="text-[#00ffcc] text-[10px] font-bold mb-1">PIVOT</span>
        <div className="w-4 h-4 rounded-full bg-[#00ffcc]/30 border-2 border-[#00ffcc] shadow-[0_0_10px_rgba(0,255,204,0.5)] relative flex items-center justify-center">
           <div className="w-1 h-1 bg-[#00ffcc] rounded-full"></div>
        </div>
      </div>
    )}

    <div 
      className="absolute top-6 right-6 z-[1000] flex flex-col items-center opacity-80 hover:opacity-100 transition-opacity"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="flex w-full justify-start mb-2 relative">
        <button 
           onClick={handleReset} 
           className="absolute -top-4 -left-4 bg-theme-surface hover:bg-theme-hover border border-theme-border p-1 rounded-sm shadow-md cursor-pointer z-10"
           title="Home View"
        >
          <Home size={14} className="text-theme-primary" />
        </button>
      </div>

      <div className="relative w-28 h-28 flex items-center justify-center" ref={compassRef}>
        {/* Outer Compass Ring */}
        <div 
          className="absolute inset-0 rounded-full border-[14px] border-theme-surface/70 cursor-grab active:cursor-grabbing hover:border-theme-surface/90 transition-transform duration-75"
          style={{ transform: `rotate(${-stageRotation}deg)` }}
          onMouseDown={handleCompassMouseDown}
        ></div>
        
        {/* Compass Labels */}
        <div 
          className="absolute inset-0 font-bold text-[10px] text-theme-primary pointer-events-none transition-transform duration-75"
          style={{ transform: `rotate(${-stageRotation}deg)` }}
        >
          <button onClick={(e) => handlePan(e, 0, 100)} className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-0.5 hover:text-blue-500 cursor-pointer p-0.5 pointer-events-auto">N</button>
          <button onClick={(e) => handlePan(e, 0, -100)} className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-0.5 hover:text-blue-500 cursor-pointer p-0.5 pointer-events-auto">S</button>
          <button onClick={(e) => handlePan(e, 100, 0)} className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-1 hover:text-blue-500 cursor-pointer p-0.5 pointer-events-auto">W</button>
          <button onClick={(e) => handlePan(e, -100, 0)} className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1 hover:text-blue-500 cursor-pointer p-0.5 pointer-events-auto">E</button>
        </div>

        {/* Inner 3D Cube */}
        <div 
          className="relative w-12 h-12 transition-transform duration-75 transform-gpu"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: `perspective(300px) rotateX(${stagePitch}deg) rotateZ(${-stageRotation}deg)` 
          }}
        >
          {/* TOP FACE */}
          <div 
            className="absolute inset-0 bg-theme-surface border-2 border-theme-border flex items-center justify-center overflow-hidden" 
            style={{ transform: 'translateZ(24px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 w-full h-full text-[0px] text-transparent hover:text-white/80 select-none z-10">
              <button onClick={(e) => handle3DView(e, -45, 60)} className="hover:bg-blue-500/50 hover:text-[8px] flex items-center justify-center cursor-pointer" title="NW Isometric">TL</button>
              <button onClick={(e) => handle3DView(e, 0, 60)} className="hover:bg-blue-500/50 hover:text-[8px] flex items-center justify-center cursor-pointer" title="N Edge">T</button>
              <button onClick={(e) => handle3DView(e, 45, 60)} className="hover:bg-blue-500/50 hover:text-[8px] flex items-center justify-center cursor-pointer" title="NE Isometric">TR</button>
              
              <button onClick={(e) => handle3DView(e, -90, 60)} className="hover:bg-blue-500/50 hover:text-[8px] flex items-center justify-center cursor-pointer" title="W Edge">L</button>
              <button onClick={(e) => handle3DView(e, 0, 0)} className="bg-theme-main/40 hover:bg-theme-main/90 text-theme-primary flex items-center justify-center border border-theme-border/20 text-[10px] font-bold !text-theme-primary cursor-pointer">TOP</button>
              <button onClick={(e) => handle3DView(e, 90, 60)} className="hover:bg-blue-500/50 hover:text-[8px] flex items-center justify-center cursor-pointer" title="E Edge">R</button>
              
              <button onClick={(e) => handle3DView(e, -135, 60)} className="hover:bg-blue-500/50 hover:text-[8px] flex items-center justify-center cursor-pointer" title="SW Isometric">BL</button>
              <button onClick={(e) => handle3DView(e, 180, 60)} className="hover:bg-blue-500/50 hover:text-[8px] flex items-center justify-center cursor-pointer" title="S Edge">B</button>
              <button onClick={(e) => handle3DView(e, 135, 60)} className="hover:bg-blue-500/50 hover:text-[8px] flex items-center justify-center cursor-pointer" title="SE Isometric">BR</button>
            </div>
          </div>

          {/* BOTTOM FACE */}
          <div 
            className="absolute inset-0 bg-theme-surface border border-theme-border flex items-center justify-center font-bold text-[10px] text-theme-primary cursor-pointer hover:bg-theme-hover" 
            style={{ transform: 'rotateX(180deg) translateZ(24px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            onClick={(e) => handle3DView(e, 0, 0)}
          >
            BOTTOM
          </div>
          
          {/* FRONT FACE (South edge) */}
          <div 
            className="absolute inset-0 bg-theme-surface border border-theme-border flex items-center justify-center font-bold text-[10px] text-theme-primary cursor-pointer hover:bg-theme-hover" 
            style={{ transform: 'rotateX(-90deg) translateZ(24px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            onClick={(e) => handle3DView(e, 0, 60)}
          >
            FRONT
          </div>

          {/* BACK FACE (North edge) */}
          <div 
            className="absolute inset-0 bg-theme-surface border border-theme-border flex items-center justify-center font-bold text-[10px] text-theme-primary cursor-pointer hover:bg-theme-hover" 
            style={{ transform: 'rotateX(90deg) rotateZ(180deg) translateZ(24px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            onClick={(e) => handle3DView(e, 180, 60)}
          >
            BACK
          </div>

          {/* RIGHT FACE (East edge) */}
          <div 
            className="absolute inset-0 bg-theme-surface border border-theme-border flex items-center justify-center font-bold text-[10px] text-theme-primary cursor-pointer hover:bg-theme-hover" 
            style={{ transform: 'rotateY(90deg) rotateZ(-90deg) translateZ(24px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            onClick={(e) => handle3DView(e, 90, 60)}
          >
            RIGHT
          </div>

          {/* LEFT FACE (West edge) */}
          <div 
            className="absolute inset-0 bg-theme-surface border border-theme-border flex items-center justify-center font-bold text-[10px] text-theme-primary cursor-pointer hover:bg-theme-hover" 
            style={{ transform: 'rotateY(-90deg) rotateZ(90deg) translateZ(24px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            onClick={(e) => handle3DView(e, -90, 60)}
          >
            LEFT
          </div>
        </div>

        {/* Rotate Controls */}
        <button 
          onClick={(e) => handleRotate(e, -90)}
          className="absolute -top-3 right-0 text-theme-muted hover:text-theme-primary pointer-events-auto cursor-pointer"
          title="Rotate Counter-Clockwise"
        >
          <RotateCcw size={16} />
        </button>
        <button 
          onClick={(e) => handleRotate(e, 90)}
          className="absolute -bottom-3 right-0 text-theme-muted hover:text-theme-primary pointer-events-auto cursor-pointer"
          title="Rotate Clockwise"
        >
          <RotateCw size={16} />
        </button>
      </div>

      <div className="mt-4 w-full flex justify-center relative" ref={wcsDropdownRef}>
        <button 
          onClick={() => setIsWcsOpen(!isWcsOpen)}
          className="flex items-center space-x-1 text-[9px] bg-theme-surface hover:bg-theme-hover border border-theme-border px-1.5 py-0.5 rounded text-theme-primary cursor-pointer shadow-sm pointer-events-auto"
        >
          <span>WCS</span>
          <ChevronDown size={10} />
        </button>

        {isWcsOpen && (
          <div className="absolute top-full mt-1 bg-theme-surface border border-theme-border shadow-lg rounded py-1 min-w-[140px] z-50 text-[10px] pointer-events-auto">
            <button 
              onClick={() => setIsWcsOpen(false)}
              className="w-full text-left px-3 py-1.5 hover:bg-theme-hover text-theme-primary font-bold cursor-pointer"
            >
              World Coordinate System (WCS)
            </button>
            <div className="h-px bg-theme-border my-1"></div>
            <button 
              onClick={() => { setIsWcsOpen(false); showToast('New UCS coming soon!', 'info'); }}
              className="w-full text-left px-3 py-1.5 hover:bg-theme-hover text-theme-primary cursor-pointer"
            >
              New UCS...
            </button>
            <button 
              onClick={() => { setIsWcsOpen(false); showToast('Manage UCS coming soon!', 'info'); }}
              className="w-full text-left px-3 py-1.5 hover:bg-theme-hover text-theme-primary cursor-pointer"
            >
              Manage UCS...
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ViewCube;
