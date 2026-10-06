# IdeaCrop Real-Time SMS-to-Chat Telecom Support Platform

A production-ready, enterprise-grade real-time SMS-to-Chat customer support platform engineered for telecom sales and support. Sales agents dispatch secure SMS invitations to customer mobile numbers, which open a lightweight, mobile-first live WebSocket chat directly in the browser—with **no login or app installation required**. The platform features real-time messaging, typing indicators, read receipts, seamless agent-to-agent live transfers, auto-assignment routing, role-based access control (RBAC), and a responsive Admin Dashboard.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Admin / Agent Dashboard   | (React + Tailwind + Zustand)
                      |   Authenticated via JWT     |
                      +--------------+--------------+
                                     |
                       REST API +    |    Socket.IO (Authenticated)
                       Role Guards   |    [agent:status, chat:transfer, chat:message]
                                     v
                      +-----------------------------+
                      |   Node.js + Express API     |
                      |   + Socket.IO Real-time     |
                      +--------------+--------------+
                                     ^
                       Public Token  |    Socket.IO (Token Scoped)
                       Validation    |    [chat:start, chat:message, chat:typing]
                                     |
                      +--------------+--------------+
                      | Customer Mobile Chat Widget | (No login, Token-based)
                      | /c/:chatToken               |
                      +-----------------------------+
                                     |
         +---------------------------+---------------------------+
         |                                                       |
         v                                                       v
+------------------+                                    +------------------+
|    PostgreSQL    | (Users, Customers, Conversations,  |      Redis       | (Active presence,
|  Relational DB   |  Messages, Transfers, Invites)     |   Adapter & Bus  |  Socket map, typing,
+------------------+                                    +------------------+  transient states)
```

---

## Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Real-Time Engine**: Socket.IO with `@socket.io/redis-adapter` for horizontal multi-instance scaling
- **Database**: PostgreSQL (Relational DB) with migrations and seeders + SQLite local fallback for instant local dev
- **Cache & Presence**: Redis (active agent presence map, socket sessions, typing indicators)
- **Frontend (Admin & Agent Desk)**: React 18, TailwindCSS, Zustand, Lucide Icons, Vite
- **Frontend (Customer Widget)**: Mobile-first responsive public portal (`/c/:chatToken`), telecom welcome screen, quick options, live chat
- **SMS Gateway**: Pluggable `SMSProvider` abstraction layer supporting `MockSMSProvider` (for testing) and `TwilioProvider` (production)
- **Security & RBAC**: JWT auth for staff, HMAC-signed expiring tokens for customer links, XSS sanitization, rate-limiting, and MIME-validated file uploads

---

## Project Structure

```
ideacrop-chat/
├── docker-compose.yml              # PostgreSQL 16 & Redis 7 container configuration
├── SOCKET_EVENTS.md                # Complete WebSocket event & payload documentation
├── package.json                    # Root workspace orchestration
├── README.md                       # Comprehensive guide
├── backend/
│   ├── data/                       # Local SQLite storage (when Postgres is offline)
│   ├── uploads/                    # Shared chat images and documents
│   ├── .env.example                # Environment variables template
│   ├── .env                        # Local development environment
│   ├── package.json
│   ├── test_socket_flow.js         # Automated end-to-end Socket.IO test suite
│   └── src/
│       ├── config/
│       │   ├── db.js               # Dual-mode DB connector (PostgreSQL + SQLite fallback)
│       │   ├── redis.js            # Redis client & Pub/Sub adapter with in-memory fallback
│       │   └── env.js              # Environment variable loader
│       ├── controllers/            # REST API route controllers
│       ├── middlewares/
│       │   ├── auth.js             # JWT verification & RBAC authorize(['admin', 'agent', ...])
│       │   ├── rateLimiter.js      # Rate limits for SMS invites & auth
│       │   ├── upload.js           # Multer file & image upload handler
│       │   └── errorHandler.js     # Centralized error handler
│       ├── migrations/
│       │   ├── 001_initial_schema.sql  # Standard PostgreSQL DDL migration
│       │   └── migrate.js          # Migration runner
│       ├── models/                 # Database repositories (User, Customer, Conversation, etc.)
│       ├── routes/                 # Express API routes
│       ├── seeds/
│       │   └── seed.js             # Demo accounts and sample customer seeder
│       ├── services/
│       │   ├── sms/                # Pluggable SMS gateway layer (Mock & Twilio)
│       │   ├── tokenService.js     # HMAC cryptographic expiring chat tokens
│       │   ├── presenceService.js  # Online/Busy/Offline presence tracker
│       │   └── autoAssignService.js# Least-Busy & Round-Robin routing algorithms
│       ├── sockets/
│       │   ├── index.js            # Socket.IO initialization with Redis adapter
│       │   ├── socketAuth.js       # Handshake auth for staff JWT & customer tokens
│       │   ├── chatHandlers.js     # Live messaging, typing, read receipts
│       │   ├── transferHandlers.js # Seamless live agent transfer
│       │   └── agentHandlers.js    # Agent status toggle and presence broadcast
│       ├── app.js                  # Express app definition
│       └── server.js               # HTTP & Socket.IO server entry point
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js              # Vite server & API proxy
    ├── tailwind.config.js          # Custom telecom color palette
    └── src/
        ├── components/
        │   ├── admin/              # Sidebar, Topbar, KPIStats, TransferModal, InviteModal
        │   ├── agent/              # AgentConversationsList, AgentChatWindow
        │   ├── customer/           # WelcomeScreen, CustomerChatWindow
        │   └── common/             # Badge, Modal, Toast
        ├── pages/                  # LoginPage, Dashboard, AgentDesk, Conversations, etc.
        ├── services/               # Axios API client & Socket.IO manager
        └── store/                  # Zustand authStore & chatStore
