import { useState, useEffect, useRef } from 'react';
import { Group, Line, Rect, Text, Circle, Arc, Path, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { calculateLineCenterAndAngle, calculateDistance, formatDistance, calculatePolygonArea, formatArea, calculateCentroid } from '../../features/planner/utils/geometryMath';
import { generateCloudSvgPath } from '../../features/planner/utils/annotationMath';
import { CanvasElement } from '../../types/canvas';

export const imageCache = new Map<string, HTMLImageElement>();

const KonvaImageElement = ({ el, props, activeTool, isSelected, isHovered }: { el: CanvasElement; props: any; activeTool: string; isSelected?: boolean; isHovered?: boolean }) => {
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
    if (!el.src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      imageCache.set(el.src!, img);
      setImageObj(img);
    };
    img.onerror = (e) => {
      console.warn('Image load failed for src:', el.src, e);
      // If relative url failed, try loading without crossOrigin
      if (img.crossOrigin) {
        const fallbackImg = new window.Image();
        fallbackImg.onload = () => {
          imageCache.set(el.src!, fallbackImg);
          setImageObj(fallbackImg);
        };
        fallbackImg.src = el.src!;
      }
    };
    img.src = el.src;
  }, [el.src]);

  if (!imageObj) return null;

  return (
    <KonvaImage
      image={imageObj}
      key={el.id}
      width={el.width || imageObj.width}
      height={el.height || imageObj.height}
      opacity={el.opacity !== undefined ? el.opacity : 1}
      perfectDrawEnabled={true}
      listening={activeTool === 'select' || activeTool === 'eraser'}
      imageSmoothingEnabled={false}
      {...props}
      strokeEnabled={isSelected || isHovered}
    />
  );
};

const OpenArrow = ({ points, stroke, strokeWidth, pointerAtBeginning, pointerAtBothEnds, ...props }: any) => {
  if (!points || points.length < 4) {
    return <Line points={points} stroke={stroke} strokeWidth={strokeWidth} {...props} />;
  }
  
  const endX = points[points.length - 2];
  const endY = points[points.length - 1];
  const startX = points[points.length - 4];
  const startY = points[points.length - 3];
  
  const headLength = Math.max(12, (strokeWidth || 2) * 5); // Length of arrow head lines scales with strokeWidth
  
  const drawHead = (hx: number, hy: number, tx: number, ty: number) => {
    const angle = Math.atan2(hy - ty, hx - tx);
    const p1 = { x: hx - headLength * Math.cos(angle - Math.PI / 6), y: hy - headLength * Math.sin(angle - Math.PI / 6) };
    const p2 = { x: hx - headLength * Math.cos(angle + Math.PI / 6), y: hy - headLength * Math.sin(angle + Math.PI / 6) };
    return [p1.x, p1.y, hx, hy, p2.x, p2.y];
  };

  const endHead = drawHead(endX, endY, startX, startY);
  const startHead = drawHead(points[0], points[1], points[2], points[3]);

  return (
    <Group {...props}>
      <Line points={points} stroke={stroke} strokeWidth={strokeWidth} lineCap="round" lineJoin="round" fillEnabled={false} />
      {(!pointerAtBeginning || pointerAtBothEnds) && (
        <Line points={endHead} stroke={stroke} strokeWidth={strokeWidth} lineCap="round" lineJoin="round" fillEnabled={false} />
      )}
      {(pointerAtBeginning || pointerAtBothEnds) && (
        <Line points={startHead} stroke={stroke} strokeWidth={strokeWidth} lineCap="round" lineJoin="round" fillEnabled={false} />
      )}
    </Group>
  );
};

interface DrawingLayerProps {
  onOpenContextMenu?: (x: number, y: number, elementId: string) => void;
  hoveredElementId?: string | null;
}

