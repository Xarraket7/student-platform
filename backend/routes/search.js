const express = require('express');
const store = require('../data/store');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 1) return res.json({ results: [] });

    const results = [];

    // Search posts
    const posts = store.find('posts', p =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.content && p.content.toLowerCase().includes(q))
    );
    posts.slice(0, 5).forEach(p => {
      const community = p.community_id ? store.getById('communities', p.community_id) : null;
      results.push({
        type: 'post',
        id: p.id,
        title: p.title || p.content?.substring(0, 60) + '...',
        subtitle: community ? community.title : 'Лента',
        icon: '📝',
        page: community ? 'community-inner' : 'feed',
        data: community || null
      });
    });

    // Search communities
    const communities = store.find('communities', c =>
      c.title.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
    communities.slice(0, 5).forEach(c => {
      results.push({
        type: 'community',
        id: c.id,
        title: c.title,
        subtitle: 'Сообщество',
        icon: '👥',
        avatar: c.avatar || null,
        page: 'community-inner',
        data: c
      });
    });

    // Search events
    const events = store.find('events', e =>
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
    events.slice(0, 5).forEach(e => {
      results.push({
        type: 'event',
        id: e.id,
        title: e.title,
        subtitle: e.event_date ? new Date(e.event_date).toLocaleDateString('ru-RU') : 'Событие',
        icon: e.icon || '📅',
        page: 'events',
        data: null
      });
    });

    // Search announcements
    const announcements = store.find('announcements', a =>
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
    announcements.slice(0, 5).forEach(a => {
      results.push({
        type: 'announcement',
        id: a.id,
        title: a.title,
        subtitle: 'Объявление',
        icon: '📢',
        page: 'announcements',
        data: null
      });
    });

    res.json({ results: results.slice(0, 15) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
