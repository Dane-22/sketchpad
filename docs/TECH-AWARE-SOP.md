# Sketchpad System
## Technical Standard Operating Procedure (SOP)

| Version | Date | Description |
| :--- | :--- | :--- |
| 1.0.0 | August 2026 | Initial Release |

---

## Table of Contents
1. [User Provisioning & Roles](#1-user-provisioning--roles)
2. [System Monitoring](#2-system-monitoring)
3. [Data Integrity & Backups](#3-data-integrity--backups)
4. [Troubleshooting](#4-troubleshooting)

---

## 1. User Provisioning & Roles

The Sketchpad System utilizes a strict role-based access control (RBAC) system defined in the Prisma schema.

### Roles
- `SUPER_ADMIN`: Full access to system configuration and all projects.
- `ADMIN`: Can manage users and global project settings.
- `ARCHITECT`: Lead technical role with elevated permissions for project canvas manipulation.
- `ENGINEER`: Standard technical role for drafting and commenting.

### Account Creation Approval
When a new user registers, their `status` is automatically set to `PENDING`. They cannot access the application until their status is escalated to `APPROVED`.
1. **Admin Action:** An `ADMIN` or `SUPER_ADMIN` must review the user queue.
2. **Database Update:** Approving a user transitions `User.status` to `APPROVED`, populates `User.approvedAt` with the current timestamp, and logs the `ADMIN`'s ID in `User.approvedById`.
3. **Rejection:** If rejected, `User.status` is set to `REJECTED`, and the `User.rejectionReason` text field must be populated.

## 2. System Monitoring

Maintaining high availability for real-time collaboration requires monitoring several distinct services:

- **MySQL Database:** Monitor the Prisma connection pool. Ensure the database can handle heavy write loads from chat messages and periodic canvas state auto-saves.
- **Redis Cache:** Monitor memory usage. Redis is crucial for pub/sub message brokering between Socket.io instances if horizontally scaled.
- **WebSocket Server:** Monitor Socket.io connection drop rates and latency. Latency spikes above 150ms will cause noticeable rubber-banding on collaborative pointers.

## 3. Data Integrity & Backups

The core intellectual property of the projects resides within the `Project.canvasData` field.

- **JSON Blobs:** The canvas state is stored as a massive serialized JSON object. Ensure database configurations (like MySQL `max_allowed_packet`) are large enough to accept multi-megabyte JSON payloads.
- **Backups:** Perform nightly snapshots of the MySQL database. Given the rapid mutation rate of `canvasData`, point-in-time recovery (PITR) should be enabled on the database cluster.

## 4. Troubleshooting

### DXF Import Failures
If the `dxf-parser` service crashes during an upload:
1. Verify the DXF file version (AutoCAD 2018 or newer is recommended).
2. Check for unsupported entity types (like proprietary 3D solids or unexploded blocks). Have the user "explode" all blocks in their native CAD software and re-export.

### Real-time Sync Disconnects
If users report that pointers or chat messages aren't syncing:
1. Verify the WebSocket connection is upgrading from HTTP long-polling successfully. Check proxy configurations (e.g., Nginx) for proper `Upgrade` header passing.
2. If horizontally scaled, ensure the Redis adapter is properly connecting all Socket.io nodes.
