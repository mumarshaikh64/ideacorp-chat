const WhatsAppProvider = require('./WhatsAppProvider');
const env = require('../../config/env');

/**
 * Twilio WhatsApp API Provider (Production)
 * Sends live WhatsApp messages via Twilio WhatsApp API (e.g. 'whatsapp:+14155238886')
 */
class TwilioWhatsAppProvider extends WhatsAppProvider {
  constructor(config = {}) {
    super();
    this.accountSid = config.accountSid || env.TWILIO_ACCOUNT_SID;
    this.authToken = config.authToken || env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config.fromNumber || env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  }

  async sendWhatsApp({ to, message, metadata = {} }) {
    if (!this.accountSid || !this.authToken) {
      console.warn('[TwilioWhatsApp] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN. Falling back to Mock print.');
      const MockWhatsAppProvider = require('./MockWhatsAppProvider');
      const mock = new MockWhatsAppProvider();
      return mock.sendWhatsApp({ to, message, metadata });
    }

    try {
      const twilio = require('twilio');
      const client = twilio(this.accountSid, this.authToken);

      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to.trim()}`;
      const formattedFrom = this.fromNumber.startsWith('whatsapp:') ? this.fromNumber : `whatsapp:${this.fromNumber}`;

      const res = await client.messages.create({
        body: message,
        from: formattedFrom,
        to: formattedTo
      });

      console.log(`[TwilioWhatsApp] Sent WhatsApp message ${res.sid} to ${to}`);
      return {
        success: true,
        messageId: res.sid,
        provider: 'twilio_whatsapp',
        status: res.status
      };
    } catch (err) {
      console.error(`[TwilioWhatsApp Error] Failed to send WhatsApp to ${to}:`, err.message);
      throw new Error(`WhatsApp Dispatch Failed: ${err.message}`);
    }
  }
}

module.exports = TwilioWhatsAppProvider;
