const db = require('../config/db');
const crypto = require('crypto');

class CategoryService {
  getAll() {
    return db.prepare(`
      SELECT c.*, cg.type as group_type 
      FROM categories c
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
    `).all();
  }

  upsert(category) {
    const id = category.id || crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO categories (id, name, icon, color, is_fixed, cashflow_group_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        icon = excluded.icon,
        color = excluded.color,
        is_fixed = excluded.is_fixed,
        cashflow_group_id = excluded.cashflow_group_id
    `);
    return stmt.run(
      id,
      category.name,
      category.icon,
      category.color,
      category.is_fixed ? 1 : 0,
      category.cashflow_group_id
    );
  }

  delete(id) {
    return db.prepare('DELETE FROM categories WHERE id = ? OR id IS NULL').run(id);
  }
}

module.exports = new CategoryService();
