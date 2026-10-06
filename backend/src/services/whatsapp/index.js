const MockWhatsAppProvider = require('./MockWhatsAppProvider');
const TwilioWhatsAppProvider = require('./TwilioWhatsAppProvider');
const MetaWhatsAppProvider = require('./MetaWhatsAppProvider');
const env = require('../../config/env');

let activeWhatsAppProviderInstance = null;
const mockInstance = new MockWhatsAppProvider();

/**
 * Returns the currently active WhatsApp Provider instance
 */
function getWhatsAppProvider() {
  if (activeWhatsAppProviderInstance) {
    return activeWhatsAppProviderInstance;
  }

  const providerType = (env.WHATSAPP_PROVIDER || 'mock').toLowerCase();

  switch (providerType) {
    case 'meta':
      activeWhatsAppProviderInstance = new MetaWhatsAppProvider();
      break;
    case 'twilio':
      activeWhatsAppProviderInstance = new TwilioWhatsAppProvider();
      break;
    case 'mock':
    default:
      activeWhatsAppProviderInstance = mockInstance;
      break;
  }

  return activeWhatsAppProviderInstance;
}

/**
 * Allows dynamic runtime override of the WhatsApp provider (e.g. from Admin Settings)
 */
function setWhatsAppProvider(type, config = {}) {
  const normalized = (type || 'mock').toLowerCase();
  if (normalized === 'meta') {
    activeWhatsAppProviderInstance = new MetaWhatsAppProvider(config);
  } else if (normalized === 'twilio') {
    activeWhatsAppProviderInstance = new TwilioWhatsAppProvider(config);
  } else {
    activeWhatsAppProviderInstance = mockInstance;
  }
  console.log(`[WhatsApp Gateway] Provider switched to: ${normalized.toUpperCase()}`);
  return activeWhatsAppProviderInstance;
}

module.exports = {
  getWhatsAppProvider,
  setWhatsAppProvider,
  MockWhatsAppProvider,
  TwilioWhatsAppProvider,
  MetaWhatsAppProvider
};
