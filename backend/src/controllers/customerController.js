const Customer = require('../models/Customer');

class CustomerController {
  static async list(req, res, next) {
    try {
      const { search, limit, offset } = req.query;
      const customers = await Customer.list({
        search,
        limit: parseInt(limit || '50', 10),
        offset: parseInt(offset || '0', 10)
      });
      return res.json({ customers });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      return res.json({ customer });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const { phone, name, email, notes } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Customer phone number is required' });
      }
      const customer = await Customer.findOrCreate({ phone, name, email, notes });
      return res.status(201).json({ customer });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const { name, phone, email, notes } = req.body;
      const customer = await Customer.update(req.params.id, { name, phone, email, notes });
      return res.json({ customer });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CustomerController;
