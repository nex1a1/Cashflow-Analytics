const db = require('../config/db');

class CalendarService {
  getAll() {
    return db.prepare('SELECT * FROM calendar_days').all();
  }

  upsert(dateStr, type) {
    const stmt = db.prepare(`
      INSERT INTO calendar_days (date_str, type)
      VALUES (?, ?)
      ON CONFLICT(date_str) DO UPDATE SET type = excluded.type
    `);
    return stmt.run(dateStr, type);
  }
}

module.exports = new CalendarService();