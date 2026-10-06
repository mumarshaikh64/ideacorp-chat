const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  static async findById(id) {
    const res = await db.query('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findByEmail(email) {
    const res = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0] || null;
  }

  static async create({ name, email, password, role = 'agent', status = 'offline' }) {
    const id = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, name, email.toLowerCase(), passwordHash, role, status]
    );

    return this.findById(id);
  }

  static async update(id, { name, role, status, password }) {
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.findById(id);
  }

  static async updateStatus(id, status) {
    await db.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
    // Log status change
    await db.query(
      'INSERT INTO agent_status_logs (id, agent_id, status, changed_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [uuidv4(), id, status]
    );
    return this.findById(id);
  }

  static async list({ role, status, search, limit = 50, offset = 0 } = {}) {
    const where = [];
    const values = [];
    let idx = 1;

    if (role) {
      where.push(`role = $${idx++}`);
      values.push(role);
    }
    if (status) {
      where.push(`status = $${idx++}`);
      values.push(status);
    }
    if (search) {
      where.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT id, name, email, role, status, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const res = await db.query(sql, values);
    return res.rows;
  }

  static async delete(id) {
    const res = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return res.rowCount > 0;
  }

  static async verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}

module.exports = User;
