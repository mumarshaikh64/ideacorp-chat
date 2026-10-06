/**
 * Environment configuration and validation
 */
require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5001',
  CLIENT_BASE_URL: process.env.CLIENT_BASE_URL || process.env.API_BASE_URL || 'http://localhost:5001',

  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_FALLBACK_SQLITE: process.env.DB_FALLBACK_SQLITE !== 'false',

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  USE_REDIS: process.env.USE_REDIS === 'true',

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_jwt_secret_dev_only',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CHAT_TOKEN_SECRET: process.env.CHAT_TOKEN_SECRET || 'fallback_chat_token_secret_dev_only',
  CHAT_TOKEN_EXPIRY_MINUTES: parseInt(process.env.CHAT_TOKEN_EXPIRY_MINUTES || '60', 10),

  // SMS & WhatsApp
  SMS_GATEWAY_PROVIDER: process.env.SMS_GATEWAY_PROVIDER || 'mock',
  SMS_FROM_NUMBER: process.env.SMS_FROM_NUMBER || '+18005550199',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || 'meta',
  META_WHATSAPP_PHONE_NUMBER_ID: process.env.META_WHATSAPP_PHONE_NUMBER_ID || '',
  META_WHATSAPP_ACCESS_TOKEN: process.env.META_WHATSAPP_ACCESS_TOKEN || '',

  // Chat settings
  INACTIVITY_TIMEOUT_MINUTES: parseInt(process.env.INACTIVITY_TIMEOUT_MINUTES || '30', 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
};

module.exports = env;
