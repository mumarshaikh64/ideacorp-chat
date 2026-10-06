const SMSProvider = require('./SMSProvider');
const env = require('../../config/env');

/**
 * Twilio SMS Gateway Provider
 * 
 * Uses standard HTTPS requests or Twilio SDK to dispatch real SMS messages.
 */
class TwilioProvider extends SMSProvider {
  constructor(accountSid = env.TWILIO_ACCOUNT_SID, authToken = env.TWILIO_AUTH_TOKEN, fromNumber = env.SMS_FROM_NUMBER) {
    super();
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async sendSMS({ to, message, metadata = {} }) {
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }

    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', this.fromNumber);
      params.append('Body', message);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Twilio error code ${data.code}`);
      }

      return {
        success: true,
        messageId: data.sid,
        provider: 'twilio',
        status: data.status,
        sentAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('[Twilio SMS Error]', err.message);
      throw err;
    }
  }

  async verifyConfig() {
    return Boolean(this.accountSid && this.authToken);
  }
}

module.exports = TwilioProvider;
