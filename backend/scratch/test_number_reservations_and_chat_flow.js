const db = require('../src/config/db');
const TelecomNumber = require('../src/models/TelecomNumber');
const TelecomAiService = require('../src/services/telecomAiService');

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING END-TO-END TELECOM NUMBER RESERVATIONS & CHAT TEST');
  console.log('================================================================\n');

  await db.initDB();

  // Test 1: AI Number Series Showcase in Chat
  console.log('👉 [Test 1] Customer asks about sequence/series numbers...');
  const aiRes = await TelecomAiService.getResponse('Mujhe koi accha VIP platinum ya gold series number chahiye');
  console.log('AI Intent:', aiRes.intent);
  console.log('Numbers returned in metadata count:', aiRes.numbers ? aiRes.numbers.length : 0);
  console.log('AI Options include booking buttons:', aiRes.options ? aiRes.options.some(o => o.key.startsWith('book_')) : false);
  if (!aiRes.numbers || aiRes.numbers.length === 0) {
    throw new Error('Test 1 Failed: Expected numbers in AI response metadata');
  }
  console.log('✅ [Test 1 Passed] AI dynamically showcased available series numbers in chat!\n');

  // Test 2: 3-Day Reservation Lifecycle
  console.log('👉 [Test 2] Customer books a number ("ye number book kar lo")...');
  const targetNumber = aiRes.numbers[0];
  console.log(`Reserving ${targetNumber.mssid} (${targetNumber.category}) for 3 days...`);

  const reserved = await TelecomNumber.reserveNumber({
    mssid: targetNumber.mssid,
    agentName: 'Ahmad Sales Agent',
    customerPhone: '+971509998877',
    customerName: 'Sultan Al Qasimi',
    durationDays: 3
  });

  console.log('Reserved Status:', reserved.status);
  console.log('Reservation Expiry:', reserved.reservation_expires_at);

  const expiryDiffHours = (new Date(reserved.reservation_expires_at).getTime() - new Date(reserved.reserved_at).getTime()) / (1000 * 60 * 60);
  console.log(`Duration set: ${Math.round(expiryDiffHours)} hours (~3 days)`);

  if (reserved.status !== 'reserved' || Math.round(expiryDiffHours) !== 72) {
    throw new Error('Test 2 Failed: Status should be reserved and expiry should be 72 hours');
  }
  console.log('✅ [Test 2 Passed] Number successfully locked for 3 days (72h)!\n');

  // Test 3: Excluded from Available Pool
  console.log('👉 [Test 3] Verify reserved number is excluded from available search/series...');
  const updatedSeries = await TelecomNumber.getSampleSeries({ limit: 20 });
  const isStillInPool = updatedSeries.some(n => n.mssid === targetNumber.mssid);
  console.log(`Is ${targetNumber.mssid} in available pool?`, isStillInPool);
  if (isStillInPool) {
    throw new Error('Test 3 Failed: Reserved number must not appear in available pool');
  }
  console.log('✅ [Test 3 Passed] Reserved number hidden from other agents & customers!\n');

  // Test 4: Sold within 3 Days -> Permanently Unavailable
  console.log('👉 [Test 4] Scenario A: Deal finalized within 3 days -> Agent marks as SOLD...');
  const sold = await TelecomNumber.sellNumber({
    mssid: targetNumber.mssid,
    agentId: 'agent-001'
  });
  console.log('Status after sale:', sold.status);
  console.log('Sold At:', sold.sold_at);
  if (sold.status !== 'sold' || !sold.sold_at) {
    throw new Error('Test 4 Failed: Expected status = sold');
  }
  console.log('✅ [Test 4 Passed] Number permanently marked as SOLD and unavailable!\n');

  // Test 5: Auto-Expiry after 3 Days without being sold -> Reverts to Available
  console.log('👉 [Test 5] Scenario B: Number reserved for 3 days, NOT sold -> Auto-expires to AVAILABLE...');
  const secondTarget = aiRes.numbers[1];
  console.log(`Reserving second number ${secondTarget.mssid}...`);
  await TelecomNumber.reserveNumber({
    mssid: secondTarget.mssid,
    agentName: 'Ahmad Sales Agent',
    customerPhone: '+971551122334',
    durationDays: 3
  });

  // Verify it is reserved
  const checkReserved = await TelecomNumber.findByMssid(secondTarget.mssid);
  console.log('Initial reservation status:', checkReserved.status);

  // Simulate 3 days passing (set expiry to 1 minute ago)
  console.log('Simulating 3 days passed without sale...');
  await db.query(`UPDATE telecom_numbers SET reservation_expires_at = datetime('now', '-1 minute') WHERE mssid = $1`, [secondTarget.mssid]);

  // Run auto-expiry check
  const released = await TelecomNumber.expireOverdueReservations();
  console.log('Auto-expiry release count:', released.length);

  const afterAutoExpiry = await TelecomNumber.findByMssid(secondTarget.mssid);
  console.log('Status after 3 days expired:', afterAutoExpiry.status);
  console.log('Reservation fields cleared? customerPhone:', afterAutoExpiry.reserved_for_customer_phone);

  if (afterAutoExpiry.status !== 'available' || afterAutoExpiry.reserved_for_customer_phone !== null) {
    throw new Error('Test 5 Failed: Overdue number should automatically revert to available');
  }
  console.log('✅ [Test 5 Passed] Overdue number automatically returned to available pool for everyone!\n');

  // Clean up test 4 sold number back to available for clean state
  await TelecomNumber.releaseNumber({ mssid: targetNumber.mssid });
  await db.query(`UPDATE telecom_numbers SET status = 'available', sold_at = NULL WHERE mssid = $1`, [targetNumber.mssid]);

  console.log('================================================================');
  console.log('🎉 ALL 5 TELECOM NUMBER RESERVATIONS & CHAT TESTS PASSED!');
  console.log('================================================================\n');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
