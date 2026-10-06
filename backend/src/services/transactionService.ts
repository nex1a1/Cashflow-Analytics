import db from '../config/db';
import crypto from 'node:crypto';
import { Transaction } from '../types';
import { ApiError } from '../middleware/ApiError';

interface TransactionWithDetails extends Transaction {
  category: string;
  category_icon: string | null;
  group_name: string;
  group_type: 'income' | 'expense' | 'savings';
}

interface FrequentItem {
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number; // Baht
  allocation_type: 'need' | 'want' | 'savings' | null;
  count: number;
  lastDate: string;
}

/** Escape LIKE wildcards so user text matches literally (pair with ESCAPE '\'). */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');

class TransactionService {
  getAll(startDate?: string, endDate?: string): TransactionWithDetails[] {
    let query = `
      SELECT 
        t.id, 
        t.date, 
        t.description, 
        t.amount, 
        t.category_id,
        t.allocation_type,
        t.created_at,
        t.asset_id,
        t.units,
        t.trade_side,
        c.name as category,
        c.icon as category_icon,
        cg.name as group_name,
        cg.type as group_type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      WHERE t.is_deleted = 0
    `;
    const params: string[] = [];

    if (startDate) {
      query += ` AND t.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.date <= ?`;
      params.push(endDate);
    }

    // created_at only has 1-second resolution (batch adds tie) — rowid keeps entry order stable
    query += ` ORDER BY t.date ASC, t.created_at ASC, t.rowid ASC`;

    return db.prepare(query).all(...params) as TransactionWithDetails[];
  }

  /** Lookup only — never creates. (It used to insert into an arbitrary "first" group, i.e. an income group.) */
  getCategoryIdByName(name: string): string | null {
    const cat = db.prepare("SELECT id FROM categories WHERE name = ?").get(name) as { id: string } | undefined;
    return cat ? cat.id : null;
  }

  /**
   * Suggest a category from the user's own history. Read-only: POST /transactions/predict calls this.
   * The old keyword rules pointed at emoji-named categories that no database has, so they could only ever
   * create junk, and they outranked the history — removed.
   */
  suggestCategory(description: string): string | null {
    if (!description) return null;

    // 1. Exact description match from past transactions
    const history = db.prepare(`
      SELECT category_id FROM transactions
      WHERE LOWER(description) = ? AND is_deleted = 0
      LIMIT 1
    `).get(description.toLowerCase()) as { category_id: string } | undefined;

    if (history) return history.category_id;

    // 2. Fuzzy match on the first word
    const fuzzy = db.prepare(`
      SELECT category_id FROM transactions
      WHERE description LIKE ? ESCAPE '\\' AND is_deleted = 0
      ORDER BY created_at DESC LIMIT 1
    `).get(`%${escapeLike(description.split(' ')[0])}%`) as { category_id: string } | undefined;

    return fuzzy ? fuzzy.category_id : null;
  }

  /**
   * แถวซื้อขาย (ผูกสินทรัพย์ หรือขายออก) ที่ยังไม่ถูกลบ — ใช้กันการย้าย/ลบหมวดและกลุ่มจนพอร์ตกับยอดออมเพี้ยน
   */
  countLiveTrades(by: { categoryId: string } | { groupId: string }): number {
    const [col, value] = 'categoryId' in by ? ['t.category_id', by.categoryId] : ['c.cashflow_group_id', by.groupId];
    return (db.prepare(`
      SELECT COUNT(*) AS n FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.is_deleted = 0 AND (t.asset_id IS NOT NULL OR t.trade_side IS NOT NULL) AND ${col} = ?
    `).get(value) as { n: number }).n;
  }

