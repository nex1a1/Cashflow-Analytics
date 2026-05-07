const db = require('../config/db');
const crypto = require('crypto');

class RecurringService {
  getAll() {
    return db.prepare(`
      SELECT rc.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM recurring_configs rc
      JOIN categories c ON rc.category_id = c.id
      ORDER BY rc.due_day ASC
    `).all();
  }

  upsert(config) {
    const id = config.id || crypto.randomUUID();
    const amountSatang = Math.round(parseFloat(config.amount) * 100);
    
    const stmt = db.prepare(`
      INSERT INTO recurring_configs (id, name, amount, category_id, due_day, note, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        amount = excluded.amount,
        category_id = excluded.category_id,
        due_day = excluded.due_day,
        note = excluded.note,
        is_active = excluded.is_active,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    return stmt.run(
      id,
      config.name,
      amountSatang,
      config.category_id,
      parseInt(config.due_day),
      config.note || '',
      config.is_active !== undefined ? (config.is_active ? 1 : 0) : 1
    );
  }

  delete(id) {
    return db.prepare('DELETE FROM recurring_configs WHERE id = ?').run(id);
  }
}

module.exports = new RecurringService();
