"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
class SettingService {
    getAll() {
        return db_1.default.prepare('SELECT * FROM settings').all();
    }
    upsert(key, value) {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const stmt = db_1.default.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
        return stmt.run(key, valueStr);
    }
}
exports.default = new SettingService();
