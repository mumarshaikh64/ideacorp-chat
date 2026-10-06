const { io } = require('socket.io-client');

async function runEndToEndTest() {
  console.log('===============================================================');
  console.log('🧪 Starting End-to-End Real-Time SMS-to-Chat Verification Test');
  console.log('===============================================================\n');

  // 1. Authenticate Agent Sarah via REST API
  const sarahLoginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'agent.sarah@ideacrop.com', password: 'Agent123!' })
  });
  const sarahAuth = await sarahLoginRes.json();
  const sarahToken = sarahAuth.token;
  const sarahId = sarahAuth.user.id;
  console.log('✅ 1. Agent Sarah authenticated (JWT token acquired)');

  // 2. Authenticate Agent Mike via REST API
  const mikeLoginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'agent.mike@ideacrop.com', password: 'Agent123!' })
  });
  const mikeAuth = await mikeLoginRes.json();
  const mikeToken = mikeAuth.token;
  const mikeId = mikeAuth.user.id;
  console.log('✅ 2. Agent Mike authenticated (JWT token acquired)');

  // 3. Sarah sends SMS invite to customer
  const inviteRes = await fetch('http://localhost:5001/api/invites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sarahToken}`
    },
    body: JSON.stringify({
      phone: '+15550998877',
      customerName: 'Marcus Vance',
      notes: 'Wants 5G business lines'
    })
  });
  const inviteData = await inviteRes.json();
  const chatLink = inviteData.invite.chatLink;
  const chatToken = chatLink.split('/c/')[1];
  console.log(`✅ 3. SMS invite dispatched via Mock provider. Chat link: ${chatLink}`);

  // 4. Connect Agent Sarah via Socket.IO
  const sarahSocket = io('http://localhost:5001', {
    auth: { token: sarahToken }
  });

  // 5. Connect Agent Mike via Socket.IO
  const mikeSocket = io('http://localhost:5001', {
    auth: { token: mikeToken }
  });

  // 6. Connect Customer via Socket.IO using public chatToken
  const customerSocket = io('http://localhost:5001', {
    auth: { chatToken }
  });

  await new Promise((resolve) => {
    let connectedCount = 0;
    const check = () => {
      connectedCount++;
      if (connectedCount === 3) resolve();
    };
    sarahSocket.on('connect', check);
    mikeSocket.on('connect', check);
    customerSocket.on('connect', check);
  });
  console.log('✅ 4. All 3 Socket.IO connections established (Sarah, Mike, Customer)');

  // Set up listeners
  let conversationId = null;

  sarahSocket.on('new_chat_assigned', (data) => {
    console.log(`🔔 Agent Sarah received 'new_chat_assigned' notification for customer ${data.customer.name}!`);
  });

  // 7. Customer clicks quick topic "Unlimited 5G Max" -> emits chat:start
  const startResult = await new Promise((resolve) => {
    customerSocket.emit('chat:start', { initialOption: 'Unlimited 5G Max Plans' }, resolve);
  });
  conversationId = startResult.conversationId;
  console.log(`✅ 5. Customer initiated live chat session (Conversation ID: ${conversationId})`);

  // Sarah joins conversation room
  await new Promise((resolve) => {
    sarahSocket.emit('chat:join', { conversationId }, resolve);
  });

  // 8. Customer sends live message
  customerSocket.emit('chat:message', {
    conversationId,
    content: 'Hello Sarah! Does the Unlimited 5G plan include mobile hotspot?',
    messageType: 'text'
  });

  await new Promise((resolve) => {
    sarahSocket.on('chat:message', (msg) => {
      if (msg.sender_type === 'customer') {
        console.log(`💬 Agent Sarah received customer message: "${msg.content}" (Status: ${msg.status})`);
        resolve();
      }
    });
  });

  // 9. Sarah types and replies
  sarahSocket.emit('chat:typing', { conversationId, isTyping: true });
  sarahSocket.emit('chat:message', {
    conversationId,
    content: 'Yes Marcus! It includes 15GB of 5G mobile hotspot data each month.',
    messageType: 'text'
  });

  await new Promise((resolve) => {
    customerSocket.on('chat:message', (msg) => {
      if (msg.sender_type === 'agent') {
        console.log(`💬 Customer received agent reply: "${msg.content}"`);
        // Acknowledge read receipt
        customerSocket.emit('chat:read', { conversationId });
        resolve();
      }
    });
  });

  // 10. Sarah transfers chat to Agent Mike
  console.log('\n🔄 Initiating live chat transfer from Agent Sarah to Agent Mike...');

  const transferPromise = new Promise((resolve) => {
    customerSocket.on('chat:transferred', (transferEvent) => {
      console.log(`🎉 Customer received seamless transfer notice: Transferred from ${transferEvent.fromAgentName} to ${transferEvent.toAgentName}!`);
      resolve();
    });
  });

  const mikeAssignedPromise = new Promise((resolve) => {
    mikeSocket.on('new_chat_assigned', (data) => {
      console.log(`🔔 Agent Mike received 'new_chat_assigned' notification for transferred chat!`);
      resolve();
    });
  });

  sarahSocket.emit('chat:transfer_request', {
    conversationId,
    toAgentId: mikeId,
    reason: 'Customer requires enterprise device quote'
  }, (res) => {
    console.log(`✅ Transfer request acknowledged: ${res.message}`);
  });

  await Promise.all([transferPromise, mikeAssignedPromise]);

  // 11. Mike joins transferred room and sends message
  await new Promise((resolve) => {
    mikeSocket.emit('chat:join', { conversationId }, resolve);
  });

  mikeSocket.emit('chat:message', {
    conversationId,
    content: 'Hi Marcus, Mike here! I can prepare that enterprise quote for your business lines right now.',
    messageType: 'text'
  });

  await new Promise((resolve) => {
    customerSocket.on('chat:message', (msg) => {
      if (msg.sender_type === 'agent' && msg.content.includes('Mike here')) {
        console.log(`💬 Customer received message from new Agent Mike: "${msg.content}"`);
        resolve();
      }
    });
  });

  // 12. Mike closes the chat
  await new Promise((resolve) => {
    customerSocket.on('chat:closed', (closedEvent) => {
      console.log(`🏁 Customer received session closed event: Closed by ${closedEvent.closedBy}`);
      resolve();
    });
    mikeSocket.emit('chat:close', { conversationId, reason: 'Inquiry resolved successfully' });
  });

  // Cleanup
  sarahSocket.disconnect();
  mikeSocket.disconnect();
  customerSocket.disconnect();

  console.log('\n===============================================================');
  console.log('🌟 ALL 12 REAL-TIME SMS-TO-CHAT TEST STEPS PASSED WITH 100% SUCCESS!');
  console.log('===============================================================\n');
  process.exit(0);
}

runEndToEndTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
