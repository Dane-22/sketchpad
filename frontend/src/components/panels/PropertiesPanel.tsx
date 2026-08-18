import React, { useEffect, useState } from 'react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { X } from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { elements, selectedElementIds, updateElement, theme } = useCanvasState();

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener('toggle-properties-panel', handleToggle);
    return () => window.removeEventListener('toggle-properties-panel', handleToggle);
  }, []);

  if (!isOpen) return null;

  const selectedElement = selectedElementIds.length > 0 ? elements.find((el) => el.id === selectedElementIds[0]) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedElementIds.length === 0) return;
    const { name, value } = e.target;
    let parsedValue: number | string = parseFloat(value);
    if (isNaN(parsedValue) || name === 'stroke') parsedValue = value;

    selectedElementIds.forEach((id) => {
      updateElement(id, { [name]: parsedValue });
    });
  };

  return (
    <div className={`absolute right-4 top-32 w-64 p-4 rounded-md shadow-lg border ${theme === 'dark' ? 'bg-[#2a2a2a] border-[#444] text-white' : 'bg-white border-gray-200 text-gray-900'} z-50`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm">Properties</h3>
        <button onClick={() => setIsOpen(false)} className="hover:text-red-500"><X size={16} /></button>
      </div>

      {!selectedElement ? (
        <div className="text-sm text-gray-500">No element selected.</div>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Type</span>
            <span className="font-mono">{selectedElement.type.toUpperCase()}</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Position X</label>
            <input 
              type="number" 
              name="x" 
              value={selectedElement.x || 0} 
              onChange={handleChange} 
              className={`p-1 border rounded ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#555]' : 'bg-white border-gray-300'}`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Position Y</label>
            <input 
              type="number" 
              name="y" 
              value={selectedElement.y || 0} 
              onChange={handleChange} 
              className={`p-1 border rounded ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#555]' : 'bg-white border-gray-300'}`}
            />
          </div>

          {selectedElement.width !== undefined && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Width</label>
              <input 
                type="number" 
                name="width" 
                value={selectedElement.width || 0} 
                onChange={handleChange} 
                className={`p-1 border rounded ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#555]' : 'bg-white border-gray-300'}`}
              />
            </div>
          )}

          {selectedElement.height !== undefined && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Height</label>
              <input 
                type="number" 
                name="height" 
                value={selectedElement.height || 0} 
                onChange={handleChange} 
                className={`p-1 border rounded ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#555]' : 'bg-white border-gray-300'}`}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Color</label>
            <input 
              type="color" 
              name="stroke" 
              value={selectedElement.stroke || '#ffffff'} 
              onChange={handleChange} 
              className="w-full h-8"
            />
          </div>
        </div>
      )}
    </div>
  );
};
