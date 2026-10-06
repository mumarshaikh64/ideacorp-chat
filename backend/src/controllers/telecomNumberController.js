const TelecomNumber = require('../models/TelecomNumber');
const Message = require('../models/Message');

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1IKbNNNBmNWJ8EvKh-utBdBpatIoqKB0du4V3RSEejlk/edit?gid=0#gid=0';

/**
 * Robust CSV parser for Telecom Numbers
 */
function parseTelecomCsv(csvContent) {
  if (!csvContent || typeof csvContent !== 'string') return [];

  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

  let mssidIdx = headers.findIndex(h => /mssid|phone|number|mobile/i.test(h));
  let ownerIdx = headers.findIndex(h => /owner|reseller|manager/i.test(h));
  let categoryIdx = headers.findIndex(h => /category|tier|type/i.test(h));
  let dateIdx = headers.findIndex(h => /date|assigned/i.test(h));

  if (mssidIdx === -1) mssidIdx = 0;
  if (ownerIdx === -1) ownerIdx = 1;
  if (categoryIdx === -1) categoryIdx = 2;
  if (dateIdx === -1) dateIdx = 3;

  const results = [];
  const startIndex = (mssidIdx !== -1 && /mssid|phone|number|category/i.test(headerLine)) ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const rawMssid = cols[mssidIdx];
    if (!rawMssid || rawMssid.length < 5) continue;

    // Clean MSSID: numbers and optional leading plus
    const cleanMssid = rawMssid.replace(/[^0-9+]/g, '');
    if (!cleanMssid) continue;

    const owner = cols[ownerIdx] || 'RESELLER MANAGEMENT';
    const category = cols[categoryIdx] || 'Standard';
    const assignedDate = cols[dateIdx] || '';

    results.push({
      mssid: cleanMssid,
      owner,
      category,
      assignedDate
    });
  }

  return results;
}

class TelecomNumberController {
  /**
   * List telecom numbers with search, category filtering & pagination
   * GET /api/numbers
   */
  static async list(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        category = '',
        status = '',
        sortBy = 'mssid',
        sortOrder = 'ASC'
      } = req.query;

      const result = await TelecomNumber.list({
        page,
        limit,
        search,
        category,
        status,
        sortBy,
        sortOrder
      });

