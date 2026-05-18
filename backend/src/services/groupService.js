const db = require('../config/db');

class GroupService {
  getAll() {
    const rows = db.prepare('SELECT * FROM cashflow_groups ORDER BY order_index ASC').all();
    return rows.map(r => ({
      ...r,
      highlightBg: !!r.highlight_bg
    }));
  }

  upsert(group) {
    const stmt = db.prepare(`
      INSERT INTO cashflow_groups (id, name, type, allocation_type, order_index, color, icon, highlight_bg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        allocation_type = excluded.allocation_type,
        order_index = excluded.order_index,
        color = excluded.color,
        icon = excluded.icon,
        highlight_bg = excluded.highlight_bg
    `);
    return stmt.run(
      group.id,
      group.name,
      group.type,
      group.allocation_type || 'want',
      group.order_index,
      group.color,
      group.icon,
      group.highlightBg ? 1 : 0
    );
  }

  delete(id) {
    return db.prepare('DELETE FROM cashflow_groups WHERE id = ?').run(id);
  }
}

module.exports = new GroupService();
