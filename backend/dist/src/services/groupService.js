"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
class GroupService {
    getAll() {
        const rows = db_1.default.prepare('SELECT * FROM cashflow_groups ORDER BY order_index ASC').all();
        return rows.map(r => ({
            ...r,
            highlightBg: !!r.highlight_bg
        }));
    }
    upsert(group) {
        const stmt = db_1.default.prepare(`
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
        return stmt.run(group.id, group.name, group.type, group.allocation_type || 'want', group.order_index || 0, group.color || null, group.icon || null, group.highlightBg ? 1 : 0);
    }
    delete(id) {
        return db_1.default.prepare('DELETE FROM cashflow_groups WHERE id = ?').run(id);
    }
}
exports.default = new GroupService();
