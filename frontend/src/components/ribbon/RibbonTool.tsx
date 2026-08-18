import React from 'react';

interface RibbonToolProps {
  icon: React.ReactNode;
  label: string;
  size?: 'large' | 'small';
  onClick?: () => void;
  isActive?: boolean;
}

const RibbonTool: React.FC<RibbonToolProps> = ({ icon, label, size = 'large', onClick, isActive }) => {
  const baseClasses = "flex items-center justify-center rounded hover:bg-theme-hover cursor-pointer transition-colors text-theme-primary select-none";
  const activeClasses = isActive ? "bg-theme-hover ring-1 ring-theme-border" : "";
  
  if (size === 'large') {
    return (
      <div 
        className={`${baseClasses} ${activeClasses} flex-col px-2 py-1 min-w-[56px] h-[68px] gap-1`}
        onClick={onClick}
      >
        <div className="w-8 h-8 flex items-center justify-center text-theme-accent">
          {icon}
        </div>
        <span className="text-[10px] text-center leading-tight whitespace-nowrap">
          {label}
        </span>
      </div>
    );
  }

  // Small size (horizontal)
  return (
    <div 
      className={`${baseClasses} ${activeClasses} flex-row px-2 py-1 h-[22px] gap-2 justify-start`}
      onClick={onClick}
    >
      <div className="w-4 h-4 flex items-center justify-center text-theme-accent">
        {icon}
      </div>
      <span className="text-[11px] whitespace-nowrap">
        {label}
      </span>
    </div>
  );
};

export default RibbonTool;
