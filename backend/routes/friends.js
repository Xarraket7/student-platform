const express = require('express');
const store = require('../data/store');
const { verifyToken, requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/friends — список друзей с деталями
router.get('/', verifyToken, requireAuth, (req, res) => {
  try {
    const user = store.getById('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const friendIds = user.friends || [];
    const friends = friendIds.map(fid => {
      const f = store.getById('users', fid);
      if (!f) return null;
      return {
        id: f.id, name: f.name, avatar: f.avatar,
        role: f.role, group_name: f.group_name, is_online: f.is_online
      };
    }).filter(Boolean);

    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/friends/online — только онлайн друзья
router.get('/online', verifyToken, requireAuth, (req, res) => {
  try {
    const user = store.getById('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const friendIds = user.friends || [];
    const onlineFriends = friendIds.map(fid => {
      const f = store.getById('users', fid);
      if (!f || !f.is_online) return null;
      return { id: f.id, name: f.name, avatar: f.avatar };
    }).filter(Boolean);

    res.json(onlineFriends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/friends/add — добавить друга (двусторонне)
router.post('/add', verifyToken, requireAuth, (req, res) => {
  try {
    const { userId } = req.body;
    const targetId = parseInt(userId);
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя добавить себя в друзья' });
    }

    const target = store.getById('users', targetId);
    if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

    const currentUser = store.getById('users', req.user.id);
    const currentFriends = currentUser.friends || [];

    if (currentFriends.includes(targetId)) {
      return res.status(400).json({ error: 'Уже в друзьях' });
    }

    // Добавить двусторонне
    currentFriends.push(targetId);
    store.update('users', req.user.id, { friends: currentFriends });

    const targetFriends = target.friends || [];
    if (!targetFriends.includes(req.user.id)) {
      targetFriends.push(req.user.id);
      store.update('users', targetId, { friends: targetFriends });
    }

    res.json({ message: 'Друг добавлен', friendId: targetId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/friends/remove — удалить друга (двусторонне)
router.post('/remove', verifyToken, requireAuth, (req, res) => {
  try {
    const { userId } = req.body;
    const targetId = parseInt(userId);

    const currentUser = store.getById('users', req.user.id);
    let currentFriends = currentUser.friends || [];
    currentFriends = currentFriends.filter(id => id !== targetId);
    store.update('users', req.user.id, { friends: currentFriends });

    const target = store.getById('users', targetId);
    if (target) {
      let targetFriends = target.friends || [];
      targetFriends = targetFriends.filter(id => id !== req.user.id);
      store.update('users', targetId, { friends: targetFriends });
    }

    res.json({ message: 'Друг удален', friendId: targetId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
