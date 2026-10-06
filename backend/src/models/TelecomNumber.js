const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class TelecomNumber {
  /**
   * Find single number by ID
   */
  static async findById(id) {
    const res = await db.query('SELECT * FROM telecom_numbers WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  /**
   * Find single number by MSSID
   */
  static async findByMssid(mssid) {
    const res = await db.query('SELECT * FROM telecom_numbers WHERE mssid = $1', [mssid]);
    return res.rows[0] || null;
  }

  /**
   * List telecom numbers with filters, search, and pagination
   */
  static async list({
    page = 1,
    limit = 50,
    search = '',
    category = '',
    status = '',
    sortBy = 'mssid',
    sortOrder = 'ASC'
  } = {}) {
    // Auto-check and release any expired reservations before listing
    await this.expireOverdueReservations();

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const where = [];
    const values = [];
    let idx = 1;

    if (search && search.trim()) {
      where.push(`(mssid LIKE $${idx++} OR owner LIKE $${idx++})`);
      values.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category.trim() && category !== 'all') {
      where.push(`LOWER(category) = LOWER($${idx})`);
      values.push(category.trim());
      idx++;
    }

    if (status && status.trim() && status !== 'all') {
      where.push(`status = $${idx}`);
      values.push(status.trim());
      idx++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM telecom_numbers ${whereClause}`;
    const countRes = await db.query(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    // Allowed sort columns to prevent SQL injection
    const allowedSort = ['mssid', 'category', 'owner', 'assigned_date', 'status', 'created_at'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'mssid';
    const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const dataSql = `
      SELECT 
        id, mssid, owner, category, assigned_date, status, notes,
        reserved_by_agent_id, reserved_by_agent_name,
        reserved_for_customer_phone, reserved_for_customer_name,
        conversation_id, reserved_at, reservation_expires_at,
        sold_at, sold_by_agent_id,
        created_at, updated_at
      FROM telecom_numbers
      ${whereClause}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const dataValues = [...values, parseInt(limit, 10), offset];
    const dataRes = await db.query(dataSql, dataValues);

    return {
      numbers: dataRes.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    };
  }

  /**
   * Automatically check and release overdue reservations (older than 3 days / 72h)
   */
  static async expireOverdueReservations() {
    try {
      const expiredRes = await db.query(`
        SELECT id, mssid, reserved_for_customer_phone, reserved_by_agent_name, reservation_expires_at
        FROM telecom_numbers
        WHERE status = 'reserved' 
          AND reservation_expires_at IS NOT NULL 
          AND reservation_expires_at <= CURRENT_TIMESTAMP
      `);

      if (expiredRes.rows && expiredRes.rows.length > 0) {
        await db.query(`
          UPDATE telecom_numbers
          SET status = 'available',
              reserved_by_agent_id = NULL,
              reserved_by_agent_name = NULL,
              reserved_for_customer_phone = NULL,
              reserved_for_customer_name = NULL,
              conversation_id = NULL,
              reserved_at = NULL,
              reservation_expires_at = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE status = 'reserved' 
            AND reservation_expires_at IS NOT NULL 
            AND reservation_expires_at <= CURRENT_TIMESTAMP
        `);
        console.log(`[Reservation Auto-Expiry] Released ${expiredRes.rows.length} overdue number(s) back to available pool.`);
      }

      return expiredRes.rows || [];
    } catch (err) {
      console.error('[expireOverdueReservations Error]', err.message);
      return [];
    }
  }

  /**
   * Reserve a number for a customer (default 3 days / 72 hours)
   */
  static async reserveNumber({ id, mssid, agentId, agentName, customerPhone, customerName, conversationId, durationDays = 3 }) {
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const reservedAt = new Date().toISOString();

    const target = id || mssid;
    await db.query(`
      UPDATE telecom_numbers
      SET status = 'reserved',
          reserved_by_agent_id = $1,
          reserved_by_agent_name = $2,
          reserved_for_customer_phone = $3,
          reserved_for_customer_name = $4,
          conversation_id = $5,
          reserved_at = $6,
          reservation_expires_at = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 OR mssid = $8
    `, [
      agentId || null,
      agentName || null,
      customerPhone || null,
      customerName || null,
      conversationId || null,
      reservedAt,
      expiresAt,
      target
    ]);

    return (mssid ? await this.findByMssid(mssid) : null) || (id ? await this.findById(id) : null);
  }

  /**
   * Mark number as sold / unavailable (permanently locked, cannot be acquired by anyone else)
   */
  static async sellNumber({ id, mssid, agentId }) {
    const soldAt = new Date().toISOString();
    const target = id || mssid;

    await db.query(`
      UPDATE telecom_numbers
      SET status = 'sold',
          sold_at = $1,
          sold_by_agent_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 OR mssid = $3
    `, [soldAt, agentId || null, target]);

    return (mssid ? await this.findByMssid(mssid) : null) || (id ? await this.findById(id) : null);
  }

  /**
   * Release reserved number back to available pool
   */
  static async releaseNumber({ id, mssid }) {
    const target = id || mssid;
    await db.query(`
      UPDATE telecom_numbers
      SET status = 'available',
          reserved_by_agent_id = NULL,
          reserved_by_agent_name = NULL,
          reserved_for_customer_phone = NULL,
          reserved_for_customer_name = NULL,
          conversation_id = NULL,
          reserved_at = NULL,
          reservation_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 OR mssid = $1
    `, [target]);

    return (mssid ? await this.findByMssid(mssid) : null) || (id ? await this.findById(id) : null);
  }

  /**
   * Get sample sequence/series numbers for live chat showcase
   */
  static async getSampleSeries({ category = null, search = null, limit = 6 } = {}) {
    await this.expireOverdueReservations();

    const where = ["status = 'available'"];
    const values = [];
    let idx = 1;

    if (category && category !== 'all') {
      where.push(`LOWER(category) = LOWER($${idx++})`);
      values.push(category.trim());
    }

    if (search && search.trim()) {
      where.push(`mssid LIKE $${idx++}`);
      values.push(`%${search.trim()}%`);
    }

    const sql = `
      SELECT id, mssid, category, owner, assigned_date, status
      FROM telecom_numbers
      WHERE ${where.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN LOWER(category) LIKE '%platinum%' THEN 1
          WHEN LOWER(category) LIKE '%gold%' THEN 2
          WHEN LOWER(category) LIKE '%silver%' THEN 3
          ELSE 4
        END,
        mssid ASC
      LIMIT ${parseInt(limit, 10)}
    `;

    const res = await db.query(sql, values);
    return res.rows;
  }

  /**
   * Get KPI statistics and category distributions
   */
  static async getStats() {
    await this.expireOverdueReservations();

    const totalRes = await db.query('SELECT COUNT(*) as count FROM telecom_numbers');
    const categoryRes = await db.query(`
      SELECT category, COUNT(*) as count 
      FROM telecom_numbers 
      GROUP BY category 
      ORDER BY count DESC
    `);
    const statusRes = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM telecom_numbers 
      GROUP BY status
    `);

    const categories = {};
    categoryRes.rows.forEach(r => {
      categories[r.category || 'Standard'] = parseInt(r.count, 10);
    });

    const statuses = {};
    statusRes.rows.forEach(r => {
      statuses[r.status || 'available'] = parseInt(r.count, 10);
    });

    return {
      total: parseInt(totalRes.rows[0]?.count || 0, 10),
      categories,
      statuses
    };
  }

  /**
   * High-performance batch upsert
   * Inserts new numbers or updates existing ones on MSSID conflict
   */
  static async upsertBatch(records) {
    if (!records || records.length === 0) return { insertedOrUpdated: 0 };

    const batchSize = 250;
    let totalProcessed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const chunk = records.slice(i, i + batchSize);

      for (const item of chunk) {
        const id = uuidv4();
        const mssid = String(item.mssid).trim();
        const owner = item.owner ? String(item.owner).trim() : 'RESELLER MANAGEMENT';
        const category = item.category ? String(item.category).trim() : 'Standard';
        const assignedDate = item.assignedDate ? String(item.assignedDate).trim() : '';
        const status = item.status || 'available';
        const notes = item.notes || null;

        await db.query(
          `INSERT INTO telecom_numbers (id, mssid, owner, category, assigned_date, status, notes, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT(mssid) DO UPDATE SET
             owner = EXCLUDED.owner,
             category = EXCLUDED.category,
             assigned_date = EXCLUDED.assigned_date,
             updated_at = CURRENT_TIMESTAMP`,
          [id, mssid, owner, category, assignedDate, status, notes]
        );
      }

      totalProcessed += chunk.length;
    }

    return { insertedOrUpdated: totalProcessed };
  }

  /**
   * Create single number
   */
  static async create({ mssid, owner, category, assignedDate, status = 'available', notes = null }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO telecom_numbers (id, mssid, owner, category, assigned_date, status, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [id, mssid.trim(), owner || 'RESELLER MANAGEMENT', category || 'Standard', assignedDate || '', status, notes]
    );
    return this.findById(id);
  }

  /**
   * Update status or details of a number
   */
  static async update(id, updates = {}) {
    const allowed = [
      'owner', 'category', 'assigned_date', 'status', 'notes',
      'reserved_by_agent_id', 'reserved_by_agent_name',
      'reserved_for_customer_phone', 'reserved_for_customer_name',
      'conversation_id', 'reserved_at', 'reservation_expires_at',
      'sold_at', 'sold_by_agent_id'
    ];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      const dbKey = key === 'assignedDate' ? 'assigned_date' : key;
      if (allowed.includes(dbKey)) {
        setClauses.push(`${dbKey} = $${idx++}`);
        values.push(val);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await db.query(
      `UPDATE telecom_numbers SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete number by ID
   */
  static async delete(id) {
    await db.query('DELETE FROM telecom_numbers WHERE id = $1', [id]);
    return true;
  }

  /**
   * Clear all numbers (Admin only)
   */
  static async clearAll() {
    await db.query('DELETE FROM telecom_numbers');
    return true;
  }
}

module.exports = TelecomNumber;
