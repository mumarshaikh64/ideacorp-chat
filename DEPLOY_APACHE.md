# 🚀 VPS Deployment Guide with Apache2 (Ubuntu / Debian)

This guide shows you how to deploy **IdeaCrop Real-Time Chat Platform** on an Ubuntu/Debian VPS using **Apache2, PM2, and Let's Encrypt Free SSL**.

---

## 🛠 Step 1: Install Apache2, Modules & Certbot

Connect to your VPS via SSH:
```bash
ssh root@YOUR_SERVER_IP
```

Install Apache2, Certbot for Apache, and Node.js:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y apache2 certbot python3-certbot-apache curl git

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
```

---

## 🔌 Step 2: Enable Required Apache Modules

Apache requires specific proxy modules to handle Node.js and real-time WebSockets (`proxy_wstunnel` is required for Socket.IO):

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod rewrite
```

Restart Apache to activate modules:
```bash
sudo systemctl restart apache2
```

---

## 📂 Step 3: Setup Project Directory & Build

```bash
sudo mkdir -p /var/www/ideacrop-chat
sudo chown -R $USER:$USER /var/www/ideacrop-chat
cd /var/www/ideacrop-chat

# Clone or upload your code here
git clone <YOUR_GIT_REPO_URL> .

# Install dependencies and build frontend
npm install
npm run build
```

---

## 🔐 Step 4: Configure Production Environment (`.env`)

```bash
cp backend/.env.production.example backend/.env
nano backend/.env
```

Ensure the following variables are set:
```ini
PORT=5001
NODE_ENV=production

# Your Domain (replace with your domain)
API_BASE_URL=https://chat.yourdomain.com
CLIENT_BASE_URL=https://chat.yourdomain.com

DB_FALLBACK_SQLITE=true
```
Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

Run migrations:
```bash
npm run migrate
npm run seed
```

---

## 🚀 Step 5: Start Node.js Backend with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Verify it is running:
```bash
pm2 status
curl http://127.0.0.1:5001/api/health
```

---

## 🌐 Step 6: Create Apache VirtualHost Configuration

Create a new site configuration file:
```bash
sudo nano /etc/apache2/sites-available/ideacrop-chat.conf
```

Paste the following configuration (replace `chat.yourdomain.com` with your domain):

```apache
<VirtualHost *:80>
    ServerName chat.yourdomain.com
    ServerAlias www.chat.yourdomain.com

    ProxyPreserveHost On
    ProxyRequests Off

    # Enable WebSockets for Socket.IO Real-time Chat
    RewriteEngine On
    RewriteCond %{REQUEST_URI}  ^/socket.io            [NC]
    RewriteCond %{QUERY_STRING} transport=websocket    [NC]
    RewriteRule /(.*)           ws://127.0.0.1:5001/$1 [P,L]

    # Proxy WebSocket connections
    ProxyPass /socket.io/ ws://127.0.0.1:5001/socket.io/
    ProxyPassReverse /socket.io/ ws://127.0.0.1:5001/socket.io/

    # Proxy standard HTTP / API / Static Frontend Requests
    ProxyPass / http://127.0.0.1:5001/
    ProxyPassReverse / http://127.0.0.1:5001/

    # Forwarded headers
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"

    # Persistent connection timeout for WebSockets
    ProxyTimeout 86400

    ErrorLog ${APACHE_LOG_DIR}/ideacrop_error.log
    CustomLog ${APACHE_LOG_DIR}/ideacrop_access.log combined
</VirtualHost>
```

Enable the site and disable default site:
```bash
sudo a2dissite 000-default.conf
sudo a2ensite ideacrop-chat.conf
sudo apache2ctl configtest # Should say "Syntax OK"
sudo systemctl reload apache2
```

---

## 🔒 Step 7: Enable Free SSL (HTTPS) with Certbot for Apache

Run Certbot:
```bash
sudo certbot --apache -d chat.yourdomain.com
```

- Enter your email address.
- Agree to terms.
- Select option to redirect HTTP traffic to HTTPS (Option 2).

Certbot will automatically configure the SSL VirtualHost (`/etc/apache2/sites-available/ideacrop-chat-le-ssl.conf`) and reload Apache!

Allow firewall ports:
```bash
sudo ufw allow 'Apache Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## ✅ Step 8: Test Live Deployment

Open your browser and visit:
```
https://chat.yourdomain.com
```

- Real-time WebSockets and single-port frontend serving will run seamlessly through Apache2!
- Default Staff Logins:
  - **Admin**: `admin@ideacorp.com` / `Admin@123`
  - **Supervisor**: `supervisor@ideacorp.com` / `Super@123`
  - **Agent**: `agent@ideacorp.com` / `Agent@123`
