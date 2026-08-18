# ENG PLANNER - Server Deployment Manual

A complete, step-by-step production deployment and operations guide for **ENG PLANNER** on Ubuntu Linux (Target Server: `72.62.254.60` running Ubuntu 24.04 LTS).

---

## 1. Quick Deployment Checklist

| Step | Action | Command |
| :--- | :--- | :--- |
| **1** | SSH into server | `ssh root@72.62.254.60` |
| **2** | Install Docker | Run the Docker installer script below |
| **3** | Clone repository | `git clone https://github.com/Dane-22/sketchpad.git /var/www/eng_planner` |
| **4** | Configure environment | `cd /var/www/eng_planner && cp .env.docker.example .env` |
| **5** | Launch stack | `docker compose up -d --build` |
| **6** | Verify & Access | Open `http://72.62.254.60` in your browser |

---

## 2. Step-by-Step Server Setup

### Step 2.1: Connect to Your Server
Open PowerShell or your terminal and run:
```bash
ssh root@72.62.254.60
```

---

### Step 2.2: Install Docker & Docker Compose on Ubuntu 24.04
Run this complete block to install the latest official Docker Engine and Docker Compose plugin:

```bash
# 1. Update system packages
apt update && apt upgrade -y

# 2. Install prerequisites
apt install -y ca-certificates curl gnupg lsb-release git ufw

# 3. Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# 4. Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Install Docker & Compose plugin
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. Enable and start Docker service
systemctl enable docker
systemctl start docker

# 7. Verify installation
docker --version
docker compose version
```

---

### Step 2.3: Configure Server Firewall (UFW)
Secure your server while allowing web traffic:
```bash
# Allow SSH (Important: Do not skip to avoid getting locked out)
ufw allow 22/tcp

# Allow HTTP and HTTPS web traffic
ufw allow 80/tcp
ufw allow 443/tcp

# Enable Firewall
ufw --force enable
ufw status
```

---

## 3. Application Deployment

### Step 3.1: Clone the Project
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Dane-22/sketchpad.git eng_planner
cd /var/www/eng_planner
```

---

### Step 3.2: Create and Configure Environment Variables
Create your production `.env` file from the provided template:
```bash
cp .env.docker.example .env
```

*(Optional)* If you wish to customize passwords or JWT secrets:
```bash
nano .env
```
*(Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit)*

#### Environment Variables Breakdown
```ini
# Environment Mode
NODE_ENV=production
PORT=5005

# Database Configuration
MYSQL_ROOT_PASSWORD=eng_root_supersecret_change_me
MYSQL_DATABASE=eng_planner
MYSQL_USER=eng_user
MYSQL_PASSWORD=eng_db_password_change_me
MYSQL_HOST=mysql
MYSQL_PORT=3306

DATABASE_URL=mysql://eng_user:eng_db_password_change_me@mysql:3306/eng_planner

# Exposed Host Ports
HOST_HTTP_PORT=80
HOST_DB_PORT=3306

# Redis Cache
REDIS_URL=redis://redis:6379

# JWT Authentication Secret
JWT_SECRET=super_secret_jwt_key_replace_with_random_string
JWT_EXPIRES_IN=7d

# Optional AI Engineering Copilot
GEMINI_API_KEY=
```

---

### Step 3.3: Launch the Full Docker Stack
Run the single command to build and launch all 4 services (Frontend Nginx, Backend Node.js, MySQL 8.0, Redis 7):

```bash
docker compose up -d --build
```

---

### Step 3.4: Verify Container Health
Check running services:
```bash
docker compose ps
```

You should see 4 active containers:
- `eng_planner_frontend` (Status: Up, Port 80)
- `eng_planner_backend` (Status: Up, Port 5005 internal)
- `eng_planner_mysql` (Status: Up / healthy, Port 3306)
- `eng_planner_redis` (Status: Up / healthy, Port 6379)

View live logs to confirm startup:
```bash
docker compose logs -f
```
*(Press `Ctrl+C` to exit log streaming)*

Now open **`http://72.62.254.60`** in your browser to start using ENG PLANNER!

