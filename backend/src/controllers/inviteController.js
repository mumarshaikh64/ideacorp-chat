const Customer = require('../models/Customer');
const ChatInvite = require('../models/ChatInvite');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { generateChatToken, verifyChatToken } = require('../services/tokenService');
const { getSMSProvider } = require('../services/sms');
const { getWhatsAppProvider } = require('../services/whatsapp');
const env = require('../config/env');
const { v4: uuidv4 } = require('uuid');

class InviteController {
  /**
   * Send an SMS or WhatsApp chat invite to a customer phone number
   */
  static async createInvite(req, res, next) {
    try {
      const { phone, customerName, notes, customMessage, channel = 'sms' } = req.body;
      const agentId = req.user.id;
      const dispatchChannel = (channel || 'sms').toLowerCase() === 'whatsapp' ? 'whatsapp' : 'sms';

      if (!phone) {
        return res.status(400).json({ error: 'Customer phone number is required' });
      }

      // 1. Find or create customer
      const customer = await Customer.findOrCreate({
        phone: phone.trim(),
        name: customerName,
        notes
      });

      // 2. Generate unique invite token
      const inviteId = uuidv4();
      const expiresAt = new Date(Date.now() + env.CHAT_TOKEN_EXPIRY_MINUTES * 60 * 1000);
      
      const token = generateChatToken({
        inviteId,
        customerPhone: customer.phone,
        customerId: customer.id,
        agentId,
        expiresInMinutes: env.CHAT_TOKEN_EXPIRY_MINUTES
      });

      // 3. Persist invite
      const invite = await ChatInvite.create({
        token,
        customerPhone: customer.phone,
        agentId,
        channel: dispatchChannel,
        expiresAt: expiresAt.toISOString()
      });

      // 4. Construct Chat Link
      const chatLink = `${env.CLIENT_BASE_URL}/c/${token}`;
      let smsText;
      if (customMessage && customMessage.trim()) {
        smsText = customMessage
          .replace(/\{name\}/gi, customer.name || 'there')
          .replace(/\{link\}/gi, chatLink);
        if (!smsText.includes(chatLink)) {
          if (smsText.includes('💬 Chat with an Agent 👤')) {
            smsText = smsText.replace('💬 Chat with an Agent 👤', `💬 Chat with an Agent 👤: ${chatLink}`);
          } else {
            smsText += `\n\n💬 Chat with an Agent 👤: ${chatLink}`;
          }
        }
      } else {
        smsText = `Greetings!

With ideacorp, an authorized channel partner of e&, you can get a postpaid number with your Freedom Plan — 250 / 325 / 500.( All with discounted prices)

☑️ ${customer.phone || '0509900011'}

Enjoy our plan with all the benefits included in your package.

✨ If you are interested in seeing more Gold & Platinum numbers, we’ll be happy to assist you in finding a great number!

💬 Chat with an Agent 👤: ${chatLink}`;
      }

      // 5. Send via active SMS or WhatsApp Provider
      let dispatchResult;
      const cleanDigits = customer.phone.replace(/[^\d]/g, '');
      const waDirectLink = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(smsText)}`;

      if (dispatchChannel === 'whatsapp') {
        const whatsappProvider = getWhatsAppProvider();
        dispatchResult = await whatsappProvider.sendWhatsApp({
          to: customer.phone,
          message: smsText,
          metadata: {
            inviteId: invite.id,
            agentId,
            customerId: customer.id
          }
        });
      } else {
        const smsProvider = getSMSProvider();
        dispatchResult = await smsProvider.sendSMS({
          to: customer.phone,
          message: smsText,
          metadata: {
            inviteId: invite.id,
            agentId,
            customerId: customer.id
          }
        });
      }

      const channelLabel = dispatchChannel === 'whatsapp' ? 'WhatsApp API' : 'SMS';
      return res.status(201).json({
        message: `Chat invite created and sent via ${channelLabel} successfully`,
        invite: {
          id: invite.id,
          customerPhone: customer.phone,
          customerName: customer.name,
          agentId,
          channel: dispatchChannel,
          expiresAt: invite.expires_at,
          chatLink,
          waDirectLink
        },
        dispatchResult
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public validation endpoint for the customer chat link
   * GET /api/invites/validate/:token
   */
  static async validateToken(req, res, next) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ valid: false, error: 'Token missing' });
      }

      // 1. Cryptographic token check
      const verification = verifyChatToken(token);
      if (!verification.valid) {
        return res.status(400).json({ valid: false, error: verification.error });
      }

      // 2. Check database invite record
      const invite = await ChatInvite.findByToken(token);
      if (!invite) {
        return res.status(404).json({ valid: false, error: 'Invite not found in system records' });
      }

      const now = new Date();
      if (new Date(invite.expires_at) < now) {
        return res.status(410).json({ valid: false, error: 'Chat invite link has expired. Please request a new invite.' });
      }

      // 3. Find customer and agent details
      const customer = await Customer.findByPhone(invite.customer_phone);
      let agent = null;
      if (invite.agent_id) {
        agent = await User.findById(invite.agent_id);
      }

      // 4. Check if conversation is already linked or closed
      let conversation = null;
      if (invite.conversation_id) {
        conversation = await Conversation.findById(invite.conversation_id);
        if (conversation && conversation.status === 'closed') {
          return res.status(410).json({
            valid: false,
            error: 'This support session has already been closed. Please request a new link.'
          });
        }
      }

      return res.json({
        valid: true,
        invite: {
          id: invite.id,
          expiresAt: invite.expires_at,
          conversationId: invite.conversation_id || null
        },
        customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : null,
        agent: agent ? { id: agent.id, name: agent.name, status: agent.status } : null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List recent invites (Staff only)
   */
  static async listInvites(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);
      const invites = await ChatInvite.list({ limit, offset });
      return res.json({ invites });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InviteController;
