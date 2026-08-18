import React from 'react';
import { Layer, Shape } from 'react-konva';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';

interface GridLayerProps {
  width: number;
  height: number;
  scale: number;
  x: number;
  y: number;
}

const GridLayer: React.FC<GridLayerProps> = React.memo(({ width, height, scale, x, y }) => {
  const { gridVisible } = useCanvasState();

  if (!gridVisible) return null;

  const gridSize = 50;

  // Calculate visible range in world coordinates
  const startX = Math.floor(-x / scale / gridSize) * gridSize;
  const endX = Math.ceil((width - x) / scale / gridSize) * gridSize;
  const startY = Math.floor(-y / scale / gridSize) * gridSize;
  const endY = Math.ceil((height - y) / scale / gridSize) * gridSize;

  return (
    <Layer listening={false}>
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          
          // Draw all vertical lines in a single path
          for (let ix = startX; ix <= endX; ix += gridSize) {
            context.moveTo(ix, startY);
            context.lineTo(ix, endY);
          }

          // Draw all horizontal lines in the same path
          for (let iy = startY; iy <= endY; iy += gridSize) {
            context.moveTo(startX, iy);
            context.lineTo(endX, iy);
          }

          context.fillStrokeShape(shape);
        }}
        stroke="#333333"
        strokeWidth={1 / scale}
        opacity={0.4}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
    </Layer>
  );
});

GridLayer.displayName = 'GridLayer';

export default GridLayer;
