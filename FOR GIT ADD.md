# 📋 Daily Git Tracking & Push Changelog (`FOR GIT ADD.md`)

> **Note**: This file is continuously updated whenever project files are created, modified, or deleted. Use this as your daily tracker for `git add`, `git commit`, and `git push origin main`.

---

## 🚀 Quick Commands (Copy & Paste)

### Option 1: Stage All Recent Collaboration, Annotation & Performance Files
```bash
# Stage backend upload routes, convert controller, thumbnail extractors & tests
git add backend/src/routes/uploadRoutes.ts backend/src/routes/convertRoutes.ts backend/src/controllers/convertController.ts backend/src/utils/cadThumbnailExtractor.ts backend/src/__tests__/upload.test.ts backend/src/__tests__/auth.test.ts backend/src/index.ts

# Stage frontend canvas, ribbon, redlining, CAD/SKP preview & comments
git add frontend/src/types/canvas.ts frontend/src/features/planner/utils/annotationMath.ts frontend/src/features/planner/utils/cadDocumentPreview.ts frontend/src/features/planner/utils/pdfConverter.ts frontend/src/features/planner/hooks/useCanvasState.ts frontend/src/features/planner/hooks/useCollaboration.ts frontend/src/features/planner/hooks/useAutoSave.ts frontend/src/components/canvas/CadCanvas.tsx frontend/src/components/canvas/DrawingLayer.tsx frontend/src/components/ribbon/RibbonMenu.tsx frontend/src/components/comments/CommentsSidebar.tsx frontend/src/components/layout/PlannerWorkspace.tsx frontend/src/components/layout/TopNavbar.tsx frontend/src/components/layout/ImportModal.tsx frontend/src/components/modals/UploadMediaModal.tsx frontend/vite.config.ts

# Stage documentation & performance architecture plans
git add REALTIME_COLLABORATION_PERFORMANCE_PLAN.md PUSH_NOTIFICATION_IMPLEMENTATION_PLAN.md USER_APPROVAL_IMPLEMENTATION_PLAN.md "FOR GIT ADD.md"

# Commit changes
git commit -m "feat(collab & annotate): real-time multi-user performance overhaul, universal binary CAD/SKP plan extraction, and image redlining toolset"

# Push to repository
git push origin main
```

### Option 2: Add All Changed Files at Once
```bash
git add .
git commit -m "feat: real-time collaboration performance optimization, binary asset upload, and topic-specific redlining tools"
git push origin main
```

---

## 📦 File Inventory by Component

### 1. Real-Time Collaboration & Binary Upload Engine
| Status | File Path | Description |
| :--- | :--- | :--- |
| `NEW` | `backend/src/routes/uploadRoutes.ts` | Dedicated `POST /api/v1/uploads/canvas-asset` endpoint using `multer` to store binary image assets directly in `backend/uploads/canvas/` with 100MB limit. |
| `NEW` | `backend/src/__tests__/upload.test.ts` | Integration tests for canvas asset uploads (validates multipart upload, 201 status, and static URL format). |
| `MODIFIED` | `backend/src/controllers/convertController.ts` | Extended conversion router to support `.skp` SketchUp 3D models alongside `.dwg`, `.dxf`, and `.skb`. |
| `MODIFIED` | `backend/src/index.ts` | Added static serving for `/uploads`, tuned Socket.IO buffer & ping intervals, and scoped canvas socket events to `project-${projectId}` rooms. |
| `MODIFIED` | `backend/src/__tests__/auth.test.ts` | Updated test expectations for `PENDING` user registration response. |

---

