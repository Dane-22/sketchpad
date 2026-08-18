import React, { useEffect, useState } from 'react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { X, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

export const LayerPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { layers, activeLayerId, addLayer, removeLayer, toggleLayerVisibility, setActiveLayerId, theme } = useCanvasState();

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener('open-layer-properties', handleToggle);
    return () => window.removeEventListener('open-layer-properties', handleToggle);
  }, []);

  if (!isOpen) return null;

  return (
    <div className={`absolute left-4 top-32 w-64 p-4 rounded-md shadow-lg border ${theme === 'dark' ? 'bg-[#2a2a2a] border-[#444] text-white' : 'bg-white border-gray-200 text-gray-900'} z-50`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm">Layers</h3>
        <div className="flex gap-2">
          <button onClick={() => addLayer(`Layer ${layers.length + 1}`)} className="hover:text-green-500"><Plus size={16} /></button>
          <button onClick={() => setIsOpen(false)} className="hover:text-red-500"><X size={16} /></button>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2">
        {layers.map((layer) => (
          <div 
            key={layer.id} 
            className={`flex items-center justify-between p-2 rounded cursor-pointer ${activeLayerId === layer.id ? (theme === 'dark' ? 'bg-[#444]' : 'bg-blue-100') : (theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-gray-100')}`}
            onClick={() => setActiveLayerId(layer.id)}
          >
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }} 
                className="hover:text-blue-500"
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-gray-400" />}
              </button>
              <span className="text-sm truncate w-24">{layer.name}</span>
            </div>
            
            {layer.id !== 'default' && (
              <button 
                onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                className="hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
