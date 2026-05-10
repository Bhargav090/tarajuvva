const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { get, run } = require('../db/database');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar, phone: u.phone, address: u.address, role: u.role, created_at: u.created_at });

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const exists = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  await run('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [id, name, email, hash]);

  const user = await get('SELECT * FROM users WHERE id = ?', [id]);
  res.status(201).json({ success: true, token: signToken(user), user: safeUser(user) });
});

// ── LOGIN (email/password) ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password, email } = req.body;
  const loginEmail = email || username;

  // Admin shortcut
  if (loginEmail === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ id: 'admin', username: process.env.ADMIN_USERNAME, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, admin: { username: process.env.ADMIN_USERNAME, role: 'admin' } });
  }

  const user = await get('SELECT * FROM users WHERE email = ?', [loginEmail]);
  if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
  if (!user.password_hash) return res.status(401).json({ success: false, message: 'This account uses Google Sign-In' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

  res.json({ success: true, token: signToken(user), user: safeUser(user) });
});

// ── GOOGLE SSO ────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ success: false, message: 'Google credential required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await get('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleId, email]);

    if (user) {
      // Update google_id if signing in with Google for the first time on existing email account
      if (!user.google_id) {
        await run('UPDATE users SET google_id = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [googleId, picture, user.id]);
        user = await get('SELECT * FROM users WHERE id = ?', [user.id]);
      }
    } else {
      // New user via Google
      const id = uuidv4();
      await run('INSERT INTO users (id, name, email, google_id, avatar) VALUES (?, ?, ?, ?, ?)', [id, name, email, googleId, picture]);
      user = await get('SELECT * FROM users WHERE id = ?', [id]);
    }

    res.json({ success: true, token: signToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('Google SSO error:', err.message);
    res.status(401).json({ success: false, message: 'Google verification failed' });
  }
});

// ── VERIFY TOKEN ──────────────────────────────────────────────────────────────
router.get('/verify', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Admin token
    if (decoded.role === 'admin') return res.json({ success: true, admin: decoded });
    const user = await get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(404).json({ success: false });
    res.json({ success: true, user: safeUser(user) });
  } catch {
    res.status(403).json({ success: false });
  }
});

module.exports = router;
