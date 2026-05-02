const db = require('../config/db');

exports.getCalendar = (req, res) => {
  try {
    res.json(db.prepare('SELECT date, type_id, iso_date FROM calendar_days').all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const convertToISO = (dateStr) => {
  if (!dateStr || !dateStr.includes('/')) return dateStr;
  const [d, m, y] = dateStr.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

exports.upsertCalendar = (req, res) => {
  const { date, type_id, isoDate } = req.body;
  try {
    db.prepare(`
      INSERT INTO calendar_days (date, type_id, iso_date) VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET 
        type_id = excluded.type_id,
        iso_date = excluded.iso_date
    `).run(date, type_id, isoDate || convertToISO(date));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};