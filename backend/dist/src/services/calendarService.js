"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
class CalendarService {
    getAll() {
        try {
            return db_1.default.prepare(`
        SELECT 
          cd.date, 
          cd.day_type_id, 
          cd.note,
          dt.name as type_name,
          dt.label as type_label,
          dt.color as type_color
        FROM calendar_days cd
        LEFT JOIN day_types dt ON cd.day_type_id = dt.id
      `).all();
        }
        catch (err) {
            console.error('Database Error in CalendarService.getAll:', err.message);
            throw err;
        }
    }
    upsert(date, day_type_id, note = '') {
        // Convert date to YYYY-MM-DD if in DD/MM/YYYY
        let formattedDate = date;
        if (formattedDate && formattedDate.includes('/')) {
            const [d, m, y] = formattedDate.split('/');
            formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        const stmt = db_1.default.prepare(`
      INSERT INTO calendar_days (date, day_type_id, note)
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET 
        day_type_id = excluded.day_type_id,
        note = excluded.note
    `);
        return stmt.run(formattedDate, day_type_id, note);
    }
}
exports.default = new CalendarService();
