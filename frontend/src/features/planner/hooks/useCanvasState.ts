import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CanvasElement, ToolType, CanvasLayer } from '../../../types/canvas';
import { socket } from '../utils/socket';

interface CanvasStateStore {
  elements: CanvasElement[];
  history: CanvasElement[][];
  historyIndex: number;
  activeTool: ToolType;
  layers: CanvasLayer[];
  activeLayerId: string;
  groups: { id: string; elementIds: string[] }[];
  stageScale: number;
  stagePos: { x: number; y: number };
  stageRotation: number;
  stagePitch: number;
  isSidebarOpen: boolean;
  isToolbarExpanded: boolean;
  theme: 'dark' | 'light';
  stageWidth: number;
  stageHeight: number;
  
  gridVisible: boolean;
  orthoMode: boolean;
  snapMode: boolean;
  commandMessage: string;
  selectedElementIds: string[];
  customSymbols: { id: string; name: string; elements: CanvasElement[] }[];
  clipboard: CanvasElement | null;
  textColor: string;
  unitMode: 'metric' | 'imperial';
  pendingCoordinate: { x: number; y: number; isRelative: boolean } | null;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  activeTopicId: string | null;
  setActiveTopicId: (id: string | null) => void;
  activeStampType: 'APPROVED' | 'REVISE & RESUBMIT' | 'FOR REVIEW' | 'REJECTED' | 'AS-BUILT' | 'HOLD';
  setActiveStampType: (type: 'APPROVED' | 'REVISE & RESUBMIT' | 'FOR REVIEW' | 'REJECTED' | 'AS-BUILT' | 'HOLD') => void;
  highlighterColor: string;
  setHighlighterColor: (color: string) => void;
  highlighterWidth: number;
  setHighlighterWidth: (w: number) => void;
  eraserMode: 'hover' | 'click';
  setEraserMode: (mode: 'hover' | 'click') => void;
  cropTargetId: string | null;
  cropMode: CropMode;
  startCropping: (id: string, mode: CropMode) => void;
  stopCropping: () => void;
  
  setElements: (elements: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[]), commit?: boolean, isRemote?: boolean, broadcast?: boolean, projectId?: string) => void;
  addElement: (element: CanvasElement, commit?: boolean, isRemote?: boolean, projectId?: string) => void;
  undo: () => void;
  redo: () => void;
  removeElement: (id: string, commit?: boolean, isRemote?: boolean, projectId?: string) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>, commit?: boolean, isRemote?: boolean, projectId?: string) => void;
  commitHistory: () => void;
  addLayer: (name: string) => void;
  updateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  removeLayer: (id: string) => void;
  setActiveLayerId: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  groupElements: (elementIds: string[]) => void;
  ungroupElements: (groupId: string) => void;
  setActiveTool: (tool: ToolType) => void;
  setStageScale: (scale: number) => void;
  setStagePos: (pos: { x: number; y: number }) => void;
  setStageRotation: (rotation: number) => void;
  setStagePitch: (pitch: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setIsToolbarExpanded: (isExpanded: boolean) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (isOpen: boolean) => void;
  setStageDimensions: (width: number, height: number) => void;
  
  removeElements: (ids: string[], commit?: boolean, isRemote?: boolean, projectId?: string) => void;
  sendToBack: (id: string) => void;
  bringToFront: (id: string) => void;
  duplicateElement: (id: string, projectId?: string) => void;
  toggleLockElement: (id: string) => void;
  setElementOpacity: (id: string, opacity: number) => void;
  rotateElement: (id: string, degrees: number) => void;
  setGridVisible: (visible: boolean) => void;
  setOrthoMode: (ortho: boolean) => void;
  setSnapMode: (snap: boolean) => void;
  setCommandMessage: (msg: string) => void;
  setSelectedElementIds: (ids: string[]) => void;
  toggleElementSelection: (id: string) => void;
  setCustomSymbols: (symbols: { id: string; name: string; elements: CanvasElement[] }[]) => void;
  setGroups: (groups: { id: string; elementIds: string[] }[]) => void;
  setClipboard: (el: CanvasElement | null) => void;
  setTextColor: (color: string) => void;
  setUnitMode: (mode: 'metric' | 'imperial') => void;
  setPendingCoordinate: (coord: { x: number; y: number; isRelative: boolean } | null) => void;
  parseCommand: (input: string) => void;
  spawnStressTest: () => void;
}

