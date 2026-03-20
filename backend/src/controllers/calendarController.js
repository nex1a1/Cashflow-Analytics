const db = require('../config/db');

exports.getCalendar = (req, res) => {
  try {
    res.json(db.prepare('SELECT date, type_id FROM calendar_days').all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertCalendar = (req, res) => {
  const { date, type_id } = req.body;
  try {
    db.prepare(`
      INSERT INTO calendar_days (date, type_id) VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET type_id = excluded.type_id
    `).run(date, type_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};