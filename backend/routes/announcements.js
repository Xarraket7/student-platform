const express = require('express');
const store = require('../data/store');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../frontend/assets/backgrounds/announcements')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.get('/', (req, res) => {
  try {
    const ann = store.getAll('announcements');
    ann.sort((a, b) => a.id - b.id);
    res.json(ann);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', verifyToken, requireAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'background', maxCount: 1 }
]), (req, res) => {
  try {
    const { title, description } = req.body;
    const image = req.files?.image ? req.files.image[0].filename : undefined;
    const background = req.files?.background ? req.files.background[0].filename : undefined;
    const ann = store.insert('announcements', { title, description, image, background });
    res.json(ann);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const { title, description, image, background } = req.body;
    const ann = store.update('announcements', req.params.id, { title, description, image, background });
    res.json(ann);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    store.remove('announcements', req.params.id);
    res.json({ message: 'Объявление удалено' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