```

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Optional**: Docker & Docker Compose (for containerized PostgreSQL & Redis)

### 2. (Optional) Start PostgreSQL and Redis via Docker
```bash
docker compose up -d
```
> *Note: If Docker or PostgreSQL is not running, the application automatically uses its built-in SQLite/in-memory adapter and in-memory Redis presence cache, so you can test locally right away without any external setup!*

### 3. Install Dependencies
```bash
# In backend
cd backend
npm install

# In frontend
cd ../frontend
npm install
```

### 4. Run Migrations & Seed Database
```bash
cd ../backend
npm run migrate
npm run seed
```

This populates the system with pre-configured accounts:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ideacrop.com` | `Admin123!` | Full control: Users, Settings, Conversations, Reports |
| **Sales Agent** | `agent.sarah@ideacrop.com` | `Agent123!` | Send SMS invites, live chat, transfer chats |
| **Sales Agent** | `agent.mike@ideacrop.com` | `Agent123!` | Send SMS invites, live chat, transfer chats |
| **Supervisor** | `supervisor@ideacrop.com` | `Super123!` | Monitor all chats, agent presence, reports |
| **Viewer** | `viewer@ideacrop.com` | `Viewer123!` | Read-only conversation transcripts and reports |

### 5. Start Backend and Frontend
In terminal 1 (Backend on port 5001):
```bash
cd backend
npm start
```

In terminal 2 (Frontend on port 5173):
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Testing the Complete Real-Time Flow Locally

### Method A: Automated Integration Test
Run the automated 12-step test suite simulating the full agent-to-customer-to-transfer lifecycle:
```bash
cd backend
node test_socket_flow.js
```

### Method B: Manual Browser Walkthrough
1. **Agent Login**:
   - Navigate to `http://localhost:5173/login`.
   - Click the **Agent Sarah** quick-fill button (or enter `agent.sarah@ideacrop.com` / `Agent123!`).
   - You will land in the **Agent Live Desk** (`/admin/agent-desk`).
   - Notice the status toggle in the top bar is set to **🟢 Online**.