  /** YYYY-MM-DD or D/M/YYYY, Gregorian or Buddhist year; anything else is a 400 (it used to be stored as-is). */
  private normalizeDate(dateStr?: string): string {
    const raw = (dateStr ?? '').trim();
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    const iso = dmy ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    const bad = () => new ApiError(400, `วันที่ไม่ถูกต้อง: "${raw}" (ใช้ YYYY-MM-DD หรือ DD/MM/YYYY)`);
    if (!dmy && !iso) throw bad();

    const [d, m] = dmy ? [Number(dmy[1]), Number(dmy[2])] : [Number(iso![3]), Number(iso![2])];
    let y = Number(dmy ? dmy[3] : iso![1]);
    if (y > 2400) y -= 543; // พ.ศ. → ค.ศ.
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (y < 1900 || y > 2400 || probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) throw bad();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private resolveCategoryId(tx: any): string | undefined {
    let categoryId = tx.category_id;
    if (!categoryId || categoryId === '') {
      const name = typeof tx.category === 'string' ? tx.category.trim() : '';
      if (name) {
        categoryId = this.getCategoryIdByName(name);
        if (!categoryId) throw new ApiError(400, `ไม่พบหมวดหมู่ "${name}" สร้างหมวดหมู่ก่อนบันทึกรายการ`);
      } else {
        categoryId = this.suggestCategory(tx.description);
      }
    }
    // No silent "any category with อื่น in its name" fallback: that could be an income category.
    if (!categoryId) throw new ApiError(400, `ไม่ได้ระบุหมวดหมู่ของรายการ "${tx.description ?? ''}"`);
    return categoryId;
  }

  private resolveAllocationType(categoryId?: string, currentAlloc?: string | null): string | null {
    if (!categoryId) return currentAlloc ?? 'want';
    const categoryGroup = db.prepare(`
      SELECT cg.type 
      FROM cashflow_groups cg
      JOIN categories c ON c.cashflow_group_id = cg.id
      WHERE c.id = ?
    `).get(categoryId) as { type: string } | undefined;

    if (categoryGroup?.type === 'income') {
      return null;
    }
    if (currentAlloc) {
      return currentAlloc;
    }
    const groupDefault = db.prepare(`
      SELECT cg.allocation_type 
      FROM cashflow_groups cg
      JOIN categories c ON c.cashflow_group_id = cg.id
      WHERE c.id = ?
    `).get(categoryId) as { allocation_type: string } | undefined;
    
    return groupDefault?.allocation_type || 'want';
  }

  private getGroupType(categoryId?: string): string | undefined {
    if (!categoryId) return undefined;
    return (db.prepare(`
      SELECT cg.type FROM cashflow_groups cg
      JOIN categories c ON c.cashflow_group_id = cg.id
      WHERE c.id = ?
    `).get(categoryId) as { type: string } | undefined)?.type;
  }

  /**
   * แถวลงทุน/ออม: จำนวนเงินติดลบ = ขาย (เงินกลับเข้ามา) เก็บค่าสัมบูรณ์ + trade_side='sell'
   * ถ้าผูกสินทรัพย์ (asset_id) ต้องมีจำนวนหน่วย > 0
   */
  private resolveTrade(tx: any, categoryId?: string): { amountSatang: number; assetId: string | null; units: number | null; side: 'buy' | 'sell' | null } {
    const amount = Number(tx.amount);
    const isSavings = this.getGroupType(categoryId) === 'savings';
    if (amount < 0 && !isSavings) throw new ApiError(400, 'จำนวนเงินติดลบได้เฉพาะหมวดลงทุน/ออม');

    const assetId: string | null = isSavings && tx.asset_id ? String(tx.asset_id) : null;
    let units: number | null = null;
    if (assetId) {
      if (!db.prepare('SELECT 1 FROM assets WHERE id = ?').get(assetId)) throw new ApiError(400, 'ไม่พบสินทรัพย์ที่เลือก');
      units = Number(tx.units);
      if (!Number.isFinite(units) || units <= 0) throw new ApiError(400, 'ต้องระบุจำนวนหน่วยที่มากกว่า 0 เมื่อเลือกสินทรัพย์');
    }
    const side = amount < 0 ? 'sell' : (assetId ? 'buy' : null);
    return { amountSatang: Math.round(Math.abs(amount) * 100), assetId, units, side };
  }

  upsertMany(transactions: any[]): void {
    const stmt = db.prepare(`
      INSERT INTO transactions (id, date, description, amount, category_id, allocation_type, asset_id, units, trade_side, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        description = excluded.description,
        amount = excluded.amount,
        category_id = excluded.category_id,
        allocation_type = excluded.allocation_type,
        asset_id = excluded.asset_id,
        units = excluded.units,
        trade_side = excluded.trade_side,
        updated_at = CURRENT_TIMESTAMP,
        is_deleted = 0
    `);

    const transactionAction = db.transaction((txs: any[]) => {
      for (const tx of txs) {
        const date = this.normalizeDate(tx.date);
        const categoryId = this.resolveCategoryId(tx);
        const allocationType = this.resolveAllocationType(categoryId, tx.allocation_type);
        const trade = this.resolveTrade(tx, categoryId);

        stmt.run(
          tx.id || crypto.randomUUID(),
          date,
          tx.description || '',
          trade.amountSatang,
          categoryId,
          allocationType,
          trade.assetId,
          trade.units,
          trade.side
        );
      }
    });

    transactionAction(transactions);
    // Per-row detail already logged by db.ts's verbose mutation hook — avoid double-printing here.
  }

  delete(id: string) {
    // Row detail is logged by db.ts's verbose mutation hook.
    return db.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  deleteByMonth(isoMonth: string) {
    const [yearStr, monthStr] = isoMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const startDate = `${yearStr}-${monthStr.padStart(2, '0')}-01`;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const result = db.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE date >= ? AND date < ? AND is_deleted = 0')
      .run(startDate, endDate);

    // One line (architecture rule 28); the rows can be undone from the frontend's snapshot.
    console.log(`[Service: Delete Month] ลบข้อมูลทั้งเดือน ${isoMonth} (${startDate} ถึง ${endDate}): ${result.changes} รายการ`);
    return result;
  }

  deleteAll() {
    return db.transaction(() => {
      const txCount = (db.prepare('SELECT COUNT(*) as c FROM transactions WHERE is_deleted = 0').get() as { c: number }).c;
      const calCount = (db.prepare('SELECT COUNT(*) as c FROM calendar_days').get() as { c: number }).c;
      const txResult = db.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE is_deleted = 0').run();
      const calResult = db.prepare('DELETE FROM calendar_days').run();
      // ประวัติมูลค่าพอร์ตคำนวณจาก ledger ที่เพิ่งถูกล้าง — เก็บไว้กราฟจะโชว์เส้นของข้อมูลที่ไม่มีแล้ว (นิยามสินทรัพย์ยังอยู่)
      db.prepare('DELETE FROM portfolio_snapshots').run();
      console.log(`[Service: Reset All] ดำเนินการล้างข้อมูลทั้งหมด: ธุรกรรม ${txResult.changes} รายการ (จากทั้งหมด ${txCount}), ปฏิทิน ${calResult.changes} รายการ (จากทั้งหมด ${calCount})`);
    })();
  }

  /**
   * Returns a distinct list of YYYY-MM where transactions exist
   */
  count(): number {
    return (db.prepare('SELECT COUNT(*) AS c FROM transactions WHERE is_deleted = 0').get() as { c: number }).c;
  }

  getAvailablePeriods(): string[] {
    const rows = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', date) as period 
      FROM transactions 
      WHERE is_deleted = 0 
      ORDER BY period DESC
    `).all() as Array<{ period: string }>;
    return rows.map(r => r.period);
  }

  /**
   * Search transactions using Full-Text Search (FTS5) with safe sanitization and fallback
   */
  search(query: string): any[] {
    const raw = (query || '').trim();
    if (!raw) return [];
    
    // Check if FTS index is empty but transactions exist (need first-time sync)
    const ftsCount = (db.prepare("SELECT COUNT(*) as count FROM transactions_fts").get() as { count: number }).count;
    const txCount = (db.prepare("SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0").get() as { count: number }).count;
    
    if (ftsCount === 0 && txCount > 0) {
      console.log('Rebuilding Search Index (FTS5)...');
      db.exec("INSERT INTO transactions_fts(rowid, id, description) SELECT rowid, id, description FROM transactions WHERE is_deleted = 0");
    }

    // Sanitize query to avoid FTS5 syntax errors
    const sanitized = raw
      .replace(/["'*(){}[\]^:?+\-~]/g, ' ')
      .replace(/\b(AND|OR|NOT|NEAR)\b/gi, ' ')
      .trim();

    const tokens = sanitized.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return this.searchLike(raw); // only symbols were entered

    const ftsQuery = tokens.map(t => `"${t}"*`).join(' ');

    try {
      const rows = db.prepare(`
        SELECT
          t.id, t.date, t.description, t.amount, t.category_id, t.created_at, t.allocation_type, t.asset_id, t.units, t.trade_side,
          c.name as category, cg.type as group_type
        FROM transactions_fts f
        JOIN transactions t ON f.rowid = t.rowid
        JOIN categories c ON t.category_id = c.id
        JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
        WHERE transactions_fts MATCH ? AND t.is_deleted = 0
        ORDER BY rank
      `).all(ftsQuery);

      // FTS5's tokenizer cannot split Thai (no spaces), so it only matches the start of a run of text:
      // "ไก่" never finds "ข้าวมันไก่". An empty FTS answer therefore falls through to a substring search.
      return rows.length > 0 ? rows : this.searchLike(raw);
    } catch (ftsErr: any) {
      console.warn('[WARN] FTS5 search query error, falling back to LIKE:', ftsErr.message);
      return this.searchLike(raw);
    }
  }

  /** Literal substring search over description and category name (the FTS5 fallback). */
  private searchLike(raw: string): any[] {
    const pattern = `%${escapeLike(raw)}%`;
    return db.prepare(`
      SELECT
        t.id, t.date, t.description, t.amount, t.category_id, t.created_at, t.allocation_type, t.asset_id, t.units, t.trade_side,
        c.name as category, cg.type as group_type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      WHERE (t.description LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\') AND t.is_deleted = 0
      ORDER BY t.date DESC
      LIMIT 50
    `).all(pattern, pattern);
  }

  /**
   * Returns aggregated frequent transactions for all-time suggestions.
   */
  getFrequentItems(): FrequentItem[] {
    const rows = db.prepare(`
      SELECT 
        t.category_id, 
        c.name as category_name,
        t.description, 
        t.amount, 
        t.allocation_type,
        COUNT(*) as count,
        MAX(t.date) as last_date
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.is_deleted = 0 AND (t.trade_side IS NULL OR t.trade_side = 'buy')
      GROUP BY t.category_id, t.description, t.amount, t.allocation_type
      ORDER BY count DESC, last_date DESC
    `).all() as Array<{
      category_id: string;
      category_name: string;
      description: string | null;
      amount: number;
      allocation_type: 'need' | 'want' | 'savings' | null;
      count: number;
      last_date: string;
    }>;
    
    return rows.map(row => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      description: row.description || '',
      amount: row.amount / 100, // Convert Satang to Baht
      allocation_type: row.allocation_type,
      count: row.count,
      lastDate: row.last_date
    }));
  }
}

export default new TransactionService();
