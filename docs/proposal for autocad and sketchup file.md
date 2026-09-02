# Proposal: High-Resolution Native Support for AutoCAD & SketchUp Files

## 1. The Current Problem
Currently, when a user uploads a `.dwg`, `.dxf`, or `.skp` file, the app extracts the low-resolution thumbnail embedded inside the file (usually 256x256 pixels) and places it on the canvas. When users zoom in to read dimensions or annotations, the image becomes extremely blocky and unreadable. 

While the frontend has existing code to parse DXF vectors into native canvas lines (`processParsedDXF`), this logic is currently being skipped due to an early `return` in the preview upload flow.

## 2. Proposed Solutions for AutoCAD (.dwg / .dxf)

### Option A: Native Vector Rendering (Recommended)
**How it works:** 
We fix the early `return` bug in `ProjectMessengerWidget.tsx`. When a DWG/DXF is uploaded, it is sent to the `/api/v1/convert` endpoint. The backend converts the DWG to DXF (if necessary) and parses it into JSON geometry. The frontend then uses the existing `processParsedDXF` function to draw actual `Konva.Line` elements on the canvas.
*   **Pros:** Infinite zoom resolution. Users can potentially click on individual CAD lines, snap to endpoints, or toggle CAD layers directly in the web app.
*   **Cons:** Very large CAD files with hundreds of thousands of lines might cause the browser canvas to lag if not optimized.

### Option B: Backend High-Res Rasterization
**How it works:** 
When the DWG is uploaded, a backend service (like LibreCAD or a headless CAD engine) converts the CAD file into a high-resolution PDF or WebP image, which is then sent back to the frontend.
*   **Pros:** Very predictable browser performance (it's just an image). Perfect visual match to how the CAD file prints.
*   **Cons:** Requires installing extra dependencies on the backend server. The user cannot interact with individual CAD lines.

---

## 3. Proposed Solutions for SketchUp (.skp)

Unlike 2D CAD lines, `.skp` files contain full 3D geometry which cannot be easily drawn on a 2D Konva canvas.

### Option A: Server-Side 2D Snapshot
**How it works:**
We configure a backend worker to open the `.skp` file, set the camera to a standard top-down (Plan) parallel projection, and render a high-resolution 2D WebP image. This image is sent to the frontend.
*   **Pros:** Fits perfectly into the existing 2D canvas workflow. Easy for users to markup and redline over the top.
*   **Cons:** Complex backend setup required to render 3D files headlessly.

### Option B: Integrated 3D WebGL Viewer
**How it works:**
Instead of drawing the SketchUp file on the 2D canvas, we add a "View 3D Model" button. Clicking this opens a floating WebGL window (using Three.js) where the user can orbit, pan, and walk through the actual 3D model.
*   **Pros:** Incredible user experience. Allows the team to do virtual walkthroughs of the space.
*   **Cons:** Significant development effort. Requires converting SKP to a web-friendly format like glTF on the backend.

---

## Next Steps
If you'd like to proceed, I recommend we start with **AutoCAD Option A** since the vector parsing code is already partially written in your frontend. We can simply remove the bypass, test the vector rendering, and optimize it. 

Let me know how you'd like to proceed!