2. **Send Customer SMS Invite**:
   - Click the **"Send SMS Invite"** button in the top navigation.
   - Enter customer number: `+1 555 019 2834` and Name: `Alex Johnson`.
   - Click **Send SMS Invite**.
   - The backend dispatches the SMS via the pluggable SMS provider and displays the generated secure link (e.g. `http://localhost:5173/c/{token}`).
   - Click **"Open Customer View"** (or open the link in an Incognito / Mobile browser window).

3. **Customer Welcome & Live Chat Experience**:
   - The public customer page loads without asking for any login!
   - Shows the telecom welcome screen with Agent Sarah as your dedicated specialist.
   - Click any quick topic (e.g., **"Unlimited 5G Max Plans"**) or tap **"Start Live Chat Now"**.
   - Agent Sarah receives an incoming alert notification in her Agent Desk!

4. **Real-Time Chat & Read Receipts**:
   - Send messages back and forth between customer and agent.
   - Observe the live typing indicator in both windows.
   - Observe message delivery/read receipts (single tick -> double tick -> blue ticks).
   - Test sending an image or document attachment using the paperclip icon.

5. **Live Agent-to-Agent Transfer**:
   - From Agent Sarah's console, click **"Transfer Chat"**.
   - Select **Agent Mike** from the list of available online agents.
   - Enter a reason (e.g., *"Customer requires specialized enterprise eSIM quote"*).
   - Click **Transfer Chat**.
   - **Customer View**: Receives a seamless notification banner: *"Specialist Transfer: Sarah Connor transferred this session to Mike Ross"*, with zero page reloads or interruption!
   - Log in as **Agent Mike** in a separate window to view the transferred chat with its complete prior message history.

6. **Close Conversation & Audit Trail**:
   - Click **"Close Chat"** from the agent workspace.
   - Check **Conversations** table in the Admin panel to view the closed status, duration, and full real-time transcript.
   - Check **Reports** to view updated conversion metrics and download the conversation log as a CSV.

---

## Roles & Permissions (RBAC)

RBAC is strictly enforced at both the **Express REST API level** (via `authorize([...])` middleware) and the **Socket.IO event level**:

- **Admin**: Full access. Manage users and agents, view all conversations, generate reports, configure platform settings.
- **Sales Agent**: Send SMS invites, chat with assigned customers, transfer chats to other available agents, view own conversations.
- **Supervisor**: Live monitoring of all team conversations, transfer chats between agents, view agent presence, generate reports.
- **Viewer**: Strictly read-only access to conversation transcripts and reports. Cannot participate in chats or modify records.

---

## Pluggable SMS Gateway Provider

The backend uses an extensible provider pattern (`SMSProvider` interface):

```javascript
// backend/src/services/sms/SMSProvider.js
class SMSProvider {
  async sendSMS({ to, message, metadata }) { ... }
}
```

### Supported Providers:
1. **Mock Provider (`SMS_GATEWAY_PROVIDER=mock`)**: Default for development. Logs styled SMS blocks to the server console with instant clickable URLs and tracks recent messages.
2. **Twilio Provider (`SMS_GATEWAY_PROVIDER=twilio`)**: Dispatches real cellular SMS messages via Twilio REST API. Configure via `.env`:
   ```env
   SMS_GATEWAY_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   SMS_FROM_NUMBER=+18005550199
   ```

---

## WebSocket Events Reference

See [`SOCKET_EVENTS.md`](./SOCKET_EVENTS.md) for complete details on:
- Namespaces and scoped rooms (`conversation_{id}`, `agent_{id}`, `admin_feed`)
- Handshake authentication
- Event names and payload schemas
- Reconnection and resync handling

---

## Verification & Automated Tests

To run the automated test suite:
```bash
# 1. Ensure backend is running
cd backend
npm start

# 2. In another terminal, run:
cd backend
node test_socket_flow.js
```

Expected output:
```
===============================================================
🌟 ALL 12 REAL-TIME SMS-TO-CHAT TEST STEPS PASSED WITH 100% SUCCESS!
===============================================================
```

---

## License

This project is licensed under the MIT License.
