import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, RegularPolygon, Circle, Group } from 'react-konva';
import Konva from 'konva';
import GridLayer from './GridLayer';
import DrawingLayer from './DrawingLayer';
import OverlayLayer from './OverlayLayer';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { getRelativePointerPosition } from '../../features/planner/utils/geometryMath';
import { CanvasElement } from '../../types/canvas';
import UcsIcon from './overlays/UcsIcon';
import { useCollaboration } from '../../features/planner/hooks/useCollaboration';
import RemoteCursorsLayer from './RemoteCursorsLayer';
import { calculateSnapPoint, SnapType } from '../../features/planner/utils/snapping';
import { CommentPinLayer } from './CommentPinLayer';
import { CanvasComment } from '../../types/comment';
import { CanvasContextMenu } from './overlays/CanvasContextMenu';
import { socket } from '../../features/planner/utils/socket';
import { OnlineUsersWidget } from './OnlineUsersWidget';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { getUserColor } from '../../features/planner/utils/colors';
import { InlineCropOverlay } from './InlineCropOverlay';

interface CadCanvasProps {
  projectId?: string;
  comments?: CanvasComment[];
  activeCommentId?: string | null;
  onSelectComment?: (commentId: string) => void;
  pendingPinPos?: { x: number; y: number } | null;
  isAddingComment?: boolean;
  onDropPinAtPos?: (pos: { x: number; y: number }) => void;
}

