import db from '../config/db';
import { DayType } from '../types';

class DayTypeService {
  getAll(): DayType[] {
    return db.prepare('SELECT * FROM day_types ORDER BY order_index ASC').all() as DayType[];
  }

  upsert(dayType: DayType) {
    const stmt = db.prepare(`
      INSERT INTO day_types (id, name, label, color, order_index)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        label = excluded.label,
        color = excluded.color,
        order_index = excluded.order_index
    `);
    return stmt.run(
      dayType.id, 
      dayType.name || '', 
      dayType.label, 
      dayType.color || null, 
      dayType.order_index || 0
    );
  }

  delete(id: string) {
    return db.prepare('DELETE FROM day_types WHERE id = ?').run(id);
  }
}

export default new DayTypeService();
