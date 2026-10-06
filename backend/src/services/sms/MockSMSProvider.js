const SMSProvider = require('./SMSProvider');
const { v4: uuidv4 } = require('uuid');

/**
 * Mock SMS Provider for Development & Testing
 * 
 * Logs SMS content cleanly to the server terminal with a prominent box
 * and clickable URL, and stores sent messages in memory for test verification.
 */
class MockSMSProvider extends SMSProvider {
  constructor() {
    super();
    this.sentLog = [];
  }

  async sendSMS({ to, message, metadata = {} }) {
    const messageId = `mock_sms_${uuidv4().substring(0, 8)}`;
    const timestamp = new Date().toISOString();

    const record = {
      messageId,
      to,
      message,
      metadata,
      sentAt: timestamp,
      provider: 'mock'
    };

    this.sentLog.push(record);
    if (this.sentLog.length > 100) this.sentLog.shift(); // keep last 100

    console.log('\n================== [OUTGOING SMS SIMULATION] ==================');
    console.log(`To:        ${to}`);
    console.log(`Sent At:   ${timestamp}`);
    console.log(`Message ID:${messageId}`);
    console.log('----------------------------------------------------------------');
    console.log(message);
    console.log('================================================================\n');

    return {
      success: true,
      messageId,
      provider: 'mock',
      sentAt: timestamp
    };
  }

  getRecentLogs() {
    return this.sentLog;
  }
}

module.exports = MockSMSProvider;
