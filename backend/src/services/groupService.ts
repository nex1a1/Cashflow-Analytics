import db from '../config/db';
import { CashflowGroup } from '../types';
import { ApiError } from '../middleware/ApiError';
import transactionService from './transactionService';

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
    // แถวขายนับเป็นลบได้เฉพาะในกลุ่ม savings — ย้ายออกทั้งที่ยังมีรายการซื้อขาย ยอดขายจะกลายเป็นรายจ่ายบวก
    if (group.type !== 'savings') {
      const n = transactionService.countLiveTrades({ groupId: group.id });
      if (n > 0) throw new ApiError(409, `เปลี่ยนชนิดไม่ได้: กลุ่มนี้มี ${n} รายการซื้อขายสินทรัพย์ ลบรายการเหล่านั้นก่อน`);
    }
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
      group.type === 'income' ? null : group.type === 'savings' ? 'savings' : (group.allocation_type || 'want'), // รายรับไม่มี NEED/WANT, ออม/ลงทุน = SAVE เสมอ
      group.order_index || 0,
      group.color || null,
      group.icon || null,
      group.highlightBg ? 1 : 0
    );
  }

  delete(id: string) {
    const n = (db.prepare('SELECT COUNT(*) AS c FROM categories WHERE cashflow_group_id = ?').get(id) as { c: number }).c;
    if (n > 0) throw new ApiError(409, `ลบกลุ่มไม่ได้: ยังมี ${n} หมวดหมู่ในกลุ่มนี้ ย้ายหรือลบหมวดหมู่ก่อน`);
    return db.prepare('DELETE FROM cashflow_groups WHERE id = ?').run(id);
  }
}

export default new GroupService();
