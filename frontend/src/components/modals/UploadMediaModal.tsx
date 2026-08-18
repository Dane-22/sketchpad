import React, { useState } from 'react';
import { UploadCloud, X, FileText, Image as ImageIcon, AlertCircle, Loader2, Check, Layers } from 'lucide-react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { useToast } from '../ui/ToastProvider';
import { convertPdfToImages, convertImageFileToDataUrl, ConvertedPdfPage } from '../../features/planner/utils/pdfConverter';
import { CanvasElement } from '../../types/canvas';

interface UploadMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadMediaModal: React.FC<UploadMediaModalProps> = ({ isOpen, onClose }) => {
  const { elements, setElements, stageWidth, stageHeight, stageScale, stagePos, setStagePos, setStageScale, activeLayerId } = useCanvasState();
  const { showToast } = useToast();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PDF Multi-page state
  const [pdfPages, setPdfPages] = useState<ConvertedPdfPage[]>([]);
  const [selectedPageIdx, setSelectedPageIdx] = useState<number>(0);
  const [activeFileName, setActiveFileName] = useState<string>('');

  // Single Image State
  const [previewImage, setPreviewImage] = useState<{ dataUrl: string; width: number; height: number } | null>(null);

  // Settings
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [fitToView, setFitToView] = useState<boolean>(true);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setPdfPages([]);
    setSelectedPageIdx(0);
    setActiveFileName('');
    setPreviewImage(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (isProcessing) return;
    resetState();
    onClose();
  };

