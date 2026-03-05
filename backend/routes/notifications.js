const express = require('express');
const store = require('../data/store');
const { verifyToken, requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, requireAuth, (req, res) => {
  try {
    let notifs = store.find('notifications', n => n.user_id === req.user.id);
    notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(notifs.slice(0, 20));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/read', verifyToken, requireAuth, (req, res) => {
  try {
    store.updateWhere('notifications', n => n.user_id === req.user.id, { is_read: true });
    res.json({ message: 'Прочитано' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/unread', verifyToken, requireAuth, (req, res) => {
  try {
    const count = store.count('notifications', n => n.user_id === req.user.id && !n.is_read);
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
