const db = require('../config/db');

class SettingService {
  getAll() {
    return db.prepare('SELECT * FROM settings').all();
  }

  upsert(key, value) {
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    return stmt.run(key, valueStr);
  }
}

module.exports = new SettingService();