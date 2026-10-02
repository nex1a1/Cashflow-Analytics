import db from '../config/db';
import crypto from 'node:crypto';
import { Category } from '../types';
import { ApiError } from '../middleware/ApiError';
import transactionService from './transactionService';

interface CategoryWithDetails extends Category {
  group_type: 'income' | 'expense' | 'savings';
  allocation_type: 'need' | 'want' | 'savings' | null;
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
    // ย้ายหมวดที่มีรายการซื้อขายออกจากกลุ่มลงทุน/ออม → ยอดขายกลายเป็นรายจ่ายบวก (ดู groupService.upsert)
    const target = db.prepare('SELECT type FROM cashflow_groups WHERE id = ?').get(category.cashflow_group_id) as { type: string } | undefined;
    if (target && target.type !== 'savings') {
      const n = transactionService.countLiveTrades({ categoryId: id });
      if (n > 0) throw new ApiError(409, `ย้ายไม่ได้: หมวดนี้มี ${n} รายการซื้อขายสินทรัพย์ ต้องอยู่ในกลุ่มชนิดลงทุน/ออม`);
    }
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
    // ลบหมวดนี้ = ลบรายการในหมวดทิ้งถาวร (ไม่มี undo) — ถ้าเป็นรายการซื้อขาย ต้นทุนและตำแหน่งในพอร์ตจะหายตามไปด้วย
    const n = transactionService.countLiveTrades({ categoryId: id });
    if (n > 0) throw new ApiError(409, `ลบไม่ได้: หมวดนี้มี ${n} รายการซื้อขายสินทรัพย์อยู่ในพอร์ต ลบรายการเหล่านั้นก่อน`);
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
