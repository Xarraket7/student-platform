const express = require('express');
const store = require('../data/store');
const { verifyToken, requireAuth, requireAdmin, generateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../frontend/assets/avatars')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Public: get online users
router.get('/online', (req, res) => {
  try {
    const online = store.find('users', u => u.is_online && u.role !== 'guest');
    res.json(online.map(u => ({ id: u.id, name: u.name, avatar: u.avatar })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all users (for friends modal "Все пользователи")
router.get('/all', verifyToken, requireAuth, (req, res) => {
  try {
    const users = store.find('users', u => u.role !== 'guest');
    res.json(users.map(u => ({
      id: u.id, name: u.name, avatar: u.avatar,
      role: u.role, group_name: u.group_name, is_online: u.is_online
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// View other user's profile by ID
router.get('/profile/:id', verifyToken, requireAuth, (req, res) => {
  try {
    const user = store.getById('users', parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const currentUser = store.getById('users', req.user.id);
    const isFriend = (currentUser.friends || []).includes(user.id);
    res.json({
      id: user.id, name: user.name, avatar: user.avatar,
      role: user.role, group_name: user.group_name,
      age: user.age, birthday: user.birthday,
      is_online: user.is_online, is_friend: isFriend
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', verifyToken, requireAdmin, (req, res) => {
  try {
    const users = store.getAll('users').map(u => ({
      id: u.id, name: u.name, email: u.email, avatar: u.avatar,
      role: u.role, group_name: u.group_name, is_online: u.is_online, created_at: u.created_at
    }));
    users.sort((a, b) => a.id - b.id);
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/profile', verifyToken, requireAuth, (req, res) => {
  try {
    const user = store.getById('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const { password, ...safe } = user;
    res.json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/profile', verifyToken, requireAuth, upload.single('avatar'), (req, res) => {
  try {
    const { name, age, birthday, group_name } = req.body;
    const avatar = req.file ? req.file.filename : undefined;
    const updates = {};
    if (name) updates.name = name;
    if (age) updates.age = parseInt(age);
    if (birthday) updates.birthday = birthday;
    if (group_name) updates.group_name = group_name;
    if (avatar) updates.avatar = avatar;

    const user = store.update('users', req.user.id, updates);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    // Re-generate token with updated avatar/name
    const newToken = generateToken(user);
    res.cookie('token', newToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    const { password: pw, ...safe } = user;
    res.json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/role', verifyToken, requireAdmin, (req, res) => {
  try {
    const { role } = req.body;
    const user = store.update('users', req.params.id, { role });
    if (!user) return res.status(404).json({ error: 'Не найден' });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    store.remove('users', req.params.id);
    res.json({ message: 'Пользователь удален' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
