const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Customer {
  static async findById(id) {
    const res = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findByPhone(phone) {
    const res = await db.query('SELECT * FROM customers WHERE phone = $1', [phone]);
    return res.rows[0] || null;
  }

  static async findOrCreate({ phone, name = null, email = null, notes = null }) {
    let customer = await this.findByPhone(phone);
    if (customer) {
      if (name && (!customer.name || customer.name === 'Customer')) {
        await db.query('UPDATE customers SET name = $1 WHERE id = $2', [name, customer.id]);
        customer.name = name;
      }
      return customer;
    }

    const id = uuidv4();
    const customerName = name || `Customer ${phone.slice(-4)}`;
    await db.query(
      `INSERT INTO customers (id, name, phone, email, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [id, customerName, phone, email, notes]
    );

    return this.findById(id);
  }

  static async update(id, { name, phone, email, notes }) {
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(notes);
    }

    values.push(id);
    await db.query(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.findById(id);
  }

  static async list({ search, limit = 50, offset = 0 } = {}) {
    const where = [];
    const values = [];
    let idx = 1;

    if (search) {
      where.push(`(name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT c.*, 
             COUNT(DISTINCT cv.id) as conversation_count,
             MAX(cv.created_at) as last_contact_at
      FROM customers c
      LEFT JOIN conversations cv ON c.id = cv.customer_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const res = await db.query(sql, values);
    return res.rows;
  }
}

module.exports = Customer;
