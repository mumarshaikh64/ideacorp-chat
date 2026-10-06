# 🚀 VPS Production Deployment Guide (Ubuntu / Debian)

This guide walks you through deploying **IdeaCrop SMS-to-Chat Platform** on an Ubuntu/Debian VPS (DigitalOcean, AWS EC2, Contabo, Hetzner, etc.) using **Node.js, PM2, Nginx, and Free Let's Encrypt SSL**.

---

## 📋 Prerequisites
- A VPS with Ubuntu 22.04 LTS or 24.04 LTS
- Root or sudo access
- A Domain or Subdomain pointing to your VPS IP address (e.g., `A` record pointing `chat.yourdomain.com` -> `YOUR_SERVER_IP`)

---

## 🛠 Step 1: Initial Server Setup & Packages

Connect to your VPS via SSH:
```bash
ssh root@YOUR_SERVER_IP
```

Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx
```

Install **Node.js 20 LTS**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Should show v20.x.x
```

Install **PM2** (Process Manager):
```bash
sudo npm install -g pm2
```

*(Optional but Recommended)* Install **Redis**:
```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

*(Optional)* Install **PostgreSQL**:
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "CREATE DATABASE ideacrop_chat OWNER postgres;"
```
*(Note: If you do not install PostgreSQL, the app will automatically run on the built-in SQLite fallback).*

---

## 📂 Step 2: Clone or Upload the Codebase

Navigate to `/var/www` or `/home`:
```bash
sudo mkdir -p /var/www/ideacrop-chat
sudo chown -R $USER:$USER /var/www/ideacrop-chat
cd /var/www/ideacrop-chat
```

Upload your files via Git, SCP, or Rsync:
```bash
# If using git:
git clone <YOUR_GIT_REPO_URL> .
```

---

## ⚙️ Step 3: Install Dependencies & Build Frontend

Inside `/var/www/ideacrop-chat`:
```bash
# 1. Install root, backend, and frontend dependencies
npm install

# 2. Build the production React frontend bundle
npm run build
```

---

## 🔐 Step 4: Configure Production Environment

Copy the example production environment file:
```bash
cp backend/.env.production.example backend/.env
nano backend/.env
```

Update the following values in `backend/.env`:
```ini
PORT=5001
NODE_ENV=production

# Put your domain here (with https://)
API_BASE_URL=https://chat.yourdomain.com
CLIENT_BASE_URL=https://chat.yourdomain.com

# Database (PostgreSQL credentials or leave fallback SQLite enabled)
DB_FALLBACK_SQLITE=true

# Security Secrets (generate random long strings)
JWT_SECRET=put_a_very_long_secure_secret_here_32chars
CHAT_TOKEN_SECRET=put_another_secure_secret_here_32chars

# Meta WhatsApp credentials (if using live WhatsApp API)
META_WHATSAPP_PHONE_NUMBER_ID=1341183065744312
META_WHATSAPP_ACCESS_TOKEN=your_token_here
```
Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

Run database migrations and initial seed:
```bash
npm run migrate
npm run seed
```

---

## 🚀 Step 5: Start with PM2

Start the application with PM2:
```bash
pm2 start ecosystem.config.js
```

Save the process list and setup autostart on VPS reboot:
```bash
pm2 save
pm2 startup
# (Copy and run the command printed by pm2 startup if prompted)
```

Useful PM2 commands:
- `pm2 status` - View running processes
- `pm2 logs ideacrop-chat` - View real-time server logs
- `pm2 restart ideacrop-chat` - Restart application

---

## 🌐 Step 6: Configure Nginx (Reverse Proxy & WebSockets)

Create a new Nginx site configuration:
```bash
sudo nano /etc/nginx/sites-available/ideacrop-chat
```

Paste the following configuration (replace `chat.yourdomain.com` with your domain):
```nginx
server {
    listen 80;
    server_name chat.yourdomain.com; # Replace with your domain

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;

        # WebSocket support (Crucial for Socket.IO Real-time Chat)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for persistent WebSockets
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable the site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/ideacrop-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Step 7: Enable Free SSL (HTTPS) with Certbot

Ensure your domain DNS points to this server IP, then run:
```bash
sudo certbot --nginx -d chat.yourdomain.com
```

Certbot will automatically configure SSL certificates and HTTPS redirect.

Allow firewall traffic:
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## ✅ Step 8: Verify Live Deployment

Open your browser and navigate to:
```
https://chat.yourdomain.com
```

- Login with default credentials:
  - **Admin**: `admin@ideacorp.com` / `Admin@123`
  - **Supervisor**: `supervisor@ideacorp.com` / `Super@123`
  - **Agent**: `agent@ideacorp.com` / `Agent@123`
- Send SMS / WhatsApp Invite links and test real-time chat!
