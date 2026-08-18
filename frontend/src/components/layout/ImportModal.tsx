import React, { useState } from 'react';
import { UploadCloud, X, File, AlertCircle } from 'lucide-react';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { importFromDXF, processParsedDXF } from '../../features/planner/utils/importCAD';

const ImportModal = () => {
  const { isImportModalOpen, setIsImportModalOpen, elements, setElements, setStageScale, setStagePos, stageWidth, stageHeight } = useCanvasState();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext !== 'dwg' && ext !== 'skb' && ext !== 'dxf') {
      setError('Please upload a valid AutoCAD (.dwg/.dxf) or SketchUp (.skb) file.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress(0);

    // If it's a DXF, we parse it locally as before
    if (ext === 'dxf') {
      try {
        const { elements: newElements, scale, offsetX, offsetY } = await importFromDXF(
          file, 
          stageWidth, 
          stageHeight, 
          setProgress
        );

        if (importMode === 'replace') {
          setElements(newElements);
          setStageScale(scale);
          setStagePos({ x: offsetX, y: offsetY });
        } else {
          setElements([...elements, ...newElements]);
        }
        
        setIsImportModalOpen(false);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to parse DXF file.');
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    } else {
      // For DWG and SKB, we post to the backend conversion API
      try {
        const formData = new FormData();
        formData.append('file', file);

        // Fake progress bar since fetch doesn't give us native upload progress easily without XHR
        let fakeProgress = 0;
        const progressInterval = setInterval(() => {
          fakeProgress += 5;
          setProgress(Math.min(fakeProgress, 90));
        }, 300);

        const response = await fetch('http://127.0.0.1:5005/api/v1/convert', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Conversion failed.');
        }

        setProgress(100);
        const data = await response.json();
        
        if (data && data.parsedDxf) {
          const { elements: newElements, scale, offsetX, offsetY } = processParsedDXF(
            data.parsedDxf,
            stageWidth,
            stageHeight
          );

          if (importMode === 'replace') {
            setElements(newElements);
            setStageScale(scale);
            setStagePos({ x: offsetX, y: offsetY });
          } else {
            setElements([...elements, ...newElements]);
          }
        }
        
        setIsImportModalOpen(false);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to convert file on backend.');
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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

  if (!isImportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-theme-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-theme-border transition-colors duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border transition-colors duration-300">
          <h2 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <UploadCloud className="text-theme-accent" />
            Import CAD File
          </h2>
          <button 
            onClick={() => !isProcessing && setIsImportModalOpen(false)}
            className="text-theme-muted hover:text-theme-primary transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="importMode" 
                value="replace" 
                checked={importMode === 'replace'} 
                onChange={() => setImportMode('replace')}
                disabled={isProcessing}
                className="text-theme-accent accent-theme-accent"
              />
              <span className="text-theme-primary text-sm">Replace Current Canvas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="importMode" 
                value="append" 
                checked={importMode === 'append'} 
                onChange={() => setImportMode('append')}
                disabled={isProcessing}
                className="text-theme-accent accent-theme-accent"
              />
              <span className="text-theme-primary text-sm">Append to Canvas</span>
            </label>
          </div>

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center transition-all duration-200
              ${isDragging ? 'border-theme-accent bg-theme-accent/10' : 'border-theme-border hover:border-theme-muted'}
              ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
            `}
          >
            <input 
              type="file" 
              accept=".dxf,.dwg,.skb" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              onChange={handleFileInput}
              disabled={isProcessing}
            />
            
            <File size={48} className={`mb-4 ${isDragging ? 'text-theme-accent' : 'text-theme-muted'}`} />
            
            <p className="text-theme-primary text-lg font-medium mb-1">
              Drag & Drop your .dxf file here
            </p>
            <p className="text-theme-muted text-sm">
              or click to browse from your computer
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex gap-3 text-red-200 items-start">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm leading-snug">{error}</p>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-theme-muted mb-2">
                <span>Parsing DXF entities...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full bg-theme-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-theme-accent transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
