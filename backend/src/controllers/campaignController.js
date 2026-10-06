const Campaign = require('../models/Campaign');
const Customer = require('../models/Customer');
const ChatInvite = require('../models/ChatInvite');
const { generateChatToken } = require('../services/tokenService');
const { getSMSProvider } = require('../services/sms');
const { getWhatsAppProvider } = require('../services/whatsapp');
const env = require('../config/env');
const { v4: uuidv4 } = require('uuid');

class CampaignController {
  /**
   * Dispatch a bulk SMS or WhatsApp campaign with unique tokens per recipient
   */
  static async createBulkCampaign(req, res, next) {
    try {
      const { name, template, recipients, channel = 'sms' } = req.body;
      const agentId = req.user.id;
      const dispatchChannel = (channel || 'sms').toLowerCase() === 'whatsapp' ? 'whatsapp' : 'sms';

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Campaign name is required' });
      }

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Recipients array is required and must not be empty' });
      }

      const defaultTemplate = template && template.trim().length > 0
        ? template.trim()
        : `Greetings!

With ideacorp, an authorized channel partner of e&, you can get a postpaid number with your Freedom Plan — 250 / 325 / 500.( All with discounted prices)

☑️ 0509900011

Enjoy our plan with all the benefits included in your package.

✨ If you are interested in seeing more Gold & Platinum numbers, we’ll be happy to assist you in finding a great number!

💬 Chat with an Agent 👤: {link}`;

      // 1. Sanitize and Deduplicate Recipients by phone
      const uniqueMap = new Map();
      for (const r of recipients) {
        if (!r.phone) continue;
        const cleanPhone = String(r.phone).trim();
        if (cleanPhone.length >= 7 && !uniqueMap.has(cleanPhone)) {
          uniqueMap.set(cleanPhone, {
            phone: cleanPhone,
            name: r.name ? String(r.name).trim() : '',
            notes: r.notes ? String(r.notes).trim() : ''
          });
        }
      }

      const validRecipients = Array.from(uniqueMap.values());
      if (validRecipients.length === 0) {
        return res.status(400).json({ error: 'No valid phone numbers found in recipient list' });
      }

      // 2. Initialize Campaign record
      const campaign = await Campaign.create({
        name: name.trim(),
        agentId,
        totalCount: validRecipients.length,
        template: defaultTemplate,
        channel: dispatchChannel,
        status: 'processing'
      });

      const smsProvider = getSMSProvider();
      const whatsappProvider = getWhatsAppProvider();
      let sentCount = 0;
      let failedCount = 0;
      const dispatchedInvites = [];

      // 3. Batch Dispatching (Process in chunks of 10)
      const CHUNK_SIZE = 10;
      for (let i = 0; i < validRecipients.length; i += CHUNK_SIZE) {
        const chunk = validRecipients.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async (recipient) => {
          try {
            // Find or create customer
            const customer = await Customer.findOrCreate({
              phone: recipient.phone,
              name: recipient.name || null,
              notes: recipient.notes || null
            });

            // Generate unique, signed, expiring chat token
            const inviteId = uuidv4();
            const expiresAt = new Date(Date.now() + env.CHAT_TOKEN_EXPIRY_MINUTES * 60 * 1000);
            const token = generateChatToken({
              inviteId,
              customerPhone: customer.phone,
              customerId: customer.id,
              agentId,
              expiresInMinutes: env.CHAT_TOKEN_EXPIRY_MINUTES
            });

            // Save chat invite linked to campaign
            const invite = await ChatInvite.create({
              token,
              customerPhone: customer.phone,
              agentId,
              campaignId: campaign.id,
              channel: dispatchChannel,
              expiresAt: expiresAt.toISOString()
            });

            const chatLink = `${env.CLIENT_BASE_URL}/c/${token}`;

            // Interpolate dynamic template placeholders
            const displayName = customer.name || 'there';
            let messageBody = defaultTemplate
              .replace(/\{name\}/gi, displayName)
              .replace(/\{link\}/gi, chatLink);

            if (!messageBody.includes(chatLink)) {
              if (messageBody.includes('💬 Chat with an Agent 👤')) {
                messageBody = messageBody.replace('💬 Chat with an Agent 👤', `💬 Chat with an Agent 👤: ${chatLink}`);
              } else {
                messageBody += `\n\n💬 Chat with an Agent 👤: ${chatLink}`;
              }
            }

            // Dispatch message based on channel (SMS or WhatsApp API)
            if (dispatchChannel === 'whatsapp') {
              await whatsappProvider.sendWhatsApp({
                to: customer.phone,
                message: messageBody,
                metadata: {
                  campaignId: campaign.id,
                  inviteId: invite.id,
                  customerId: customer.id
                }
              });
            } else {
              await smsProvider.sendSMS({
                to: customer.phone,
                message: messageBody,
                metadata: {
                  campaignId: campaign.id,
                  inviteId: invite.id,
                  customerId: customer.id
                }
              });
            }

            sentCount++;
            dispatchedInvites.push({
              phone: customer.phone,
              name: customer.name,
              chatLink,
              channel: dispatchChannel,
              status: 'sent'
            });
          } catch (err) {
            console.error(`[Bulk ${dispatchChannel.toUpperCase()}] Failed sending to ${recipient.phone}:`, err.message);
            failedCount++;
          }
        }));
      }

      // 4. Update Campaign completion
      const updatedCampaign = await Campaign.updateCounts(campaign.id, {
        sentCount,
        failedCount,
        status: failedCount === validRecipients.length ? 'failed' : 'completed'
      });

      const channelLabel = dispatchChannel === 'whatsapp' ? 'WhatsApp API' : 'SMS';
      return res.status(201).json({
        message: `Bulk ${channelLabel} Campaign launched successfully. Sent: ${sentCount}, Failed: ${failedCount}`,
        campaign: updatedCampaign,
        samplePreview: dispatchedInvites.slice(0, 5),
        totalDispatched: sentCount
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all campaigns with conversion metrics
   */
  static async listCampaigns(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);
      const campaigns = await Campaign.list({ limit, offset });
      return res.json({ campaigns });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single campaign details and recipients
   */
  static async getCampaignDetails(req, res, next) {
    try {
      const { id } = req.params;
      const campaign = await Campaign.findById(id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const recipients = await Campaign.getRecipients(id);
      return res.json({ campaign, recipients });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CampaignController;
