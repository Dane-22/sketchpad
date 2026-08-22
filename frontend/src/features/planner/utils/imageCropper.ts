export const applyCropToImage = async (
  imageSrc: string,
  mode: 'rect' | 'freehand' | 'image_eraser',
  cropData: { x?: number; y?: number; width?: number; height?: number; points?: {x: number, y: number}[]; strokes?: number[][]; brushSize?: number; targetWidth?: number; targetHeight?: number; }
): Promise<{ dataUrl: string; width: number; height: number; dx: number; dy: number }> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    // Allow cross origin for external URLs if needed
    if (!imageSrc.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2d context available'));

      let dx = 0;
      let dy = 0;
      
      const targetW = cropData.targetWidth || img.width;
      const targetH = cropData.targetHeight || img.height;
      const scaleX = img.width / targetW;
      const scaleY = img.height / targetH;

      if (mode === 'rect') {
        if (cropData.width === undefined || cropData.height === undefined || cropData.x === undefined || cropData.y === undefined) {
          return reject(new Error('Missing crop dimensions'));
        }
        
        const srcX = cropData.x * scaleX;
        const srcY = cropData.y * scaleY;
        const srcW = cropData.width * scaleX;
        const srcH = cropData.height * scaleY;

        canvas.width = srcW;
        canvas.height = srcH;
        
        dx = cropData.x;
        dy = cropData.y;

        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcW,
          srcH,
          0,
          0,
          srcW,
          srcH
        );
      } else if (mode === 'freehand' && cropData.points && cropData.points.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        cropData.points.forEach(p => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
        
        const w = maxX - minX;
        const h = maxY - minY;
        
        const srcW = w * scaleX;
        const srcH = h * scaleY;
        
        canvas.width = srcW;
        canvas.height = srcH;
        
        dx = minX;
        dy = minY;
        
        ctx.beginPath();
        cropData.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo((p.x - minX) * scaleX, (p.y - minY) * scaleY);
          else ctx.lineTo((p.x - minX) * scaleX, (p.y - minY) * scaleY);
        });
        ctx.closePath();
        
        ctx.clip();
        ctx.drawImage(img, -minX * scaleX, -minY * scaleY, img.width, img.height);
      } else if (mode === 'image_eraser' && cropData.strokes) {
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = cropData.brushSize || 20;
        
        cropData.strokes.forEach(stroke => {
          if (stroke.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(stroke[0] * scaleX, stroke[1] * scaleY);
          if (stroke.length === 2) {
            ctx.lineTo(stroke[0] * scaleX, stroke[1] * scaleY);
          } else {
            for (let i = 2; i < stroke.length; i += 2) {
              ctx.lineTo(stroke[i] * scaleX, stroke[i+1] * scaleY);
            }
          }
          ctx.stroke();
        });
        
        dx = 0;
        dy = 0;
      } else {
        return reject(new Error('Invalid crop parameters'));
      }

      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: mode === 'rect' ? cropData.width! : (mode === 'freehand' ? canvas.width / scaleX : targetW),
        height: mode === 'rect' ? cropData.height! : (mode === 'freehand' ? canvas.height / scaleY : targetH),
        dx,
        dy
      });
    };

    img.onerror = (e) => {
      console.warn('Failed to load image with CORS. Falling back...', e);
      // Fallback without crossOrigin for local data
      const fallbackImg = new window.Image();
      fallbackImg.onload = img.onload;
      fallbackImg.onerror = () => reject(new Error('Failed to load image for cropping'));
      fallbackImg.src = imageSrc;
    };
    img.src = imageSrc;
  });
};
