import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasState } from '../useCanvasState';

describe('useCanvasState', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCanvasState());
    act(() => {
      // Reset state before each test
      result.current.activeTool = 'select';
      result.current.commandMessage = '';
      result.current.pendingCoordinate = null;
    });
  });

  it('should parse simple tool commands', () => {
    const { result } = renderHook(() => useCanvasState());

    act(() => {
      result.current.parseCommand('L');
    });

    expect(result.current.activeTool).toBe('line');
    
    act(() => {
      result.current.parseCommand('CIRCLE');
    });

    expect(result.current.activeTool).toBe('circle');
  });

  it('should parse absolute coordinates', () => {
    const { result } = renderHook(() => useCanvasState());

    act(() => {
      result.current.parseCommand('100,50');
    });

    expect(result.current.pendingCoordinate).toEqual({
      x: 100,
      y: 50,
      isRelative: false
    });
  });

  it('should parse relative coordinates', () => {
    const { result } = renderHook(() => useCanvasState());

    act(() => {
      result.current.parseCommand('@-10,20.5');
    });

    expect(result.current.pendingCoordinate).toEqual({
      x: -10,
      y: 20.5,
      isRelative: true
    });
  });

  it('should update linked dimensions when target element is moved', () => {
    const { result } = renderHook(() => useCanvasState());

    // Setup initial state: a line and a dimension linked to it
    act(() => {
      useCanvasState.setState({
        elements: [
          {
            id: 'line-1',
            type: 'line',
            x: 0,
            y: 0,
            points: [100, 100, 200, 200]
          },
          {
            id: 'dim-1',
            type: 'dimension',
            x: 0,
            y: 0,
            points: [100, 100, 200, 200, 150, 100], // P1, P2, Offset
            linkedElements: [
              { elementId: 'line-1', dimensionPointIndex: 0 }, // Linked P1
              { elementId: 'line-1', dimensionPointIndex: 2 }  // Linked P2
            ]
          }
        ]
      });
    });

    // Move the line by +50, -20
    act(() => {
      // In the app, updateElement expects x,y updates for movement.
      // But we initialized x=0, y=0. So we update it to x=50, y=-20
      result.current.updateElement('line-1', { x: 50, y: -20 });
    });

    const dim = result.current.elements.find(e => e.id === 'dim-1');
    expect(dim?.points).toBeDefined();
    // P1 (index 0,1) should be 100+50=150, 100-20=80
    // P2 (index 2,3) should be 200+50=250, 200-20=180
    // Offset (index 4,5) is not linked, so it remains 150, 100
    expect(dim?.points).toEqual([150, 80, 250, 180, 150, 100]);
  });

  it('should parse all exhaustive command shortcuts', () => {
    const { result } = renderHook(() => useCanvasState());
    const commands: Record<string, string> = {
      'L': 'line', 'LINE': 'line',
      'C': 'circle', 'CIRCLE': 'circle',
      'REC': 'rectangle', 'RECTANG': 'rectangle', 'RECTANGLE': 'rectangle',
      'PL': 'polyline', 'POLYLINE': 'polyline',
      'A': 'arc', 'ARC': 'arc',
      'E': 'eraser', 'ERASE': 'eraser',
      'M': 'select', 'MOVE': 'select',
      'T': 'text', 'TEXT': 'text'
    };

    for (const [cmd, expected] of Object.entries(commands)) {
      act(() => {
        result.current.parseCommand(cmd);
      });
      expect(result.current.activeTool).toBe(expected);
    }
  });

  it('should handle grouping and ungrouping', () => {
    const { result } = renderHook(() => useCanvasState());

    act(() => {
      useCanvasState.setState({
        elements: [
          { id: 'el-1', type: 'line', x: 0, y: 0 },
          { id: 'el-2', type: 'circle', x: 10, y: 10 }
        ],
        groups: []
      });
    });

    // Group elements
    act(() => {
      result.current.groupElements(['el-1', 'el-2']);
    });

    const groups = result.current.groups;
    expect(groups.length).toBe(1);
    expect(groups[0].elementIds).toEqual(['el-1', 'el-2']);
    expect(result.current.elements[0].groupId).toBe(groups[0].id);
    expect(result.current.elements[1].groupId).toBe(groups[0].id);

    // Ungroup
    act(() => {
      result.current.ungroupElements(groups[0].id);
    });

    expect(result.current.groups.length).toBe(0);
    expect(result.current.elements[0].groupId).toBeUndefined();
  });

  it('should handle layers addition, visibility, and removal', () => {
    const { result } = renderHook(() => useCanvasState());

    // Add layer
    act(() => {
      result.current.addLayer('MyLayer');
    });

    const layers = result.current.layers;
    const newLayer = layers[layers.length - 1];
    expect(newLayer.name).toBe('MyLayer');
    expect(newLayer.visible).toBe(true);

    // Toggle visibility
    act(() => {
      result.current.toggleLayerVisibility(newLayer.id);
    });
    expect(result.current.layers.find(l => l.id === newLayer.id)?.visible).toBe(false);

    // Remove layer
    act(() => {
      result.current.removeLayer(newLayer.id);
    });
    expect(result.current.layers.find(l => l.id === newLayer.id)).toBeUndefined();
  });

  it('should handle boundary conditions and fast state mutations with 50,000 elements', () => {
    const { result } = renderHook(() => useCanvasState());
    
    const manyElements = Array.from({ length: 50000 }).map((_, i) => ({
      id: `generated-${i}`,
      type: 'line' as const,
      x: i,
      y: i,
      points: [0, 0, 10, 10]
    }));

    const start = performance.now();
    
    act(() => {
      useCanvasState.setState({ elements: manyElements });
    });

    // Update the last element to see how long it takes
    act(() => {
      result.current.updateElement('generated-49999', { x: 99999 }, false); // no commit to history to keep memory lower
    });

    const end = performance.now();
    const duration = end - start;
    
    expect(result.current.elements.length).toBe(50000);
    expect(result.current.elements[49999].x).toBe(99999);
    
    // As long as the duration isn't completely catastrophic (e.g., > 1000ms), it's a pass in this controlled environment.
    // Real strict 16ms tests might fail in JSDOM due to environment overhead.
    expect(duration).toBeLessThan(1500); 
  });
});
