# ENG PLANNER - Standard Operating Procedure (SOP)

---

## 1. Prerequisites & Environment Setup

### System Requirements
- **Node.js**: v18.x or v20.x LTS
- **Package Manager**: `npm` v9+ or `yarn` v1.22+
- **Database Server**: MySQL 8.x / MariaDB (e.g. WampServer 64-bit on Windows or Docker MySQL)
- **Optional In-Memory Cache**: Redis v6+ (System includes automatic in-memory TTL Map fallback if Redis is unavailable)

### Environment Configuration Files

#### Backend (`backend/.env`)
```env
PORT=5005
NODE_ENV=development
DATABASE_URL="mysql://root:@localhost:3306/eng_planner?schema=public"
JWT_SECRET="super-secret-engineer-jwt-key-2026"
JWT_EXPIRES_IN="7d"
REDIS_URL="redis://localhost:6379"
GEMINI_API_KEY="" # Optional: EngiAI copilot uses built-in CAD intelligence fallback if omitted
```

#### Frontend (`frontend/vite.config.ts`)
- Configured with proxy forwarding `/api` requests to `http://localhost:5005`.

---

## 2. Starting the Application

### Step 1: Initialize Database
1. Ensure WampServer or MySQL is running on port `3306`.
2. Navigate to `backend` directory and push database schema:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   ```

### Step 2: Launch Backend Server
In a terminal at `backend/`:
```bash
npm run dev
```
*The backend starts at `http://localhost:5005`.*

### Step 3: Launch Frontend Development Server
In a separate terminal at `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
*The frontend starts at `http://localhost:3000`.*

---

## 3. Database Management & Migrations

### Applying Schema Modifications
When updating `backend/prisma/schema.prisma`:
1. Modify models or add fields.
2. Run schema push and client generation:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
3. Restart the backend process to pick up the generated Prisma types.

### Exporting & Importing Database Backups (phpMyAdmin / SQL Dump)
1. **Export**:
   - Open phpMyAdmin at `http://localhost/phpmyadmin/`.
   - Select database `eng_planner`.
   - Click **Export** $\rightarrow$ Format: **SQL** $\rightarrow$ **Go**.
   - Save file as `eng_planner.sql`.
2. **Import**:
   - Create database `eng_planner` (Collation: `utf8mb4_unicode_ci`).
   - Click **Import** $\rightarrow$ Choose `eng_planner.sql` $\rightarrow$ **Go**.

---

## 4. Running Automated Tests & Load Simulations

### A. Backend Unit & Integration Tests
Runs all 5 Jest test suites covering authentication, project storage, comment threads, channel messaging, and socket rooms:
```bash
cd backend
npm test
```

### B. 20-Concurrent-User Load & Stress Simulation
Simulates 20 engineers actively chatting, querying `@ai`, moving multiplayer cursors, and synchronizing drawing pins:
```bash
cd backend
npx ts-node scripts/simulate20UsersGroupMessenger.ts
```

### C. Database Persistence Verification Test
Simulates drawing creation, image uploads, duplication, and keyboard `Delete` actions with immediate HTTP reloads:
```bash
cd backend
npx ts-node scripts/testPersistence.ts
```

---

## 5. Production Build & Deployment SOP

### Building the Frontend
```bash
cd frontend
npm run build
```
The optimized bundle is output to `frontend/dist/`.

### Building the Backend
```bash
cd backend
npm run build
```
Compiled JavaScript files are output to `backend/dist/`.

### Running in Production Mode
1. Serve the backend with PM2 or Node:
   ```bash
   NODE_ENV=production node dist/index.js
   ```
2. Configure Nginx / Apache as a reverse proxy:
   - Route `/api` and `/socket.io` to `http://localhost:5005`.
   - Serve static frontend assets from `frontend/dist/` with SPA routing (`try_files $uri /index.html`).

---

## 6. Developer Guidelines

### Adding a New CAD Entity / Tool
1. **Define Element Type**: Update `ToolType` in `frontend/src/types/canvas.ts`.
2. **Handle Drafting Events**: In `frontend/src/components/canvas/CadCanvas.tsx`, add mouse down, move, and up handling for the new tool.
3. **Render Geometry**: In `frontend/src/components/canvas/DrawingLayer.tsx`, add the corresponding React Konva shape element (e.g. `<Rect>`, `<Path>`, `<Circle>`).
4. **Wire Ribbon UI**: Add the tool icon button to `frontend/src/components/ribbon/RibbonMenu.tsx`.

### Extending the EngiAI Copilot
1. Locate `backend/src/controllers/chatController.ts`.
2. In `sendMessage`, extend the `context` prompt builder to supply relevant CAD dimensions, element counts, or comment threads.
3. Update fallback prompt responses or fine-tune Gemini system instructions.
