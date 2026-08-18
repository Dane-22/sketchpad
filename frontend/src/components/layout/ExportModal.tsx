import React from 'react';
import { Download, FileImage, FileText, FileCode2, X } from 'lucide-react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { exportToPNG, exportToPDF, exportToDXF } from '../../features/planner/utils/exportCAD';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  getStageDataUrl: () => string;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, getStageDataUrl }) => {
  const { elements, stageWidth, stageHeight, unitMode } = useCanvasState();

  if (!isOpen) return null;

  const handleExportPNG = () => {
    const dataUrl = getStageDataUrl();
    exportToPNG(dataUrl, 'eng-planner-export.png');
    onClose();
  };

  const handleExportPDF = () => {
    const dataUrl = getStageDataUrl();
    exportToPDF(dataUrl, stageWidth, stageHeight, 'eng-planner-export.pdf');
    onClose();
  };

  const handleExportDXF = () => {
    exportToDXF(elements, unitMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <Download size={24} className="text-theme-accent" />
            Export Project
          </h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleExportPNG}
            className="flex items-center gap-3 p-4 rounded-lg bg-theme-hover hover:brightness-110 border border-theme-border transition-all text-left group"
          >
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded group-hover:bg-blue-500/30 transition-colors">
              <FileImage size={24} />
            </div>
            <div>
              <div className="font-semibold text-theme-primary">PNG Image</div>
              <div className="text-sm text-theme-muted">High resolution flat image</div>
            </div>
          </button>

          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-3 p-4 rounded-lg bg-theme-hover hover:brightness-110 border border-theme-border transition-all text-left group"
          >
            <div className="p-2 bg-red-500/20 text-red-400 rounded group-hover:bg-red-500/30 transition-colors">
              <FileText size={24} />
            </div>
            <div>
              <div className="font-semibold text-theme-primary">PDF Document</div>
              <div className="text-sm text-theme-muted">Standard document format</div>
            </div>
          </button>

          <button 
            onClick={handleExportDXF}
            className="flex items-center gap-3 p-4 rounded-lg bg-theme-hover hover:brightness-110 border border-theme-border transition-all text-left group"
          >
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded group-hover:bg-orange-500/30 transition-colors">
              <FileCode2 size={24} />
            </div>
            <div>
              <div className="font-semibold text-theme-primary">DXF File</div>
              <div className="text-sm text-theme-muted">CAD compatible vector file</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
