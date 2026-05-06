const db = require('../config/db');
const crypto = require('crypto');

class CategoryService {
  getAll() {
    return db.prepare(`
      SELECT c.*, cg.type as group_type 
      FROM categories c
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      ORDER BY c.order_index ASC
    `).all();
  }

  upsert(category) {
    const id = category.id || crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO categories (id, name, icon, color, is_fixed, order_index, cashflow_group_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        icon = excluded.icon,
        color = excluded.color,
        is_fixed = excluded.is_fixed,
        order_index = excluded.order_index,
        cashflow_group_id = excluded.cashflow_group_id
    `);
    return stmt.run(
      id,
      category.name,
      category.icon,
      category.color,
      category.is_fixed ? 1 : 0,
      category.order_index || 0,
      category.cashflow_group_id
    );
  }

  delete(id) {
    return db.transaction(() => {
      // ลบรายการบัญชีทั้งหมดที่อ้างอิงหมวดหมู่นี้ออกก่อน (รวมถึงที่ถูกลบซอฟต์ลบไปแล้ว)
      // เพื่อไม่ให้ติด FOREIGN KEY constraint
      db.prepare('DELETE FROM transactions WHERE category_id = ?').run(id);
      
      // จากนั้นค่อยลบหมวดหมู่
      return db.prepare('DELETE FROM categories WHERE id = ? OR id IS NULL').run(id);
    })();
  }
}

module.exports = new CategoryService();
