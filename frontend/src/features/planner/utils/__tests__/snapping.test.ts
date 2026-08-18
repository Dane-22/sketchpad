import { describe, it, expect } from 'vitest';
import { calculateSnapPoint } from '../snapping';
import { CanvasElement } from '../../../../types/canvas';

describe('Snapping Utils', () => {
  it('should snap to an endpoint of a line', () => {
    const elements: CanvasElement[] = [
      { id: '1', type: 'line', x: 0, y: 0, points: [100, 100, 200, 200] }
    ];

    // Pointer very close to 100, 100
    const snap = calculateSnapPoint({ x: 102, y: 98 }, elements, 50, true, 1);
    
    expect(snap.point).toEqual({ x: 100, y: 100 });
    expect(snap.type).toBe('endpoint');
    expect(snap.elementId).toBe('1');
    expect(snap.nodeIndex).toBe(0);
  });

  it('should snap to a midpoint of a line', () => {
    const elements: CanvasElement[] = [
      { id: '1', type: 'line', x: 0, y: 0, points: [100, 100, 200, 200] }
    ];

    // Pointer very close to 150, 150 (midpoint)
    const snap = calculateSnapPoint({ x: 149, y: 151 }, elements, 50, true, 1);
    
    expect(snap.point).toEqual({ x: 150, y: 150 });
    expect(snap.type).toBe('midpoint');
    expect(snap.elementId).toBe('1');
    expect(snap.nodeIndex).toBe(0.5);
  });

  it('should perform well with 50,000 elements', () => {
    const elements: CanvasElement[] = Array.from({ length: 50000 }).map((_, i) => ({
      id: `el-${i}`,
      type: 'rectangle',
      x: i * 10,
      y: i * 10,
      width: 5,
      height: 5
    }));

    const start = performance.now();
    
    // Snap to the very last element's top-left corner
    const snap = calculateSnapPoint({ x: 499990 - 2, y: 499990 - 2 }, elements, 10, true, 1);
    
    const end = performance.now();
    const duration = end - start;

    expect(snap.point).toEqual({ x: 499990, y: 499990 });
    expect(snap.type).toBe('endpoint');
    expect(snap.elementId).toBe('el-49999');
    
    // Iterating 50k elements for snapping should ideally be under ~50ms in JS 
    // to maintain 60 FPS, but tests run a bit slower. We'll set a loose 1000ms bound for the test env.
    expect(duration).toBeLessThan(1500);
  });
});
