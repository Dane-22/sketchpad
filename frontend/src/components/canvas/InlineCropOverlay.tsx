import React, { useState, useEffect, useRef } from 'react';
import { Group, Rect, Line, Transformer } from 'react-konva';
import { Html } from 'react-konva-utils';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { applyCropToImage } from '../../features/planner/utils/imageCropper';
import { getRelativePointerPosition } from '../../features/planner/utils/geometryMath';


interface InlineCropOverlayProps {
  projectId?: string;
}

export const InlineCropOverlay: React.FC<InlineCropOverlayProps> = ({ projectId }) => {
  const { cropTargetId, cropMode, stopCropping, elements, updateElement, stageScale } = useCanvasState();
  const [rectBounds, setRectBounds] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<{x: number, y: number}[]>([]);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  
  const [eraserStrokes, setEraserStrokes] = useState<number[][]>([]);
  const [currentEraserStroke, setCurrentEraserStroke] = useState<number[]>([]);
  const [isErasing, setIsErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);

  const isProcessingRef = useRef(false);
  const pendingApplyRef = useRef(false);
  const rectRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const targetElement = elements.find(el => el.id === cropTargetId);

  useEffect(() => {
    if (targetElement && targetElement.type === 'image' && cropMode === 'rect' && !rectBounds) {
      setRectBounds({
        x: targetElement.x,
        y: targetElement.y,
        width: targetElement.width || 100,
        height: targetElement.height || 100
      });
    }
    if (!targetElement) {
      setRectBounds(null);
      setFreehandPoints([]);
      setEraserStrokes([]);
      setCurrentEraserStroke([]);
    }
  }, [targetElement, cropMode, rectBounds]);

  useEffect(() => {
    if (cropMode === 'rect' && rectRef.current && transformerRef.current) {
      transformerRef.current.nodes([rectRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [cropMode, rectBounds]);

  if (!cropTargetId || !cropMode || !targetElement || targetElement.type !== 'image') return null;

  const handleApply = async (overrideEraserStrokes?: number[][], overrideFreehandPoints?: {x: number, y: number}[]) => {
    if (isProcessingRef.current) {
      pendingApplyRef.current = true;
      return;
    }
    isProcessingRef.current = true;
    try {
      if (!targetElement.src) throw new Error("No image source");
      
      let cropData: any = {};
      const activeEraserStrokes = overrideEraserStrokes || eraserStrokes;
      const activeFreehandPoints = overrideFreehandPoints || freehandPoints;

      if (cropMode === 'rect' && rectBounds) {
        // Calculate relative to image
        cropData = {
          x: (rectBounds.x - targetElement.x) / (targetElement.scaleX || 1),
          y: (rectBounds.y - targetElement.y) / (targetElement.scaleY || 1),
          width: rectBounds.width / (targetElement.scaleX || 1),
          height: rectBounds.height / (targetElement.scaleY || 1)
        };
      } else if (cropMode === 'freehand' && activeFreehandPoints.length > 2) {
        cropData = {
          points: activeFreehandPoints.map(p => ({
            x: (p.x - targetElement.x) / (targetElement.scaleX || 1),
            y: (p.y - targetElement.y) / (targetElement.scaleY || 1)
          }))
        };
      } else if (cropMode === 'image_eraser' && activeEraserStrokes.length > 0) {
        cropData = {
          strokes: activeEraserStrokes.map(stroke => 
            stroke.map((val, i) => {
              if (i % 2 === 0) {
                // x
                return (val - targetElement.x) / (targetElement.scaleX || 1);
              } else {
                // y
                return (val - targetElement.y) / (targetElement.scaleY || 1);
              }
            })
          ),
          brushSize: brushSize / (((targetElement.scaleX || 1) + (targetElement.scaleY || 1)) / 2)
        };
      } else {
        stopCropping();
        return;
      }

      const result = await applyCropToImage(targetElement.src, cropMode, cropData as any);
      
      const newWidth = result.width * (targetElement.scaleX || 1);
      const newHeight = result.height * (targetElement.scaleY || 1);
      const newX = targetElement.x + (result.dx * (targetElement.scaleX || 1));
      const newY = targetElement.y + (result.dy * (targetElement.scaleY || 1));

      updateElement(targetElement.id, {
        src: result.dataUrl,
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY,
        scaleX: 1, 
        scaleY: 1
      }, true, false, projectId);

      setEraserStrokes(prev => prev.filter(s => !activeEraserStrokes.includes(s)));
      if (cropMode === 'freehand') {
        setFreehandPoints([]);
      }
      // Do not stop cropping, allow continuous edits
    } catch (err) {
      console.error("Failed to crop image", err);
      alert("Failed to crop image. CORS issue?");
    } finally {
      isProcessingRef.current = false;
      
      if (pendingApplyRef.current) {
        pendingApplyRef.current = false;
        // Use a timeout to ensure state has updated before grabbing the next batch
        setTimeout(() => {
          // Pass undefined overrides so it grabs the latest state from the component
          handleApply();
        }, 10);
      }
    }
  };

  const handleDragMove = (e: any) => {
    if (cropMode !== 'rect') return;
    setRectBounds({
      x: e.target.x(),
      y: e.target.y(),
      width: rectBounds?.width || 100,
      height: rectBounds?.height || 100
    });
  };

  const handleTransform = (e: any) => {
    if (cropMode !== 'rect') return;
    const node = e.target;
    setRectBounds({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * node.scaleX()),
      height: Math.max(5, node.height() * node.scaleY())
    });
    // Reset scale to 1 to avoid compounding scales during resize
    node.scaleX(1);
    node.scaleY(1);
  };

  const handleTransformEnd = () => {
    if (cropMode !== 'rect') return;
    handleApply();
  };
  const handleDragEnd = () => {
    if (cropMode !== 'rect') return;
    handleApply();
  };

  return (
    <Group>
      {/* Dimmed background over the whole stage to focus on crop? Or just dim the original image. */}
      {/* We can draw a slightly dark rect over the image, then clear the crop area. But Konva composite operations are tricky. */}
      {/* For now, just show the crop boundaries clearly. */}
      
      {cropMode === 'rect' && rectBounds && (
        <Group>
          {/* Crop Rectangle */}
          <Rect
            ref={rectRef}
            x={rectBounds.x}
            y={rectBounds.y}
            width={rectBounds.width}
            height={rectBounds.height}
            stroke="#00ffcc"
            strokeWidth={2 / stageScale}
            dash={[5 / stageScale, 5 / stageScale]}
            draggable
            onDragMove={handleDragMove}
            onTransform={handleTransform}
            onTransformEnd={handleTransformEnd}
            onDragEnd={handleDragEnd}
            name="cropRect"
          />
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // limit resize
              if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Group>
      )}

      {cropMode === 'freehand' && (
        <Group>
          {/* Invisible rect over the image to catch drawing events */}
          <Rect
            x={targetElement.x}
            y={targetElement.y}
            width={targetElement.width}
            height={targetElement.height}
            fill="transparent"
            onMouseDown={(e) => {
              // Prevent event from bubbling to stage and causing drag
              e.cancelBubble = true;
              setIsDrawingFreehand(true);
              const stage = e.target.getStage();
              if (stage) {
                const pos = getRelativePointerPosition(stage);
                if (pos) setFreehandPoints([{x: pos.x, y: pos.y}]);
              }
            }}
            onMouseMove={(e) => {
              if (!isDrawingFreehand) return;
              e.cancelBubble = true;
              const stage = e.target.getStage();
              if (stage) {
                const pos = getRelativePointerPosition(stage);
                if (pos) setFreehandPoints(prev => [...prev, {x: pos.x, y: pos.y}]);
              }
            }}
            onMouseUp={(e) => {
              e.cancelBubble = true;
              setIsDrawingFreehand(false);
              setFreehandPoints(prev => {
                const activePoints = [...prev];
                setTimeout(() => handleApply(undefined, activePoints), 10);
                return prev;
              });
            }}
            onMouseLeave={() => {
              setIsDrawingFreehand(false);
            }}
          />
          {freehandPoints.length > 0 && (
            <Line
              points={freehandPoints.flatMap(p => [p.x, p.y])}
              stroke="#00ffcc"
              strokeWidth={2 / stageScale}
              closed={!isDrawingFreehand}
              fill={isDrawingFreehand ? undefined : "rgba(0, 255, 204, 0.2)"}
              listening={false}
            />
          )}
        </Group>
      )}

      {cropMode === 'image_eraser' && (
        <Group>
          <Group x={targetElement.x + 10} y={targetElement.y + 10}>
            <Html
              transform={true}
              divProps={{
                style: {
                  pointerEvents: 'auto',
                },
              }}
            >
              <div
                className="bg-theme-bg/90 backdrop-blur-md border border-theme-border rounded-lg shadow-xl p-3 flex flex-col gap-2 pointer-events-auto"
                style={{ minWidth: '150px' }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-theme-text">
                  <span>Brush Size</span>
                  <span>{brushSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </Html>
          </Group>
          <Rect
            x={targetElement.x}
            y={targetElement.y}
            width={targetElement.width}
            height={targetElement.height}
            fill="transparent"
            onMouseDown={(e) => {
              e.cancelBubble = true;
              setIsErasing(true);
              const stage = e.target.getStage();
              if (stage) {
                const pos = getRelativePointerPosition(stage);
                if (pos) setCurrentEraserStroke([pos.x, pos.y, pos.x, pos.y]);
              }
            }}
            onMouseMove={(e) => {
              if (!isErasing) return;
              e.cancelBubble = true;
              const stage = e.target.getStage();
              if (stage) {
                const pos = getRelativePointerPosition(stage);
                if (pos) setCurrentEraserStroke(prev => [...prev, pos.x, pos.y]);
              }
            }}
            onMouseUp={(e) => {
              e.cancelBubble = true;
              setIsErasing(false);
              if (currentEraserStroke.length > 0) {
                setEraserStrokes(prev => {
                  const newStrokes = [...prev, currentEraserStroke];
                  setTimeout(() => handleApply(newStrokes, undefined), 10);
                  return newStrokes;
                });
                setCurrentEraserStroke([]);
              }
            }}
            onMouseLeave={() => {
              if (isErasing) {
                setIsErasing(false);
                if (currentEraserStroke.length > 0) {
                  setEraserStrokes(prev => {
                    const newStrokes = [...prev, currentEraserStroke];
                    setTimeout(() => handleApply(newStrokes, undefined), 10);
                    return newStrokes;
                  });
                  setCurrentEraserStroke([]);
                }
              }
            }}
          />
          {eraserStrokes.map((stroke, i) => (
            <Line key={i} points={stroke} stroke="#ff0000" strokeWidth={brushSize} opacity={0.6} lineCap="round" lineJoin="round" tension={0.5} listening={false} />
          ))}
          {currentEraserStroke.length > 0 && (
            <Line points={currentEraserStroke} stroke="#ff0000" strokeWidth={brushSize} opacity={0.6} lineCap="round" lineJoin="round" tension={0.5} listening={false} />
          )}
        </Group>
      )}

    </Group>
  );
};
