# Sketchpad System
## Technical User Manual

| Version | Date | Description |
| :--- | :--- | :--- |
| 1.0.0 | August 2026 | Initial Release |

---

## Table of Contents
1. [Introduction & Architecture Overview](#1-introduction--architecture-overview)
2. [Canvas Tools & Operations](#2-canvas-tools--operations)
3. [Comprehensive Command Shortcuts](#3-comprehensive-command-shortcuts)
4. [Import & Export](#4-import--export)
5. [Real-time Collaboration & Chat](#5-real-time-collaboration--chat)

---

## 1. Introduction & Architecture Overview

The **Sketchpad System** is a highly interactive, real-time collaboration canvas tailored for engineers, architects, and technical professionals. It leverages a modern stack consisting of React, Konva for 2D canvas rendering, and Socket.io for WebSocket-driven real-time synchronization.

**Live Environment Access:** [http://72.62.254.60:9000/](http://72.62.254.60:9000/)

This architecture allows multiple users to view live pointer movements, execute drawing commands synchronously, and communicate via integrated chat channels with sub-millisecond latency.

## 2. Canvas Tools & Operations

The core of the planner revolves around the Konva-based canvas environment. 

### Drawing Tools
- **Line & Polyline:** For drafting precise structural or electrical routes.
- **Arrow:** Used for leader lines and directional annotations.
- **Freehand:** For conceptual sketches.
- **Circle:** For indicating nodes, endpoints, or focal areas.
- **Ink Color:** Manage stroke properties dynamically for layer or discipline differentiation.
- **Eraser (Hover and Click):** Operates on a precise collision-detection model; hover over the target vector and click to remove it from the canvas JSON blob.

### Context Modes
- **Grid Layer (`F7`):** Toggles the background grid layer for alignment.
- **Ortho Mode (`F8`):** Restricts line drawing to strict horizontal (0/180 degrees) and vertical (90/270 degrees) axes.

## 3. Comprehensive Command Shortcuts

To maximize efficiency, Sketchpad System supports native CAD-like keyboard shortcuts. Sequences must be executed within a 1.5-second buffer window.

### Single Key Commands
- `E` : **Eraser** Tool
- `L` : **Line** Tool
- `F` : **Freehand** Tool
- `C` : **Circle** Tool
- `T` : **Text** Tool
- `P` / `Escape` : **Select** Tool (Default state)
- `F7` : Toggle **Grid**
- `F8` : Toggle **Ortho Mode**
- `Delete` / `Backspace` : Delete selected elements

### Keyboard Sequences
- `PL` : Activate **Polyline** Tool
- `Z` + `Enter` + `T` + `E` : **Zoom Extents** (Fits all current geometry within the viewport)

### Modifiers
- `Ctrl + O` / `Cmd + O` : Open Import/Upload Modal
- `Ctrl + Z` / `Cmd + Z` : Undo the last action
- `Ctrl + Y` (or `Ctrl + Shift + Z`) : Redo

## 4. Import & Export

Sketchpad System supports robust I/O for integrating with external CAD software and documentation pipelines.

- **DXF Parsing:** Utilizes `dxf-parser` for importing `.dxf` vector files. Note that complex splines and hatch patterns may be abstracted into simpler poly-lines upon import.
- **SKP Conversion:** 3D SketchUp (`.skp`) files are converted into 2D isometric or top-down projections, flattening the geometry for web-based annotation.
- **PDF Extraction:** Built on `pdfjs-dist` to rasterize or extract vectors from architectural blueprints to be used as base layers in the canvas.
- **DXF/PDF Export:** The canvas state can be serialized back into `.dxf` (via `dxf-writer`) or generated as a high-fidelity PDF (`jspdf`).

## 5. Real-time Collaboration & Chat

### Presence & Online Users
The system tracks connected clients via Socket.io to provide live presence indicators. The active user list is updated in real-time whenever a user joins or leaves the `projectId` room. This online status is used to display live collaborator cursors on the canvas, manage active typing indicators, and display online presence in the chat interface.

### WebSocket Sync
All canvas data changes (`canvasData` JSON blob) and pointer events are broadcasted via Socket.io. This ensures that when a client triggers an event (e.g., placing a vertex), all connected clients in the same `projectId` room receive the delta update immediately.

### Project Messenger
The built-in chat supports Channels and direct mentions. Chat messages are persisted via Prisma to the MySQL database. Users can drop "Pins" on the canvas that directly link to specific chat threads for contextual discussion.
