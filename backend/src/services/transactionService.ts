import db from '../config/db';
import crypto from 'crypto';
import { Transaction } from '../types';

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

    query += ` ORDER BY t.date ASC, t.created_at ASC`;

    return db.prepare(query).all(...params) as TransactionWithDetails[];
  }

  /**
   * Helper to find or create a category by name
   */
  getCategoryIdByName(name: string): string | null {
    let cat = db.prepare("SELECT id FROM categories WHERE name = ?").get(name) as { id: string } | undefined;
    if (!cat) {
      // Create a default category if not found
      // Find a default group (first one available)
      const defaultGroup = db.prepare("SELECT id FROM cashflow_groups LIMIT 1").get() as { id: string } | undefined;
      if (defaultGroup) {
        const id = crypto.randomUUID();
        db.prepare("INSERT INTO categories (id, name, cashflow_group_id) VALUES (?, ?, ?)")
          .run(id, name, defaultGroup.id);
        return id;
      }
      return null;
    }
    return cat.id;
  }

  /**
   * AI-Lite: Suggest category based on description keywords or historical matches
   */
  suggestCategory(description: string): string | null {
    if (!description) return null;
    const desc = description.toLowerCase();

    // 1. Keyword Mapping (The "Shark" Rules)
    const rules = [
      { keywords: ['7-eleven', 'เซเว่น', 'cj express', 'lotus', 'big c', 'mart'], category: '🛒 สินค้าทั่วไป' },
      { keywords: ['grab', 'foodpanda', 'lineman', 'shopeefood', 'กิน', 'food', 'อาหาร', 'ข้าว', 'เตี๋ยว', 'ตำ'], category: '🍔 อาหารและเครื่องดื่ม' },
      { keywords: ['bts', 'mrt', 'grab taxi', 'bolt', 'เติมน้ำมัน', 'ptt', 'shell', 'caltex', 'บางจาก'], category: '🚗 การเดินทาง' },
      { keywords: ['ais', 'true', 'dtac', 'netflix', 'spotify', 'youtube', 'internet', 'เน็ต'], category: '🌐 บริการดิจิทัล' },
      { keywords: ['หอ', 'คอนโด', 'ไฟฟ้า', 'ประปา', 'ค่าส่วนกลาง', 'rent'], category: '🏠 ที่พักอาศัย' }
    ];

    for (const rule of rules) {
      if (rule.keywords.some(k => desc.includes(k))) {
        return this.getCategoryIdByName(rule.category);
      }
    }

    // 2. Historical Match (Exact description match from past transactions)
    const history = db.prepare(`
      SELECT category_id FROM transactions 
      WHERE LOWER(description) = ? AND is_deleted = 0 
      LIMIT 1
    `).get(desc) as { category_id: string } | undefined;

    if (history) return history.category_id;

    // 3. Fuzzy Historical Match (Similar description)
    const fuzzy = db.prepare(`
      SELECT category_id FROM transactions 
      WHERE description LIKE ? AND is_deleted = 0 
      ORDER BY created_at DESC LIMIT 1
    `).get(`%${description.split(' ')[0]}%`) as { category_id: string } | undefined;

    return fuzzy ? fuzzy.category_id : null;
  }

  private normalizeDate(dateStr?: string): string {
    if (dateStr && dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr || '';
  }

  private resolveCategoryId(tx: any): string | undefined {
    let categoryId = tx.category_id;
    if (!categoryId || categoryId === '') {
      if (tx.category) {
        categoryId = this.getCategoryIdByName(tx.category);
      }
      if (!categoryId) {
        categoryId = this.suggestCategory(tx.description);
      }
    }
    if (!categoryId) {
      const fallback = db.prepare("SELECT id FROM categories WHERE name LIKE '%อื่น%' OR name LIKE '%เบ็ดเตล็ด%' LIMIT 1").get() as { id: string } | undefined
                    || db.prepare("SELECT id FROM categories LIMIT 1").get() as { id: string } | undefined;
      categoryId = fallback?.id;
    }
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

  upsertMany(transactions: any[]): void {
    const stmt = db.prepare(`
      INSERT INTO transactions (id, date, description, amount, category_id, allocation_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        description = excluded.description,
        amount = excluded.amount,
        category_id = excluded.category_id,
        allocation_type = excluded.allocation_type,
        updated_at = CURRENT_TIMESTAMP,
        is_deleted = 0
    `);

    const transactionAction = db.transaction((txs: any[]) => {
      for (const tx of txs) {
        const date = this.normalizeDate(tx.date);
        const amountSatang = Math.round(tx.amount * 100);
        const categoryId = this.resolveCategoryId(tx);
        const allocationType = this.resolveAllocationType(categoryId, tx.allocation_type);

        stmt.run(
          tx.id || crypto.randomUUID(),
          date,
          tx.description || '',
          amountSatang,
          categoryId,
          allocationType
        );
      }
    });

    transactionAction(transactions);
  }

  delete(id: string) {
    return db.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  deleteByMonth(isoMonth: string) {
    return db.prepare("UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE date LIKE ?")
      .run(`${isoMonth}%`);
  }

  deleteAll() {
    return db.transaction(() => {
      db.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP').run();
      db.prepare('DELETE FROM calendar_days').run();
    })();
  }

  /**
   * Returns a distinct list of YYYY-MM where transactions exist
   */
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
      console.log('🔄 Rebuilding Search Index (FTS5)...');
      db.exec("INSERT INTO transactions_fts(rowid, id, description) SELECT rowid, id, description FROM transactions WHERE is_deleted = 0");
    }

    // Sanitize query to avoid FTS5 syntax errors
    const sanitized = raw
      .replace(/["'*(){}\[\]^:?+\-~]/g, ' ')
      .replace(/\b(AND|OR|NOT|NEAR)\b/gi, ' ')
      .trim();

    const tokens = sanitized.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      // If only symbols were entered, fallback directly to LIKE
      return db.prepare(`
        SELECT 
          t.id, t.date, t.description, t.amount, t.category_id, t.created_at, t.allocation_type,
          c.name as category, cg.type as group_type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
        WHERE (t.description LIKE ? OR c.name LIKE ?) AND t.is_deleted = 0
        ORDER BY t.date DESC
        LIMIT 50
      `).all(`%${raw}%`, `%${raw}%`);
    }

    const ftsQuery = tokens.map(t => `"${t}"*`).join(' ');

    try {
      const rows = db.prepare(`
        SELECT 
          t.id, t.date, t.description, t.amount, t.category_id, t.created_at, t.allocation_type,
          c.name as category, cg.type as group_type
        FROM transactions_fts f
        JOIN transactions t ON f.rowid = t.rowid
        JOIN categories c ON t.category_id = c.id
        JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
        WHERE transactions_fts MATCH ? AND t.is_deleted = 0
        ORDER BY rank
      `).all(ftsQuery);

      return rows;
    } catch (ftsErr: any) {
      console.warn('⚠️ FTS5 search query error, falling back to LIKE:', ftsErr.message);
      return db.prepare(`
        SELECT 
          t.id, t.date, t.description, t.amount, t.category_id, t.created_at, t.allocation_type,
          c.name as category, cg.type as group_type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
        WHERE (t.description LIKE ? OR c.name LIKE ?) AND t.is_deleted = 0
        ORDER BY t.date DESC
        LIMIT 50
      `).all(`%${raw}%`, `%${raw}%`);
    }
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
      WHERE t.is_deleted = 0
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
