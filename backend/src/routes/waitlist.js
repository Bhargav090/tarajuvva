const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { get, run, all } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');

// Join waitlist (repair or donate)
router.post('/', async (req, res) => {
  const { type, name, email, phone } = req.body;

  if (!type || !name || !email) {
    return res.status(400).json({ success: false, message: 'Type, name, and email are required' });
  }

  if (!['repair', 'donate'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Type must be repair or donate' });
  }

  // Check for duplicate
  const existing = await get('SELECT id FROM waitlist WHERE email = ? AND type = ?', [email, type]);
  if (existing) {
    return res.json({ success: true, message: "You're already on the list. We'll notify you when this goes live." });
  }

  const id = uuidv4();
  await run('INSERT INTO waitlist (id, type, name, email, phone) VALUES (?, ?, ?, ?, ?)', [id, type, name, email, phone || null]);

  res.status(201).json({
    success: true,
    message: "You're on the list. We'll notify you when this goes live."
  });
});

// Get waitlist (admin)
router.get('/', authenticateAdmin, async (req, res) => {
  const { type } = req.query;
  let query = 'SELECT * FROM waitlist WHERE 1=1';
  const params = [];

  if (type) { query += ' AND type = ?'; params.push(type); }
  query += ' ORDER BY created_at DESC';

  const entries = await all(query, params);
  res.json({ success: true, entries });
});

module.exports = router;