      return res.json({
        success: true,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get KPI statistics and category distributions
   * GET /api/numbers/stats
   */
  static async getStats(req, res, next) {
    try {
      const stats = await TelecomNumber.getStats();
      return res.json({
        success: true,
        stats
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Import directly from Google Sheet URL
   * POST /api/numbers/import-google-sheet
   */
  static async importGoogleSheet(req, res, next) {
    try {
      const { sheetUrl = DEFAULT_SHEET_URL } = req.body || {};

      // Extract Sheet ID and gid
      const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) {
        return res.status(400).json({ error: 'Invalid Google Sheet URL format. Make sure it contains /d/<ID>/' });
      }

      const sheetId = idMatch[1];
      const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      console.log(`[Google Sheet Import] Fetching from: ${exportCsvUrl}`);

      const response = await fetch(exportCsvUrl, {
        headers: { 'User-Agent': 'IdeaCrop-Telecom-Importer/1.0' }
      });

      if (!response.ok) {
        return res.status(400).json({
          error: `Failed to fetch Google Sheet. HTTP status ${response.status}. Make sure the sheet sharing is set to "Anyone with the link can view".`
        });
      }

      const csvContent = await response.text();
      const records = parseTelecomCsv(csvContent);

      if (records.length === 0) {
        return res.status(400).json({ error: 'No valid phone numbers found in the Google Sheet.' });
      }

      console.log(`[Google Sheet Import] Parsed ${records.length} records. Starting batch upsert...`);
      const { insertedOrUpdated } = await TelecomNumber.upsertBatch(records);
      const stats = await TelecomNumber.getStats();

      return res.json({
        success: true,
        message: `Successfully imported ${insertedOrUpdated} telecom numbers from Google Sheet!`,
        totalProcessed: insertedOrUpdated,
        stats
      });
    } catch (err) {
      console.error('[Google Sheet Import Error]', err);
      next(err);
    }
  }

  /**
   * Upload CSV file
   * POST /api/numbers/upload
   */
  static async uploadCsv(req, res, next) {
    try {
      let csvContent = '';

      if (req.file) {
        csvContent = req.file.buffer ? req.file.buffer.toString('utf-8') : '';
      } else if (req.body && req.body.csvData) {
        csvContent = req.body.csvData;
      }

      if (!csvContent || !csvContent.trim()) {
        return res.status(400).json({ error: 'No CSV file or data provided' });
      }

      const records = parseTelecomCsv(csvContent);
      if (records.length === 0) {
        return res.status(400).json({ error: 'No valid phone numbers found in the uploaded CSV' });
      }

      const { insertedOrUpdated } = await TelecomNumber.upsertBatch(records);
      const stats = await TelecomNumber.getStats();

      return res.json({
        success: true,
        message: `Successfully uploaded ${insertedOrUpdated} telecom numbers!`,
        totalProcessed: insertedOrUpdated,
        stats
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Add a single number manually
   * POST /api/numbers
   */
  static async create(req, res, next) {
    try {
      const { mssid, owner, category, assignedDate, status, notes } = req.body;
      if (!mssid || mssid.trim().length < 5) {
        return res.status(400).json({ error: 'Valid phone number / MSSID is required' });
      }

      const cleanMssid = mssid.trim().replace(/[^0-9+]/g, '');
      const existing = await TelecomNumber.findByMssid(cleanMssid);
      if (existing) {
        return res.status(409).json({ error: `Phone number ${cleanMssid} already exists in inventory` });
      }

      const number = await TelecomNumber.create({
        mssid: cleanMssid,
        owner,
        category,
        assignedDate,
        status,
        notes
      });

      return res.status(201).json({
        success: true,
        message: 'Number added to inventory successfully',
        number
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update status or details of a number
   * PATCH /api/numbers/:id
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const number = await TelecomNumber.update(id, req.body);
      if (!number) {
        return res.status(404).json({ error: 'Number not found' });
      }

      return res.json({
        success: true,
        message: 'Number updated successfully',
        number
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete number
   * DELETE /api/numbers/:id
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      await TelecomNumber.delete(id);
      return res.json({
        success: true,
        message: 'Number removed from inventory'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get sample sequence/series numbers for chat showcase
   * GET /api/numbers/series
   */
  static async getSeries(req, res, next) {
    try {
      const { category, search, limit = 6 } = req.query;
      const series = await TelecomNumber.getSampleSeries({
        category,
        search,
        limit: parseInt(limit, 10) || 6
      });
      return res.json({
        success: true,
        series
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reserve a number for 3 days (72 hours)
   * POST /api/numbers/reserve
   */
  static async reserve(req, res, next) {
    try {
      const { mssid, id, customerPhone, customerName, conversationId, durationDays = 3 } = req.body;
      const target = id || mssid;
      if (!target) {
        return res.status(400).json({ error: 'MSSID or Number ID is required' });
      }

      const existing = (mssid ? await TelecomNumber.findByMssid(mssid) : null) || (id ? await TelecomNumber.findById(id) : null);
      if (!existing) {
        return res.status(404).json({ error: 'Number not found in inventory' });
      }

      if (existing.status === 'sold') {
        return res.status(400).json({ error: 'This number has already been sold and is permanently unavailable.' });
      }

      const agentId = req.user ? req.user.id : null;
      const agentName = req.user ? req.user.name : 'Sales Specialist';

      const updated = await TelecomNumber.reserveNumber({
        id: existing.id,
        mssid: existing.mssid,
        agentId,
        agentName,
        customerPhone: customerPhone || existing.reserved_for_customer_phone,
        customerName: customerName || existing.reserved_for_customer_name,
        conversationId,
        durationDays: parseInt(durationDays, 10) || 3
      });

      const io = req.app.get('io');
      if (io) {
        if (conversationId) {
          const sysMsg = await Message.create({
            conversationId,
            senderType: 'system',
            content: `🔒 VIP Number ${existing.mssid} (${existing.category}) has been RESERVED for 3 days for this customer by ${agentName}.`
          });
          io.to(`conversation_${conversationId}`).emit('chat:message', sysMsg);
          io.to(`conversation_${conversationId}`).emit('number:reserved', {
            number: updated,
            expiresAt: updated.reservation_expires_at
          });
        }
        io.emit('numbers:inventory_updated', { action: 'reserved', number: updated });
      }

      return res.json({
        success: true,
        message: `Number ${existing.mssid} reserved for 3 days (expires: ${new Date(updated.reservation_expires_at).toLocaleString()}).`,
        number: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark number as sold (permanently unavailable)
   * POST /api/numbers/sell
   */
  static async sell(req, res, next) {
    try {
      const { mssid, id, conversationId } = req.body;
      const target = id || mssid;
      if (!target) {
        return res.status(400).json({ error: 'MSSID or Number ID is required' });
      }

      const existing = (mssid ? await TelecomNumber.findByMssid(mssid) : null) || (id ? await TelecomNumber.findById(id) : null);
      if (!existing) {
        return res.status(404).json({ error: 'Number not found in inventory' });
      }

      const agentId = req.user ? req.user.id : null;
      const agentName = req.user ? req.user.name : 'Sales Specialist';

      const updated = await TelecomNumber.sellNumber({
        id: existing.id,
        mssid: existing.mssid,
        agentId
      });

      const io = req.app.get('io');
      if (io) {
        if (conversationId) {
          const sysMsg = await Message.create({
            conversationId,
            senderType: 'system',
            content: `🎉 Congratulations! VIP Number ${existing.mssid} (${existing.category}) has been SOLD and permanently assigned to customer by ${agentName}.`
          });
          io.to(`conversation_${conversationId}`).emit('chat:message', sysMsg);
          io.to(`conversation_${conversationId}`).emit('number:sold', { number: updated });
        }
        io.emit('numbers:inventory_updated', { action: 'sold', number: updated });
      }

      return res.json({
        success: true,
        message: `Number ${existing.mssid} marked as SOLD (permanently unavailable).`,
        number: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Release reserved number back to available pool
   * POST /api/numbers/release
   */
  static async release(req, res, next) {
    try {
      const { mssid, id, conversationId } = req.body;
      const target = id || mssid;
      if (!target) {
        return res.status(400).json({ error: 'MSSID or Number ID is required' });
      }

      const existing = (mssid ? await TelecomNumber.findByMssid(mssid) : null) || (id ? await TelecomNumber.findById(id) : null);
      if (!existing) {
        return res.status(404).json({ error: 'Number not found' });
      }

      const updated = await TelecomNumber.releaseNumber({
        id: existing.id,
        mssid: existing.mssid
      });

      const io = req.app.get('io');
      if (io) {
        if (conversationId) {
          const sysMsg = await Message.create({
            conversationId,
            senderType: 'system',
            content: `VIP Number ${existing.mssid} reservation has been released back to available pool.`
          });
          io.to(`conversation_${conversationId}`).emit('chat:message', sysMsg);
        }
        io.emit('numbers:inventory_updated', { action: 'released', number: updated });
      }

      return res.json({
        success: true,
        message: `Number ${existing.mssid} returned to available pool.`,
        number: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Share series/sequence numbers directly into chat
   * POST /api/numbers/share-to-chat
   */
  static async shareToChat(req, res, next) {
    try {
      const { conversationId, numbers, note } = req.body;
      if (!conversationId) {
        return res.status(400).json({ error: 'conversationId is required' });
      }
      if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'numbers array is required' });
      }

      const agentName = req.user ? req.user.name : 'Sales Specialist';
      const agentId = req.user ? req.user.id : null;

      const lines = numbers.map(n => `• ${n.category?.toLowerCase().includes('platinum') ? '💎' : n.category?.toLowerCase().includes('gold') ? '✨' : '🥈'} **${n.mssid}** (${n.category || 'VIP'}) — Available`);
      const messageContent = note
        ? `${note}\n\n${lines.join('\n')}`
        : `✨ Here are exclusive available VIP & sequence numbers curated for you:\n\n${lines.join('\n')}\n\n*Let me know which number you prefer and I can reserve it for you for 3 days!*`;

      const msg = await Message.create({
        conversationId,
        senderType: 'agent',
        senderId,
        content: messageContent,
        messageType: 'number_series',
        metadata: { numbers }
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`conversation_${conversationId}`).emit('chat:message', {
          ...msg,
          senderName: agentName
        });
      }

      return res.json({
        success: true,
        message: 'Numbers successfully shared in chat',
        chatMessage: msg
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Clear all numbers (Admin only)
   * POST /api/numbers/clear-all
   */
  static async clearAll(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only Super Admins can clear the inventory' });
      }

      await TelecomNumber.clearAll();
      return res.json({
        success: true,
        message: 'All numbers have been cleared from the inventory'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TelecomNumberController;
