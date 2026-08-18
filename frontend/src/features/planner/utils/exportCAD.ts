import { CanvasElement } from '../../../types/canvas';
import DxfWriter from 'dxf-writer';
import { jsPDF } from 'jspdf';
import { calculateDistance, formatDistance, calculateLineCenterAndAngle } from './geometryMath';

export const exportToSVG = (elements: CanvasElement[], width: number, height: number) => {
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svgContent += `  <rect width="100%" height="100%" fill="#1e1e1e" />\n`;

  elements.forEach((el) => {
    if ((el.type === 'line' || el.type === 'freehand') && el.points && el.points.length >= 4) {
      // Simplification: using polyline for both straight lines and freehand strokes.
      // In a more exact implementation, freehand would be a `<path>` with cubic bezier curves to match tension.
      svgContent += `  <polyline points="${el.points.join(',')}" stroke="${el.stroke || '#00ffcc'}" stroke-width="${el.strokeWidth || 2}" fill="none" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }
  });

  svgContent += `</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, 'export.svg');
};

export const exportToPNG = (dataUrl: string, filename: string = 'export.png') => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const exportToPDF = (dataUrl: string, width: number, height: number, filename: string = 'export.pdf') => {
  const doc = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height]
  });
  doc.addImage(dataUrl, 'PNG', 0, 0, width, height);
  doc.save(filename);
};

export const exportToDXF = (elements: CanvasElement[], unitMode: 'metric' | 'imperial' = 'metric') => {
  const dxf = new DxfWriter();
  
  elements.forEach((el) => {
    if ((el.type === 'line' || el.type === 'freehand' || el.type === 'polyline' || el.type === 'leader') && el.points && el.points.length >= 4) {
      if (el.type === 'line') {
        dxf.drawLine(el.points[0], el.points[1], el.points[2], el.points[3]);
      } else {
        const pts: [number, number][] = [];
        for (let i = 0; i < el.points.length; i += 2) {
          pts.push([el.points[i], el.points[i+1]]);
        }
        dxf.drawPolyline(pts);
      }
    } else if (el.type === 'rectangle' && el.width && el.height) {
      const pts: [number, number][] = [
        [el.x, el.y],
        [el.x + el.width, el.y],
        [el.x + el.width, el.y + el.height],
        [el.x, el.y + el.height],
        [el.x, el.y] // close the loop
      ];
      dxf.drawPolyline(pts);
    } else if (el.type === 'area' && el.points && el.points.length >= 6) {
      const pts: [number, number][] = [];
      for (let i = 0; i < el.points.length; i += 2) {
        pts.push([el.points[i], el.points[i+1]]);
      }
      pts.push([el.points[0], el.points[1]]); // close the loop
      dxf.drawPolyline(pts);
    } else if (el.type === 'circle' && el.radius) {
      dxf.drawCircle(el.x, el.y, el.radius);
    } else if (el.type === 'text' && el.text) {
      dxf.drawText(el.x, el.y, el.height || 16, 0, el.text);
    } else if (el.type === 'dimension' && el.points && el.points.length >= 6) {
      const p1 = { x: el.points[0], y: el.points[1] };
      const p2 = { x: el.points[2], y: el.points[3] };
      const offset = { x: el.points[4], y: el.points[5] };
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len >= 0.1) {
        const ux = dx / len;
        const uy = dy / len;
        const px = -uy;
        const py = ux;
        const ox = offset.x - p1.x;
        const oy = offset.y - p1.y;
        const offsetDist = ox * px + oy * py;
        
        const d1 = { x: p1.x + px * offsetDist, y: p1.y + py * offsetDist };
        const d2 = { x: p2.x + px * offsetDist, y: p2.y + py * offsetDist };
        const overshoot = 5 * Math.sign(offsetDist) || 5;
        
        // Extension lines
        dxf.drawLine(p1.x + px * 2, p1.y + py * 2, d1.x + px * overshoot, d1.y + py * overshoot);
        dxf.drawLine(p2.x + px * 2, p2.y + py * 2, d2.x + px * overshoot, d2.y + py * overshoot);
        
        // Main dimension line
        dxf.drawLine(d1.x, d1.y, d2.x, d2.y);
        
        // Text
        const dist = calculateDistance(p1, p2);
        const lengthText = formatDistance(dist, unitMode);
        const { x, y, angle } = calculateLineCenterAndAngle(d1.x, d1.y, d2.x, d2.y);
        dxf.drawText(x - 20, y - 10, 12, angle, lengthText);
      }
    }
  });

  const dxfString = dxf.toDxfString();
  const blob = new Blob([dxfString], { type: 'application/dxf' });
  triggerDownload(blob, 'export.dxf');
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
