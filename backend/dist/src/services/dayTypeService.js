"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
class DayTypeService {
    getAll() {
        return db_1.default.prepare('SELECT * FROM day_types ORDER BY order_index ASC').all();
    }
    upsert(dayType) {
        const stmt = db_1.default.prepare(`
      INSERT INTO day_types (id, name, label, color, order_index)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        label = excluded.label,
        color = excluded.color,
        order_index = excluded.order_index
    `);
        return stmt.run(dayType.id, dayType.name || '', dayType.label, dayType.color || null, dayType.order_index || 0);
    }
    delete(id) {
        return db_1.default.prepare('DELETE FROM day_types WHERE id = ?').run(id);
    }
}
exports.default = new DayTypeService();
