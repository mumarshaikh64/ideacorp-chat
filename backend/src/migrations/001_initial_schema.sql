-- ====================================================================
-- REAL-TIME SMS-TO-CHAT SUPPORT PLATFORM SCHEMA (PostgreSQL)
-- Migration 001: Initial Schema
-- ====================================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Admin, Sales Agent, Supervisor, Viewer)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'supervisor', 'viewer')),
    status VARCHAR(32) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'offline')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    current_agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'transferred', 'closed')),
    handling_mode VARCHAR(32) NOT NULL DEFAULT 'ai' CHECK (handling_mode IN ('ai', 'human')),
    handoff_requested BOOLEAN DEFAULT FALSE,
    handoff_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(32) NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system', 'bot')),
    sender_id VARCHAR(64),
    content TEXT,
    message_type VARCHAR(32) NOT NULL DEFAULT 'text',
    file_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Campaigns Table (for Bulk SMS & WhatsApp Broadcasts)
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    total_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    channel VARCHAR(32) NOT NULL DEFAULT 'sms',
    template TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Chat Invites Table
CREATE TABLE IF NOT EXISTS chat_invites (
    id VARCHAR(64) PRIMARY KEY,
    token VARCHAR(512) UNIQUE NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE SET NULL,
    campaign_id VARCHAR(64) REFERENCES campaigns(id) ON DELETE SET NULL,
    channel VARCHAR(32) NOT NULL DEFAULT 'sms',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Transfer Logs Table
CREATE TABLE IF NOT EXISTS transfer_logs (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    from_agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    to_agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    transferred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Agent Status Logs Table
CREATE TABLE IF NOT EXISTS agent_status_logs (
    id VARCHAR(64) PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Telecom Numbers Inventory Table
CREATE TABLE IF NOT EXISTS telecom_numbers (
    id VARCHAR(64) PRIMARY KEY,
    mssid VARCHAR(32) NOT NULL UNIQUE,
    owner VARCHAR(128) DEFAULT 'RESELLER MANAGEMENT',
    category VARCHAR(64) DEFAULT 'Standard',
    assigned_date VARCHAR(64),
    status VARCHAR(32) DEFAULT 'available', -- 'available', 'reserved', 'sold', 'assigned'
    reserved_by_agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reserved_by_agent_name VARCHAR(128),
    reserved_for_customer_phone VARCHAR(32),
    reserved_for_customer_name VARCHAR(128),
    conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE SET NULL,
    reserved_at TIMESTAMP WITH TIME ZONE,
    reservation_expires_at TIMESTAMP WITH TIME ZONE,
    sold_at TIMESTAMP WITH TIME ZONE,
    sold_by_agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(current_agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_invites_token ON chat_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_phone ON chat_invites(customer_phone);
CREATE INDEX IF NOT EXISTS idx_telecom_numbers_mssid ON telecom_numbers(mssid);
CREATE INDEX IF NOT EXISTS idx_telecom_numbers_category ON telecom_numbers(category);
CREATE INDEX IF NOT EXISTS idx_telecom_numbers_status ON telecom_numbers(status);
CREATE INDEX IF NOT EXISTS idx_telecom_numbers_reservation_exp ON telecom_numbers(reservation_expires_at);

