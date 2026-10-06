/**
 * Base SMSProvider Interface / Abstract Class
 * 
 * All SMS Gateway providers must implement this interface to be swappable.
 */
class SMSProvider {
  /**
   * Send an SMS message
   * @param {Object} options
   * @param {string} options.to - Recipient phone number (E.164 format)
   * @param {string} options.message - Text body including chat link
   * @param {Object} [options.metadata] - Optional tracing/audit data
   * @returns {Promise<{ success: boolean, messageId: string, provider: string }>}
   */
  async sendSMS({ to, message, metadata = {} }) {
    throw new Error('sendSMS() method must be implemented by subclass');
  }

  /**
   * Health check / validation of provider configuration
   * @returns {Promise<boolean>}
   */
  async verifyConfig() {
    return true;
  }
}

module.exports = SMSProvider;
