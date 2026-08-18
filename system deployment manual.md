# SYSTEM DEPLOYMENT MANUAL

> This manual is also available at [SYSTEM_DEPLOYMENT_MANUAL.md](file:///c:/wamp64/www/eng_planner/SYSTEM_DEPLOYMENT_MANUAL.md).

---

## 1. System Architecture & Topology

**ENG PLANNER** is structured as an enterprise multi-tier microservice architecture orchestrated via Docker Compose:

```
                                  [ Client Browser ]
                                          |
                                          |  HTTP:80 / HTTPS:443
                                          v
+---------------------------------------------------------------------------------------+
|  FRONTEND CONTAINER (Nginx Alpine Reverse Proxy & Web Server)                          |
|                                                                                       |
|  - Serves compiled React 18 + Vite SPA bundle (/usr/share/nginx/html)                 |
|  - Handles SPA client-side routing fallback (try_files $uri $uri/ /index.html)        |
|  - Caches static CSS/JS/SVG assets with gzip compression                              |
|  - Allows CAD blueprint uploads up to 500MB (client_max_body_size 500M)                |
+-----------------------------------+---------------------------------------------------+
                                    |
          Internal Docker Network   | (eng_network)
                                    v
+---------------------------------------------------------------------------------------+
|  BACKEND CONTAINER (Node.js 20 + Express + Socket.io + Prisma Engine)                 |
|                                                                                       |
|  - REST API Engine mounted at /api/v1                                                 |
|  - Real-Time Collaborative Canvas & Messenger (WebSocket /socket.io/)                 |
|  - CAD Parsing & Vectorization Engine (DXF / DWG / PDF)                               |
|  - EngiAI Copilot Integration                                                         |
+-------------------+-----------------------------------------------+-------------------+
                    |                                               |
                    v                                               v
+---------------------------------------+       +---------------------------------------+
|  MYSQL CONTAINER (MySQL 8.0)          |       |  REDIS CONTAINER (Redis 7 Alpine)     |
|                                       |       |                                       |
|  - Relational Database Engine         |       |  - High-throughput In-Memory Cache    |
|  - Character Set: utf8mb4_unicode_ci  |       |  - Real-time Pub/Sub Collaboration    |
|  - Persistent Volume: mysql_data      |       |  - Persistent Volume: redis_data      |
|  - Auto-seeded via eng_planner.sql    |       +---------------------------------------+
+---------------------------------------+
```

---

## 2. Quick Start on Ubuntu 24.04 Server (`72.62.254.60`)

### Step 1: Connect to Server
```bash
ssh root@72.62.254.60
```

### Step 2: Install Docker & Docker Compose
```bash
apt update && apt install -y ca-certificates curl gnupg lsb-release git ufw

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker
```

### Step 3: Clone Project & Configure Environment
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Dane-22/sketchpad.git eng_planner
cd eng_planner

cp .env.docker.example .env
nano .env  # Edit your passwords & JWT secret
```

### Step 4: Run Single-Command Deployment
```bash
docker compose up -d --build
```

### Step 5: Verify Deployment
```bash
docker compose ps
docker compose logs -f
```

---

## 3. Detailed Documentation & Reference

For the comprehensive deployment guide including SSL/TLS setup, Certbot certificates, automated backups, disaster recovery, and systemd service creation, see **[SYSTEM_DEPLOYMENT_MANUAL.md](file:///c:/wamp64/www/eng_planner/SYSTEM_DEPLOYMENT_MANUAL.md)**.
