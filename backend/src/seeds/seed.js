const db = require('../config/db');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

async function seed() {
  console.log('[Seed] Initializing database seeding...');
  await db.initDB();

  try {
    // 1. Create Default Users (Roles: admin, agent, supervisor, viewer)
    const usersToCreate = [
      { name: 'System Administrator', email: 'admin@ideacrop.com', password: 'Admin123!', role: 'admin', status: 'online' },
      { name: 'Sarah Connor (Agent)', email: 'agent.sarah@ideacrop.com', password: 'Agent123!', role: 'agent', status: 'online' },
      { name: 'Mike Ross (Agent)', email: 'agent.mike@ideacrop.com', password: 'Agent123!', role: 'agent', status: 'online' },
      { name: 'Rachel Zane (Supervisor)', email: 'supervisor@ideacrop.com', password: 'Super123!', role: 'supervisor', status: 'online' },
      { name: 'Harvey Specter (Viewer)', email: 'viewer@ideacrop.com', password: 'Viewer123!', role: 'viewer', status: 'offline' }
    ];

    const createdUsers = {};
    for (const u of usersToCreate) {
      let existing = await User.findByEmail(u.email);
      if (!existing) {
        existing = await User.create(u);
        console.log(`[Seed] Created user: ${u.email} (${u.role})`);
      } else {
        console.log(`[Seed] User already exists: ${u.email}`);
      }
      createdUsers[u.email] = existing;
    }

    // 2. Create Sample Customers
    const customersToCreate = [
      {
        name: 'Alex Johnson',
        phone: '+15550192834',
        email: 'alex.j@example.com',
        notes: 'Interested in Unlimited 5G Family Bundle + 2 eSIMs'
      },
      {
        name: 'Elena Rostova',
        phone: '+15550183742',
        email: 'elena.r@example.com',
        notes: 'Requested iPhone 15 Pro device payment plan details'
      },
      {
        name: 'David Chen',
        phone: '+15550172651',
        email: 'david.c@example.com',
        notes: 'International roaming and business SIM inquiries'
      }
    ];

    const createdCustomers = [];
    for (const c of customersToCreate) {
      const cust = await Customer.findOrCreate(c);
      createdCustomers.push(cust);
      console.log(`[Seed] Customer registered: ${cust.name} (${cust.phone})`);
    }

    // 3. Seed an existing conversation with messages
    const existingConv = await Conversation.list({ limit: 1 });
    if (existingConv.length === 0 && createdCustomers.length > 0) {
      const sarah = createdUsers['agent.sarah@ideacrop.com'];
      const customer = createdCustomers[0];

      const conv = await Conversation.create({
        customerId: customer.id,
        currentAgentId: sarah.id,
        status: 'open'
      });

      await Message.create({
        conversationId: conv.id,
        senderType: 'system',
        content: 'Customer Alex Johnson joined chat via secure invite link.'
      });

      await Message.create({
        conversationId: conv.id,
        senderType: 'customer',
        content: 'Hi! I saw the SMS promo regarding the Unlimited 5G plan. Does it include roaming in Canada and Mexico?'
      });

      await Message.create({
        conversationId: conv.id,
        senderType: 'agent',
        senderId: sarah.id,
        content: 'Hello Alex! Yes, absolutely. Our Unlimited 5G Max plan includes 15GB of high-speed data in Canada & Mexico per month at no extra charge.'
      });

      console.log(`[Seed] Seeded sample conversation (ID: ${conv.id}) with customer ${customer.name}`);
    }

    // 4. Default System Settings
    const defaultSettings = [
      { key: 'sms_provider', value: 'mock', description: 'Active SMS Provider (mock | twilio)' },
      { key: 'chat_link_expiry_minutes', value: '60', description: 'Expiry duration for customer SMS links' },
      { key: 'auto_assignment_mode', value: 'least_busy', description: 'Routing algorithm for incoming chats (least_busy | round_robin)' },
      { key: 'business_hours', value: '08:00 - 20:00 EST', description: 'Official customer support operating hours' }
    ];

    for (const s of defaultSettings) {
      await db.query(
        `INSERT INTO system_settings (key, value, description, updated_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [s.key, s.value, s.description]
      );
    }

    console.log('[Seed] Seeding completed successfully!');
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