### 2. Frontend State, Delta Sync & Auto-Save
| Status | File Path | Description |
| :--- | :--- | :--- |
| `MODIFIED` | `frontend/src/features/planner/hooks/useCanvasState.ts` | Added `activeProjectId`, `activeTopicId`, `activeStampType`, `highlighterColor`, `highlighterWidth`, granular delta mutations (`addElement`, `removeElement`, `updateElement`), and restricted `elements-changed` broadcasting. |
| `MODIFIED` | `frontend/src/features/planner/hooks/useCollaboration.ts` | Scoped Socket.IO connection to `join-project` / `leave-project`, added listener for `element-added`, and scoped cursor tracking to project room. |
| `MODIFIED` | `frontend/src/features/planner/hooks/useAutoSave.ts` | Increased debounce delay to 2,000ms with payload deduplication (`lastSavedJsonRef`) to protect MySQL and Redis from redundant PUT requests. |
| `MODIFIED` | `frontend/src/features/planner/utils/pdfConverter.ts` | Added WebP Blob generation, canvas to compressed blob conversion, and `uploadCanvasAssetToServer` helper. |
| `NEW` | `frontend/src/features/planner/utils/cadDocumentPreview.ts` | High-resolution blueprint and 3D model sheet generator for `.dwg`, `.dxf`, `.skp`, `.skb`, and `.docx` binary files. |
| `MODIFIED` | `frontend/src/components/modals/UploadMediaModal.tsx` | Universal file uploader supporting `.dwg`, `.skp`, `.skb`, `.docx`, `.pdf`, and images with instant interactive preview sheet generation and binary upload. |
| `MODIFIED` | `frontend/src/components/layout/ImportModal.tsx` | Updated CAD Vector Geometry import modal to support `.skp` models alongside `.dwg` and `.dxf`. |

---

### 3. CAD Canvas, Redlining Tools & Image Annotation
| Status | File Path | Description |
| :--- | :--- | :--- |
| `NEW` | `frontend/src/features/planner/utils/annotationMath.ts` | Geometry generator for authentic AutoCAD-style scalloped Revision Cloud SVG paths (`generateCloudSvgPath`). |
| `MODIFIED` | `frontend/src/types/canvas.ts` | Extended `ToolType` with `'highlighter' | 'cloud' | 'stamp' | 'callout'`, added `topicId`, `parentImageId`, and `stampType` to `CanvasElement`. |
| `MODIFIED` | `frontend/src/components/ribbon/RibbonMenu.tsx` | Activated `Annotate` ribbon tab with Redline Pen, Fluorescent Highlighter (with color picker dropdown), Revision Cloud, Callout Leader, Text Notes, Dimensions, and Engineering Review Stamps dropdown. |
| `MODIFIED` | `frontend/src/components/canvas/CadCanvas.tsx` | In-progress drawing stays local in state, polyline finalizer (`finishPolyline`) with multi-point cleanup on double-click/Enter/Space/Escape/ToolSwitch, and drawing logic for highlighters, clouds, callouts, and stamps. |
| `MODIFIED` | `frontend/src/components/canvas/DrawingLayer.tsx` | Rendering branches for Highlighters, Revision Clouds, Callout Leaders, and Engineering Review Stamps, plus image pointer isolation (`listening: false` during draw mode). |
| `MODIFIED` | `frontend/src/components/comments/CommentsSidebar.tsx` | Displays count of linked markups per discussion card, auto-focuses topic context, and provides quick **Redline** and **Highlight** actions. |
| `MODIFIED` | `frontend/src/components/layout/PlannerWorkspace.tsx` | Passed `projectId` down to `<CadCanvas />`. |
| `MODIFIED` | `frontend/src/components/layout/TopNavbar.tsx` | Removed redundant "Import CAD" button in favor of unified "Upload File" workflow, updated upload tooltips, and auto-save debounce delay to 2,000ms. |

---

