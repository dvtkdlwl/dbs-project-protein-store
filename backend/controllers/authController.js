// controllers/authController.js

const db      = require('../config/db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
require('dotenv').config();

// ── Register ──────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });

    // Check duplicate email
    const [existing] = await db.query(
      'SELECT user_id FROM Users WHERE email = ?', [email]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Email already registered' });

    // Hash password with bcrypt (10 salt rounds)
    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO Users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashed]
    );

    res.status(201).json({ message: 'Registered successfully', user_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Login ─────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const [rows] = await db.query(
      'SELECT * FROM Users WHERE email = ?', [email]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials' });

    // Sign JWT — expires in 24 hours
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login };
