export type ToolType = 'select' | 'line' | 'freehand' | 'text' | 'dimension' | 'leader' | 'rectangle' | 'circle' | 'arc' | 'polyline' | 'area' | 'symbol' | 'eraser' | 'image';

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color?: string;
}

export interface CanvasElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  points?: number[];
  text?: string;
  width?: number;
  height?: number;
  radius?: number;
  innerRadius?: number;
  outerRadius?: number;
  angle?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  svgData?: string;
  src?: string; // Image dataUrl or URL
  opacity?: number;
  locked?: boolean;
  name?: string;
  scaleX?: number;
  scaleY?: number;
  layerId?: string;
  groupId?: string;
  linkedElements?: {
    elementId: string;
    dimensionPointIndex: number;
    nodeIndex?: number;
  }[];
}

export interface CanvasState {
  elements: CanvasElement[];
  version: number;
  stageWidth: number;
  stageHeight: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}
