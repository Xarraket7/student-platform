const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('../data/store');
const { generateToken, verifyToken, requireAuth } = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = store.findOne('users', u => u.email === email);
    if (existing) return res.status(400).json({ error: 'Email уже зарегистрирован' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = store.insert('users', {
      name, email, password: hashedPassword,
      role: role || 'student', avatar: 'default.png',
      age: null, birthday: null, group_name: null, google_id: null, is_online: false, friends: []
    });
    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = store.findOne('users', u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    if (!user.password) return res.status(401).json({ error: 'Используйте быстрый вход' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Неверный пароль' });

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick login
router.post('/quick-login', (req, res) => {
  try {
    const { role } = req.body;
    if (role === 'guest') {
      return res.json({ user: { id: 0, name: 'Гость', role: 'guest', avatar: 'u.png' } });
    }
    const user = store.findOne('users', u => u.role === role);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Вы вышли из системы' });
});

// Get current user
router.get('/me', verifyToken, (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user });
});

module.exports = router;
