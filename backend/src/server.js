const http = require('http');
const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');
const { initRedis } = require('./config/redis');
const initSocketIO = require('./sockets');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const TelecomNumber = require('./models/TelecomNumber');

async function startServer() {
  try {
    console.log('---------------------------------------------------------');
    console.log('🚀 Initializing IdeaCrop SMS-to-Chat Platform Backend...');
    console.log('---------------------------------------------------------');

    // 1. Initialize Database
    await db.initDB();

    // 2. Initialize Redis
    await initRedis();

    // 3. Create HTTP & WebSocket Server
    const server = http.createServer(app);
    const io = initSocketIO(server);

    // Make io accessible to Express controllers via req.app.get('io')
    app.set('io', io);

    // 4. Inactivity Auto-Close Background Job (runs every 5 minutes)
    const INACTIVITY_MS = env.INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
    setInterval(async () => {
      try {
        const thresholdDate = new Date(Date.now() - INACTIVITY_MS).toISOString();
        const inactiveResult = await db.query(`
          SELECT c.id 
          FROM conversations c
          WHERE c.status = 'open' 
            AND (
              SELECT COALESCE(MAX(m.created_at), c.created_at) 
              FROM messages m 
              WHERE m.conversation_id = c.id
            ) < $1
        `, [thresholdDate]);

        if (inactiveResult.rows.length > 0) {
          console.log(`[Auto-Close] Found ${inactiveResult.rows.length} inactive conversation(s). Closing...`);
          for (const row of inactiveResult.rows) {
            await Conversation.close(row.id, null);
            await Message.create({
              conversationId: row.id,
              senderType: 'system',
              content: 'Conversation automatically closed due to customer/agent inactivity.'
            });
            io.to(`conversation_${row.id}`).emit('chat:closed', {
              conversationId: row.id,
              reason: 'Inactivity timeout'
            });
          }
          io.to('admin_feed').emit('admin:dashboard_update', { event: 'auto_close' });
        }
      } catch (err) {
        console.error('[Auto-Close Background Job Error]', err.message);
      }
    }, 5 * 60 * 1000);

    // 5. Number Reservation 3-Day Auto-Expiry Background Job (runs every 60 seconds)
    setInterval(async () => {
      try {
        const released = await TelecomNumber.expireOverdueReservations();
        if (released && released.length > 0) {
          console.log(`[Auto-Expiry Timer] Released ${released.length} overdue reservation(s) back to available pool.`);
          io.emit('numbers:inventory_updated', {
            action: 'auto_expired',
            count: released.length,
            released
          });
        }
      } catch (err) {
        console.error('[Reservation Auto-Expiry Job Error]', err.message);
      }
    }, 60 * 1000);

    // 6. Start Listening
    server.listen(env.PORT, () => {
      console.log(`[Server] HTTP & Socket.IO server running on port ${env.PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
      console.log(`[Server] SMS Gateway Provider: ${env.SMS_GATEWAY_PROVIDER.toUpperCase()}`);
      console.log(`[Server] API Base URL: ${env.API_BASE_URL}`);
      console.log('---------------------------------------------------------');
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
