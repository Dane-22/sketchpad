import React, { useEffect, useRef } from 'react';
import {
  Trash2,
  Copy,
  Lock,
  Unlock,
  ArrowDownToLine,
  ArrowUpToLine,
  RotateCw,
  RotateCcw,
  Sliders,
  MessageSquarePlus,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { useCanvasState } from '../../../features/planner/hooks/useCanvasState';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  elementId: string;
  onClose: () => void;
  onAddCommentPinAtPos?: (pos: { x: number; y: number }) => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  elementId,
  onClose,
  onAddCommentPinAtPos,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    elements,
    removeElements,
    sendToBack,
    bringToFront,
    duplicateElement,
    toggleLockElement,
    setElementOpacity,
    rotateElement,
  } = useCanvasState();

  const element = elements.find((e) => e.id === elementId);

  // Close on outside click or escape key
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!element) return null;

  const isImage = element.type === 'image';
  const isLocked = !!element.locked;
  const currentOpacity = element.opacity !== undefined ? Math.round(element.opacity * 100) : 100;

  // Prevent menu overflow off the edge of screen
  const menuWidth = 220;
  const menuHeight = 320;
  const safeX = Math.min(x, window.innerWidth - menuWidth - 10);
  const safeY = Math.min(y, window.innerHeight - menuHeight - 10);

  const handleDelete = () => {
    removeElements([elementId]);
    onClose();
  };

  const handleDuplicate = () => {
    duplicateElement(elementId);
    onClose();
  };

  const handleToggleLock = () => {
    toggleLockElement(elementId);
    onClose();
  };

  const handleSendToBack = () => {
    sendToBack(elementId);
    onClose();
  };

  const handleBringToFront = () => {
    bringToFront(elementId);
    onClose();
  };

  const handleRotate = (deg: number) => {
    rotateElement(elementId, deg);
  };

  const handleSetOpacity = (val: number) => {
    setElementOpacity(elementId, val);
  };

  const handleAddPin = () => {
    if (onAddCommentPinAtPos) {
      onAddCommentPinAtPos({ x: element.x, y: element.y });
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[999] bg-slate-900/95 backdrop-blur-2xl border border-slate-700/90 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150 min-w-[210px]"
      style={{ left: `${safeX}px`, top: `${safeY}px` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header Tag */}
      <div className="px-2.5 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          {isImage ? <ImageIcon size={13} className="text-cyan-400" /> : <Layers size={13} className="text-blue-400" />}
          <span className="capitalize">{element.name || element.type}</span>
        </div>
        {isLocked && (
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
            Locked
          </span>
        )}
      </div>

      {/* Primary Actions */}
      <button
        onClick={handleDelete}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-rose-600/20 hover:text-rose-300 text-rose-400 font-semibold transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Trash2 size={14} />
          <span>Delete Element</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Del</span>
      </button>

      <button
        onClick={handleDuplicate}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Copy size={14} className="text-blue-400" />
          <span>Duplicate</span>
        </div>
      </button>

      <button
        onClick={handleToggleLock}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isLocked ? <Unlock size={14} className="text-amber-400" /> : <Lock size={14} className="text-slate-400" />}
          <span>{isLocked ? 'Unlock Position' : 'Lock in Place'}</span>
        </div>
      </button>

      <div className="h-px bg-slate-800 my-0.5" />

      {/* Layer Ordering (Crucial for background blueprints) */}
      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        Layer Order
      </div>

      <button
        onClick={handleSendToBack}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-left"
        title="Place underneath all drawing entities (ideal for background blueprints)"
      >
        <div className="flex items-center gap-2">
          <ArrowDownToLine size={14} className="text-indigo-400" />
          <span>Send to Back (Background)</span>
        </div>
      </button>

      <button
        onClick={handleBringToFront}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <ArrowUpToLine size={14} className="text-indigo-400" />
          <span>Bring to Front</span>
        </div>
      </button>

      <div className="h-px bg-slate-800 my-0.5" />

      {/* Rotation & Alignment */}
      <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <span>Rotate</span>
        <div className="flex items-center gap-1 font-normal lowercase">
          <button
            onClick={() => handleRotate(90)}
            className="p-1 rounded hover:bg-slate-800 hover:text-cyan-300 text-slate-300 transition-colors"
            title="Rotate 90° Clockwise"
          >
            <RotateCw size={13} />
          </button>
          <button
            onClick={() => handleRotate(-90)}
            className="p-1 rounded hover:bg-slate-800 hover:text-cyan-300 text-slate-300 transition-colors"
            title="Rotate 90° Counter-Clockwise"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Opacity Presets for Blueprint Tracing */}
      <div className="px-2.5 py-1 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Sliders size={11} /> Opacity ({currentOpacity}%)
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {[0.25, 0.5, 0.75, 1.0].map((op) => (
            <button
              key={op}
              onClick={() => handleSetOpacity(op)}
              className={`py-1 rounded text-[10px] font-bold transition-all ${
                Math.abs((element.opacity ?? 1) - op) < 0.05
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {op * 100}%
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-800 my-0.5" />

      {/* Discussion Pin Link */}
      <button
        onClick={handleAddPin}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <MessageSquarePlus size={14} className="text-cyan-400" />
          <span>Drop Discussion Pin</span>
        </div>
      </button>
    </div>
  );
};