### 4. Database & Super Admin User Approval System
| Status | File Path | Description |
| :--- | :--- | :--- |
| `MODIFIED` | `backend/prisma/schema.prisma` | Added `SUPER_ADMIN` to `Role` enum, added `UserStatus` enum (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`), and user approval metadata fields. |
| `NEW` | `backend/src/middlewares/superAdminMiddleware.ts` | Security middleware requiring `SUPER_ADMIN` or `ADMIN` privileges. |
| `NEW` | `backend/src/controllers/adminController.ts` | Controllers for user approval, rejection with custom reason, role promotion, and user stats. |
| `NEW` | `backend/src/routes/adminRoutes.ts` | Admin REST routes mounted under `/api/v1/admin`. |
| `NEW` | `frontend/src/pages/AdminUsersPage.tsx` | Dedicated Super Admin User Approvals portal with live statistics, search & status tabs, and real-time Socket.io updates. |
| `NEW` | `frontend/src/components/layout/AdminRoute.tsx` | Route protection wrapper redirecting non-admin users to `/dashboard`. |
| `MODIFIED` | `frontend/src/pages/LoginPage.tsx` | Added requested role selector, post-registration pending confirmation card, and status-aware error banners. |
| `MODIFIED` | `frontend/src/pages/DashboardPage.tsx` | Added "🛡️ User Approvals" action button in dashboard header for Super Admins. |
| `MODIFIED` | `frontend/src/App.tsx` | Registered `/admin` and `/admin/users` routes protected by `<AdminRoute>`. |

---

### 5. Web Push & Notification Engine
| Status | File Path | Description |
| :--- | :--- | :--- |
| `NEW` | `backend/src/config/vapid.ts` | Web Push VAPID initialization module. |
| `NEW` | `backend/src/services/notificationService.ts` | Central notification dispatcher (MySQL logging, Socket.io broadcast, Web Push dispatch). |
| `NEW` | `backend/src/controllers/notificationController.ts` | Controllers for VAPID keys, push subscription, and notification lists. |
| `NEW` | `backend/src/routes/notificationRoutes.ts` | REST API routes under `/api/v1/notifications`. |
| `NEW` | `frontend/public/sw.js` | Service Worker handling background push notifications and CAD deep linking. |
| `NEW` | `frontend/src/features/notifications/store/useNotificationStore.ts` | Zustand store managing notifications and unread counters. |
| `NEW` | `frontend/src/components/notifications/NotificationBellDropdown.tsx` | Top bar notification bell with live unread badge and push promo banner. |
| `NEW` | `frontend/src/components/modals/NotificationSettingsModal.tsx` | Settings modal to configure desktop push, AI alerts, Messenger alerts, and audio tones. |

---

### 6. Documentation & Performance Plans
| Status | File Path | Description |
| :--- | :--- | :--- |
| `NEW` | `REALTIME_COLLABORATION_PERFORMANCE_PLAN.md` | Comprehensive architectural analysis of 5 root causes, 20-user scalability benchmarks, and universal binary/WebP ingestion pipeline for `.docs`, `.dwg`, `.skp`, `.pdf`, and images. |
| `NEW` | `PUSH_NOTIFICATION_IMPLEMENTATION_PLAN.md` | Architectural design document for Web Push and in-app notifications. |
| `NEW` | `USER_APPROVAL_IMPLEMENTATION_PLAN.md` | Architecture plan for Super Admin user registration review and approval workflow. |
| `MODIFIED` | `FOR GIT ADD.md` | Active Git tracking manifest and changelog. |

---

## 🏷️ Commit Message Template
```text
feat(collab & annotate): real-time multi-user performance overhaul, universal binary asset upload, and image redlining toolset

- Eliminate Base64 data bloat by adding POST /api/v1/uploads/canvas-asset and storing lightweight WebP image URLs (99.99% payload reduction)
- Isolate all Socket.IO canvas and cursor events to project-${projectId} rooms
- Implement conflict-free delta mutations (element-added, element-updated, element-removed) and stop 60 FPS full-array broadcasting
- Add robust polyline completion handler supporting double-click, Enter, Space, Escape, and tool switching
- Activate Annotate ribbon tab with Redline Pen, Fluorescent Highlighter, Revision Cloud (scalloped arcs), Callout Leaders, and Engineering Review Stamps
- Implement in-place image annotation with pointer event isolation
- Add Topic-Linked Discussions linking drawings directly to comment pins with quick Redline and Highlight actions
- Tune auto-save to 2,000ms debounce with payload deduplication to protect MySQL/Redis
```
