import db from '../config/db';
import { Setting } from '../types';

class SettingService {
  getAll(): Setting[] {
    return db.prepare('SELECT * FROM settings').all() as Setting[];
  }

  upsert(key: string, value: any) {
    // Always JSON, so a string like "123" or "true" reads back as a string (getAllSettings JSON.parses)
    const valueStr = JSON.stringify(value ?? null);
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    return stmt.run(key, valueStr);
  }
}

export default new SettingService();
