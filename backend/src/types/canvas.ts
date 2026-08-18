export type ToolType = 'line' | 'freehand' | 'text' | 'dimension';

export interface CanvasElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  points?: number[];
  text?: string;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface CanvasState {
  elements: CanvasElement[];
  version: number;
  stageWidth: number;
  stageHeight: number;
  scale: number;
}