---

## 4. Database Operations & Backups

### 4.1 Automatic Initial Database Loading
Upon first run, MySQL automatically executes `eng_planner.sql`, setting up all tables, users, CAD projects, spatial comments, and messenger channels.

### 4.2 Creating Live Backups (`mysqldump`)
To export a full database backup at any time:
```bash
docker compose exec -T mysql mysqldump -u root -peng_root_supersecret_change_me eng_planner > /var/www/eng_planner/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 4.3 Restoring from a SQL Backup
To restore a backup into the running database:
```bash
docker compose exec -T mysql mysql -u root -peng_root_supersecret_change_me eng_planner < /var/www/eng_planner/backup_filename.sql
```

### 4.4 Syncing Prisma Schema Changes
If you update database models in `schema.prisma`:
```bash
docker compose exec backend npx prisma db push
```

---

## 5. Domain & Free SSL Certificate (HTTPS)

To attach a domain (e.g. `planner.yourdomain.com`) with a free SSL certificate:

### Step 5.1: Point DNS
In your domain provider (Cloudflare, GoDaddy, Namecheap, etc.), add an **A record**:
- **Type**: `A`
- **Name**: `@` (or `planner`)
- **IPv4 Address**: `72.62.254.60`

---

### Step 5.2: Configure Host Nginx & Certbot
1. Install host Nginx and Certbot:
```bash
apt install -y nginx certbot python3-certbot-nginx
```

2. Change `HOST_HTTP_PORT` in `/var/www/eng_planner/.env` to `8080`:
```ini
HOST_HTTP_PORT=8080
```
Recreate the frontend container:
```bash
cd /var/www/eng_planner
docker compose up -d --force-recreate frontend
```

3. Create Nginx site config: `/etc/nginx/sites-available/eng_planner.conf`
```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

4. Enable site and generate SSL certificate:
```bash
ln -s /etc/nginx/sites-available/eng_planner.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 6. Auto-Start on Server Reboot (Systemd Service)

Ensure your ENG PLANNER stack boots automatically whenever the server restarts:

1. Create service unit file:
```bash
nano /etc/systemd/system/eng-planner.service
```

2. Paste this content:
```ini
[Unit]
Description=ENG PLANNER Container Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/var/www/eng_planner
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

3. Enable the service:
```bash
systemctl daemon-reload
systemctl enable eng-planner.service
```

---

## 7. How to Deploy Updates (CI/CD)

Whenever you push new features or fixes to GitHub:

```bash
cd /var/www/eng_planner

# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart containers
docker compose up -d --build

# 3. Clean unused build cache
docker image prune -f
```

---

## 8. Troubleshooting & Diagnostics

### Common Diagnostic Commands
```bash
# Check status of all containers
docker compose ps

# View real-time logs of all services
docker compose logs -f

# View logs of a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
docker compose logs -f redis

# Restart a specific service
docker compose restart backend
docker compose restart frontend

# Enter backend container terminal
docker compose exec backend sh

# Access MySQL CLI directly
docker compose exec mysql mysql -u eng_user -p eng_planner
```

### FAQs

1. **Error: `bind: address already in use` for Port 80**
   - Another web server (like Apache or standalone Nginx) is running on the host.
   - Run `systemctl stop apache2 && systemctl disable apache2` or change `HOST_HTTP_PORT=8080` in `.env`.

2. **Can't upload large DXF or DWG files?**
   - Nginx is pre-configured with `client_max_body_size 500M`. Make sure your reverse proxy / Cloudflare also allows 500MB+ uploads.

3. **Real-time multiplayer cursor or chat not syncing?**
   - Check WebSocket connection in browser DevTools Network tab (`/socket.io/`). Ensure `Upgrade` headers are forwarded.
