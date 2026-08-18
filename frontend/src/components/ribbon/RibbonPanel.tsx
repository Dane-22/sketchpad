import React from 'react';

interface RibbonPanelProps {
  label: string;
  children: React.ReactNode;
}

const RibbonPanel: React.FC<RibbonPanelProps> = ({ label, children }) => {
  return (
    <div className="flex flex-col h-full border-r border-theme-border pr-2 mr-2 last:border-r-0 last:mr-0 last:pr-0">
      <div className="flex flex-1 items-start gap-1 p-1">
        {children}
      </div>
      <div className="h-5 flex items-center justify-center text-[10px] text-theme-muted uppercase select-none pb-1">
        {label}
      </div>
    </div>
  );
};

export default RibbonPanel;
