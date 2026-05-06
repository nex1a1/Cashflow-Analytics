const db = require('../config/db');

class DayTypeService {
  getAll() {
    return db.prepare('SELECT * FROM day_types ORDER BY order_index ASC').all();
  }

  upsert(dayType) {
    const stmt = db.prepare(`
      INSERT INTO day_types (id, name, label, color, order_index)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        label = excluded.label,
        color = excluded.color,
        order_index = excluded.order_index
    `);
    return stmt.run(
      dayType.id, 
      dayType.name || '', 
      dayType.label, 
      dayType.color, 
      dayType.order_index || 0
    );
  }

  delete(id) {
    return db.prepare('DELETE FROM day_types WHERE id = ?').run(id);
  }
}

module.exports = new DayTypeService();
