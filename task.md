# 🚀 Upcoming Tasks & Roadmap

Now that the Dashboard is fully redesigned and deployed, we can focus on leveling up the core CAD engine and adding premium features. Here are some of the most impactful features we can build next:

## 🥇 Next Up: The Undo / Redo System (Completed)
Every professional CAD tool needs a robust undo/redo system. We implemented a state history stack that tracks every change made on the canvas.
- [x] Implement `history` and `future` stacks in the canvas state store
- [x] Add `pushToHistory` action before any mutation (moving, drawing, deleting)
- [x] Create `undo` and `redo` functions to traverse the stacks
- [x] Hook up `Ctrl+Z` / `Cmd+Z` and `Ctrl+Y` / `Cmd+Shift+Z` keyboard shortcuts
- [x] Add visual Undo/Redo buttons to the TopNavbar or CommandBar

**Real-Life Scenario:** An engineer accidentally deletes a critical bearing from their assembly layout. With one keystroke (`Ctrl+Z`), the bearing is restored without having to redraw it.
- **Pros:** Massively improves user confidence; allows for safe experimentation without fear of ruining the design.
- **Cons:** Memory intensive over long sessions (the history stack grows large if not capped).

## 🥈 Feature Idea: Canvas Snapping & Grid Alignment
Make drawing and placing objects perfectly precise.
- [x] Implement a magnetic grid system
- [x] Add object-to-object snapping (corners, midpoints, edges)
- [x] Add a toggle button for snapping in the UI

**Real-Life Scenario:** An architect is designing a floor plan and needs the new interior wall line to perfectly touch the exact midpoint of an existing exterior wall. Object snapping handles this mathematically instead of forcing the user to "eyeball" it.
- **Pros:** Ensures mathematical precision; speeds up drawing drastically; prevents tiny gaps or overlaps that ruin 3D extrusions later.
- **Cons:** Complex to implement (requires constant distance calculations for every mouse movement); can be annoying if the snap distance is too large and the user is trying to draw something very close to an existing object.

## 🥉 Feature Idea: Export & Sharing
Let users share their hard work.
- [x] Implement Export to PNG / PDF functionality
- [x] Implement Export to DXF format
- [x] Add "Share Project" capability (generate a view-only link)

**Real-Life Scenario:** A contractor finishes a plumbing diagram on site and needs to instantly text a PDF copy to the client for approval, or export a DXF file to send to a CNC routing machine.
- **Pros:** Makes the tool viable for professional workflows; allows collaboration with people who don't use the app.
- **Cons:** Generating proper DXF files from web graphics is notoriously difficult and requires strict adherence to legacy CAD specifications.

## 📐 Feature Idea: Measurement & Dimensioning Tools
Engineers and architects need to know exact sizes. We need tools to draw smart dimensions.
- [x] Implement an 'Aligned Dimension' tool (click two points, drag to place text)
- [x] Implement an 'Area Measurement' tool
- [x] Make dimension lines visually update when the associated objects are moved
- [x] Add units support (Metric vs Imperial)

**Real-Life Scenario:** An interior designer draws a room layout and needs to explicitly mark the wall length as exactly 12' 4" so the contractor knows how much drywall to order.
- **Pros:** Essential for creating actual construction documents; elevates the app from a simple drawing tool to an engineering tool.
- **Cons:** Tricky to implement scaling (what distance in pixels equals 1 meter?); requires complex text orientation and arrowhead rendering on the canvas.

## 🧱 Feature Idea: Symbol / Block Library
Drag and drop reusable components into the design.
- [x] Create a sidebar panel containing pre-built CAD symbols (doors, windows, electrical outlets, valves)
- [x] Implement drag-and-drop from the sidebar onto the canvas
- [x] Allow users to group their own drawn elements and save them as a custom symbol

**Real-Life Scenario:** An electrical engineer is designing a circuit diagram and needs to place 50 identical resistors. Instead of drawing them manually, they drag and drop the resistor symbol from the library 50 times.
- **Pros:** Saves massive amounts of time for repetitive tasks; creates standardization across drawings.
- **Cons:** We have to build and maintain the initial library of symbols; requires handling complex groups of grouped elements.

## ⌨️ Feature Idea: Power-User Command Line Interface (CLI)
AutoCAD veterans expect to be able to type commands quickly.
- [x] Expand the bottom `CommandBar` to accept text inputs
- [x] Map commands like `L` or `LINE` to activate the line tool
- [x] Allow typing coordinates to specify exact points (e.g. `@10,20` for relative, `100,100` for absolute)

**Real-Life Scenario:** A seasoned CAD drafter is recreating a schematic and doesn't want to move their mouse to click buttons. They just type `L` [Enter] `0,0` [Enter] `100,0` [Enter] to draw a perfectly straight line instantly.
- **Pros:** Unlocks lightning-fast workflows for professionals; creates a huge competitive advantage.
- **Cons:** Requires a robust command parser; tricky to intercept keystrokes without conflicting with regular typing (like naming a layer).
