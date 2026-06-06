import db from '../config/db';

interface CalendarDayWithDetails {
  date: string;
  day_type_id: string;
  note: string | null;
  type_name: string | null;
  type_label: string | null;
  type_color: string | null;
}

class CalendarService {
  getAll(): CalendarDayWithDetails[] {
    try {
      return db.prepare(`
        SELECT 
          cd.date, 
          cd.day_type_id, 
          cd.note,
          dt.name as type_name,
          dt.label as type_label,
          dt.color as type_color
        FROM calendar_days cd
        LEFT JOIN day_types dt ON cd.day_type_id = dt.id
      `).all() as CalendarDayWithDetails[];
    } catch (err: any) {
      console.error('Database Error in CalendarService.getAll:', err.message);
      throw err;
    }
  }

  upsert(date: string, day_type_id: string, note: string = '') {
    // Convert date to YYYY-MM-DD if in DD/MM/YYYY
    let formattedDate = date;
    if (formattedDate && formattedDate.includes('/')) {
      const [d, m, y] = formattedDate.split('/');
      formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const stmt = db.prepare(`
      INSERT INTO calendar_days (date, day_type_id, note)
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET 
        day_type_id = excluded.day_type_id,
        note = excluded.note
    `);
    return stmt.run(formattedDate, day_type_id, note);
  }
}

export default new CalendarService();
