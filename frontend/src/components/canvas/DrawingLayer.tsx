import { useState, useEffect, useRef } from 'react';
import { Layer, Line, Rect, Text, Circle, Arc, Path, Transformer, Arrow, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { calculateLineCenterAndAngle, calculateDistance, formatDistance, calculatePolygonArea, formatArea, calculateCentroid } from '../../features/planner/utils/geometryMath';
import { CanvasElement } from '../../types/canvas';

const imageCache = new Map<string, HTMLImageElement>();

const KonvaImageElement = ({ el, props }: { el: CanvasElement; props: any }) => {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(() => {
    return el.src ? imageCache.get(el.src) || null : null;
  });

  useEffect(() => {
    if (!el.src) return;
    if (imageCache.has(el.src)) {
      setImageObj(imageCache.get(el.src)!);
      return;
    }

    const img = new window.Image();
    img.src = el.src;
    img.onload = () => {
      imageCache.set(el.src!, img);
      setImageObj(img);
    };
  }, [el.src]);

  if (!imageObj) return null;

  return (
    <KonvaImage
      image={imageObj}
      key={el.id}
      x={el.x}
      y={el.y}
      width={el.width || imageObj.width}
      height={el.height || imageObj.height}
      opacity={el.opacity !== undefined ? el.opacity : 1}
      scaleX={el.scaleX}
      scaleY={el.scaleY}
      rotation={el.rotation}
      perfectDrawEnabled={false}
      {...props}
    />
  );
};

interface DrawingLayerProps {
  onOpenContextMenu?: (x: number, y: number, elementId: string) => void;
}

const DrawingLayer: React.FC<DrawingLayerProps> = ({ onOpenContextMenu }) => {

  const { elements, activeTool, removeElement, selectedElementIds, setSelectedElementIds, toggleElementSelection, updateElement, theme, unitMode } = useCanvasState();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  useEffect(() => {
    if (activeTool !== 'select') {
      if (selectedElementIds.length > 0) {
        setSelectedElementIds([]);
      }
      return;
    }

    if (selectedElementIds.length > 0 && transformerRef.current && layerRef.current) {
      // Find all IDs to select, expanding groups
      const allSelectedIds = new Set<string>();
      
      elements.forEach(el => {
        if (selectedElementIds.includes(el.id)) {
          allSelectedIds.add(el.id);
          if (el.groupId) {
            elements.filter(e => e.groupId === el.groupId).forEach(e => allSelectedIds.add(e.id));
          }
        }
      });
      
      const nodes = Array.from(allSelectedIds).map(id => layerRef.current?.findOne(`#${id}`)).filter(Boolean) as Konva.Node[];
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedElementIds, elements, activeTool]);

  const handlePointerEnter = (id: string) => {
    if (activeTool === 'eraser' || activeTool === 'select') {
      setHoveredId(id);
    }
  };

  const handlePointerLeave = () => {
    setHoveredId(null);
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    if (activeTool === 'eraser') {
      removeElement(id);
      setHoveredId(null);
    } else if (activeTool === 'select') {
      if (e.evt.shiftKey) {
        toggleElementSelection(id);
      } else {
        setSelectedElementIds([id]);
      }
    }
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>, id: string) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
    setSelectedElementIds([id]);
    if (onOpenContextMenu) {
      onOpenContextMenu(e.evt.clientX, e.evt.clientY, id);
    }
  };

  const getElementProps = (el: CanvasElement) => {
    const isHovered = hoveredId === el.id;
    const isSelected = selectedElementIds.includes(el.id) || !!(el.groupId && selectedElementIds.some(selId => elements.find(e => e.id === selId)?.groupId === el.groupId));
    const baseStroke = el.stroke || '#ffffff';
    const actualStroke = (baseStroke === '#ffffff' && theme === 'light') ? '#000000' : baseStroke;
    const selectColor = theme === 'light' ? '#0055ff' : '#ffffff';
    
    return {
      id: el.id,
      name: 'element',
      onPointerEnter: () => handlePointerEnter(el.id),
      onPointerLeave: handlePointerLeave,
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; handleClick(e, el.id); },
      onTap: (e: Konva.KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; handleClick(e, el.id); },
      onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => handleContextMenu(e, el.id),
      draggable: activeTool === 'select' && isSelected && !el.locked,
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        updateElement(el.id, { x: node.x(), y: node.y() });
      },
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        updateElement(el.id, {
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation()
        });
      },
      opacity: el.opacity !== undefined ? el.opacity : (isHovered ? 0.7 : 1),
      stroke: isSelected ? selectColor : isHovered ? '#ff4444' : actualStroke,
    };
  };

  return (
    <Layer ref={layerRef}>
      {elements.map((el) => {
        const props = getElementProps(el);

        if (el.type === 'dimension' && el.points && el.points.length >= 6) {
          const p1 = { x: el.points[0], y: el.points[1] };
          const p2 = { x: el.points[2], y: el.points[3] };
          const offset = { x: el.points[4], y: el.points[5] };
          
          // Vector from P1 to P2
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          
          if (len < 0.1) return null; // Avoid division by zero
          
          // Normalized direction vector
          const ux = dx / len;
          const uy = dy / len;
          
          // Perpendicular vector
          const px = -uy;
          const py = ux;
          
          // Vector from P1 to Offset
          const ox = offset.x - p1.x;
          const oy = offset.y - p1.y;
          
          // Project offset onto perpendicular vector
          const offsetDist = ox * px + oy * py;
          
          // Dimension line endpoints (D1, D2)
          const d1 = { x: p1.x + px * offsetDist, y: p1.y + py * offsetDist };
          const d2 = { x: p2.x + px * offsetDist, y: p2.y + py * offsetDist };
          
          // Extension line overshoot
          const overshoot = 5 * Math.sign(offsetDist) || 5;
          const ext1Start = { x: p1.x + px * 2, y: p1.y + py * 2 }; // slight gap from object
          const ext1End = { x: d1.x + px * overshoot, y: d1.y + py * overshoot };
          const ext2Start = { x: p2.x + px * 2, y: p2.y + py * 2 };
          const ext2End = { x: d2.x + px * overshoot, y: d2.y + py * overshoot };
          
          const dist = calculateDistance(p1, p2);
          const lengthText = formatDistance(dist, unitMode);
          const { x, y, angle } = calculateLineCenterAndAngle(d1.x, d1.y, d2.x, d2.y);
          
          return (
            <Group key={el.id} {...props}>
              {/* Extension Line 1 */}
              <Line points={[ext1Start.x, ext1Start.y, ext1End.x, ext1End.y]} stroke={props.stroke} strokeWidth={el.strokeWidth || 1} />
              {/* Extension Line 2 */}
              <Line points={[ext2Start.x, ext2Start.y, ext2End.x, ext2End.y]} stroke={props.stroke} strokeWidth={el.strokeWidth || 1} />
              {/* Main Dimension Line */}
              <Arrow
                points={[d1.x, d1.y, d2.x, d2.y]}
                stroke={props.stroke}
                fill={props.stroke}
                strokeWidth={el.strokeWidth || 1}
                pointerLength={8}
                pointerWidth={8}
                pointerAtBeginning={true}
                hitStrokeWidth={10}
              />
              {/* Dimension Text */}
              <Group x={x} y={y} rotation={angle} listening={false}>
                <Rect x={-30} y={-10} width={60} height={20} fill={theme === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,30,0.8)'} cornerRadius={4} />
                <Text text={lengthText} fill={props.stroke} fontSize={12} width={60} height={20} align="center" verticalAlign="middle" x={-30} y={-10} />
              </Group>
            </Group>
          );
        } else if (el.type === 'line') {
          return (
            <Line
              key={el.id}
              points={el.points || []}
              strokeWidth={el.strokeWidth || 2}
              lineCap="round"
              lineJoin="round"
              hitStrokeWidth={10}
              {...props}
            />
          );
        } else if (el.type === 'leader') {
          return (
            <Arrow
              key={el.id}
              points={el.points || []}
              fill={props.stroke}
              strokeWidth={el.strokeWidth || 2}
              pointerLength={10}
              pointerWidth={10}
              hitStrokeWidth={10}
              {...props}
            />
          );
        } else if (el.type === 'freehand') {
          return (
            <Line
              key={el.id}
              points={el.points || []}
              strokeWidth={el.strokeWidth || 2}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              hitStrokeWidth={10}
              {...props}
            />
          );
        } else if (el.type === 'polyline') {
          return (
            <Line
              key={el.id}
              points={el.points || []}
              strokeWidth={el.strokeWidth || 2}
              lineCap="round"
              lineJoin="round"
              hitStrokeWidth={10}
              {...props}
            />
          );
        } else if (el.type === 'area') {
          if (!el.points || el.points.length < 6) return null;
          
          const area = calculatePolygonArea(el.points);
          const areaText = formatArea(area, unitMode);
          const centroid = calculateCentroid(el.points);
          const fillColor = props.stroke + '33'; // 20% opacity of the stroke color

          return (
            <Group key={el.id} {...props}>
              <Line
                points={el.points}
                stroke={props.stroke}
                strokeWidth={el.strokeWidth || 2}
                fill={fillColor}
                closed={true}
                lineCap="round"
                lineJoin="round"
                hitStrokeWidth={10}
              />
              <Group x={centroid.x} y={centroid.y} listening={false}>
                <Rect x={-40} y={-10} width={80} height={20} fill={theme === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(30,30,30,0.8)'} cornerRadius={4} />
                <Text text={areaText} fill={props.stroke} fontSize={12} width={80} height={20} align="center" verticalAlign="middle" x={-40} y={-10} />
              </Group>
            </Group>
          );
        } else if (el.type === 'rectangle') {
          return (
            <Rect
              key={el.id}
              x={el.x}
              y={el.y}
              width={el.width || 0}
              height={el.height || 0}
              strokeWidth={el.strokeWidth || 2}
              hitStrokeWidth={10}
              scaleX={el.scaleX}
              scaleY={el.scaleY}
              rotation={el.rotation}
              {...props}
            />
          );
        } else if (el.type === 'circle') {
          return (
            <Circle
              key={el.id}
              x={el.x}
              y={el.y}
              radius={el.radius || 0}
              strokeWidth={el.strokeWidth || 2}
              hitStrokeWidth={10}
              scaleX={el.scaleX}
              scaleY={el.scaleY}
              rotation={el.rotation}
              {...props}
            />
          );
        } else if (el.type === 'arc') {
          return (
            <Arc
              key={el.id}
              x={el.x}
              y={el.y}
              innerRadius={el.innerRadius || 0}
              outerRadius={el.outerRadius || 0}
              angle={el.angle || 0}
              strokeWidth={el.strokeWidth || 2}
              hitStrokeWidth={10}
              scaleX={el.scaleX}
              scaleY={el.scaleY}
              rotation={el.rotation}
              {...props}
            />
          );
        } else if (el.type === 'symbol') {
          return (
            <Group key={el.id} x={el.x} y={el.y} scaleX={el.scaleX} scaleY={el.scaleY} rotation={el.rotation} {...props}>
              <Path
                data={el.svgData || ''}
                strokeWidth={el.strokeWidth || 2}
                fill="transparent"
                hitStrokeWidth={10}
              />
            </Group>
          );
        } else if (el.type === 'text') {
          const { stroke, ...restProps } = props;
          return (
            <Text
              key={el.id}
              x={el.x}
              y={el.y}
              text={el.text || ''}
              fontSize={16}
              fill={stroke}
              scaleX={el.scaleX}
              scaleY={el.scaleY}
              rotation={el.rotation}
              onDblClick={(e) => {
                e.cancelBubble = true;
                if (activeTool === 'select') {
                  const event = new CustomEvent('edit-text', { detail: { id: el.id } });
                  window.dispatchEvent(event);
                }
              }}
              {...restProps}
            />
          );
        } else if (el.type === 'image') {
          return (
            <KonvaImageElement key={el.id} el={el} props={props} />
          );
        }
        return null;
      })}
      
      {activeTool === 'select' && (
        <Transformer 
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </Layer>
  );
};

export default DrawingLayer;
