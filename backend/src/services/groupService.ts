import db from '../config/db';
import { CashflowGroup } from '../types';

interface GroupResponse extends Omit<CashflowGroup, 'highlight_bg'> {
  highlightBg: boolean;
  highlight_bg: number;
}

class GroupService {
  getAll(): GroupResponse[] {
    const rows = db.prepare('SELECT * FROM cashflow_groups ORDER BY order_index ASC').all() as CashflowGroup[];
    return rows.map(r => ({
      ...r,
      highlightBg: !!r.highlight_bg
    }));
  }

  upsert(group: Partial<CashflowGroup> & { id: string; name: string; type: 'income' | 'expense' | 'savings'; highlightBg?: boolean }) {
    const stmt = db.prepare(`
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
    return stmt.run(
      group.id,
      group.name,
      group.type,
      group.allocation_type || 'want',
      group.order_index || 0,
      group.color || null,
      group.icon || null,
      group.highlightBg ? 1 : 0
    );
  }

  delete(id: string) {
    return db.prepare('DELETE FROM cashflow_groups WHERE id = ?').run(id);
  }
}

export default new GroupService();