const CadCanvas: React.FC<CadCanvasProps> = ({
  projectId,
  comments = [],
  activeCommentId = null,
  onSelectComment,
  pendingPinPos = null,
  isAddingComment = false,
  onDropPinAtPos,
}) => {
  const stageRef = useRef<Konva.Stage>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const { 
    elements, setElements, addElement,
    activeTool, setActiveTool,
    stageScale, setStageScale, 
    stagePos, setStagePos,
    orthoMode, snapMode,
    textColor, updateElement, removeElement, theme,
    commitHistory, activeLayerId, stageRotation, stagePitch,
    groups, setGroups, setSelectedElementIds,
    pendingCoordinate, setPendingCoordinate,
    activeTopicId, activeStampType, highlighterColor, highlighterWidth,
    eraserMode, userColor
  } = useCanvasState();

  const { remoteCursors, emitCursorMove } = useCollaboration(projectId);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLineId, setCurrentLineId] = useState<string | null>(null);
  const [activePolylineId, setActivePolylineId] = useState<string | null>(null);
  const [activeDimensionId, setActiveDimensionId] = useState<string | null>(null);
  const [dimensionStep, setDimensionStep] = useState<number>(0);

  const currentUser = useAuthStore(state => state.user);
  const defaultUserInkColor = userColor || '#00ffcc';

  const lastPanPosRef = useRef<{ x: number, y: number } | null>(null);
  const lastMiddleClickTimeRef = useRef<number>(0);
  const isPanningRef = useRef(false);

  const [isSpacebarDown, setIsSpacebarDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<{ point: {x: number, y: number}, type: SnapType } | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  const finishPolyline = useCallback(() => {
    if (!activePolylineId) return;
    const currentElements = useCanvasState.getState().elements;
    const targetEl = currentElements.find(el => el.id === activePolylineId);
    
    if (targetEl && targetEl.points && targetEl.points.length >= 4) {
      let finalPoints = [...targetEl.points];
      while (finalPoints.length >= 6) {
        const len = finalPoints.length;
        if (Math.hypot(finalPoints[len - 2] - finalPoints[len - 4], finalPoints[len - 1] - finalPoints[len - 3]) < 5) {
          finalPoints = finalPoints.slice(0, len - 2);
        } else {
          break;
        }
      }

      if (finalPoints.length >= 4) {
        const finishedEl: CanvasElement = { ...targetEl, points: finalPoints };
        setElements(prev => prev.map(e => e.id === activePolylineId ? finishedEl : e), true, false, false);
        socket.emit('element-added', { projectId, element: finishedEl });
      } else {
        removeElement(activePolylineId, false, false, projectId);
      }
    } else if (targetEl) {
      removeElement(activePolylineId, false, false, projectId);
    }
    
    setActivePolylineId(null);
    setActiveTool('select');
  }, [activePolylineId, projectId, setElements, removeElement, setActiveTool]);

  // Keyboard shortcut listener to finalize polyline on Enter, Space, or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === ' ') {
        setIsSpacebarDown(true);
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        if (activePolylineId) {
          e.preventDefault();
          finishPolyline();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacebarDown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activePolylineId, finishPolyline]);

  // Auto-finish polyline if the tool is switched on the Ribbon or toolbar
  useEffect(() => {
    if (activePolylineId && activeTool !== 'polyline' && activeTool !== 'leader' && activeTool !== 'area') {
      finishPolyline();
    }
  }, [activeTool, activePolylineId, finishPolyline]);

  const handleZoomExtents = useCallback(() => {
    const currentElements = useCanvasState.getState().elements;
    if (currentElements.length === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentElements.forEach(el => {
      minX = Math.min(minX, el.x || 0);
      minY = Math.min(minY, el.y || 0);
      maxX = Math.max(maxX, el.x + (el.width || 0), (el.x || 0) + (el.radius || 0));
      maxY = Math.max(maxY, el.y + (el.height || 0), (el.y || 0) + (el.radius || 0));
      if (el.points) {
        for (let i = 0; i < el.points.length; i += 2) {
          minX = Math.min(minX, el.points[i]);
          minY = Math.min(minY, el.points[i + 1]);
          maxX = Math.max(maxX, el.points[i]);
          maxY = Math.max(maxY, el.points[i + 1]);
        }
      }
    });

    if (minX === Infinity) return;

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      const scaleX = containerWidth / width;
      const scaleY = containerHeight / height;
      const scale = Math.min(scaleX, scaleY);
      
      setStageScale(scale);
      setStagePos({
        x: -minX * scale + (containerWidth - width * scale) / 2,
        y: -minY * scale + (containerHeight - height * scale) / 2
      });
    }
  }, [setStageScale, setStagePos]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    const handleEditText = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id) {
        setEditingTextId(customEvent.detail.id);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('edit-text', handleEditText);
    window.addEventListener('zoom-extents', handleZoomExtents);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('edit-text', handleEditText);
      window.removeEventListener('zoom-extents', handleZoomExtents);
    };
  }, [handleZoomExtents]);

  // Update text color of the currently editing text if the user changes the color from the ribbon
  useEffect(() => {
    if (editingTextId) {
      updateElement(editingTextId, { stroke: textColor });
    }
  }, [textColor, editingTextId, updateElement]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (e.evt.cancelable) {
      e.evt.preventDefault();
    }
    if (!stageRef.current) return;

    // Zoom on any scroll (Standard CAD behavior)
    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Use our geometry function which handles rotation correctly
    const mousePointTo = getRelativePointerPosition(stage);

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    if (newScale < 0.1 || newScale > 10) return;

    setStageScale(newScale);

    // Calculate new stage position
    const rad = stageRotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const pitchCos = Math.cos(stagePitch * Math.PI / 180);

    const scaledX = mousePointTo.x * newScale;
    const scaledY = mousePointTo.y * newScale * pitchCos;

    const rotatedX = scaledX * cos - scaledY * sin;
    const rotatedY = scaledX * sin + scaledY * cos;

    setStagePos({
      x: pointer.x - rotatedX,
      y: pointer.y - rotatedY,
    });
  };



  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Handle middle mouse button or spacebar+left-click for panning
    if (e.evt.button === 1 || e.evt.buttons === 4 || (e.evt.button === 0 && isSpacebarDown)) {
      e.evt.preventDefault();

      if (e.evt.button === 1 || e.evt.buttons === 4) {
        const now = Date.now();
        if (now - lastMiddleClickTimeRef.current < 300) {
          handleZoomExtents();
        }
        lastMiddleClickTimeRef.current = now;
      }

      if (!isPanningRef.current) {
        isPanningRef.current = true;
        setIsPanning(true);
        const stage = e.target.getStage();
        if (stage) {
          lastPanPosRef.current = stage.getPointerPosition();
        }
      }
      return;
    }

    if (e.evt.button !== 0) return;

    if (!stageRef.current) return;

    if (isAddingComment && onDropPinAtPos) {
      const pos = getRelativePointerPosition(stageRef.current);
      onDropPinAtPos(pos);
      return;
    }

    if (activeTool === 'eraser' && eraserMode === 'click' && hoveredElementId) {
      removeElement(hoveredElementId);
      setHoveredElementId(null);
      return;
    }

    if (activeTool === 'select' || activeTool === 'symbol' || activeTool === 'eraser') {
      if (e.target === stageRef.current) {
        setSelectedElementIds([]);
        useCanvasState.getState().stopCropping();
      }
      return;
    }
    
    let pos = getRelativePointerPosition(stageRef.current);

    
    // Apply snapping
    const snapResult = calculateSnapPoint(pos, elements, 50, snapMode, stageScale);
    pos = snapResult.point;

    if (activeTool === 'text') {
      const id = Date.now().toString();
      const newElement: CanvasElement = {
        authorId: currentUser?.id,
        id,
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: '',
        stroke: textColor?.toLowerCase() === '#ffffff' ? defaultUserInkColor : textColor,
        strokeWidth: 0,
        scaleX: 1 / stageScale,
        scaleY: 1 / stageScale,
        layerId: activeLayerId
      };
      addElement(newElement, true, false, projectId);
      setEditingTextId(id);
      setActiveTool('select');
      return;
    }
    
    if (activeTool === 'stamp') {
      const id = Date.now().toString();
      const newElement: CanvasElement = {
        authorId: currentUser?.id,
        id,
        type: 'stamp',
        x: pos.x,
        y: pos.y,
        width: 200 / stageScale,
        height: 80 / stageScale,
        stampType: activeStampType,
        stampAuthor: localStorage.getItem('user_name') || 'Engineer',
        stampDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        strokeWidth: 2 / stageScale,
        layerId: activeLayerId,
        topicId: activeTopicId || undefined
      };
      addElement(newElement, true, false, projectId);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'highlighter') {
      setIsDrawing(true);
      const id = Date.now().toString();
      setCurrentLineId(id);
      
      const newElement: CanvasElement = {
        authorId: currentUser?.id,
        id,
        type: 'highlighter',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        stroke: highlighterColor || '#ffe600',
        strokeWidth: (highlighterWidth || 16) / stageScale,
        opacity: 0.45,
        layerId: activeLayerId,
        topicId: activeTopicId || undefined
      };
      setElements([...elements, newElement], false, false, false);
      return;
    }

    if (activeTool === 'cloud') {
      setIsDrawing(true);
      const id = Date.now().toString();
      setCurrentLineId(id);
      
      const newElement: CanvasElement = {
        authorId: currentUser?.id,
        id,
        type: 'cloud',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        stroke: '#ff9900',
        strokeWidth: 2.5 / stageScale,
        layerId: activeLayerId,
        topicId: activeTopicId || undefined
      };
      setElements([...elements, newElement], false, false, false);
      return;
    }

    if (activeTool === 'callout') {
      if (activeDimensionId && dimensionStep === 1) {
        // Step 2: Set text note position and finish callout
        const currentElements = useCanvasState.getState().elements;
        const calloutEl = currentElements.find(e => e.id === activeDimensionId);
        if (calloutEl && calloutEl.points) {
          const finishedEl: CanvasElement = {
            ...calloutEl,
            points: [calloutEl.points[0], calloutEl.points[1], pos.x, pos.y],
            text: 'Review Required',
          };
          setElements(prev => prev.map(e => e.id === activeDimensionId ? finishedEl : e), true, false, false);
          socket.emit('element-added', { projectId, element: finishedEl });
        }
        commitHistory();
        setActiveDimensionId(null);
        setDimensionStep(0);
        setActiveTool('select');
        return;
      } else {
        // Step 1: Set arrow start tip
        const id = Date.now().toString();
        setActiveDimensionId(id);
        setDimensionStep(1);
        const newElement: CanvasElement = {
        authorId: currentUser?.id,
          id,
          type: 'callout',
          x: 0,
          y: 0,
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: '#00e5ff',
          strokeWidth: 2 / stageScale,
          layerId: activeLayerId,
          topicId: activeTopicId || undefined
        };
        setElements([...elements, newElement], false, false, false);
        return;
      }
    }
    
    if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'freehand' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'arc') {
      setIsDrawing(true);
      const id = Date.now().toString();
      setCurrentLineId(id);
      
      const newElement: CanvasElement = {
        authorId: currentUser?.id,
        id,
        type: activeTool,
        x: (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'freehand') ? 0 : pos.x,
        y: (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'freehand') ? 0 : pos.y,
        points: (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'freehand') ? [pos.x, pos.y] : undefined,
        width: activeTool === 'rectangle' ? 0 : undefined,
        height: activeTool === 'rectangle' ? 0 : undefined,
        radius: activeTool === 'circle' ? 0 : undefined,
        innerRadius: activeTool === 'arc' ? 0 : undefined,
        outerRadius: activeTool === 'arc' ? 0 : undefined,
        angle: activeTool === 'arc' ? 0 : undefined,
        stroke: textColor?.toLowerCase() === '#ffffff' ? defaultUserInkColor : textColor,
        strokeWidth: 2 / stageScale,
        layerId: activeLayerId,
        topicId: activeTopicId || undefined
      };
      
      // Store locally during drawing without broadcasting full canvas
      setElements([...elements, newElement], false, false, false);
    } else if (activeTool === 'polyline' || activeTool === 'leader' || activeTool === 'area') {
      if (activePolylineId) {
        setElements(prev => prev.map(el => {
          if (el.id === activePolylineId) {
            if (orthoMode && el.points && el.points.length >= 2) {
              const prevX = el.points[el.points.length - 2];
              const prevY = el.points[el.points.length - 1];
              if (Math.abs(pos.x - prevX) > Math.abs(pos.y - prevY)) {
                pos.y = prevY;
              } else {
                pos.x = prevX;
              }
            }
            return { ...el, points: [...(el.points || []), pos.x, pos.y] };
          }
          return el;
        }), false, false, false);
      } else {
        const id = Date.now().toString();
        setActivePolylineId(id);
        const newElement: CanvasElement = {
        authorId: currentUser?.id,
          id,
          type: activeTool,
          x: 0,
          y: 0,
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: textColor?.toLowerCase() === '#ffffff' ? defaultUserInkColor : textColor,
          strokeWidth: 2 / stageScale,
          layerId: activeLayerId,
          topicId: activeTopicId || undefined
        };
        setElements([...elements, newElement], false, false, false);
      }
    } else if (activeTool === 'dimension') {
      if (dimensionStep === 0) {
        // Step 0: Set P1
        const id = Date.now().toString();
        setActiveDimensionId(id);
        setDimensionStep(1);
        const newElement: CanvasElement = {
        authorId: currentUser?.id,
          id,
          type: 'dimension',
          x: 0,
          y: 0,
          // P1(x,y), P2(x,y), Offset(x,y)
          points: [pos.x, pos.y, pos.x, pos.y, pos.x, pos.y],
          stroke: textColor?.toLowerCase() === '#ffffff' ? defaultUserInkColor : textColor,
          strokeWidth: 1 / stageScale,
          layerId: activeLayerId,
          topicId: activeTopicId || undefined,
          linkedElements: snapResult.elementId ? [{
            elementId: snapResult.elementId,
            dimensionPointIndex: 0,
            nodeIndex: snapResult.nodeIndex
          }] : []
        };
        setElements([...elements, newElement], false, false, false);
      } else if (dimensionStep === 1) {
        // Step 1: Set P2
        setDimensionStep(2);
        if (activeDimensionId && snapResult.elementId) {
          setElements(elements.map(el => {
            if (el.id === activeDimensionId) {
              const linkedElements = el.linkedElements || [];
              return {
                ...el,
                linkedElements: [...linkedElements, {
                  elementId: snapResult.elementId!, // ts compiler should know it's string because of the check, but use ! just in case
                  dimensionPointIndex: 2,
                  nodeIndex: snapResult.nodeIndex
                }]
              };
            }
            return el;
          }), false, false, false);
        }
      } else if (dimensionStep === 2) {
        // Step 2: Set Offset and finish
        const currentElements = useCanvasState.getState().elements;
        const finishedEl = currentElements.find(e => e.id === activeDimensionId);
        if (finishedEl) {
          socket.emit('element-added', { projectId, element: finishedEl });
        }
        commitHistory();
        setActiveDimensionId(null);
        setDimensionStep(0);
        setActiveTool('select');
      }
    }
  };

  useEffect(() => {
    if (pendingCoordinate) {
      let pos = { x: pendingCoordinate.x, y: pendingCoordinate.y };
      
      if (pendingCoordinate.isRelative) {
        let lastPos = null;
        if (activePolylineId) {
          const el = elements.find(e => e.id === activePolylineId);
          if (el && el.points && el.points.length >= 2) {
            lastPos = { x: el.points[el.points.length - 2], y: el.points[el.points.length - 1] };
          }
        } else if (isDrawing && currentLineId) {
          const el = elements.find(e => e.id === currentLineId);
          if (el) {
            lastPos = { x: el.x, y: el.y };
            if ((activeTool === 'line' || activeTool === 'freehand' || activeTool === 'highlighter' || activeTool === 'cloud') && el.points) {
               lastPos = { x: el.points[0], y: el.points[1] };
            }
          }
        }
        
        if (lastPos) {
          // CAD convention: Y is positive upwards, but canvas Y is positive downwards.
          // In most CAD tools, typing @10,10 goes RIGHT and UP.
          // So we should subtract the Y coordinate.
          pos.x = lastPos.x + pendingCoordinate.x;
          pos.y = lastPos.y - pendingCoordinate.y; 
        }
      } else {
        // Absolute CAD coordinate (0,0 is usually bottom left, but here we'll map directly to canvas coords for simplicity unless requested otherwise).
        // Let's just use it as canvas pos for now, but invert Y to match typical CAD feel where Y goes UP?
        // Wait, earlier tasks didn't change coordinate system, so let's keep canvas native coords (positive Y = down) for absolute, but relative Y positive = up as handled above.
        // Actually, let's keep absolute Y as positive = down for consistency with grid, unless we invert it entirely.
      }

      if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'arc' || activeTool === 'freehand' || activeTool === 'highlighter' || activeTool === 'cloud') {
        if (!isDrawing) {
          setIsDrawing(true);
          const id = Date.now().toString();
          setCurrentLineId(id);
          
          const newElement: CanvasElement = {
        authorId: currentUser?.id,
            id,
            type: activeTool,
            x: (activeTool === 'line' || activeTool === 'freehand' || activeTool === 'highlighter' || activeTool === 'cloud') ? 0 : pos.x,
            y: (activeTool === 'line' || activeTool === 'freehand' || activeTool === 'highlighter' || activeTool === 'cloud') ? 0 : pos.y,
            points: (activeTool === 'line' || activeTool === 'freehand' || activeTool === 'highlighter' || activeTool === 'cloud') ? [pos.x, pos.y] : undefined,
            width: activeTool === 'rectangle' ? 0 : undefined,
            height: activeTool === 'rectangle' ? 0 : undefined,
            radius: activeTool === 'circle' ? 0 : undefined,
            stroke: textColor || '#00ffcc', 
            strokeWidth: activeTool === 'highlighter' ? (highlighterWidth / stageScale) : (2 / stageScale),
            opacity: activeTool === 'highlighter' ? 0.45 : 1,
            layerId: activeLayerId,
            topicId: activeTopicId || undefined
          };
          setElements([...elements, newElement], false);
        } else {
          setIsDrawing(false);
          setCurrentLineId(null);
          commitHistory();
        }
      } else if (activeTool === 'polyline' || activeTool === 'leader' || activeTool === 'area') {
        if (activePolylineId) {
          setElements(prev => prev.map(el => {
            if (el.id === activePolylineId) {
              if (orthoMode && el.points && el.points.length >= 2) {
                const prevX = el.points[el.points.length - 2];
                const prevY = el.points[el.points.length - 1];
                if (Math.abs(pos.x - prevX) > Math.abs(pos.y - prevY)) {
                  pos.y = prevY;
                } else {
                  pos.x = prevX;
                }
              }
              return { ...el, points: [...(el.points || []), pos.x, pos.y] };
            }
            return el;
          }), false);
        } else {
          const id = Date.now().toString();
          setActivePolylineId(id);
          const newElement: CanvasElement = {
        authorId: currentUser?.id,
            id,
            type: activeTool,
            x: 0,
            y: 0,
            points: [pos.x, pos.y, pos.x, pos.y],
            stroke: textColor || '#00ffcc',
            strokeWidth: 2 / stageScale,
            layerId: activeLayerId,
            topicId: activeTopicId || undefined
          };
          setElements([...elements, newElement], true);
        }
      }
      
      setPendingCoordinate(null);
    }
  }, [pendingCoordinate, activeTool, elements, isDrawing, currentLineId, activePolylineId, orthoMode, textColor, stageScale, activeLayerId, activeTopicId, highlighterWidth, setElements, commitHistory, setPendingCoordinate]);

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // 1. Detect if we should pan natively from the event state (dynamic capture)
    const evt = e.evt as any;
    const buttons = typeof evt.buttons === 'number' ? evt.buttons : 0;
    
    // Some browsers lose the 'buttons' state on pointermove when dragging with middle-click.
    // We make shouldPan sticky if isPanningRef.current is true.
    const isMiddleButtonDown = (buttons & 4) !== 0;
    const isSpacebarPan = isSpacebarDown && (buttons & 1) !== 0;
    const shouldPan = isMiddleButtonDown || isSpacebarPan || isPanningRef.current;

    if (shouldPan) {
      if (!isPanningRef.current) {
        isPanningRef.current = true;
        setIsPanning(true);
        const stage = e.target.getStage();
        if (stage) {
          lastPanPosRef.current = stage.getPointerPosition();
        }
      }
      
      if (lastPanPosRef.current) {
        const stage = e.target.getStage();
        if (stage) {
          const currentPos = stage.getPointerPosition();
          if (currentPos) {
            const dx = currentPos.x - lastPanPosRef.current.x;
            const dy = currentPos.y - lastPanPosRef.current.y;
            const currentStagePos = useCanvasState.getState().stagePos;
            setStagePos({
              x: currentStagePos.x + dx,
              y: currentStagePos.y + dy
            });
            lastPanPosRef.current = currentPos;
          }
        }
      }
      return; // Block drawing tools from processing during pan
    }

    if (hoveredElementId) {
      setHoveredElementId(null);
    }
    
    if (!stageRef.current) return;
    let pos = getRelativePointerPosition(stageRef.current);
    
    // Apply snapping conditionally
    let snapResult: { point: { x: number; y: number }; type: SnapType; elementId?: string; nodeIndex?: number } | null = null;
    if (snapMode && elements.length > 0) {
      snapResult = calculateSnapPoint(pos, elements, 50, snapMode, stageScale);
      if (snapResult && snapResult.type) {
        pos = snapResult.point;
      }
    }

    const newIndicator = snapResult?.type ? snapResult : null;
    setSnapIndicator((prev) => {
      if (!prev && !newIndicator) return prev;
      if (prev && newIndicator && prev.type === newIndicator.type && prev.point.x === newIndicator.point.x && prev.point.y === newIndicator.point.y) {
        return prev;
      }
      return newIndicator;
    });
    
    emitCursorMove(pos.x, pos.y);

    if (activeTool === 'callout' && activeDimensionId && dimensionStep === 1) {
      setElements((prev) => 
        prev.map((el) => {
          if (el.id === activeDimensionId && el.points) {
            return { ...el, points: [el.points[0], el.points[1], pos.x, pos.y] };
          }
          return el;
        }), false, false, false
      );
      return;
    }

    if (activeTool === 'polyline' || activeTool === 'leader' || activeTool === 'area') {
      if (activePolylineId) {
        setElements((prev) => 
          prev.map((el) => {
            if (el.id === activePolylineId && el.points) {
              const newPoints = [...el.points];
              let drawX = pos.x;
              let drawY = pos.y;
              
              if (orthoMode && newPoints.length >= 4) {
                const prevX = newPoints[newPoints.length - 4];
                const prevY = newPoints[newPoints.length - 3];
                if (Math.abs(drawX - prevX) > Math.abs(drawY - prevY)) {
                  drawY = prevY;
                } else {
                  drawX = prevX;
                }
              }
              
              newPoints[newPoints.length - 2] = drawX;
              newPoints[newPoints.length - 1] = drawY;
              return { ...el, points: newPoints };
            }
            return el;
          })
        , false, false, false);
      }
      return;
    }

    if (activeTool === 'dimension' && activeDimensionId) {
      setElements((prev) => 
        prev.map((el) => {
          if (el.id === activeDimensionId && el.points) {
            const newPoints = [...el.points];
            let drawX = pos.x;
            let drawY = pos.y;
            
            if (orthoMode && dimensionStep === 1) {
              const startX = newPoints[0];
              const startY = newPoints[1];
              if (Math.abs(drawX - startX) > Math.abs(drawY - startY)) {
                drawY = startY;
              } else {
                drawX = startX;
              }
            }
            
            if (dimensionStep === 1) {
              // Updating P2 and Offset to match cursor
              newPoints[2] = drawX;
              newPoints[3] = drawY;
              newPoints[4] = drawX;
              newPoints[5] = drawY;
            } else if (dimensionStep === 2) {
              // Updating only Offset
              newPoints[4] = drawX;
              newPoints[5] = drawY;
            }
            
            return { ...el, points: newPoints };
          }
          return el;
        }), false, false, false
      );
      return;
    }

    if (!isDrawing || !currentLineId) return;

    setElements((prev) => 
      prev.map((el) => {
        if (el.id === currentLineId) {
          if (activeTool === 'line' || activeTool === 'arrow') {
            let drawX = pos.x;
            let drawY = pos.y;
            if (orthoMode && el.points) {
              const startX = el.points[0];
              const startY = el.points[1];
              if (Math.abs(drawX - startX) > Math.abs(drawY - startY)) {
                drawY = startY;
              } else {
                drawX = startX;
              }
            }
            return { ...el, points: [el.points![0], el.points![1], drawX, drawY] };
          } else if (activeTool === 'freehand' || activeTool === 'highlighter' || activeTool === 'cloud') {
            if (activeTool === 'freehand' && orthoMode && el.points && el.points.length >= 2) {
              const startX = el.points[0];
              const startY = el.points[1];
              let drawX = pos.x;
              let drawY = pos.y;
              if (Math.abs(drawX - startX) > Math.abs(drawY - startY)) {
                drawY = startY;
              } else {
                drawX = startX;
              }
              return { ...el, points: [startX, startY, drawX, drawY] };
            }
            return { ...el, points: [...(el.points || []), pos.x, pos.y] };
          } else if (activeTool === 'rectangle') {
            return { ...el, width: pos.x - el.x, height: pos.y - el.y };
          } else if (activeTool === 'circle') {
            const radius = Math.sqrt(Math.pow(pos.x - el.x, 2) + Math.pow(pos.y - el.y, 2));
            return { ...el, radius };
          } else if (activeTool === 'arc') {
            const radius = Math.sqrt(Math.pow(pos.x - el.x, 2) + Math.pow(pos.y - el.y, 2));
            const angle = Math.atan2(pos.y - el.y, pos.x - el.x) * (180 / Math.PI);
            return { ...el, innerRadius: radius * 0.8, outerRadius: radius, angle: angle > 0 ? angle : 360 + angle };
          }
        }
        return el;
      })
    , false, false, false);
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanningRef.current && (e.evt.button === 1 || e.evt.button === 0)) {
      isPanningRef.current = false;
      setIsPanning(false);
      lastPanPosRef.current = null;
      
      // Only return early if we are NOT actively drawing. 
      // If we are drawing (e.g. released left click while holding spacebar), 
      // we must proceed to finish the stroke to avoid state leaks!
      if (!isDrawing) {
        return;
      }
    }

    if (activeTool === 'polyline' || activeTool === 'leader' || activeTool === 'area' || activeTool === 'dimension') return;
    if (isDrawing && currentLineId) {
      const currentElements = useCanvasState.getState().elements;
      const finishedEl = currentElements.find(el => el.id === currentLineId);
      if (finishedEl) {
        socket.emit('element-added', { projectId, element: finishedEl });
      }
      commitHistory();
    }
    setIsDrawing(false);
    setCurrentLineId(null);
  };

  const handleDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'select' && e.target.getClassName() === 'Text') {
      const id = e.target.id();
      if (id) {
        setEditingTextId(id);
      }
    } else if (activeTool === 'polyline' || activeTool === 'leader' || activeTool === 'area') {
      finishPolyline();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    stageRef.current?.setPointersPositions(e);
    const pos = getRelativePointerPosition(stageRef.current!);
    
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.type === 'symbol') {
        const newElement: CanvasElement = {
        authorId: currentUser?.id,
          id: Date.now().toString(),
          type: 'symbol',
          x: pos.x,
          y: pos.y,
          svgData: data.svgData,
          stroke: '#ffffff',
          strokeWidth: 2 / stageScale,
          scaleX: 1 / stageScale,
          scaleY: 1 / stageScale,
        };
        addElement(newElement, true, false, projectId);
        setActiveTool('select');
      } else if (data.type === 'custom_symbol') {
        const symbolElements: CanvasElement[] = data.elements;
        
        // Find center of the custom symbol
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        symbolElements.forEach(el => {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          maxX = Math.max(maxX, el.x + (el.width || 0));
          maxY = Math.max(maxY, el.y + (el.height || 0));
        });
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        
        const groupId = `group-${Date.now()}`;
        
        const newElements = symbolElements.map((el, i) => {
          const offsetX = el.x - cx;
          const offsetY = el.y - cy;
          return {
            ...el,
            id: `${Date.now()}-${i}`,
            groupId,
            x: pos.x + offsetX,
            y: pos.y + offsetY,
            points: el.points ? el.points.map((p, idx) => idx % 2 === 0 ? pos.x + offsetX + (p - el.x) : pos.y + offsetY + (p - el.y)) : undefined
          };
        });
        
        setElements([...elements, ...newElements], true, false, false);
        newElements.forEach(el => socket.emit('element-added', { projectId, element: el }));
        setGroups([...groups, { id: groupId, elementIds: newElements.map(e => e.id) }]);
        setActiveTool('select');
        setSelectedElementIds(newElements.map(e => e.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 bg-theme-main outline-none transition-colors duration-300 ${activeTool === 'eraser' ? 'cursor-cell' : isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        pixelRatio={typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2}
        scaleX={stageScale}
        scaleY={stageScale * Math.cos(stagePitch * Math.PI / 180)}
        x={stagePos.x}
        y={stagePos.y}
        rotation={stageRotation}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDblClick}
        draggable={activeTool === 'select' && !isSpacebarDown}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer id="main-layer">
          <GridLayer 
            width={dimensions.width} 
            height={dimensions.height} 
            scale={stageScale}
            x={stagePos.x}
            y={stagePos.y}
          />
          <DrawingLayer 
            onOpenContextMenu={(x, y, id) => setContextMenu({ x, y, elementId: id })} 
            hoveredElementId={hoveredElementId}
          />
          <Group id="ui-group">
          <RemoteCursorsLayer cursors={remoteCursors} />
          {onSelectComment && (
            <CommentPinLayer
              comments={comments}
              activeCommentId={activeCommentId}
              onSelectComment={onSelectComment}
              pendingPinPos={pendingPinPos}
            />
          )}
          <OverlayLayer />
          <InlineCropOverlay projectId={projectId} />
          
          {/* Snapping Indicator Layer */}
          <Group listening={false}>
            {snapIndicator && (
              <>
                {snapIndicator.type === 'endpoint' && (
                  <Rect 
                    x={snapIndicator.point.x - 5/stageScale} 
                    y={snapIndicator.point.y - 5/stageScale} 
                    width={10/stageScale} 
                    height={10/stageScale} 
                    stroke="#00ff00" 
                    strokeWidth={2/stageScale} 
                  />
                )}
                {snapIndicator.type === 'midpoint' && (
                  <RegularPolygon 
                    x={snapIndicator.point.x} 
                    y={snapIndicator.point.y} 
                    sides={3} 
                    radius={7/stageScale} 
                    stroke="#00ff00" 
                    strokeWidth={2/stageScale} 
                  />
                )}
                {snapIndicator.type === 'center' && (
                  <Circle 
                    x={snapIndicator.point.x} 
                    y={snapIndicator.point.y} 
                    radius={7/stageScale} 
                    stroke="#00ff00" 
                    strokeWidth={2/stageScale} 
                  />
                )}
                {snapIndicator.type === 'grid' && (
                  <Circle 
                    x={snapIndicator.point.x} 
                    y={snapIndicator.point.y} 
                    radius={2/stageScale} 
                    fill="#00ff00" 
                  />
                )}
              </>
            )}
          </Group>
          </Group>
        </Layer>
      </Stage>
      
      {/* Inline Text Editor */}
      {editingTextId && (
        (() => {
          const textEl = elements.find(el => el.id === editingTextId);
          if (!textEl) return null;
          
          // Calculate absolute screen position
          const x = textEl.x * stageScale + stagePos.x;
          const y = textEl.y * stageScale + stagePos.y;
          
          // Calculate actual color based on theme
          const baseStroke = textEl.stroke || '#ffffff';
          const actualColor = (baseStroke === '#ffffff' && theme === 'light') ? '#000000' : baseStroke;
          
          return (
            <textarea
              ref={(node) => {
                if (node && document.activeElement !== node) {
                  // Small delay to ensure it focuses after React finishes rendering
                  setTimeout(() => node.focus(), 10);
                }
              }}
              className="absolute bg-theme-main/80 border-2 border-dashed border-theme-primary outline-none resize-none p-1 overflow-hidden whitespace-pre z-[999] rounded shadow-lg"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                fontSize: `${16 * stageScale}px`,
                color: actualColor,
                lineHeight: 1.2,
                minWidth: '100px',
                minHeight: '30px',
                fontFamily: 'sans-serif',
                pointerEvents: 'auto'
              }}
              defaultValue={textEl.text || ''}
              placeholder="Type here..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              onBlur={(e) => {
                const newText = e.target.value.trim();
                if (!newText) {
                  removeElement(editingTextId);
                } else {
                  updateElement(editingTextId, { text: newText });
                }
                setEditingTextId(null);
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = (target.scrollHeight) + 'px';
                target.style.width = 'auto';
                target.style.width = (target.scrollWidth + 10) + 'px';
              }}
            />
          );
        })()
      )}

      {/* Visual Overlays */}
      <UcsIcon />
      <OnlineUsersWidget remoteCursors={remoteCursors} />

      {/* Canvas Element Right-Click Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elementId={contextMenu.elementId}
          onClose={() => setContextMenu(null)}
          onAddCommentPinAtPos={onDropPinAtPos}
        />
      )}
    </div>
  );
};

export default CadCanvas;
