import { io } from 'socket.io-client';

let socket = null;

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');

/**
 * Connect as authenticated staff (Admin, Agent, Supervisor, Viewer)
 */
export function initStaffSocket(token) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_SERVER_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected as Staff:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket Connection Error]', err.message);
  });

  return socket;
}

/**
 * Connect as public customer using unique signed chatToken
 */
export function initCustomerSocket(chatToken) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_SERVER_URL, {
    auth: { chatToken },
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected as Customer:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket Customer Error]', err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
