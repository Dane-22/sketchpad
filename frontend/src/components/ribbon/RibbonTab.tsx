import React from 'react';

interface RibbonTabProps {
  id: string;
  isActive: boolean;
  children: React.ReactNode;
}

const RibbonTab: React.FC<RibbonTabProps> = ({ isActive, children }) => {
  if (!isActive) return null;
  
  return (
    <div className="h-[96px] bg-theme-surface flex items-stretch px-2 py-1 shadow-sm relative overflow-x-auto overflow-y-hidden">
      {children}
    </div>
  );
};

export default RibbonTab;
