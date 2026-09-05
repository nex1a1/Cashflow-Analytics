import db from '../config/db';
import crypto from 'node:crypto';
import { Category } from '../types';

interface CategoryWithDetails extends Category {
  group_type: 'income' | 'expense' | 'savings';
  allocation_type: 'need' | 'want' | 'savings';
}

class CategoryService {
  getAll(): CategoryWithDetails[] {
    return db.prepare(`
      SELECT c.*, cg.type as group_type, cg.allocation_type 
      FROM categories c
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      ORDER BY c.order_index ASC
    `).all() as CategoryWithDetails[];
  }

  upsert(category: Partial<Category> & { name: string; cashflow_group_id: string }) {
    const id = category.id || crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        icon = excluded.icon,
        color = excluded.color,
        order_index = excluded.order_index,
        cashflow_group_id = excluded.cashflow_group_id
    `);
    return stmt.run(
      id,
      category.name,
      category.icon || null,
      category.color || null,
      category.order_index || 0,
      category.cashflow_group_id
    );
  }

  getById(id: string): { id: string; name: string } | undefined {
    return db.prepare("SELECT id, name FROM categories WHERE id = ?").get(id) as { id: string; name: string } | undefined;
  }

  delete(id: string) {
    return db.transaction(() => {
      // ลบรายการบัญชีทั้งหมดที่อ้างอิงหมวดหมู่นี้ออกก่อน (รวมถึงที่ถูกลบซอฟต์ลบไปแล้ว)
      // เพื่อไม่ให้ติด FOREIGN KEY constraint
      db.prepare('DELETE FROM transactions WHERE category_id = ?').run(id);
      
      // จากนั้นค่อยลบหมวดหมู่
      return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    })();
  }
}

export default new CategoryService();
