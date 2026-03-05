const express = require('express');
const store = require('../data/store');
const { verifyToken, requireAuth, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'news_image') {
      cb(null, path.join(__dirname, '../../frontend/assets/photos'));
    } else {
      cb(null, path.join(__dirname, '../uploads'));
    }
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Get all posts (admin)
router.get('/all', verifyToken, requireAdmin, (req, res) => {
  try {
    let posts = store.getAll('posts');
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const enriched = posts.map(p => {
      const author = store.getById('users', p.author_id) || {};
      const community = p.community_id ? store.getById('communities', p.community_id) : null;
      return {
        ...p,
        author_name: author.name || 'Unknown',
        community_title: community?.title || null,
        likes_count: store.count('likes', l => l.post_id === p.id),
        comments_count: store.count('comments', c => c.post_id === p.id)
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get feed posts (visibility: 'feed', 'both', or legacy is_feed: true)
router.get('/feed', (req, res) => {
  try {
    let posts = store.find('posts', p =>
      p.visibility === 'feed' || p.visibility === 'both' || (p.is_feed === true && !p.visibility)
    );
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const enriched = posts.map(p => {
      const author = store.getById('users', p.author_id) || {};
      const community = p.community_id ? store.getById('communities', p.community_id) : null;
      const likes_count = store.count('likes', l => l.post_id === p.id);
      const comments_count = store.count('comments', c => c.post_id === p.id);
      return {
        ...p,
        author_name: author.name || 'Unknown',
        author_avatar: author.avatar || 'Admin.png',
        author_role: author.role || 'student',
        community_title: community?.title || null,
        community_slug: community?.slug || null,
        community_icon: community?.icon || null,
        likes_count, comments_count
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create post (admin only)
router.post('/', verifyToken, requireAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'news_image', maxCount: 1 }
]), (req, res) => {
  try {
    const { title, content, community_id, visibility } = req.body;
    const image = req.files?.image?.[0]?.filename || null;
    const news_image = req.files?.news_image?.[0]?.filename || null;
    const post = store.insert('posts', {
      community_id: community_id ? parseInt(community_id) : null,
      author_id: req.user.id,
      title: title || null,
      content,
      image,
      news_image,
      visibility: visibility || 'community'
    });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete post (admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    store.removeWhere('comments', c => c.post_id === id);
    store.removeWhere('likes', l => l.post_id === id);
    store.remove('posts', req.params.id);
    res.json({ message: 'Пост удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like post
router.post('/:id/like', verifyToken, requireAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;
    const existing = store.findOne('likes', l => l.post_id === postId && l.user_id === userId);
    if (existing) {
      store.remove('likes', existing.id);
      return res.json({ liked: false });
    }
    store.insert('likes', { post_id: postId, user_id: userId });
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get comments
router.get('/:id/comments', (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    let comments = store.find('comments', c => c.post_id === postId);
    comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const enriched = comments.map(c => {
      const user = store.getById('users', c.user_id) || {};
      return { ...c, user_name: user.name || 'Unknown', user_avatar: user.avatar || 'Admin.png' };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment
router.post('/:id/comments', verifyToken, requireAuth, (req, res) => {
  try {
    const { text } = req.body;
    const user = store.getById('users', req.user.id) || {};
    const comment = store.insert('comments', {
      post_id: parseInt(req.params.id), user_id: req.user.id, text
    });
    res.json({ ...comment, user_name: user.name, user_avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
