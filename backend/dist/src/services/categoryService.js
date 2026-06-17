"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
const crypto_1 = __importDefault(require("crypto"));
class CategoryService {
    getAll() {
        return db_1.default.prepare(`
      SELECT c.*, cg.type as group_type, cg.allocation_type 
      FROM categories c
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      ORDER BY c.order_index ASC
    `).all();
    }
    upsert(category) {
        const id = category.id || crypto_1.default.randomUUID();
        const stmt = db_1.default.prepare(`
      INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        icon = excluded.icon,
        color = excluded.color,
        order_index = excluded.order_index,
        cashflow_group_id = excluded.cashflow_group_id
    `);
        return stmt.run(id, category.name, category.icon || null, category.color || null, category.order_index || 0, category.cashflow_group_id);
    }
    delete(id) {
        return db_1.default.transaction(() => {
            // ลบรายการบัญชีทั้งหมดที่อ้างอิงหมวดหมู่นี้ออกก่อน (รวมถึงที่ถูกลบซอฟต์ลบไปแล้ว)
            // เพื่อไม่ให้ติด FOREIGN KEY constraint
            db_1.default.prepare('DELETE FROM transactions WHERE category_id = ?').run(id);
            // จากนั้นค่อยลบหมวดหมู่
            return db_1.default.prepare('DELETE FROM categories WHERE id = ?').run(id);
        })();
    }
}
exports.default = new CategoryService();