const DrawingLayer: React.FC<DrawingLayerProps> = ({ onOpenContextMenu, hoveredElementId }) => {

  const { elements, activeTool, removeElement, selectedElementIds, setSelectedElementIds, toggleElementSelection, updateElement, theme, unitMode } = useCanvasState();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Sync external hoveredElementId with internal state if provided
  useEffect(() => {
    if (hoveredElementId !== undefined) {
      setHoveredId(hoveredElementId);
    }
  }, [hoveredElementId]);
  const transformerRef = useRef<Konva.Transformer>(null);
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    if (activeTool !== 'select') {
      if (selectedElementIds.length > 0) {
        setSelectedElementIds([]);
      }
      return;
    }

    if (selectedElementIds.length > 0 && transformerRef.current && groupRef.current) {
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
      
      const nodes = Array.from(allSelectedIds).map(id => groupRef.current?.findOne(`#${id}`)).filter(Boolean) as Konva.Node[];
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedElementIds, elements, activeTool]);

  const handlePointerEnter = (id: string) => {
    if (activeTool === 'eraser') {
      // Hover mode is removed, now it acts like a brush
    }
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
      x: el.x || 0,
      y: el.y || 0,
      rotation: el.rotation || 0,
      scaleX: el.scaleX || 1,
      scaleY: el.scaleY || 1,
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
    <Group ref={groupRef}>
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
              <OpenArrow
                points={[d1.x, d1.y, d2.x, d2.y]}
                strokeWidth={el.strokeWidth || 1}
                pointerAtBothEnds={true}
                {...props}
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
        } else if (el.type === 'arrow' || el.type === 'leader') {
          return (
            <OpenArrow
              key={el.id}
              points={el.points || []}
              strokeWidth={el.strokeWidth || 2}
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
              width={el.width || 0}
              height={el.height || 0}
              strokeWidth={el.strokeWidth || 2}
              hitStrokeWidth={10}
              {...props}
            />
          );
        } else if (el.type === 'circle') {
          return (
            <Circle
              key={el.id}
              radius={el.radius || 0}
              strokeWidth={el.strokeWidth || 2}
              hitStrokeWidth={10}
              {...props}
            />
          );
        } else if (el.type === 'arc') {
          return (
            <Arc
              key={el.id}
              innerRadius={el.innerRadius || 0}
              outerRadius={el.outerRadius || 0}
              angle={el.angle || 0}
              strokeWidth={el.strokeWidth || 2}
              hitStrokeWidth={10}
              {...props}
            />
          );
        } else if (el.type === 'symbol') {
          return (
            <Group key={el.id} {...props}>
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
              text={el.text || ''}
              fontSize={16}
              fill={stroke}
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
        } else if (el.type === 'highlighter') {
          const { stroke, opacity, ...restProps } = props;
          return (
            <Line
              key={el.id}
              points={el.points || []}
              stroke={el.stroke || '#ffe600'}
              strokeWidth={el.strokeWidth || 16}
              opacity={el.opacity !== undefined ? el.opacity : 0.45}
              lineCap="round"
              lineJoin="round"
              tension={0.3}
              hitStrokeWidth={16}
              {...restProps}
            />
          );
        } else if (el.type === 'eraser') {
          return (
            <Line
              key={el.id}
              points={el.points || []}
              stroke="white"
              strokeWidth={el.strokeWidth || 10}
              lineCap="round"
              lineJoin="round"
              tension={0.3}
              globalCompositeOperation="destination-out"
              listening={false}
            />
          );
        } else if (el.type === 'cloud') {
          const cloudPath = generateCloudSvgPath(el.points || []);
          return (
            <Group key={el.id} {...props}>
              <Path
                data={cloudPath}
                stroke={props.stroke || '#ff9900'}
                strokeWidth={el.strokeWidth || 2.5}
                fill="transparent"
                lineCap="round"
                lineJoin="round"
                hitStrokeWidth={12}
              />
            </Group>
          );
        } else if (el.type === 'callout') {
          const p = el.points || [0, 0, 50, 50];
          const tipX = p[0];
          const tipY = p[1];
          const textX = p[2] !== undefined ? p[2] : p[0] + 50;
          const textY = p[3] !== undefined ? p[3] : p[1] + 50;
          const noteText = el.text || 'Review Required';
          const textWidth = Math.max(120, noteText.length * 8 + 24);

          return (
            <Group key={el.id} {...props}>
              <OpenArrow
                points={[textX, textY, tipX, tipY]}
                strokeWidth={el.strokeWidth || 2}
                {...props}
              />
              <Group x={textX} y={textY - 14}>
                <Rect
                  x={0}
                  y={0}
                  width={textWidth}
                  height={26}
                  fill={theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.92)'}
                  stroke={props.stroke || '#00e5ff'}
                  strokeWidth={1}
                  cornerRadius={4}
                  shadowBlur={6}
                  shadowColor="rgba(0,0,0,0.3)"
                />
                <Text
                  x={8}
                  y={6}
                  text={noteText}
                  fontSize={12}
                  fontStyle="bold"
                  fill={theme === 'light' ? '#0f172a' : '#f8fafc'}
                  width={textWidth - 16}
                />
              </Group>
            </Group>
          );
        } else if (el.type === 'stamp') {
          const stampType = el.stampType || 'APPROVED';
          const stampColor = 
            stampType === 'APPROVED' ? '#10b981' :
            stampType === 'REVISE & RESUBMIT' ? '#f59e0b' :
            stampType === 'FOR REVIEW' ? '#3b82f6' :
            stampType === 'REJECTED' ? '#ef4444' :
            stampType === 'AS-BUILT' ? '#06b6d4' : '#8b5cf6';
          
          const w = el.width || 180;
          const h = el.height || 75;
          const author = el.stampAuthor || 'Engineer';
          const date = el.stampDate || new Date().toLocaleDateString();

          return (
            <Group key={el.id} {...props}>
              {/* Outer Double Border */}
              <Rect
                x={0}
                y={0}
                width={w}
                height={h}
                stroke={stampColor}
                strokeWidth={3}
                cornerRadius={6}
                fill={theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.9)'}
                shadowBlur={8}
                shadowColor={stampColor + '40'}
              />
              <Rect
                x={4}
                y={4}
                width={w - 8}
                height={h - 8}
                stroke={stampColor}
                strokeWidth={1}
                cornerRadius={4}
              />
              {/* Title Header Badge */}
              <Text
                x={6}
                y={8}
                text={stampType}
                fontSize={13}
                fontStyle="bold"
                align="center"
                width={w - 12}
                fill={stampColor}
                letterSpacing={1.1}
              />
              {/* Divider */}
              <Line
                points={[8, 30, w - 8, 30]}
                stroke={stampColor}
                strokeWidth={1}
                dash={[4, 2]}
              />
              {/* Metadata */}
              <Text
                x={10}
                y={36}
                text={`BY: ${author}`}
                fontSize={10}
                fontStyle="bold"
                fill={theme === 'light' ? '#334155' : '#cbd5e1'}
                width={w - 20}
              />
              <Text
                x={10}
                y={52}
                text={`DATE: ${date}`}
                fontSize={10}
                fontStyle="bold"
                fill={theme === 'light' ? '#64748b' : '#94a3b8'}
                width={w - 20}
              />
            </Group>
          );
        } else if (el.type === 'image') {
          const isHovered = hoveredId === el.id;
          const isSelected = selectedElementIds.includes(el.id) || !!(el.groupId && selectedElementIds.some(selId => elements.find(e => e.id === selId)?.groupId === el.groupId));
          return (
            <KonvaImageElement key={el.id} el={el} props={props} activeTool={activeTool} isSelected={isSelected} isHovered={isHovered} />
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
    </Group>
  );
};

export default DrawingLayer;
