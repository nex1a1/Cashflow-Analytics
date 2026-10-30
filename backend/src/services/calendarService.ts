import db from '../config/db';
import { log, clip } from '../utils/logger';

interface CalendarDayWithDetails {
  date: string;
  day_type_id: string;
  note: string | null;
  note_icon: string | null;
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
          cd.note_icon,
          dt.name as type_name,
          dt.label as type_label,
          dt.color as type_color
        FROM calendar_days cd
        LEFT JOIN day_types dt ON cd.day_type_id = dt.id
      `).all() as CalendarDayWithDetails[];
    } catch (err: any) {
      log.error('db', `อ่านปฏิทินไม่สำเร็จ: ${err.message}`);
      throw err;
    }
  }

  /**
   * note / note_icon: undefined/null = keep what is stored (changing the day type must not wipe them), '' = clear.
   * The icon belongs to the note text, so clearing the note clears the icon too.
   */
  upsert(date: string, day_type_id: string, note?: string | null, note_icon?: string | null) {
    // Convert date to YYYY-MM-DD if in DD/MM/YYYY
    let formattedDate = date;
    if (formattedDate?.includes('/')) {
      const [d, m, y] = formattedDate.split('/');
      formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const stmt = db.prepare(`
      INSERT INTO calendar_days (date, day_type_id, note, note_icon)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        day_type_id = excluded.day_type_id,
        note = COALESCE(excluded.note, calendar_days.note),
        note_icon = CASE WHEN excluded.note = '' THEN '' ELSE COALESCE(excluded.note_icon, calendar_days.note_icon) END
    `);
    const result = stmt.run(formattedDate, day_type_id, note?.trim() ?? null, note_icon?.trim() ?? null);
    const dayType = db.prepare('SELECT label FROM day_types WHERE id = ?').get(day_type_id) as { label: string } | undefined;
    const noteText = note == null ? '' : note.trim() === '' ? ' · ลบโน้ต' : ` · โน้ต "${clip(note.trim(), 60)}"`;
    log.info('db', `ปฏิทิน ${formattedDate} · ${dayType?.label ?? day_type_id}${noteText}`);
    return result;
  }
}

export default new CalendarService();
