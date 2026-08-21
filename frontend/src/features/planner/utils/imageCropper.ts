export const applyCropToImage = async (
  imageSrc: string,
  mode: 'rect' | 'freehand' | 'image_eraser',
  cropData: { x?: number; y?: number; width?: number; height?: number; points?: {x: number, y: number}[]; strokes?: number[][]; brushSize?: number }
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

      if (mode === 'rect') {
        if (cropData.width === undefined || cropData.height === undefined || cropData.x === undefined || cropData.y === undefined) {
          return reject(new Error('Missing crop dimensions'));
        }
        canvas.width = cropData.width;
        canvas.height = cropData.height;
        
        dx = cropData.x;
        dy = cropData.y;

        ctx.drawImage(
          img,
          cropData.x,
          cropData.y,
          cropData.width,
          cropData.height,
          0,
          0,
          cropData.width,
          cropData.height
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
        
        canvas.width = w;
        canvas.height = h;
        
        dx = minX;
        dy = minY;
        
        ctx.beginPath();
        cropData.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x - minX, p.y - minY);
          else ctx.lineTo(p.x - minX, p.y - minY);
        });
        ctx.closePath();
        
        ctx.clip();
        ctx.drawImage(img, -minX, -minY, img.width, img.height);
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
          ctx.moveTo(stroke[0], stroke[1]);
          if (stroke.length === 2) {
            ctx.lineTo(stroke[0], stroke[1]);
          } else {
            for (let i = 2; i < stroke.length; i += 2) {
              ctx.lineTo(stroke[i], stroke[i+1]);
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
        width: canvas.width,
        height: canvas.height,
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
