const db = require('../config/db');
const { setSMSProvider } = require('../services/sms');
const { setWhatsAppProvider } = require('../services/whatsapp');

class SettingsController {
  static async getSettings(req, res, next) {
    try {
      const result = await db.query('SELECT key, value, description, updated_at FROM system_settings');
      const settings = {};
      result.rows.forEach(r => {
        settings[r.key] = r.value;
      });
      return res.json({ settings, raw: result.rows });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings object is required' });
      }

      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined && value !== null) {
          await db.query(
            `INSERT INTO system_settings (key, value, updated_at) 
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
            [key, String(value)]
          );
        }
      }

      // Sync runtime SMS & WhatsApp providers with credentials
      const smsProvider = settings.sms_provider || 'mock';
      const whatsappProvider = settings.whatsapp_provider || 'mock';

      const twilioConfig = {
        accountSid: settings.twilio_account_sid,
        authToken: settings.twilio_auth_token,
        fromNumber: settings.twilio_sms_from
      };

      const waConfig = {
        accountSid: settings.twilio_account_sid,
        authToken: settings.twilio_auth_token,
        fromNumber: settings.twilio_whatsapp_from,
        phoneNumberId: settings.meta_whatsapp_phone_number_id,
        accessToken: settings.meta_whatsapp_access_token
      };

      setSMSProvider(smsProvider, twilioConfig);
      setWhatsAppProvider(whatsappProvider, waConfig);

      return res.json({ message: 'Settings updated successfully', settings });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SettingsController;
