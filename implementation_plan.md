# Docker Containerization & System Deployment Manual Plan

This plan establishes a production-grade Docker container architecture and a comprehensive, publication-ready **System Deployment Manual (`SYSTEM_DEPLOYMENT_MANUAL.md`)** for the ENG PLANNER application.

---

## 1. System Architecture & Container Topology

The ENG PLANNER stack will be orchestrated using Docker Compose with four dedicated services:

1. **`frontend` (Reverse Proxy & Web Client)**:
   - Multi-stage build (`node:20-alpine` builder -> `nginx:alpine` runtime).
   - High-performance Nginx configuration handling:
     - React SPA static asset serving with gzip compression and client-side caching.
     - Single Page Application fallback routing (`try_files $uri $uri/ /index.html`).
     - Internal reverse proxy for `/api/` requests to the `backend` service (port 5005).
     - Full WebSocket upgrade support for `/socket.io/` real-time collaboration.
     - Extended upload body limit (500MB+) for high-resolution DXF, DWG, and PDF CAD drawing imports.
   - Exposed on port `80` (HTTP) / `443` (HTTPS ready) or configurable host port (default: `3000` or `80`).

2. **`backend` (API & Real-time Engine)**:
   - Multi-stage build (`node:20-alpine` builder with `prisma generate` and `tsc` -> lightweight production runner).
   - Healthcheck-aware entrypoint script (`docker-entrypoint.sh`) that waits for MySQL and Redis readiness before running `prisma db push` and launching Express + Socket.io.
   - Handles CAD parsing, AI engineering copilot (EngiAI), spatial pins, and multi-user room synchronization.
   - Internal container network access to MySQL and Redis.

3. **`mysql` (Database Tier)**:
   - Official `mysql:8.0` image with UTF-8 (`utf8mb4_unicode_ci`) configuration.
   - Persistent volume (`mysql_data`) for durability across container lifecycles.
   - Automated initialization hook using `/docker-entrypoint-initdb.d/` pointing to `eng_planner.sql` for instant bootstrap on clean runs.
   - Internal port `3306` (optionally exposed to host `3306` if configured).

4. **`redis` (Caching & Session Store Tier)**:
   - Official `redis:7-alpine` container providing high-throughput caching and pub/sub capabilities.
   - Persistent volume (`redis_data`).

---

## 2. Proposed Changes

### Configuration & Docker Infrastructure

#### [NEW] [docker-compose.yml](file:///c:/wamp64/www/eng_planner/docker-compose.yml)
- Root compose file defining `frontend`, `backend`, `mysql`, and `redis` services, custom bridge network, named volumes, health checks, restart policies, and environment bindings.

#### [NEW] [docker-compose.dev.yml](file:///c:/wamp64/www/eng_planner/docker-compose.dev.yml)
- Development override compose configuration with volume binds for live code reloading (nodemon backend & Vite HMR frontend).

#### [NEW] [.env.docker.example](file:///c:/wamp64/www/eng_planner/.env.docker.example) & [.env.example](file:///c:/wamp64/www/eng_planner/.env.example)
- Production-ready environment variable templates containing DB passwords, JWT secrets, port configs, and Redis URLs.

#### [NEW] [.dockerignore](file:///c:/wamp64/www/eng_planner/.dockerignore)
- Root dockerignore ignoring `.git`, `node_modules`, `dist`, logs, temporary CAD uploads, and test artifacts.

---

### Backend Service Containerization

#### [NEW] [backend/Dockerfile](file:///c:/wamp64/www/eng_planner/backend/Dockerfile)
- Multi-stage container definition:
  - Stage 1: Build stage (installs all dependencies, generates Prisma client, runs `tsc`).
  - Stage 2: Production runner (installs production dependencies only, copies Prisma client + compiled `dist`, adds non-root user).

#### [NEW] [backend/docker-entrypoint.sh](file:///c:/wamp64/www/eng_planner/backend/docker-entrypoint.sh)
- Robust startup script checking database connection readiness, auto-syncing Prisma schema, and starting the Node application.

