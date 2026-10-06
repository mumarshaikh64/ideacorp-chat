# Socket.IO WebSocket Event Documentation

This document describes all real-time events, rooms, authentication rules, and payload schemas for the **IdeaCrop Real-Time SMS-to-Chat Platform**.

---

## 1. Rooms & Namespaces

| Room Name | Scope | Members | Purpose |
| :--- | :--- | :--- | :--- |
| `conversation_{conversationId}` | Conversation Room | Customer + Assigned Agent + Monitoring Supervisors | Live message exchange, typing indicators, read receipts |
| `agent_{agentId}` | Private Agent Room | Specific Agent (all connected browser tabs of that agent) | Incoming chat assignment notifications (`new_chat_assigned`), transfer alerts |
| `admin_feed` | Administrative Feed | Admins & Supervisors | Real-time KPI updates, chat volume events, online presence changes |

---

## 2. Authentication Handshake

Sockets must connect with either a **Staff JWT** or a **Customer Signed Chat Token** in `socket.handshake.auth`:

```javascript
// Staff Connection (Admin, Agent, Supervisor, Viewer)
const socket = io('http://localhost:5000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsIn...' // Staff JWT
  }
});

// Customer Connection (Public, Token Scoped)
const socket = io('http://localhost:5000', {
  auth: {
    chatToken: 'eyJhbGciOiJIUzI1NiIsIn...' // Signed Chat Token from SMS link
  }
});
```

---

## 3. Client-to-Server Events (Emitted by Frontend)

| Event Name | Emitter | Payload Shape | Acknowledgment / Callback | Description |
| :--- | :--- | :--- | :--- | :--- |
| `chat:start` | Customer | `{ initialOption?: string }` | `{ success: boolean, conversationId: string, conversation: object }` | Initiates or resumes customer chat session when entering portal or choosing a quick plan. |
| `chat:join` | Agent / Customer | `{ conversationId: string }` | `{ success: boolean, conversation: object, history: Message[] }` | Joins a conversation room and marks prior unread messages as delivered. |
| `chat:message` | Agent / Customer | `{ conversationId: string, content: string, messageType?: 'text'\|'image'\|'file'\|'quick_option', fileUrl?: string }` | `{ success: boolean, message: Message }` | Sends a message in the active chat room. Persisted to database and broadcast to room. |
| `chat:typing` | Agent / Customer | `{ conversationId: string, isTyping: boolean }` | None | Broadcasts ephemeral typing status to the conversation room. |
| `chat:read` | Agent / Customer | `{ conversationId: string }` | None | Updates status of received messages in DB to `read` and broadcasts read receipt. |
| `chat:transfer_request` | Agent / Supervisor | `{ conversationId: string, toAgentId: string, reason?: string }` | `{ success: boolean, message: string, transferLog: object }` | Transfers an active conversation to another available agent in real time. |
| `agent:status_toggle` | Agent / Admin | `{ status: 'online' \| 'busy' \| 'offline' }` | `{ success: boolean, status: string }` | Toggles agent status and broadcasts presence to dashboard. |
| `chat:close` | Agent / Admin | `{ conversationId: string, reason?: string }` | `{ success: boolean, conversation: object }` | Manually marks conversation as closed in DB and notifies room. |

---

## 4. Server-to-Client Events (Emitted by Backend)

| Event Name | Target Room / Client | Payload Shape | Description |
| :--- | :--- | :--- | :--- |
| `chat:message` | `conversation_{id}` | `{ id, conversationId, senderType, senderId, senderName, content, messageType, fileUrl, status, created_at }` | Real-time message broadcast to all participants in conversation. |
| `chat:typing` | `conversation_{id}` | `{ conversationId, isTyping, senderType, senderName }` | Notifies counterparty that user is typing. |
| `chat:read` | `conversation_{id}` | `{ conversationId, readBy: 'agent'\|'customer', timestamp }` | Delivery/read tick upgrade (sent -> delivered -> read). |
| `new_chat_assigned` | `agent_{agentId}` | `{ conversationId, customer: { id, name, phone }, initialOption, transferredFrom?, reason?, timestamp }` | Audio/visual notification for newly assigned or transferred chat. |
| `chat:customer_joined`| `conversation_{id}` | `{ conversationId, customerPhone, agentId, timestamp }` | Alerts agent that customer entered the live chat room. |
| `chat:transferred` | `conversation_{id}` | `{ conversationId, fromAgentName, toAgentName, toAgentId, reason, systemMessage, timestamp }` | Seamless customer notification that chat was transferred to another specialist. |
| `chat:transfer_completed` | `agent_{fromAgentId}` | `{ conversationId, toAgentName }` | Confirms to original agent that the chat transfer completed. |
| `chat:closed` | `conversation_{id}` | `{ conversationId, closedBy, closedAt, reason }` | Informs customer and agent that the session has concluded. |
| `agent:status_changed` | All connected staff | `{ agentId, name, status, timestamp }` | Real-time presence update for agent rosters and transfer dropdowns. |
| `admin:dashboard_update`| `admin_feed` | `{ event: string, conversationId?: string, [key: string]: any }` | Real-time trigger for KPI refresh on Admin dashboard. |

---

## 5. Reconnection & Resync Flow

When either customer or agent experiences network drops:
1. Socket client reconnects automatically with stored token/chatToken.
2. Client emits `chat:join` with `{ conversationId }`.
3. Server returns full recent `history` array from database.
4. Client reconciles local message list with server history.
