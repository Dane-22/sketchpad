import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { MousePointer2, Edit3, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string, newWidth: number, newHeight: number) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const [cropMode, setCropMode] = useState<'rect' | 'freehand'>('rect');
  
  // Rect crop state
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  
  // Freehand crop state
  const [points, setPoints] = useState<{x: number, y: number}[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getCroppedImg = useCallback(() => {
    if (!imgRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (cropMode === 'rect') {
      if (!completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
        onCancel();
        return;
      }
      
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      canvas.width = Math.floor(completedCrop.width * scaleX);
      canvas.height = Math.floor(completedCrop.height * scaleY);

      ctx.drawImage(
        imgRef.current,
        Math.floor(completedCrop.x * scaleX),
        Math.floor(completedCrop.y * scaleY),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      onCropComplete(canvas.toDataURL('image/webp', 1), canvas.width, canvas.height);
      
    } else {
      if (points.length < 3) {
        onCancel();
        return;
      }
      
      // Calculate bounding box of the points
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      const width = (maxX - minX) * scaleX;
      const height = (maxY - minY) * scaleY;
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.beginPath();
      points.forEach((p, i) => {
        const scaledX = (p.x - minX) * scaleX;
        const scaledY = (p.y - minY) * scaleY;
        if (i === 0) ctx.moveTo(scaledX, scaledY);
        else ctx.lineTo(scaledX, scaledY);
      });
      ctx.closePath();
      
      // Clip to path and draw image
      ctx.clip();
      ctx.drawImage(
        imgRef.current,
        -minX * scaleX,
        -minY * scaleY,
        imgRef.current.naturalWidth,
        imgRef.current.naturalHeight
      );
      
      onCropComplete(canvas.toDataURL('image/webp', 1), width, height);
    }
  }, [completedCrop, cropMode, points, onCropComplete, onCancel]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (cropMode !== 'freehand') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPoints([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || cropMode !== 'freehand') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPoints(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handlePointerUp = () => {
    if (cropMode === 'freehand') {
      setIsDrawing(false);
    }
  };

  // Draw freehand path
  useEffect(() => {
    if (cropMode !== 'freehand' || !canvasRef.current || !imgRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = imgRef.current.width;
    canvas.height = imgRef.current.height;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (points.length > 0) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      
      if (!isDrawing && points.length > 2) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.fill();
      }
      
      ctx.stroke();
    }
  }, [points, isDrawing, cropMode]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setCropMode('rect')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${cropMode === 'rect' ? 'bg-theme-accent text-white' : 'bg-theme-main text-theme-muted hover:bg-theme-hover'}`}
        >
          <MousePointer2 size={16} /> Rectangular Crop
        </button>
        <button
          onClick={() => setCropMode('freehand')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${cropMode === 'freehand' ? 'bg-theme-accent text-white' : 'bg-theme-main text-theme-muted hover:bg-theme-hover'}`}
        >
          <Edit3 size={16} /> Freehand Crop
        </button>
      </div>

      <div className="relative border border-theme-border rounded-lg overflow-hidden bg-theme-main/50 flex items-center justify-center min-h-[300px] w-full">
        {cropMode === 'rect' ? (
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
          >
            <img ref={imgRef} src={imageSrc} className="max-w-full max-h-[60vh]" alt="Crop me" />
          </ReactCrop>
        ) : (
          <div className="relative inline-block">
            <img ref={imgRef} src={imageSrc} className="max-w-full max-h-[60vh] select-none pointer-events-none" draggable={false} alt="Freehand crop" />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 cursor-crosshair touch-none z-10 w-full h-full"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-theme-muted hover:text-theme-primary flex items-center gap-2">
          <X size={16} /> Cancel
        </button>
        <button onClick={getCroppedImg} className="px-4 py-2 text-sm bg-theme-accent text-white rounded-lg hover:opacity-90 flex items-center gap-2">
          <Check size={16} /> Apply Crop
        </button>
      </div>
    </div>
  );
};
