import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Palette } from 'lucide-react';

interface ColorPickerDropdownProps {
  color: string;
  onChange: (color: string) => void;
}

const THEME_COLORS = [
  '#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'
];

const THEME_SHADES = [
  ['#f2f2f2', '#808080', '#d0cece', '#d6dce4', '#d9e1f2', '#fce4d6', '#ededed', '#fff2cc', '#deebf7', '#e2efda'],
  ['#d8d8d8', '#595959', '#aeaaaa', '#adb9ca', '#b4c6e7', '#f8cbad', '#dbdbdb', '#ffe699', '#bdd7ee', '#c6e0b4'],
  ['#bfbfbf', '#404040', '#757171', '#8497b0', '#8ea9db', '#f4b084', '#c9c9c9', '#ffd966', '#9bc2e6', '#a9d08e'],
  ['#a6a6a6', '#262626', '#3a3838', '#333f4f', '#305496', '#c65911', '#7b7b7b', '#bf8f00', '#2e74b5', '#548235'],
  ['#7f7f7f', '#0d0d0d', '#171616', '#222a35', '#1f3864', '#833c0c', '#525252', '#806000', '#1f4e78', '#375623']
];

const STANDARD_COLORS = [
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'
];

const ColorPickerDropdown: React.FC<ColorPickerDropdownProps> = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 2,
        left: rect.left,
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleColorClick = (c: string) => {
    onChange(c);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button 
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-1 hover:bg-theme-hover rounded transition-colors border border-transparent hover:border-theme-border"
        title="Font Color"
      >
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-bold text-theme-primary leading-none">A</span>
          <div className="w-4 h-1 mt-[2px] border border-theme-border/50" style={{ backgroundColor: color }}></div>
        </div>
        <ChevronDown size={12} className="text-theme-muted" />
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed bg-theme-surface border border-theme-border rounded shadow-xl z-[9999] text-[12px] text-theme-primary font-sans select-none"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          
          <div className="p-2 border-b border-theme-border flex items-center justify-between">
            <span className="text-theme-muted">High-contrast only</span>
            <div className="w-8 h-4 bg-gray-600 rounded-full flex items-center p-0.5 cursor-not-allowed">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>

          <div 
            className="p-2 border-b border-theme-border flex items-center gap-2 cursor-pointer hover:bg-theme-hover transition-colors"
            onClick={() => handleColorClick('#ffffff')}
          >
            <div className="w-4 h-4 border border-theme-border bg-theme-primary"></div>
            <span>Automatic</span>
          </div>

          <div className="p-2">
            <div className="mb-1 font-semibold text-theme-muted">Theme Colors</div>
            <div className="flex gap-1 mb-1">
              {THEME_COLORS.map((c, i) => (
                <div 
                  key={i} 
                  className={`w-5 h-5 border border-theme-border cursor-pointer hover:scale-110 transition-transform ${color === c ? 'ring-1 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => handleColorClick(c)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-[2px]">
              {THEME_SHADES.map((row, i) => (
                <div key={i} className="flex gap-1">
                  {row.map((c, j) => (
                    <div 
                      key={j} 
                      className={`w-5 h-4 border border-transparent hover:border-white cursor-pointer ${color === c ? 'border-white' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => handleColorClick(c)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="p-2 border-t border-theme-border">
            <div className="mb-1 font-semibold text-theme-muted">Standard Colors</div>
            <div className="flex gap-1">
              {STANDARD_COLORS.map((c, i) => (
                <div 
                  key={i} 
                  className={`w-5 h-5 border border-theme-border cursor-pointer hover:scale-110 transition-transform ${color === c ? 'ring-1 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => handleColorClick(c)}
                />
              ))}
            </div>
          </div>

          <div className="p-2 border-t border-theme-border flex flex-col gap-1">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-theme-hover p-1 rounded transition-colors"
              onClick={() => nativeInputRef.current?.click()}
            >
              <Palette size={14} className="text-theme-muted" />
              <span>More Colors...</span>
            </div>
            <input 
              type="color" 
              ref={nativeInputRef}
              value={color}
              onChange={(e) => {
                onChange(e.target.value);
                setIsOpen(false);
              }}
              className="hidden"
            />
          </div>

        </div>,
        document.body
      )}
    </div>
  );
};

export default ColorPickerDropdown;
