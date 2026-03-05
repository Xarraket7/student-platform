const express = require('express');
const store = require('../data/store');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const events = store.getAll('events');
    events.sort((a, b) => a.id - b.id);
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', verifyToken, requireAdmin, (req, res) => {
  try {
    const { title, description, icon, event_date, event_time } = req.body;
    const event = store.insert('events', { title, description, icon, event_date: event_date || null, event_time: event_time || null });
    res.json(event);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const { title, description, icon, event_date, event_time } = req.body;
    const event = store.update('events', req.params.id, { title, description, icon, event_date, event_time });
    res.json(event);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    store.remove('events', req.params.id);
    res.json({ message: 'Событие удалено' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
