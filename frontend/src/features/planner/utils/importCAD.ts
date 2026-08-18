import DxfParser from 'dxf-parser';
import { CanvasElement } from '../../../types/canvas';

// Helper to convert AutoCAD color index to Hex. 
// A full map would be 255 colors, providing a basic subset for common colors.
const ACI_TO_HEX: Record<number, string> = {
  1: '#ff0000', // Red
  2: '#ffff00', // Yellow
  3: '#00ff00', // Green
  4: '#00ffff', // Cyan
  5: '#0000ff', // Blue
  6: '#ff00ff', // Magenta
  7: '#ffffff', // White
  8: '#808080', // Dark Grey
  9: '#c0c0c0', // Light Grey
};

function getStrokeColor(entity: any, layer: any): string {
  // If entity has a specific color index (ACI), use it.
  if (entity.colorIndex && ACI_TO_HEX[entity.colorIndex]) {
    return ACI_TO_HEX[entity.colorIndex];
  }
  // Otherwise try to use layer color.
  if (layer && layer.colorIndex && ACI_TO_HEX[layer.colorIndex]) {
    return ACI_TO_HEX[layer.colorIndex];
  }
  return '#ffffff'; // Default to white
}

export const processParsedDXF = (
  parsedDxf: any,
  stageWidth: number,
  stageHeight: number
) => {
  const newElements: CanvasElement[] = [];
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  const updateBounds = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  if (parsedDxf && parsedDxf.entities) {
    const layers = (parsedDxf.tables?.layer as any)?.layers || {};

    parsedDxf.entities.forEach((entity: any) => {
      const layer = layers[entity.layer];
      const stroke = getStrokeColor(entity, layer);
      const strokeWidth = entity.lineweight ? entity.lineweight / 100 : 2;

      if (entity.type === 'LINE') {
        const x1 = entity.vertices[0].x;
        const y1 = -entity.vertices[0].y; 
        const x2 = entity.vertices[1].x;
        const y2 = -entity.vertices[1].y;

        updateBounds(x1, y1);
        updateBounds(x2, y2);

        newElements.push({
          id: `dxf-line-${Math.random().toString(36).substr(2, 9)}`,
          type: 'line',
          x: 0,
          y: 0,
          points: [x1, y1, x2, y2],
          stroke,
          strokeWidth,
        });
      } else if (entity.type === 'CIRCLE') {
        const cx = entity.center.x;
        const cy = -entity.center.y;
        const r = entity.radius;

        updateBounds(cx - r, cy - r);
        updateBounds(cx + r, cy + r);

        newElements.push({
          id: `dxf-circle-${Math.random().toString(36).substr(2, 9)}`,
          type: 'circle',
          x: cx,
          y: cy,
          radius: r,
          stroke,
          strokeWidth,
        });
      } else if (entity.type === 'ARC') {
        const cx = entity.center.x;
        const cy = -entity.center.y;
        const r = entity.radius;

        updateBounds(cx - r, cy - r);
        updateBounds(cx + r, cy + r);

        let startAngle = 360 - (entity.endAngle * 180 / Math.PI);
        let endAngle = 360 - (entity.startAngle * 180 / Math.PI);
        if (startAngle < 0) startAngle += 360;
        if (endAngle < 0) endAngle += 360;

        let angle = endAngle - startAngle;
        if (angle < 0) angle += 360;

        newElements.push({
          id: `dxf-arc-${Math.random().toString(36).substr(2, 9)}`,
          type: 'arc',
          x: cx,
          y: cy,
          innerRadius: r,
          outerRadius: r,
          angle,
          rotation: startAngle,
          stroke,
          strokeWidth,
        });
      } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const points: number[] = [];
        entity.vertices.forEach((v: any) => {
          const px = v.x;
          const py = -v.y;
          updateBounds(px, py);
          points.push(px, py);
        });
        
        if (entity.shape) {
          points.push(entity.vertices[0].x, -entity.vertices[0].y);
        }

        newElements.push({
          id: `dxf-poly-${Math.random().toString(36).substr(2, 9)}`,
          type: 'polyline',
          x: 0,
          y: 0,
          points,
          stroke,
          strokeWidth,
        });
      } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
         const tx = entity.startPoint.x;
         const ty = -entity.startPoint.y;
         updateBounds(tx, ty);

         newElements.push({
           id: `dxf-text-${Math.random().toString(36).substr(2, 9)}`,
           type: 'text',
           x: tx,
           y: ty,
           text: entity.text,
           stroke,
           strokeWidth: 1, 
           width: entity.textHeight * 10,
         });
      }
    });
  }

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (newElements.length > 0) {
    const width = maxX - minX;
    const height = maxY - minY;

    const scaleX = (stageWidth * 0.8) / width;
    const scaleY = (stageHeight * 0.8) / height;
    scale = Math.min(scaleX, scaleY);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    offsetX = (stageWidth / 2) - (cx * scale);
    offsetY = (stageHeight / 2) - (cy * scale);
  }

  return { elements: newElements, scale, offsetX, offsetY };
};

export const importFromDXF = async (
  file: File, 
  stageWidth: number, 
  stageHeight: number,
  onProgress?: (progress: number) => void
): Promise<{ elements: CanvasElement[], scale: number, offsetX: number, offsetY: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      if (fakeProgress < 90 && onProgress) {
        fakeProgress += 10;
        onProgress(fakeProgress);
      }
    }, 100);

    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        const parser = new DxfParser();
        const parsedDxf = parser.parseSync(fileContent);
        
        const result = processParsedDXF(parsedDxf, stageWidth, stageHeight);

        clearInterval(progressInterval);
        if (onProgress) onProgress(100);
        
        setTimeout(() => {
          resolve(result);
        }, 300);

      } catch (err) {
        clearInterval(progressInterval);
        reject(err);
      }
    };
    reader.onerror = (err) => {
      clearInterval(progressInterval);
      reject(err);
    };
    reader.readAsText(file);
  });
};
