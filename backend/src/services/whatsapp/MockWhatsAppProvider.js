const WhatsAppProvider = require('./WhatsAppProvider');
const { v4: uuidv4 } = require('uuid');

/**
 * Mock WhatsApp Provider for Development & Testing
 * Logs outgoing WhatsApp API messages to the server terminal with a green styled box
 */
class MockWhatsAppProvider extends WhatsAppProvider {
  constructor() {
    super();
    this.sentMessages = [];
  }

  async sendWhatsApp({ to, message, metadata = {} }) {
    const messageId = `mock_wa_${uuidv4().substring(0, 8)}`;
    const cleanPhone = String(to).replace(/[^\d+]/g, '');
    const waDirectLink = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;

    const record = {
      messageId,
      to,
      message,
      metadata,
      waDirectLink,
      sentAt: new Date().toISOString()
    };

    this.sentMessages.unshift(record);
    if (this.sentMessages.length > 50) this.sentMessages.pop();

    console.log('\n================== [OUTGOING WHATSAPP API SIMULATION] ==================');
    console.log(`💬 Provider     : MOCK WHATSAPP BUSINESS API`);
    console.log(`📱 Recipient    : ${to}`);
    console.log(`🆔 Message ID   : ${messageId}`);
    if (metadata.campaignId) console.log(`📢 Campaign ID  : ${metadata.campaignId}`);
    console.log(`------------------------------------------------------------------------`);
    console.log(`📄 Message Content:\n${message}`);
    console.log(`------------------------------------------------------------------------`);
    console.log(`🔗 WhatsApp Direct Link: ${waDirectLink}`);
    console.log('========================================================================\n');

    return {
      success: true,
      messageId,
      provider: 'mock_whatsapp',
      waDirectLink,
      to,
      sentAt: record.sentAt
    };
  }

  getRecentMessages() {
    return this.sentMessages;
  }
}

module.exports = MockWhatsAppProvider;
