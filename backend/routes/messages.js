const express = require('express');
const store = require('../data/store');
const { verifyToken, requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get contacts — admin pinned first, then only users with message history
router.get('/contacts', verifyToken, requireAuth, (req, res) => {
  try {
    const allUsers = store.find('users', u => u.id !== req.user.id && u.role !== 'guest');
    const admin = store.findOne('users', u => u.role === 'admin');
    const contacts = [];
    let adminAdded = false;

    for (const u of allUsers) {
      const msgs = store.find('messages', m =>
        m.community_id == null &&
        ((m.sender_id === u.id && m.receiver_id === req.user.id) ||
         (m.sender_id === req.user.id && m.receiver_id === u.id))
      );
      msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const isAdmin = admin && u.id === admin.id;
      const hasMessages = msgs.length > 0;

      if (isAdmin || hasMessages) {
        contacts.push({
          id: u.id, name: u.name, avatar: u.avatar, is_online: u.is_online,
          last_message: msgs[0]?.text || null,
          last_message_time: msgs[0]?.created_at || null,
          is_admin: !!isAdmin
        });
        if (isAdmin) adminAdded = true;
      }
    }

    // Ensure admin is always present
    if (!adminAdded && admin && admin.id !== req.user.id) {
      contacts.unshift({
        id: admin.id, name: admin.name, avatar: admin.avatar,
        is_online: admin.is_online,
        last_message: null, last_message_time: null, is_admin: true
      });
    }

    // Sort: admin first, then by last message time
    contacts.sort((a, b) => {
      if (a.is_admin && !b.is_admin) return -1;
      if (!a.is_admin && b.is_admin) return 1;
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time) - new Date(a.last_message_time);
    });

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages with a user
router.get('/user/:userId', verifyToken, requireAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    let messages = store.find('messages', m =>
      m.community_id == null &&
      ((m.sender_id === req.user.id && m.receiver_id === userId) ||
       (m.sender_id === userId && m.receiver_id === req.user.id))
    );
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const enriched = messages.map(m => {
      const sender = store.getById('users', m.sender_id) || {};
      return { ...m, sender_name: sender.name, sender_avatar: sender.avatar };
    });
    store.updateWhere('messages',
      m => m.sender_id === userId && m.receiver_id === req.user.id && !m.is_read,
      { is_read: true }
    );
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get community chat messages
router.get('/community/:communityId', (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);
    let messages = store.find('messages', m => m.community_id === communityId && m.receiver_id == null);
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    messages = messages.slice(-100);
    const enriched = messages.map(m => {
      const sender = store.getById('users', m.sender_id) || {};
      return { ...m, sender_name: sender.name, sender_avatar: sender.avatar };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post('/', verifyToken, requireAuth, (req, res) => {
  try {
    const { receiver_id, community_id, text, image } = req.body;
    const msg = store.insert('messages', {
      sender_id: req.user.id,
      receiver_id: receiver_id ? parseInt(receiver_id) : null,
      community_id: community_id ? parseInt(community_id) : null,
      text, image: image || null, is_read: false
    });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete message (admin only)
router.delete('/:id', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только администратор' });
    store.remove('messages', req.params.id);
    res.json({ message: 'Сообщение удалено' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
