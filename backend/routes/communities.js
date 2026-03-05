const express = require('express');
const store = require('../data/store');
const { verifyToken, requireAuth, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'background') {
        cb(null, path.join(__dirname, '../../frontend/assets/backgrounds/communities'));
      } else if (file.fieldname === 'photos') {
        cb(null, path.join(__dirname, '../../frontend/assets/photos'));
      } else {
        cb(null, path.join(__dirname, '../../frontend/assets/icons/feed'));
      }
    },
    filename: (req, file, cb) => {
      if (file.fieldname === 'background' || file.fieldname === 'photos') {
        cb(null, Date.now() + '-' + file.originalname);
      } else {
        cb(null, file.originalname);
      }
    }
  })
});

// Get all communities
router.get('/', (req, res) => {
  try {
    const communities = store.getAll('communities');
    communities.sort((a, b) => a.id - b.id);
    res.json(communities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get community by slug
router.get('/:slug', (req, res) => {
  try {
    const community = store.findOne('communities', c => c.slug === req.params.slug);
    if (!community) return res.status(404).json({ error: 'Сообщество не найдено' });
    res.json(community);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get community news
router.get('/:slug/news', (req, res) => {
  try {
    const community = store.findOne('communities', c => c.slug === req.params.slug);
    if (!community) return res.status(404).json({ error: 'Сообщество не найдено' });

    let posts = store.find('posts', p =>
      p.community_id === community.id &&
      (p.visibility === 'community' || p.visibility === 'both' || (!p.visibility && p.is_feed !== true) || (!p.visibility && p.is_feed === undefined))
    );
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const enriched = posts.map(p => {
      const author = store.getById('users', p.author_id) || {};
      return {
        ...p,
        author_name: author.name || 'Unknown',
        author_avatar: author.avatar || 'Admin.png',
        author_role: author.role || 'student',
        likes_count: store.count('likes', l => l.post_id === p.id),
        comments_count: store.count('comments', c => c.post_id === p.id)
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get community gallery
router.get('/:slug/gallery', (req, res) => {
  try {
    const community = store.findOne('communities', c => c.slug === req.params.slug);
    if (!community) return res.status(404).json({ error: 'Сообщество не найдено' });

    const gallery = store.find('gallery', g => g.community_id === community.id);
    gallery.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(gallery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create community (admin only)
router.post('/', verifyToken, requireAdmin, upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'background', maxCount: 1 }
]), (req, res) => {
  try {
    const { title } = req.body;
    const slug = (req.body.slug || '').replace(/^\/+/, '').replace(/\/+/g, '-');
    const icon = req.files?.icon?.[0]?.filename || null;
    const background = req.files?.background?.[0]?.filename || null;
    const community = store.insert('communities', { title, slug, background, icon, feed_icon: icon });
    res.json(community);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload gallery photos (admin only)
router.post('/:slug/gallery', verifyToken, requireAdmin, upload.fields([
  { name: 'photos', maxCount: 10 }
]), (req, res) => {
  try {
    const community = store.findOne('communities', c => c.slug === req.params.slug);
    if (!community) return res.status(404).json({ error: 'Сообщество не найдено' });

    const photos = req.files?.photos || [];
    const inserted = photos.map(file => {
      return store.insert('gallery', {
        community_id: community.id,
        image: file.filename,
        uploaded_by: req.user.id
      });
    });
    res.json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete gallery photo (admin only)
router.delete('/:slug/gallery/:photoId', verifyToken, requireAdmin, (req, res) => {
  try {
    store.remove('gallery', req.params.photoId);
    res.json({ message: 'Фото удалено' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update community (admin only)
router.put('/:id', verifyToken, requireAdmin, upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'background', maxCount: 1 }
]), (req, res) => {
  try {
    const { title, slug, description } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (slug) updates.slug = slug.replace(/^\/+/, '').replace(/\/+/g, '-');
    if (description !== undefined) updates.description = description;
    if (req.files?.icon?.[0]) {
      updates.icon = req.files.icon[0].filename;
      updates.feed_icon = req.files.icon[0].filename;
    }
    if (req.files?.background?.[0]) {
      updates.background = req.files.background[0].filename;
    }
    const community = store.update('communities', req.params.id, updates);
    res.json(community);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete community (admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    store.removeWhere('posts', p => p.community_id === id);
    store.removeWhere('messages', m => m.community_id === id);
    store.removeWhere('gallery', g => g.community_id === id);
    store.remove('communities', req.params.id);
    res.json({ message: 'Сообщество удалено' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
