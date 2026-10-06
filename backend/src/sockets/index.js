const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getPubSubClients, isRedisActive } = require('../config/redis');
const socketAuthMiddleware = require('./socketAuth');
const registerChatHandlers = require('./chatHandlers');
const registerTransferHandlers = require('./transferHandlers');
const registerAgentHandlers = require('./agentHandlers');

function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow frontend client connections
      methods: ['GET', 'POST']
    },
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // Attach Redis adapter if Redis is connected
  if (isRedisActive()) {
    try {
      const { pubClient, subClient } = getPubSubClients();
      if (pubClient && subClient) {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[Socket.IO] Redis adapter enabled for horizontal clustering');
      }
    } catch (err) {
      console.warn('[Socket.IO] Failed to bind Redis adapter, using in-memory adapter:', err.message);
    }
  } else {
    console.log('[Socket.IO] Running with high-performance in-memory adapter');
  }

  // Authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const identifier = socket.isStaff
      ? `Staff [${socket.user.role}] ${socket.user.name} (${socket.user.id})`
      : `Customer (${socket.customer.customerPhone})`;

    console.log(`[Socket.IO] Client connected: ${socket.id} - ${identifier}`);

    // Register handlers
    registerChatHandlers(io, socket);
    registerTransferHandlers(io, socket);
    registerAgentHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

module.exports = initSocketIO;
