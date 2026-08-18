# ENG PLANNER - Errors, Bug Fixes & Troubleshooting Guide

---

## 1. Resolved Architectural Issues & Bug Fixes

This section documents all resolved bugs, root-cause analyses, and permanent architectural remedies implemented in the codebase.

---

### Issue 1: Canvas Element Deletion / Duplication Reverts on Page Refresh
- **Symptoms**: Deleting an uploaded file/image or duplicating elements worked in the UI, but pressing browser refresh (`F5`) caused the deleted elements to reappear and duplicates to disappear.
- **Root Cause**:
  1. `useAutoSave` used a long **2,000ms debounce delay**. When users pressed refresh within 1–2 seconds, the React unmount lifecycle cancelled the pending save timer (`clearTimeout`).
  2. The application had no `beforeunload` event handler to flush pending canvas updates before page teardown.
  3. `useCanvasState` was persisting `elements` globally in `localStorage` under `canvas-storage`, overriding database state with stale cached data across reloads.
- **Resolution**:
  - Reduced auto-save debounce to **400ms** in [`useAutoSave.ts`](file:///c:/wamp64/www/eng_planner/frontend/src/features/planner/hooks/useAutoSave.ts).
  - Added a `beforeunload` listener using `fetch(url, { keepalive: true })` with the JWT token, guaranteeing server delivery even during instantaneous page reloads.
  - Removed `elements` from global `localStorage` partialize so each project loads strictly from MySQL.
  - Added `isProjectLoaded` guard in [`PlannerWorkspace.tsx`](file:///c:/wamp64/www/eng_planner/frontend/src/components/layout/PlannerWorkspace.tsx) to prevent premature blank overwrites.

---

### Issue 2: MySQL Compound Unique Key Index Limitation
- **Symptoms**: `npx prisma db push` failed with `Specified key was too long; max key length is 1000 bytes`.
- **Root Cause**: In MySQL 8.x with `utf8mb4` encoding (4 bytes per char), Prisma's default `String` (`VARCHAR(191)` $\times 4 = 764$ bytes) across compound unique indexes (like `@@unique([channelId, userId])`) exceeded MySQL's 1000-byte index limit ($764 \times 2 = 1528$ bytes).
- **Resolution**:
  - Added explicit `@db.VarChar(100)` attributes on foreign key relation IDs in [`backend/prisma/schema.prisma`](file:///c:/wamp64/www/eng_planner/backend/prisma/schema.prisma) ($100 \times 4 \times 2 = 800$ bytes $\le 1000$ bytes).

---

### Issue 3: Redis `ECONNREFUSED` Error Loop (6,000+ logs/min)
- **Symptoms**: When Redis was not installed or running locally, the server flooded the terminal with aggressive `ECONNREFUSED 127.0.0.1:6379` errors, causing severe local performance degradation.
- **Root Cause**: Unhandled Redis reconnect loops on every API request.
- **Resolution**:
  - Replaced direct Redis calls with [`cacheService`](file:///c:/wamp64/www/eng_planner/backend/src/config/redis.ts).
  - Implemented a high-performance in-memory TTL `Map` fallback with exponential backoff on Redis reconnection attempts.

---

### Issue 4: Comment Deletion 500 Internal Server Error
- **Symptoms**: Deleting a spatial comment pin failed with HTTP 500 and `Foreign key constraint failed on CommentReply`.
- **Root Cause**: The Prisma schema lacked `onDelete: Cascade` on the `CommentReply.comment` relation, causing MySQL foreign key rejection when deleting comments with threaded replies.
- **Resolution**:
  - Updated `CommentReply` relation in `schema.prisma`:
    ```prisma
    comment Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
    ```

---

### Issue 5: Multiplayer Cursor Flooding & CPU Spikes
- **Symptoms**: High CPU utilization and network socket congestion when multiple users moved cursors simultaneously.
- **Root Cause**: `onPointerMove` emitted raw mouse coordinates on every screen pixel (120+ events/sec per user).
- **Resolution**:
  - Implemented 40ms (~25 FPS) timestamp-based throttling using `useRef` + `useCallback` in [`useCollaboration.ts`](file:///c:/wamp64/www/eng_planner/frontend/src/features/planner/hooks/useCollaboration.ts).

---

### Issue 6: React Konva Grid Re-Render Lag
- **Symptoms**: Panning and zooming large CAD blueprints suffered from frame drops.
- **Root Cause**: `GridLayer.tsx` rendered 200–400 individual React Konva `<Line>` components.
- **Resolution**:
  - Consolidated the entire coordinate grid into a single memoized custom `<Shape>` draw call with `listening={false}` in [`GridLayer.tsx`](file:///c:/wamp64/www/eng_planner/frontend/src/components/canvas/GridLayer.tsx).

---

### Issue 7: Base64 Image Decoding Lag on Canvas
- **Symptoms**: Re-rendering the canvas caused noticeable micro-stutters when large image plans or PDF pages were present.
- **Root Cause**: `new window.Image()` was re-instantiated and re-decoded on every render cycle.
- **Resolution**:
  - Added a global `imageCache = new Map<string, HTMLImageElement>()` in [`DrawingLayer.tsx`](file:///c:/wamp64/www/eng_planner/frontend/src/components/canvas/DrawingLayer.tsx), decoding images only once.

---

## 2. Common Operational Issues & Diagnostic Runbooks

### Diagnostic 1: "Cannot Connect to MySQL Database"
- **Error**: `PrismaClientInitializationError: Can't reach database server at localhost:3306`.
- **Steps to Resolve**:
  1. Verify WampServer is running and the icon in system tray is Green.
  2. Verify MySQL service is active on port `3306`.
  3. Ensure `DATABASE_URL` in `backend/.env` has the correct username and password (`root:@localhost:3306/eng_planner`).

---

### Diagnostic 2: "Unauthorized / 401 on API Requests"
- **Error**: `AxiosError: Request failed with status code 401`.
- **Steps to Resolve**:
  1. The user's JWT token has expired or is missing from `localStorage`.
  2. Log out and log back in at `http://localhost:3000/login`.
  3. Check that `localStorage.getItem('token')` contains a valid JWT string.

---

### Diagnostic 3: "Port 5005 or 3000 Already in Use"
- **Error**: `Error: listen EADDRINUSE: address already in use :::5005`.
- **Steps to Resolve (Windows PowerShell)**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5005).OwningProcess | Stop-Process -Force
  ```