  const processFile = async (file: File) => {
    resetState();
    setActiveFileName(file.name);
    setError(null);
    setIsProcessing(true);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      if (ext === 'pdf') {
        const pages = await convertPdfToImages(file);
        if (pages.length === 0) {
          throw new Error('No readable pages found in PDF.');
        }
        setPdfPages(pages);
        setSelectedPageIdx(0);
      } else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
        const imgData = await convertImageFileToDataUrl(file);
        setPreviewImage(imgData);
      } else {
        throw new Error('Unsupported format. Please upload an Image (.png, .jpg, .svg) or Document (.pdf).');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process uploaded file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleInsert = () => {
    let targetDataUrl = '';
    let origWidth = 800;
    let origHeight = 600;

    if (pdfPages.length > 0) {
      const page = pdfPages[selectedPageIdx];
      targetDataUrl = page.dataUrl;
      origWidth = page.width;
      origHeight = page.height;
    } else if (previewImage) {
      targetDataUrl = previewImage.dataUrl;
      origWidth = previewImage.width;
      origHeight = previewImage.height;
    } else {
      return;
    }

    // Determine coordinate & dimensions on canvas
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    // Scale to a reasonable size if fitToView is selected
    if (fitToView) {
      const maxW = Math.max(stageWidth * 0.8, 800);
      const maxH = Math.max(stageHeight * 0.8, 600);
      const scaleFit = Math.min(maxW / origWidth, maxH / origHeight, 1.5);
      targetWidth = origWidth * scaleFit;
      targetHeight = origHeight * scaleFit;
    }

    // Place at center of current view
    const viewCenterX = (-stagePos.x + stageWidth / 2) / stageScale;
    const viewCenterY = (-stagePos.y + stageHeight / 2) / stageScale;
    const posX = viewCenterX - targetWidth / 2;
    const posY = viewCenterY - targetHeight / 2;

    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'image',
      name: activeFileName || 'Uploaded Document',
      x: posX,
      y: posY,
      width: targetWidth,
      height: targetHeight,
      src: targetDataUrl,
      opacity: 1,
      locked: false,
      layerId: activeLayerId,
      scaleX: 1,
      scaleY: 1
    };

    if (importMode === 'replace') {
      setElements([newElement], true);
      setStageScale(1);
      setStagePos({ x: 50, y: 50 });
    } else {
      setElements([...elements, newElement], true);
    }

    showToast(
      pdfPages.length > 0
        ? `PDF Page ${selectedPageIdx + 1} added to canvas!`
        : `Image added to canvas!`,
      'success'
    );

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-theme-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-theme-border flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-theme-accent/10 text-theme-accent border border-theme-accent/20">
              <UploadCloud size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-theme-primary leading-none">Upload Image or Document</h2>
              <p className="text-xs text-theme-muted mt-1">Upload blueprint images or auto-convert PDF documents directly to the canvas</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-theme-muted hover:text-theme-primary p-1.5 rounded-lg hover:bg-theme-hover transition-colors"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
          
          {/* Dropzone */}
          {(!previewImage && pdfPages.length === 0) && (
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all duration-200
                ${isDragging ? 'border-theme-accent bg-theme-accent/10 scale-[0.99]' : 'border-theme-border hover:border-theme-accent/50 bg-theme-main/40'}
                ${isProcessing ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}
              `}
            >
              <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg,.webp,.svg" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={handleFileInput}
                disabled={isProcessing}
              />
              
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 size={40} className="animate-spin text-theme-accent" />
                  <p className="text-sm font-medium text-theme-primary">Converting and rendering file...</p>
                  <span className="text-xs text-theme-muted">Rasterizing high-resolution pages for canvas</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3 text-theme-muted">
                    <ImageIcon size={32} className="text-theme-accent" />
                    <FileText size={32} className="text-blue-400" />
                  </div>
                  <p className="text-theme-primary text-base font-semibold mb-1">
                    Drag & drop Image or PDF here
                  </p>
                  <p className="text-theme-muted text-xs mb-3">
                    Supports PNG, JPG, WebP, SVG, and PDF documents
                  </p>
                  <span className="px-3 py-1.5 text-xs rounded-lg bg-theme-hover text-theme-primary border border-theme-border font-medium shadow-sm">
                    Browse Files
                  </span>
                </>
              )}
            </div>
          )}

          {/* PDF Pages Preview Selector */}
          {pdfPages.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-theme-primary">
                  <FileText size={16} className="text-theme-accent" />
                  <span>{activeFileName}</span>
                  <span className="text-xs font-normal text-theme-muted">({pdfPages.length} page{pdfPages.length > 1 ? 's' : ''})</span>
                </div>
                <button
                  onClick={resetState}
                  className="text-xs text-theme-muted hover:text-theme-primary underline"
                >
                  Choose different file
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-2 bg-theme-main/50 rounded-xl border border-theme-border">
                {pdfPages.map((page, idx) => (
                  <div
                    key={page.pageNumber}
                    onClick={() => setSelectedPageIdx(idx)}
                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      selectedPageIdx === idx
                        ? 'border-theme-accent shadow-md shadow-theme-accent/20 scale-[1.02]'
                        : 'border-theme-border hover:border-theme-muted opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={page.dataUrl} 
                      alt={`Page ${page.pageNumber}`} 
                      className="w-full h-28 object-contain bg-white"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs py-0.5 text-center text-[10px] text-white font-medium">
                      Page {page.pageNumber}
                    </div>
                    {selectedPageIdx === idx && (
                      <div className="absolute top-1 right-1 bg-theme-accent text-theme-main rounded-full p-0.5">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Image Preview */}
          {previewImage && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-theme-primary">
                  <ImageIcon size={16} className="text-theme-accent" />
                  <span>{activeFileName}</span>
                  <span className="text-xs font-normal text-theme-muted">({previewImage.width} × {previewImage.height}px)</span>
                </div>
                <button
                  onClick={resetState}
                  className="text-xs text-theme-muted hover:text-theme-primary underline"
                >
                  Choose different file
                </button>
              </div>

              <div className="w-full h-52 bg-theme-main/50 rounded-xl border border-theme-border overflow-hidden flex items-center justify-center p-3">
                <img 
                  src={previewImage.dataUrl} 
                  alt="Preview" 
                  className="max-h-full max-w-full object-contain rounded shadow"
                />
              </div>
            </div>
          )}

          {/* Options (Visible once a file is loaded) */}
          {(previewImage || pdfPages.length > 0) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-theme-main/30 rounded-xl border border-theme-border text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-theme-primary">
                  <input
                    type="radio"
                    name="modalImportMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="accent-theme-accent"
                  />
                  <span>Add to Canvas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-theme-primary">
                  <input
                    type="radio"
                    name="modalImportMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-theme-accent"
                  />
                  <span>Replace Canvas</span>
                </label>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-theme-muted hover:text-theme-primary">
                <input
                  type="checkbox"
                  checked={fitToView}
                  onChange={(e) => setFitToView(e.target.checked)}
                  className="rounded accent-theme-accent"
                />
                <span>Fit comfortably to viewport</span>
              </label>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-2.5 text-red-400 items-start text-xs">
              <AlertCircle className="shrink-0 mt-0.5" size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-theme-border bg-theme-main/20">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!previewImage && pdfPages.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-theme-accent text-theme-main hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-theme-accent/10"
          >
            <Layers size={15} />
            <span>Place on Canvas</span>
          </button>
        </div>

      </div>
    </div>
  );
};
