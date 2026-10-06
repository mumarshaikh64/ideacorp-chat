/**
 * Base WhatsAppProvider Interface / Abstract Class
 * All WhatsApp Gateway providers must implement this interface to be swappable.
 */
class WhatsAppProvider {
  /**
   * Send a WhatsApp message
   * @param {Object} options
   * @param {string} options.to - Recipient phone number (E.164 format)
   * @param {string} options.message - Message body text
   * @param {Object} [options.metadata] - Optional campaign or invite metadata
   * @returns {Promise<{ success: boolean, messageId: string, provider: string }>}
   */
  async sendWhatsApp({ to, message, metadata = {} }) {
    throw new Error('sendWhatsApp() method must be implemented by subclass');
  }
}

module.exports = WhatsAppProvider;
