const db = require('../config/db');

class GroupService {
  getAll() {
    return db.prepare('SELECT * FROM cashflow_groups ORDER BY order_index ASC').all();
  }

  upsert(group) {
    const stmt = db.prepare(`
      INSERT INTO cashflow_groups (id, name, type, order_index, color, icon)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        order_index = excluded.order_index,
        color = excluded.color,
        icon = excluded.icon
    `);
    return stmt.run(
      group.id,
      group.name,
      group.type,
      group.order_index,
      group.color,
      group.icon
    );
  }

  delete(id) {
    return db.prepare('DELETE FROM cashflow_groups WHERE id = ?').run(id);
  }
}

module.exports = new GroupService();
