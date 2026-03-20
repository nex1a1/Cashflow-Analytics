const db = require('../config/db');

exports.getSettings = (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = JSON.parse(row.setting_value);
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertSetting = (req, res) => {
  const { key, value } = req.body;
  try {
    db.prepare(`
      INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
    `).run(key, JSON.stringify(value));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};