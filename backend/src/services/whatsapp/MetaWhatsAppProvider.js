const WhatsAppProvider = require('./WhatsAppProvider');
const env = require('../../config/env');
const db = require('../../config/db');

/**
 * Meta WhatsApp Cloud API Provider (Official Meta Direct API)
 * Dispatches messages via Meta Graph API (https://graph.facebook.com/v22.0/{phone_number_id}/messages)
 */
class MetaWhatsAppProvider extends WhatsAppProvider {
  constructor(config = {}) {
    super();
    this.phoneNumberId = config.phoneNumberId || env.META_WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = config.accessToken || env.META_WHATSAPP_ACCESS_TOKEN;
    this.apiVersion = config.apiVersion || 'v22.0';
    this.templateName = config.templateName || 'hello_world';
    this.templateLanguage = config.templateLanguage || 'en_US';
  }

  async resolveCredentials() {
    let phoneNumberId = this.phoneNumberId;
    let accessToken = this.accessToken;

    if (!phoneNumberId || !accessToken) {
      try {
        const res = await db.query(
          "SELECT key, value FROM system_settings WHERE key IN ('meta_whatsapp_phone_number_id', 'meta_whatsapp_access_token')"
        );
        for (const row of res.rows) {
          if (row.key === 'meta_whatsapp_phone_number_id' && row.value) {
            phoneNumberId = row.value;
          }
          if (row.key === 'meta_whatsapp_access_token' && row.value) {
            accessToken = row.value;
          }
        }
      } catch (err) {
        // Ignore DB query errors in fallback
      }
    }

    return { phoneNumberId, accessToken };
  }

  async sendWhatsApp({ to, message, metadata = {} }) {
    const { phoneNumberId, accessToken } = await this.resolveCredentials();

    if (!phoneNumberId || !accessToken) {
      console.warn('[MetaWhatsApp] Missing META_WHATSAPP_PHONE_NUMBER_ID or META_WHATSAPP_ACCESS_TOKEN credentials. Printing simulation block.');
      const MockWhatsAppProvider = require('./MockWhatsAppProvider');
      const mock = new MockWhatsAppProvider();
      return mock.sendWhatsApp({ to, message, metadata });
    }

    // Format phone number (E.164 without leading '+')
    let cleanPhone = String(to).replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('920') && cleanPhone.length === 13) {
      cleanPhone = '92' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('03') && cleanPhone.length === 11) {
      cleanPhone = '92' + cleanPhone.slice(1);
    }
    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`;

    // Send the full custom system message and chat link by default.
    // Use template only if explicitly requested in metadata (e.g. metadata.templateName or useTemplate: true).
    const useTemplate = Boolean(metadata.templateName || metadata.useTemplate);
    let payload;

    if (useTemplate) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'template',
        template: {
          name: metadata.templateName || this.templateName || 'hello_world',
          language: { code: metadata.templateLanguage || this.templateLanguage || 'en_US' }
        }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: true,
          body: message
        }
      };
    }

    try {
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let data = await response.json();

      // If text message fails because 24hr window is closed (Error 131047 / template required), fallback to template
      if ((!response.ok || data.error) && !useTemplate) {
        const errCode = data.error?.code;
        const errMsg = data.error?.message || '';

        if (errCode === 131047 || errMsg.toLowerCase().includes('re-engagement') || errMsg.toLowerCase().includes('template')) {
          console.warn(`[Meta WhatsApp] Text message restricted outside 24h window. Falling back to '${this.templateName}' template...`);
          const fallbackPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'template',
            template: {
              name: this.templateName,
              language: { code: this.templateLanguage }
            }
          };

          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fallbackPayload)
          });
          data = await response.json();
        }
      }

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `Meta API Error (${response.status})`;
        console.error(`[Meta WhatsApp Error] Code: ${data.error?.code}, Message: ${errorMsg}`);
        throw new Error(`Meta WhatsApp API Error: ${errorMsg}`);
      }

      const messageId = data.messages?.[0]?.id || `meta_wa_${Date.now()}`;
      console.log(`[Meta WhatsApp] Successfully dispatched message ${messageId} to ${cleanPhone}`);

      return {
        success: true,
        messageId,
        provider: 'meta_whatsapp',
        recipient: cleanPhone,
        sentAt: new Date().toISOString()
      };
    } catch (err) {
      console.error(`[Meta WhatsApp Exception] Failed sending to ${to}:`, err.message);
      throw err;
    }
  }

  async verifyConfig() {
    const { phoneNumberId, accessToken } = await this.resolveCredentials();
    return Boolean(phoneNumberId && accessToken);
  }
}

module.exports = MetaWhatsAppProvider;