#### [NEW] [backend/.dockerignore](file:///c:/wamp64/www/eng_planner/backend/.dockerignore)
- Excludes `node_modules`, `dist`, `.env`, `tmp/`, tests, and OS junk from backend docker builds.

---

### Frontend Service Containerization & Portability

#### [NEW] [frontend/Dockerfile](file:///c:/wamp64/www/eng_planner/frontend/Dockerfile)
- Multi-stage container definition:
  - Stage 1: Build stage (installs dependencies, executes `tsc && vite build`).
  - Stage 2: Nginx alpine image serving optimized static output with custom Nginx reverse proxy configuration.

#### [NEW] [frontend/nginx.conf](file:///c:/wamp64/www/eng_planner/frontend/nginx.conf)
- Nginx configuration with:
  - SPA routing fallback.
  - Proxy pass `/api/` -> `http://backend:5005/api/`.
  - Proxy pass `/socket.io/` -> `http://backend:5005/socket.io/` with `Upgrade` & `Connection` headers.
  - High `client_max_body_size 500M`.
  - Security headers & caching policies for static assets.

#### [NEW] [frontend/.dockerignore](file:///c:/wamp64/www/eng_planner/frontend/.dockerignore)
- Excludes `node_modules`, `dist`, `test-results`, `playwright-report`.

#### [MODIFY] [ShareProjectModal.tsx](file:///c:/wamp64/www/eng_planner/frontend/src/components/layout/ShareProjectModal.tsx)
- Replace hardcoded `http://localhost:5000/api/projects/...` with standard relative `/api/v1/projects/...` to ensure smooth reverse proxy routing in both Docker and standard environments.

#### [MODIFY] [ImportModal.tsx](file:///c:/wamp64/www/eng_planner/frontend/src/components/layout/ImportModal.tsx)
- Replace hardcoded `http://127.0.0.1:5005/api/v1/convert` with relative `/api/v1/convert`.

#### [MODIFY] [socket.ts](file:///c:/wamp64/www/eng_planner/frontend/src/features/planner/utils/socket.ts)
- Update default fallback from hardcoded `http://localhost:5005` to window origin when behind reverse proxy or fallback when `VITE_API_URL` is unset.

---

### Documentation

#### [NEW] [SYSTEM_DEPLOYMENT_MANUAL.md](file:///c:/wamp64/www/eng_planner/SYSTEM_DEPLOYMENT_MANUAL.md)
A comprehensive, production-grade deployment manual formatted in GitHub Markdown containing:
1. **System Architecture & Service Diagram**: Visual topology and network flows.
2. **Prerequisites & Hardware Sizing**: Recommended CPU, RAM, Disk, and Docker versions.
3. **Quick Start Guide**: Single-command startup with `docker compose up -d --build`.
4. **Environment Variables Reference**: Complete dictionary of all environment variables for backend, frontend, database, and caching.
5. **Database Management**: Schema initialization via `eng_planner.sql`, Prisma migrations, backup creation (`mysqldump`), and disaster recovery.
6. **Development vs. Production Workflows**: Hot-reload local compose setup vs. hardened production compose.
7. **Networking & Nginx Reverse Proxy**: Route matching, WebSocket upgrade protocols, SSL certificate termination with Certbot/Let's Encrypt.
8. **Cloud & VPS Deployment (Ubuntu / Debian / AWS EC2 / DigitalOcean)**: Complete step-by-step walkthrough from clean OS to running production system with systemd auto-restart.
9. **Troubleshooting, Logs & Health Checks**: Diagnostic cheatsheet for port conflicts, database connectivity, and common errors.

---

## 3. Verification Plan

### Automated Verification
- Verify Docker configuration files syntax.
- Verify frontend TypeScript & build via `npm run build` in `frontend/`.
- Verify backend TypeScript compilation via `npm run build` in `backend/`.
- Verify shell script permissions and line endings (LF instead of CRLF for Alpine Linux compatibility).

### Manual & Deployment Verification
- Verify `.env.example` has all required fields without exposing sensitive secrets.
- Review `SYSTEM_DEPLOYMENT_MANUAL.md` for clarity, completeness, and accuracy.
