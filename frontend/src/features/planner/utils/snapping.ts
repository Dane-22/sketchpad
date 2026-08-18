import { Point, CanvasElement } from '../../../types/canvas';

export type SnapType = 'endpoint' | 'midpoint' | 'center' | 'grid' | null;

export interface SnapResult {
  point: Point;
  type: SnapType;
  elementId?: string;
  nodeIndex?: number;
}

export const calculateSnapPoint = (
  pos: Point,
  elements: CanvasElement[],
  gridSize: number,
  snapMode: boolean,
  scale: number
): SnapResult => {
  // If no snapping is enabled, just return the raw position
  if (!snapMode) {
    return { point: pos, type: null };
  }

  // Calculate the strict pixel threshold based on current zoom scale.
  // E.g., we want 15 screen pixels to be the snap radius.
  // In canvas coordinates, that distance is 15 / scale.
  const snapThreshold = 15 / scale;

  let closestDistance = Infinity;
  let bestSnapPoint: Point | null = null;
  let bestSnapType: SnapType = null;
  let bestElementId: string | undefined = undefined;
  let bestNodeIndex: number | undefined = undefined;

  const checkAndSetClosest = (p: Point, type: SnapType, elementId?: string, nodeIndex?: number) => {
    const dist = Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2));
    if (dist < snapThreshold && dist < closestDistance) {
      closestDistance = dist;
      bestSnapPoint = p;
      bestSnapType = type;
      if (elementId) bestElementId = elementId;
      if (nodeIndex !== undefined) bestNodeIndex = nodeIndex;
    }
  };

  // 1. Object Snapping (prioritize endpoints, midpoints, centers)
  for (const el of elements) {
    // Endpoints and midpoints for lines/polylines
    if ((el.type === 'line' || el.type === 'polyline' || el.type === 'dimension' || el.type === 'leader') && el.points) {
      for (let i = 0; i < el.points.length; i += 2) {
        const x = el.points[i];
        const y = el.points[i + 1];
        
        // Endpoint
        checkAndSetClosest({ x, y }, 'endpoint', el.id, i);

        // Midpoint (check with next point if it exists)
        if (i + 3 < el.points.length) {
          const nextX = el.points[i + 2];
          const nextY = el.points[i + 3];
          checkAndSetClosest({ x: (x + nextX) / 2, y: (y + nextY) / 2 }, 'midpoint', el.id, i + 0.5); // 0.5 signifies midpoint between i and i+2
        }
      }
    }

    // Corners and midpoints for rectangles
    if (el.type === 'rectangle' && el.width !== undefined && el.height !== undefined) {
      const { x, y, width, height } = el;
      // 4 Corners
      checkAndSetClosest({ x, y }, 'endpoint', el.id, 0); // TL
      checkAndSetClosest({ x: x + width, y }, 'endpoint', el.id, 1); // TR
      checkAndSetClosest({ x, y: y + height }, 'endpoint', el.id, 2); // BL
      checkAndSetClosest({ x: x + width, y: y + height }, 'endpoint', el.id, 3); // BR

      // 4 Edge Midpoints
      checkAndSetClosest({ x: x + width / 2, y }, 'midpoint', el.id, 4); // Top mid
      checkAndSetClosest({ x: x + width / 2, y: y + height }, 'midpoint', el.id, 5); // Bot mid
      checkAndSetClosest({ x, y: y + height / 2 }, 'midpoint', el.id, 6); // Left mid
      checkAndSetClosest({ x: x + width, y: y + height / 2 }, 'midpoint', el.id, 7); // Right mid
    }

    // Center and quadrants for circles/arcs
    if ((el.type === 'circle' || el.type === 'arc') && el.radius !== undefined) {
      // Center
      checkAndSetClosest({ x: el.x, y: el.y }, 'center', el.id, 0);
      
      // 4 Quadrants
      checkAndSetClosest({ x: el.x + el.radius, y: el.y }, 'endpoint', el.id, 1); // Right
      checkAndSetClosest({ x: el.x - el.radius, y: el.y }, 'endpoint', el.id, 2); // Left
      checkAndSetClosest({ x: el.x, y: el.y + el.radius }, 'endpoint', el.id, 3); // Bottom
      checkAndSetClosest({ x: el.x, y: el.y - el.radius }, 'endpoint', el.id, 4); // Top
    }
  }

  // If we found a valid object snap within threshold, return it
  if (bestSnapPoint) {
    return { point: bestSnapPoint, type: bestSnapType, elementId: bestElementId, nodeIndex: bestNodeIndex };
  }

  // 2. Grid Snapping (fallback)
  const gridSnapPoint = {
    x: Math.round(pos.x / gridSize) * gridSize,
    y: Math.round(pos.y / gridSize) * gridSize
  };

  const gridDist = Math.sqrt(Math.pow(gridSnapPoint.x - pos.x, 2) + Math.pow(gridSnapPoint.y - pos.y, 2));
  
  if (gridDist < snapThreshold) {
    return { point: gridSnapPoint, type: 'grid' };
  }

  // No snap point within threshold
  return { point: pos, type: null };
};
