import { Point } from '../../../types/canvas';
import Konva from 'konva';

export const getRelativePointerPosition = (node: Konva.Node): Point => {
  const transform = node.getAbsoluteTransform().copy();
  transform.invert();
  const pos = node.getStage()?.getPointerPosition();
  
  if (!pos) {
    return { x: 0, y: 0 };
  }
  
  return transform.point(pos);
};

export const calculateLineLength = (x1: number, y1: number, x2: number, y2: number, scaleInMeters = 40): string => {
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const meters = distance / scaleInMeters;
  return `${meters.toFixed(2)} m`;
};

export const calculateLineCenterAndAngle = (x1: number, y1: number, x2: number, y2: number) => {
  const x = (x1 + x2) / 2;
  const y = (y1 + y2) / 2;
  
  let angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  // Keep text upright
  if (angle > 90 || angle < -90) {
    angle += 180;
  }
  
  return { x, y, angle };
};

export const calculateDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const formatDistance = (dist: number, unitMode: 'metric' | 'imperial' = 'metric'): string => {
  // Assume 1 pixel = 1 mm
  if (unitMode === 'imperial') {
    // 1 mm = 0.0393701 inches
    const inches = dist * 0.0393701;
    if (inches > 12) {
      const feet = Math.floor(inches / 12);
      const remainingInches = inches - (feet * 12);
      return `${feet}' - ${remainingInches.toFixed(1)}"`;
    }
    return `${inches.toFixed(2)}"`;
  }
  return `${dist.toFixed(1)} mm`;
};

// Calculates the centroid of a polygon given as a flat array of [x, y, x, y, ...]
export const calculateCentroid = (points: number[]): Point => {
  let x = 0;
  let y = 0;
  let n = points.length / 2;
  
  if (n === 0) return {x: 0, y: 0};

  for (let i = 0; i < points.length; i += 2) {
    x += points[i];
    y += points[i + 1];
  }

  return { x: x / n, y: y / n };
};

// Uses the Shoelace formula to calculate the area of a polygon
export const calculatePolygonArea = (points: number[]): number => {
  let area = 0;
  const n = points.length / 2;
  
  if (n < 3) return 0;
  
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = points[i * 2];
    const yi = points[i * 2 + 1];
    const xj = points[j * 2];
    const yj = points[j * 2 + 1];
    
    area += (xj + xi) * (yj - yi);
    j = i;
  }
  
  return Math.abs(area / 2.0);
};

export const formatArea = (area: number, unitMode: 'metric' | 'imperial' = 'metric'): string => {
  // Assuming 1 pixel = 1 mm, area is in mm^2
  if (unitMode === 'imperial') {
    // 1 mm^2 = 0.0015500031 sq inches
    const sqInches = area * 0.0015500031;
    if (sqInches > 144) {
      return `${(sqInches / 144).toFixed(2)} sq ft`;
    }
    return `${sqInches.toFixed(2)} sq in`;
  }
  return `${(area / 100).toFixed(2)} cm²`;
};