export const useCanvasState = create<CanvasStateStore>()(
  persist(
    (set) => ({
      elements: [],
      history: [[]],
      historyIndex: 0,
      activeTool: 'select',
      layers: [{ id: 'layer-0', name: 'Layer 0', visible: true, locked: false }],
      activeLayerId: 'layer-0',
      groups: [],
      stageScale: 1,
      stagePos: { x: 0, y: 0 },
      stageRotation: 0,
      stagePitch: 0,
      isSidebarOpen: false,
      isToolbarExpanded: false,
      theme: 'dark',
      isImportModalOpen: false,
      stageWidth: window.innerWidth,
      stageHeight: window.innerHeight,
      
      gridVisible: true,
      orthoMode: false,
      snapMode: true,
      commandMessage: 'Command: SELECT - Ready',
      selectedElementIds: [],
      customSymbols: [],
      clipboard: null,
      textColor: '#ffffff',
      unitMode: 'metric',
      pendingCoordinate: null,
      activeProjectId: null,
      setActiveProjectId: (id) => set({ activeProjectId: id }),
      activeTopicId: null,
      setActiveTopicId: (id) => set({ activeTopicId: id }),
      activeStampType: 'APPROVED',
      setActiveStampType: (type) => set({ activeStampType: type }),
      highlighterColor: '#FFFF00',
      setHighlighterColor: (color) => set({ highlighterColor: color }),
      highlighterWidth: 20,
      setHighlighterWidth: (w) => set({ highlighterWidth: w }),
      eraserMode: 'hover',
      setEraserMode: (mode) => set({ eraserMode: mode }),
      cropTargetId: null,
      cropMode: null,
      startCropping: (id, mode) => set({ cropTargetId: id, cropMode: mode }),
      stopCropping: () => set({ cropTargetId: null, cropMode: null }),
      
      setElements: (elementsOrUpdater, commit = true, isRemote = false, broadcast = false, projectId?: string) => set((state) => {
        const newElements = typeof elementsOrUpdater === 'function' ? elementsOrUpdater(state.elements) : elementsOrUpdater;
        const targetProjectId = projectId || state.activeProjectId;
        
        if (!isRemote && broadcast) {
          socket.emit('elements-changed', { projectId: targetProjectId, elements: newElements });
        }
        
        if (commit) {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newElements);
          return {
            elements: newElements,
            history: newHistory,
            historyIndex: newHistory.length - 1
          };
        }
        return { elements: newElements };
      }),
      addElement: (element, commit = true, isRemote = false, projectId?: string) => set((state) => {
        if (state.elements.some(e => e.id === element.id)) {
          return state;
        }
        const targetProjectId = projectId || state.activeProjectId;
        const newElements = [...state.elements, element];
        
        if (!isRemote) {
          socket.emit('element-added', { projectId: targetProjectId, element });
        }
        
        if (commit) {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newElements);
          return {
            elements: newElements,
            history: newHistory,
            historyIndex: newHistory.length - 1
          };
        }
        return { elements: newElements };
      }),
      commitHistory: () => set((state) => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(state.elements);
        return {
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      }),
      undo: () => set((state) => {
        if (state.historyIndex > 0) {
          return {
            elements: state.history[state.historyIndex - 1],
            historyIndex: state.historyIndex - 1
          };
        }
        return state;
      }),
      redo: () => set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          return {
            elements: state.history[state.historyIndex + 1],
            historyIndex: state.historyIndex + 1
          };
        }
        return state;
      }),
      removeElement: (id, commit = true, isRemote = false, projectId?: string) => set((state) => {
        const targetProjectId = projectId || state.activeProjectId;
        const newElements = state.elements.filter(el => el.id !== id);
        
        if (!isRemote) {
          socket.emit('element-removed', { projectId: targetProjectId, id });
        }
        
        if (commit) {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newElements);
          return {
            elements: newElements,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            selectedElementIds: state.selectedElementIds.filter(selId => selId !== id)
          };
        }
        return {
          elements: newElements,
          selectedElementIds: state.selectedElementIds.filter(selId => selId !== id)
        };
      }),
      removeElements: (ids, commit = true, isRemote = false, projectId?: string) => set((state) => {
        const targetProjectId = projectId || state.activeProjectId;
        const idSet = new Set(ids);
        const newElements = state.elements.filter(el => !idSet.has(el.id));
        
        if (!isRemote) {
          ids.forEach(id => socket.emit('element-removed', { projectId: targetProjectId, id }));
        }
        
        if (commit) {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newElements);
          return {
            elements: newElements,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            selectedElementIds: []
          };
        }
        return {
          elements: newElements,
          selectedElementIds: []
        };
      }),
      sendToBack: (id) => set((state) => {
        const el = state.elements.find(e => e.id === id);
        if (!el) return state;
        const newElements = [el, ...state.elements.filter(e => e.id !== id)];
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newElements);
        return {
          elements: newElements,
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      }),
      bringToFront: (id) => set((state) => {
        const el = state.elements.find(e => e.id === id);
        if (!el) return state;
        const newElements = [...state.elements.filter(e => e.id !== id), el];
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newElements);
        return {
          elements: newElements,
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      }),
      duplicateElement: (id, projectId?: string) => set((state) => {
        const targetProjectId = projectId || state.activeProjectId;
        const el = state.elements.find(e => e.id === id);
        if (!el) return state;
        const cloned: CanvasElement = {
          ...el,
          id: `clone-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          x: el.x + 30,
          y: el.y + 30,
          points: el.points ? el.points.map((p) => p + 30) : undefined
        };
        const newElements = [...state.elements, cloned];
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newElements);
        socket.emit('element-added', { projectId: targetProjectId, element: cloned });
        return {
          elements: newElements,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          selectedElementIds: [cloned.id]
        };
      }),
      toggleLockElement: (id) => set((state) => {
        const targetProjectId = state.activeProjectId;
        const newElements = state.elements.map(el => {
          if (el.id === id) {
            const nextLocked = !el.locked;
            socket.emit('element-updated', { projectId: targetProjectId, id, updates: { locked: nextLocked } });
            return { ...el, locked: nextLocked };
          }
          return el;
        });
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newElements);
        return {
          elements: newElements,
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      }),
      setElementOpacity: (id, opacity) => set((state) => {
        const targetProjectId = state.activeProjectId;
        const newElements = state.elements.map(el => {
          if (el.id === id) {
            socket.emit('element-updated', { projectId: targetProjectId, id, updates: { opacity } });
            return { ...el, opacity };
          }
          return el;
        });
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newElements);
        return {
          elements: newElements,
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      }),
      rotateElement: (id, degrees) => set((state) => {
        const targetProjectId = state.activeProjectId;
        const newElements = state.elements.map(el => {
          if (el.id === id) {
            const currentRot = el.rotation || 0;
            const nextRot = (currentRot + degrees + 360) % 360;
            socket.emit('element-updated', { projectId: targetProjectId, id, updates: { rotation: nextRot } });
            return { ...el, rotation: nextRot };
          }
          return el;
        });
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newElements);
        return {
          elements: newElements,
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      }),
      updateElement: (id, updates, commit = true, isRemote = false, projectId?: string) => set((state) => {
        const targetProjectId = projectId || state.activeProjectId;
        const targetElement = state.elements.find(e => e.id === id);
        const dx = updates.x !== undefined && targetElement ? updates.x - targetElement.x : 0;
        const dy = updates.y !== undefined && targetElement ? updates.y - targetElement.y : 0;

        const newElements = state.elements.map(el => {
          if (el.id === id) return { ...el, ...updates };

          if (el.type === 'dimension' && el.linkedElements && el.points && (dx !== 0 || dy !== 0)) {
            const links = el.linkedElements.filter(link => link.elementId === id);
            if (links.length > 0) {
              const newPoints = [...el.points];
              links.forEach(link => {
                const idx = link.dimensionPointIndex;
                if (idx !== undefined && idx < newPoints.length - 1) {
                  newPoints[idx] += dx;
                  newPoints[idx + 1] += dy;
                }
              });
              return { ...el, points: newPoints };
            }
          }
          return el;
        });
        
        if (!isRemote) {
          socket.emit('element-updated', { projectId: targetProjectId, id, updates });
          // Also emit updates for linked dimensions so multiplayer sees the dimension move
          newElements.forEach(el => {
            if (el.type === 'dimension' && el.linkedElements?.some(link => link.elementId === id)) {
              socket.emit('element-updated', { projectId: targetProjectId, id: el.id, updates: { points: el.points } });
            }
          });
        }
        
        if (commit) {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newElements);
          return {
            elements: newElements,
            history: newHistory,
            historyIndex: newHistory.length - 1
          };
        }
        return { elements: newElements };
      }),
      addLayer: (name) => set((state) => {
        const newLayer = { id: `layer-${Date.now()}`, name, visible: true, locked: false };
        return { layers: [...state.layers, newLayer] };
      }),
      updateLayer: (id, updates) => set((state) => ({
        layers: state.layers.map(l => l.id === id ? { ...l, ...updates } : l)
      })),
      removeLayer: (id) => set((state) => ({
        layers: state.layers.filter(l => l.id !== id),
        elements: state.elements.filter(el => el.layerId !== id)
      })),
      setActiveLayerId: (id) => set({ activeLayerId: id }),
      toggleLayerVisibility: (id) => set((state) => ({
        layers: state.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
      })),
      groupElements: (elementIds) => set((state) => {
        const groupId = `group-${Date.now()}`;
        return {
          groups: [...state.groups, { id: groupId, elementIds }],
          elements: state.elements.map(el => elementIds.includes(el.id) ? { ...el, groupId } : el)
        };
      }),
      ungroupElements: (groupId) => set((state) => ({
        groups: state.groups.filter(g => g.id !== groupId),
        elements: state.elements.map(el => el.groupId === groupId ? { ...el, groupId: undefined } : el)
      })),
      setGroups: (groups) => set({ groups }),
      setClipboard: (el) => set({ clipboard: el }),
      setTextColor: (color) => set({ textColor: color }),
      setPendingCoordinate: (coord) => set({ pendingCoordinate: coord }),
      parseCommand: (input: string) => set(() => {
        const cmd = input.trim().toUpperCase();
        
        // Command mappings
        const toolMap: Record<string, ToolType> = {
          'L': 'line',
          'LINE': 'line',
          'ARROW': 'arrow',
          'AR': 'arrow',
          'PL': 'polyline',
          'POLYLINE': 'polyline',
          'A': 'arc',
          'ARC': 'arc',
          'E': 'eraser',
          'ERASE': 'eraser',
          'M': 'select', // Move uses select tool
          'MOVE': 'select',
          'T': 'text',
          'TEXT': 'text'
        };

        if (toolMap[cmd]) {
          return { activeTool: toolMap[cmd], commandMessage: `Command: ${cmd} (Active Tool: ${toolMap[cmd]})` };
        }

        // Check if it's a coordinate
        let isRelative = false;
        let coordStr = cmd;
        if (coordStr.startsWith('@')) {
          isRelative = true;
          coordStr = coordStr.substring(1);
        }
        
        const parts = coordStr.split(',');
        if (parts.length === 2) {
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          if (!isNaN(x) && !isNaN(y)) {
            return { 
              pendingCoordinate: { x, y, isRelative },
              commandMessage: `Coordinate: ${isRelative ? '@' : ''}${x},${y}`
            };
          }
        }

        return { commandMessage: `Unknown command: ${input}` };
      }),
      setActiveTool: (tool) => set({ 
        activeTool: tool,
        commandMessage: `Command: ${tool.toUpperCase()} - Ready`
      }),
      setStageScale: (scale) => set({ stageScale: scale }),
      setStagePos: (pos) => set({ stagePos: pos }),
      setStageRotation: (rotation) => set({ stageRotation: rotation }),
      setStagePitch: (pitch) => set({ stagePitch: pitch }),
      setTheme: (theme) => set({ theme }),
      setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      setIsToolbarExpanded: (isExpanded) => set({ isToolbarExpanded: isExpanded }),
      setIsImportModalOpen: (isOpen) => set({ isImportModalOpen: isOpen }),
      setStageDimensions: (width, height) => set({ stageWidth: width, stageHeight: height }),
      
      setGridVisible: (visible) => set({ gridVisible: visible }),
      setOrthoMode: (ortho) => set({ orthoMode: ortho }),
      setSnapMode: (snap) => set({ snapMode: snap }),
      setCommandMessage: (msg) => set({ commandMessage: msg }),
      setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),
      toggleElementSelection: (id) => set((state) => ({
        selectedElementIds: state.selectedElementIds.includes(id) 
          ? state.selectedElementIds.filter(sId => sId !== id)
          : [...state.selectedElementIds, id]
      })),
      setCustomSymbols: (symbols) => set({ customSymbols: symbols }),
      setUnitMode: (mode) => set({ unitMode: mode }),
      spawnStressTest: () => set((state) => {
        const newElements: CanvasElement[] = [];
        const types: CanvasElement['type'][] = ['line', 'arrow', 'text'];
        for (let i = 0; i < 10000; i++) {
          const type = types[Math.floor(Math.random() * types.length)];
          const x = Math.random() * 5000 - 2500;
          const y = Math.random() * 5000 - 2500;
          
          let element: CanvasElement;
          if (type === 'line') {
             element = { id: `stress-${i}`, type: 'line', x: 0, y: 0, points: [x, y, x + Math.random() * 100, y + Math.random() * 100], stroke: '#ff0000', layerId: state.activeLayerId };
          } else if (type === 'arrow') {
             element = { id: `stress-${i}`, type: 'arrow', x: 0, y: 0, points: [x, y, x + Math.random() * 100, y + Math.random() * 100], stroke: '#00ff00', layerId: state.activeLayerId };
          } else {
             element = { id: `stress-${i}`, type: 'text', x, y, text: 'STRESS', fill: '#ffffff', layerId: state.activeLayerId };
          }
          newElements.push(element);
        }
        
        const combined = [...state.elements, ...newElements];
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(combined);
        
        return {
          elements: combined,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          commandMessage: `Command: STRESSTEST - Spawned 10,000 entities`
        };
      })
    }),
    {
      name: 'canvas-storage',
      partialize: (state) => ({ layers: state.layers, theme: state.theme, customSymbols: state.customSymbols }),
    }
  )
);
