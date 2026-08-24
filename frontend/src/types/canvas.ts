export type ToolType = 
  | 'select' 
  | 'line' 
  | 'freehand' 
  | 'text' 
  | 'dimension' 
  | 'leader' 
  | 'callout'
  | 'arrow' 
  | 'arc' 
  | 'polyline' 
  | 'area' 
  | 'symbol' 
  | 'eraser' 
  | 'image'
  | 'rectangle'
  | 'circle'
  | 'highlighter'
  | 'cloud'
  | 'stamp';

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
  fontSize?: number;
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
  src?: string; // Image URL or asset path
  opacity?: number;
  locked?: boolean;
  name?: string;
  scaleX?: number;
  scaleY?: number;
  layerId?: string;
  groupId?: string;
  topicId?: string; // Linked discussion / comment thread ID
  parentImageId?: string; // Bound to an underlying image / document sheet
  authorId?: string; // The ID of the user who created this element
  stampType?: 'APPROVED' | 'REVISE & RESUBMIT' | 'FOR REVIEW' | 'REJECTED' | 'AS-BUILT' | 'HOLD';
  stampAuthor?: string;
  stampDate?: string;
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
