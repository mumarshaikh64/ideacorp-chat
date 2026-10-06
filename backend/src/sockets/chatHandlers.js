const validator = require('validator');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ChatInvite = require('../models/ChatInvite');
const Customer = require('../models/Customer');
const User = require('../models/User');
const AutoAssignService = require('../services/autoAssignService');
const PresenceService = require('../services/presenceService');
const TelecomAiService = require('../services/telecomAiService');
const TelecomNumber = require('../models/TelecomNumber');

// Socket message rate limiter map: socketId -> timestamp[]
const socketRateLimits = new Map();

function checkSocketRateLimit(socketId, maxPerInterval = 8, intervalMs = 2000) {
  const now = Date.now();
  let timestamps = socketRateLimits.get(socketId) || [];
  timestamps = timestamps.filter(t => now - t < intervalMs);

  if (timestamps.length >= maxPerInterval) {
    return false; // rate limited
  }

  timestamps.push(now);
  socketRateLimits.set(socketId, timestamps);
  return true;
}

module.exports = function registerChatHandlers(io, socket) {
  /**
   * Customer initiates or resumes chat session
   * Emitted when customer clicks "Start Chat" or quick option on welcome screen
   */
  socket.on('chat:start', async (data, callback) => {
    try {
      if (socket.isStaff) {
        if (callback) callback({ error: 'Staff cannot call chat:start' });
        return;
      }

      const { customerPhone, inviteId, customerId, agentId } = socket.customer;
      const { initialOption } = data || {};

      // 1. Check if an active open conversation already exists for this invite
      const invite = await ChatInvite.findById(inviteId);
      let conversationId = invite ? invite.conversation_id : null;
      let conversation = null;

      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
      }

      // 2. If no open conversation, create a new one
      let isNewConversation = false;
      if (!conversation || conversation.status === 'closed') {
        isNewConversation = true;
        // Strict Sender-Agent Binding:
        // Always assign directly to the sales agent who sent the invite
        const assignedAgentId = await AutoAssignService.findAvailableAgent(agentId, 'least_busy');

        conversation = await Conversation.create({
          customerId,
          currentAgentId: assignedAgentId,
          status: 'open',
          handlingMode: 'ai'
        });

        conversationId = conversation.id;

        // Update invite with conversation ID
        if (invite) {
          await ChatInvite.markUsed(invite.id, conversationId);
        }

        // Send initial system message
        await Message.create({
          conversationId,
          senderType: 'system',
          content: 'Customer joined live chat via secure invite link.'
        });

        // Initial welcome response from Telecom AI Concierge
        const welcomeRes = await TelecomAiService.getResponse(initialOption || 'hi');
        await Message.create({
          conversationId,
          senderType: 'bot',
          content: welcomeRes.text,
          messageType: welcomeRes.numbers ? 'number_series' : 'text',
          metadata: { options: welcomeRes.options, numbers: welcomeRes.numbers }
        });

        // If customer selected a quick telecom option on the welcome screen, record it
        if (initialOption) {
          await Message.create({
            conversationId,
            senderType: 'customer',
            content: `Selected Option: ${initialOption}`,
            messageType: 'quick_option'
          });
        }
      }

      // Join socket room
      const room = `conversation_${conversationId}`;
      socket.join(room);
      await PresenceService.mapConversationSocket(conversationId, socket.id);

      // Check assigned agent's online presence
      let isAgentOnline = false;
      if (conversation.current_agent_id) {
        const agentPresence = await PresenceService.getAgentStatus(conversation.current_agent_id);
        isAgentOnline = Boolean(agentPresence && agentPresence.status === 'online');

        const customer = await Customer.findById(customerId);
        if (isAgentOnline) {
          // Notify assigned agent's personal room in real time
          io.to(`agent_${conversation.current_agent_id}`).emit('new_chat_assigned', {
            conversationId,
            customer: {
              id: customerId,
              name: customer ? customer.name : 'Customer',
              phone: customerPhone
            },
            assignedAgentId: conversation.current_agent_id,
            initialOption: initialOption || null,
            timestamp: new Date().toISOString()
          });
        } else {
          // Assigned agent is offline: Alert Super Admin & Supervisors
          io.to('admin_feed').emit('admin:agent_offline_chat', {
            event: 'agent_offline_chat',
            conversationId,
            agentId: conversation.current_agent_id,
            agentName: conversation.current_agent_name || 'Assigned Sales Agent',
            customerPhone,
            customerName: customer ? customer.name : 'Customer',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Broadcast customer joined to room
      io.to(room).emit('chat:customer_joined', {
        conversationId,
        customerPhone,
        agentId: conversation.current_agent_id,
        isAgentOnline,
        timestamp: new Date().toISOString()
      });

      // Update admin feed
      io.to('admin_feed').emit('admin:dashboard_update', {
        event: 'new_chat',
        conversationId
      });

      if (callback) {
        callback({
          success: true,
          conversationId,
          conversation,
          isAgentOnline
        });
      }
    } catch (err) {
      console.error('[Socket chat:start error]', err);
      if (callback) callback({ error: 'Failed to start chat session' });
    }
  });

  /**
   * Join an existing conversation room
   */
  socket.on('chat:join', async ({ conversationId }, callback) => {
    try {
      if (!conversationId) {
        if (callback) callback({ error: 'conversationId is required' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (callback) callback({ error: 'Conversation not found' });
        return;
      }

      // Strict Agent Attendance Enforcement:
      // Only the assigned agent who created/owns the link (or Admin/Supervisor) can attend this chat
      if (socket.isStaff && socket.user.role === 'agent') {
        if (conversation.current_agent_id && conversation.current_agent_id !== socket.user.id) {
          if (callback) callback({
            error: 'Access denied: You are not assigned to attend this chat session. Only the assigned agent can attend this conversation.'
          });
          return;
        }
      }

      const room = `conversation_${conversationId}`;
      socket.join(room);
      await PresenceService.mapConversationSocket(conversationId, socket.id);

      // Update delivery ticks
      const recipientType = socket.isStaff ? 'agent' : 'customer';
      await Message.markConversationDelivered(conversationId, recipientType);

      // Resync history
      const history = await Message.findByConversation(conversationId, { limit: 100 });

      // Check assigned agent presence
      let isAgentOnline = false;
      if (conversation.current_agent_id) {
        const agentPresence = await PresenceService.getAgentStatus(conversation.current_agent_id);
        isAgentOnline = Boolean(agentPresence && agentPresence.status === 'online');
      }

      if (callback) {
        callback({
          success: true,
          conversation,
          history,
          isAgentOnline
        });
      }

      // Notify others in room of presence
      socket.to(room).emit('chat:presence_joined', {
        user: socket.isStaff ? socket.user.name : 'Customer',
        role: socket.isStaff ? socket.user.role : 'customer'
      });
    } catch (err) {
      console.error('[Socket chat:join error]', err);
      if (callback) callback({ error: 'Failed to join conversation room' });
    }
  });

  /**
   * Send a real-time message in the conversation
   */
  socket.on('chat:message', async (data, callback) => {
    try {
      const { conversationId, content, messageType = 'text', fileUrl = null } = data || {};

      if (!conversationId) {
        if (callback) callback({ error: 'conversationId is required' });
        return;
      }

      // Rate limit check
      if (!checkSocketRateLimit(socket.id)) {
        if (callback) callback({ error: 'You are sending messages too quickly. Please slow down.' });
        return;
      }

      // Validate conversation exists and is open
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (callback) callback({ error: 'Conversation not found' });
        return;
      }
      if (conversation.status === 'closed') {
        if (callback) callback({ error: 'This conversation has been closed' });
        return;
      }

      // Strict Agent Attendance Enforcement:
      // Prevent other agents from sending messages into conversations they did not send/own
      if (socket.isStaff && socket.user.role === 'agent') {
        if (conversation.current_agent_id && conversation.current_agent_id !== socket.user.id) {
          if (callback) callback({
            error: 'Forbidden: You are not assigned to this conversation. Only the assigned agent can attend and chat in this session.'
          });
          return;
        }
      }

      // Sanitize input content
      const sanitizedContent = content ? validator.escape(String(content).trim()) : '';
      if (!sanitizedContent && !fileUrl) {
        if (callback) callback({ error: 'Message content or attachment is required' });
        return;
      }

      const senderType = socket.isStaff ? 'agent' : 'customer';
      const senderId = socket.isStaff ? socket.user.id : null;

      // Persist to database
      const message = await Message.create({
        conversationId,
        senderType,
        senderId,
        content: sanitizedContent,
        messageType,
        fileUrl,
        status: 'sent'
      });

      const payload = {
        ...message,
        senderName: socket.isStaff ? socket.user.name : (conversation.customer_name || 'Customer')
      };

      const room = `conversation_${conversationId}`;
      io.to(room).emit('chat:message', payload);

      if (callback) {
        callback({ success: true, message: payload });
      }

      // --- AI CONCIERGE & HUMAN ESCALATION ENGINE ---
      // If customer sent the message and AI handling is active:
      if (!socket.isStaff && conversation.handling_mode === 'ai') {
        const isHumanReq = TelecomAiService.isHumanEscalation(sanitizedContent) || (data && data.requestHuman);

        if (isHumanReq) {
          // Switch mode to human
          await Conversation.setHandlingMode(conversationId, 'human', {
            handoffRequested: true,
            handoffReason: sanitizedContent || 'Customer requested human specialist'
          });

          // Check if assigned agent is currently online
          const agentPresence = conversation.current_agent_id
            ? await PresenceService.getAgentStatus(conversation.current_agent_id)
            : null;
          const isAgentOnline = Boolean(agentPresence && agentPresence.status === 'online');

          let handoffResponseText = '';
          if (isAgentOnline) {
            handoffResponseText = `Ji bilkul! Main aap ko aap ke Dedicated Sales Specialist (${conversation.current_agent_name || 'Agent'}) se connect kar raha hoon 👨‍💼. Ek moment hold karein...`;

            // Emit high-priority alert to assigned agent's desk
            io.to(`agent_${conversation.current_agent_id}`).emit('chat:handoff_requested', {
              conversationId,
              customerPhone: conversation.customer_phone,
              customerName: conversation.customer_name,
              reason: sanitizedContent,
              timestamp: new Date().toISOString()
            });
          } else {
            handoffResponseText = `Aap ke dedicated sales specialist (${conversation.current_agent_name || 'Sales Agent'}) filhal available nahi hain 🙏. Hamare Super Admin / Supervisor ko alert bhej diya gaya hai, wo aap ki chat kisi active specialist ko transfer kar rahe hain. Please hold on karein!`;

            // Alert Super Admin & Supervisors in admin_feed
            io.to('admin_feed').emit('admin:offline_agent_handoff', {
              conversationId,
              agentId: conversation.current_agent_id,
              agentName: conversation.current_agent_name || 'Sales Agent',
              customerPhone: conversation.customer_phone,
              customerName: conversation.customer_name,
              reason: sanitizedContent,
              timestamp: new Date().toISOString()
            });
          }

          // Emit transition bot message
          const handoffMsg = await Message.create({
            conversationId,
            senderType: 'bot',
            content: handoffResponseText,
            messageType: 'handoff_prompt'
          });

          io.to(room).emit('chat:message', {
            ...handoffMsg,
            senderName: 'ideacorp AI Assistant'
          });

          io.to(room).emit('chat:mode_changed', {
            conversationId,
            handlingMode: 'human',
            handoffRequested: true,
            isAgentOnline
          });
        } else {
          // Automated AI Telecom Response with Sequence Series & 3-Day Reservation Handling
          io.to(room).emit('chat:typing', {
            conversationId,
            isTyping: true,
            senderType: 'bot',
            senderName: 'ideacorp AI Assistant'
          });

          setTimeout(async () => {
            try {
              // Check if customer requested to book / reserve a specific number
              const bookMatch = sanitizedContent.match(/(?:book|reserve|chahiye|lena hai)\D*(\+?971\d{8,11}|05\d{8})/i) ||
                                sanitizedContent.match(/^book_(\d+)/i);

              if (bookMatch) {
                const targetMssid = bookMatch[1].replace(/[^0-9]/g, '');
                const targetNum = await TelecomNumber.findByMssid(targetMssid);

                if (targetNum && targetNum.status === 'available') {
                  const reserved = await TelecomNumber.reserveNumber({
                    mssid: targetMssid,
                    customerPhone: conversation.customer_phone,
                    customerName: conversation.customer_name,
                    conversationId,
                    agentId: conversation.current_agent_id,
                    agentName: conversation.current_agent_name,
                    durationDays: 3
                  });

                  const expiresFormatted = new Date(reserved.reservation_expires_at).toLocaleString();
                  const bookingConfirmText = `✅ **Number Reserved for 3 Days!** 🎉\n\nVIP Number **${targetMssid}** (${targetNum.category}) has been reserved exclusively for you for **3 days (72 hours)**.\n\n⏳ **Reservation Valid Until:** ${expiresFormatted}\n\nOur Dedicated Sales Specialist (${conversation.current_agent_name || 'Agent'}) has been notified to finalize your package and arrange free doorstep delivery.`;

                  const botMsg = await Message.create({
                    conversationId,
                    senderType: 'bot',
                    content: bookingConfirmText,
                    messageType: 'number_reservation_confirmed',
                    metadata: { reservedNumber: reserved }
                  });

                  io.to(room).emit('chat:typing', {
                    conversationId,
                    isTyping: false,
                    senderType: 'bot',
                    senderName: 'ideacorp AI Assistant'
                  });

                  io.to(room).emit('chat:message', {
                    ...botMsg,
                    senderName: 'ideacorp AI Assistant'
                  });

                  io.to(room).emit('number:reserved', {
                    number: reserved,
                    expiresAt: reserved.reservation_expires_at
                  });
                  io.emit('numbers:inventory_updated', { action: 'reserved', number: reserved });

                  if (conversation.current_agent_id) {
                    io.to(`agent_${conversation.current_agent_id}`).emit('chat:number_booked_alert', {
                      conversationId,
                      customerPhone: conversation.customer_phone,
                      mssid: targetMssid,
                      category: targetNum.category,
                      expiresAt: reserved.reservation_expires_at
                    });
                  }
                  return;
                }
              }

              // Normal AI inquiry resolution
              const aiRes = await TelecomAiService.getResponse(sanitizedContent);
              const botMsg = await Message.create({
                conversationId,
                senderType: 'bot',
                content: aiRes.text,
                messageType: aiRes.numbers ? 'number_series' : 'text',
                metadata: { options: aiRes.options, numbers: aiRes.numbers }
              });

              io.to(room).emit('chat:typing', {
                conversationId,
                isTyping: false,
                senderType: 'bot',
                senderName: 'ideacorp AI Assistant'
              });

              io.to(room).emit('chat:message', {
                ...botMsg,
                senderName: 'ideacorp AI Assistant'
              });
            } catch (aiErr) {
              console.error('[AI response error]', aiErr);
            }
          }, 650);
        }
      }
    } catch (err) {
      console.error('[Socket chat:message error]', err);
      if (callback) callback({ error: 'Failed to send message' });
    }
  });

  /**
   * Explicit Customer Request for Human Agent (button click)
   */
  socket.on('chat:request_human', async ({ conversationId }, callback) => {
    try {
      if (!conversationId) {
        if (callback) callback({ error: 'conversationId is required' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (callback) callback({ error: 'Conversation not found' });
        return;
      }

      // Update conversation mode to human
      await Conversation.setHandlingMode(conversationId, 'human', {
        handoffRequested: true,
        handoffReason: 'Customer clicked Talk to Human Agent'
      });

      // Check assigned agent presence
      const agentPresence = conversation.current_agent_id
        ? await PresenceService.getAgentStatus(conversation.current_agent_id)
        : null;
      const isAgentOnline = Boolean(agentPresence && agentPresence.status === 'online');

      let handoffResponseText = '';
      if (isAgentOnline) {
        handoffResponseText = `Connecting you with your dedicated specialist (${conversation.current_agent_name || 'Agent'}) right now! 👨‍💼 Please hold on for just a moment...`;
        io.to(`agent_${conversation.current_agent_id}`).emit('chat:handoff_requested', {
          conversationId,
          customerPhone: conversation.customer_phone,
          customerName: conversation.customer_name,
          reason: 'Customer clicked Talk to Human Agent',
          timestamp: new Date().toISOString()
        });
      } else {
        handoffResponseText = `Aap ke dedicated sales specialist (${conversation.current_agent_name || 'Sales Agent'}) filhal available nahi hain 🙏. Hamara Super Admin / Supervisor aap ki chat kisi active specialist ko transfer kar rahe hain. Please hold on karein!`;
        io.to('admin_feed').emit('admin:offline_agent_handoff', {
          conversationId,
          agentId: conversation.current_agent_id,
          agentName: conversation.current_agent_name || 'Sales Agent',
          customerPhone: conversation.customer_phone,
          customerName: conversation.customer_name,
          reason: 'Customer clicked Talk to Human Agent (Assigned agent offline)',
          timestamp: new Date().toISOString()
        });
      }

      const handoffMsg = await Message.create({
        conversationId,
        senderType: 'bot',
        content: handoffResponseText,
        messageType: 'handoff_prompt'
      });

      const room = `conversation_${conversationId}`;
      io.to(room).emit('chat:message', {
        ...handoffMsg,
        senderName: 'ideacorp AI Assistant'
      });

      io.to(room).emit('chat:mode_changed', {
        conversationId,
        handlingMode: 'human',
        handoffRequested: true,
        isAgentOnline
      });

      if (callback) callback({ success: true, isAgentOnline });
    } catch (err) {
      console.error('[Socket chat:request_human error]', err);
      if (callback) callback({ error: 'Failed to request human agent' });
    }
  });

  /**
   * Toggle AI Auto-Responder ON/OFF (Sales Agent or Admin action)
   */
  socket.on('chat:toggle_ai', async ({ conversationId, enableAi }, callback) => {
    try {
      if (!socket.isStaff) {
        if (callback) callback({ error: 'Only staff can toggle AI status' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (callback) callback({ error: 'Conversation not found' });
        return;
      }

      if (socket.user.role === 'agent' && conversation.current_agent_id !== socket.user.id) {
        if (callback) callback({ error: 'Forbidden: Only the assigned agent or admin can toggle AI for this conversation' });
        return;
      }

      const mode = enableAi ? 'ai' : 'human';
      await Conversation.setHandlingMode(conversationId, mode, {
        handoffRequested: false
      });

      const room = `conversation_${conversationId}`;
      io.to(room).emit('chat:mode_changed', {
        conversationId,
        handlingMode: mode,
        toggledBy: socket.user.name
      });

      io.to('admin_feed').emit('admin:dashboard_update', {
        event: 'mode_changed',
        conversationId,
        handlingMode: mode
      });

      if (callback) callback({ success: true, handlingMode: mode });
    } catch (err) {
      console.error('[Socket chat:toggle_ai error]', err);
      if (callback) callback({ error: 'Failed to toggle AI status' });
    }
  });

  /**
   * Live typing indicator
   */
  socket.on('chat:typing', ({ conversationId, isTyping }) => {
    if (!conversationId) return;
    const room = `conversation_${conversationId}`;
    socket.to(room).emit('chat:typing', {
      conversationId,
      isTyping: Boolean(isTyping),
      senderType: socket.isStaff ? 'agent' : 'customer',
      senderName: socket.isStaff ? socket.user.name : 'Customer'
    });
  });

  /**
   * Message read receipt acknowledgment
   */
  socket.on('chat:read', async ({ conversationId }) => {
    if (!conversationId) return;
    try {
      const readerType = socket.isStaff ? 'agent' : 'customer';
      await Message.markConversationRead(conversationId, readerType);

      const room = `conversation_${conversationId}`;
      socket.to(room).emit('chat:read', {
        conversationId,
        readBy: readerType,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Socket chat:read error]', err);
    }
  });

  /**
   * Close conversation
   */
  socket.on('chat:close', async ({ conversationId, reason }, callback) => {
    try {
      if (!socket.isStaff) {
        if (callback) callback({ error: 'Only staff can close conversations' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (callback) callback({ error: 'Conversation not found' });
        return;
      }

      if (socket.user.role === 'agent' && conversation.current_agent_id !== socket.user.id) {
        if (callback) callback({ error: 'Forbidden: Only the assigned agent or admin can close this conversation' });
        return;
      }

      const closed = await Conversation.close(conversationId, socket.user.id);
      await Message.create({
        conversationId,
        senderType: 'system',
        content: `Conversation closed by ${socket.user.name}${reason ? ` (${reason})` : ''}`
      });

      const room = `conversation_${conversationId}`;
      io.to(room).emit('chat:closed', {
        conversationId,
        closedBy: socket.user.name,
        reason
      });

      io.to('admin_feed').emit('admin:dashboard_update', {
        event: 'conversation_closed',
        conversationId
      });

      if (callback) callback({ success: true, conversation: closed });
    } catch (err) {
      console.error('[Socket chat:close error]', err);
      if (callback) callback({ error: 'Failed to close conversation' });
    }
  });

  /**
   * Live Number Reservation via Socket (3-day lock)
   */
  socket.on('number:reserve', async ({ mssid, id, conversationId, durationDays = 3 }, callback) => {
    try {
      const target = id || mssid;
      if (!target) {
        if (callback) callback({ error: 'MSSID or ID is required' });
        return;
      }

      const existing = (mssid ? await TelecomNumber.findByMssid(mssid) : null) || (id ? await TelecomNumber.findById(id) : null);
      if (!existing) {
        if (callback) callback({ error: 'Number not found' });
        return;
      }

      if (existing.status === 'sold') {
        if (callback) callback({ error: 'Number is already sold and unavailable' });
        return;
      }

      let conv = null;
      if (conversationId) {
        conv = await Conversation.findById(conversationId);
      }

      const agentId = socket.isStaff ? socket.user.id : (conv ? conv.current_agent_id : null);
      const agentName = socket.isStaff ? socket.user.name : (conv ? conv.current_agent_name : 'Sales Specialist');
      const customerPhone = conv ? conv.customer_phone : null;
      const customerName = conv ? conv.customer_name : null;

      const reserved = await TelecomNumber.reserveNumber({
        id: existing.id,
        mssid: existing.mssid,
        agentId,
        agentName,
        customerPhone,
        customerName,
        conversationId,
        durationDays: parseInt(durationDays, 10) || 3
      });

      if (conversationId) {
        const sysMsg = await Message.create({
          conversationId,
          senderType: 'system',
          content: `🔒 VIP Number ${existing.mssid} (${existing.category}) has been RESERVED for 3 days by ${agentName}.`
        });
        io.to(`conversation_${conversationId}`).emit('chat:message', sysMsg);
        io.to(`conversation_${conversationId}`).emit('number:reserved', {
          number: reserved,
          expiresAt: reserved.reservation_expires_at
        });
      }

      io.emit('numbers:inventory_updated', { action: 'reserved', number: reserved });

      if (callback) callback({ success: true, number: reserved });
    } catch (err) {
      console.error('[Socket number:reserve error]', err);
      if (callback) callback({ error: 'Failed to reserve number' });
    }
  });

  /**
   * Live Mark as Sold via Socket (Permanently unavailable)
   */
  socket.on('number:sell', async ({ mssid, id, conversationId }, callback) => {
    try {
      const target = id || mssid;
      const existing = (mssid ? await TelecomNumber.findByMssid(mssid) : null) || (id ? await TelecomNumber.findById(id) : null);
      if (!existing) {
        if (callback) callback({ error: 'Number not found' });
        return;
      }

      const agentId = socket.isStaff ? socket.user.id : null;
      const agentName = socket.isStaff ? socket.user.name : 'Sales Specialist';

      const sold = await TelecomNumber.sellNumber({
        id: existing.id,
        mssid: existing.mssid,
        agentId
      });

      if (conversationId) {
        const sysMsg = await Message.create({
          conversationId,
          senderType: 'system',
          content: `🎉 Number ${existing.mssid} (${existing.category}) has been marked as SOLD and permanently assigned to customer by ${agentName}.`
        });
        io.to(`conversation_${conversationId}`).emit('chat:message', sysMsg);
        io.to(`conversation_${conversationId}`).emit('number:sold', { number: sold });
      }

      io.emit('numbers:inventory_updated', { action: 'sold', number: sold });

      if (callback) callback({ success: true, number: sold });
    } catch (err) {
      console.error('[Socket number:sell error]', err);
      if (callback) callback({ error: 'Failed to mark number as sold' });
    }
  });

  /**
   * Release reserved number back to pool via Socket
   */
  socket.on('number:release', async ({ mssid, id, conversationId }, callback) => {
    try {
      const target = id || mssid;
      const existing = (mssid ? await TelecomNumber.findByMssid(mssid) : null) || (id ? await TelecomNumber.findById(id) : null);
      if (!existing) {
        if (callback) callback({ error: 'Number not found' });
        return;
      }

      const released = await TelecomNumber.releaseNumber({
        id: existing.id,
        mssid: existing.mssid
      });

      if (conversationId) {
        const sysMsg = await Message.create({
          conversationId,
          senderType: 'system',
          content: `VIP Number ${existing.mssid} reservation released back to available pool.`
        });
        io.to(`conversation_${conversationId}`).emit('chat:message', sysMsg);
      }

      io.emit('numbers:inventory_updated', { action: 'released', number: released });

      if (callback) callback({ success: true, number: released });
    } catch (err) {
      console.error('[Socket number:release error]', err);
      if (callback) callback({ error: 'Failed to release number' });
    }
  });

  socket.on('disconnect', () => {
    socketRateLimits.delete(socket.id);
  });
};
