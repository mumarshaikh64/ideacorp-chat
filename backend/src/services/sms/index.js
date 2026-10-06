const env = require('../../config/env');
const MockSMSProvider = require('./MockSMSProvider');
const TwilioProvider = require('./TwilioProvider');

let currentProvider = null;
const mockInstance = new MockSMSProvider();

/**
 * Returns the currently active SMS Provider instance
 */
function getSMSProvider() {
  const providerType = (env.SMS_GATEWAY_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'twilio') {
    if (!currentProvider || !(currentProvider instanceof TwilioProvider)) {
      currentProvider = new TwilioProvider();
    }
    return currentProvider;
  }

  // Default to mock provider
  return mockInstance;
}

/**
 * Allows dynamic runtime override of the SMS provider (e.g. from Admin Settings)
 */
function setSMSProvider(type, config = {}) {
  const normalized = (type || 'mock').toLowerCase();
  if (normalized === 'twilio') {
    currentProvider = new TwilioProvider(config.accountSid, config.authToken, config.fromNumber);
  } else {
    currentProvider = mockInstance;
  }
  return currentProvider;
}

module.exports = {
  getSMSProvider,
  setSMSProvider,
  mockInstance
};
