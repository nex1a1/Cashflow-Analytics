const db = require('../config/db');

class TransactionService {
  getAll(startDate, endDate) {
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
    const params = [];

    if (startDate) {
      query += ` AND t.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY t.date ASC, t.created_at ASC`;

    return db.prepare(query).all(...params);
  }

  /**
   * Helper to find or create a category by name
   */
  getCategoryIdByName(name) {
    let cat = db.prepare("SELECT id FROM categories WHERE name = ?").get(name);
    if (!cat) {
      // Create a default category if not found
      // Find a default group (first one available)
      const defaultGroup = db.prepare("SELECT id FROM cashflow_groups LIMIT 1").get();
      if (defaultGroup) {
        const id = require('crypto').randomUUID();
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
  suggestCategory(description) {
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
    `).get(desc);

    if (history) return history.category_id;

    // 3. Fuzzy Historical Match (Similar description)
    const fuzzy = db.prepare(`
      SELECT category_id FROM transactions 
      WHERE description LIKE ? AND is_deleted = 0 
      ORDER BY created_at DESC LIMIT 1
    `).get(`%${description.split(' ')[0]}%`);

    return fuzzy ? fuzzy.category_id : null;
  }

  upsertMany(transactions) {
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

    const transactionAction = db.transaction((txs) => {
      for (const tx of txs) {
        // Convert date to YYYY-MM-DD if in DD/MM/YYYY
        let date = tx.date;
        if (date && date.includes('/')) {
          const [d, m, y] = date.split('/');
          date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        // Amount to Satang (integer)
        const amountSatang = Math.round(tx.amount * 100);

        // Category mapping logic
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
          const fallback = db.prepare("SELECT id FROM categories WHERE name LIKE '%อื่น%' OR name LIKE '%เบ็ดเตล็ด%' LIMIT 1").get()
                        || db.prepare("SELECT id FROM categories LIMIT 1").get();
          categoryId = fallback?.id;
        }

        // Smart Allocation Type logic: 
        // Use provided allocation_type, or default to the category's group default
        let allocationType = tx.allocation_type;
        if (!allocationType) {
          const groupDefault = db.prepare(`
            SELECT cg.allocation_type 
            FROM cashflow_groups cg
            JOIN categories c ON c.cashflow_group_id = cg.id
            WHERE c.id = ?
          `).get(categoryId);
          
          allocationType = groupDefault?.allocation_type || 'want';
        }

        stmt.run(
          tx.id || require('crypto').randomUUID(),
          date,
          tx.description || '',
          amountSatang,
          categoryId,
          allocationType
        );
      }
    });

    return transactionAction(transactions);
  }

  delete(id) {
    return db.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  deleteByMonth(isoMonth) {
    return db.prepare("UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE date LIKE ?")
      .run(`${isoMonth}%`);
  }

  deleteAll() {
    return db.transaction(() => {
      db.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP').run();
      db.prepare('DELETE FROM calendar_days').run();
      // Settings might still be needed for other things
    })();
  }

  /**
   * Returns a distinct list of YYYY-MM where transactions exist
   */
  getAvailablePeriods() {
    const rows = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', date) as period 
      FROM transactions 
      WHERE is_deleted = 0 
      ORDER BY period DESC
    `).all();
    return rows.map(r => r.period);
  }

  /**
   * Search transactions using Full-Text Search (FTS5)
   */
  search(query) {
    if (!query) return [];
    
    // Check if FTS index is empty but transactions exist (need first-time sync)
    const ftsCount = db.prepare("SELECT COUNT(*) as count FROM transactions_fts").get().count;
    const txCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0").get().count;
    
    if (ftsCount === 0 && txCount > 0) {
      console.log('🔄 Rebuilding Search Index (FTS5)...');
      db.exec("INSERT INTO transactions_fts(rowid, id, description) SELECT rowid, id, description FROM transactions WHERE is_deleted = 0");
    }

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
    `).all(query);

    return rows;
  }

  /**
   * Returns aggregated frequent transactions for all-time suggestions.
   * Improved logic: We weigh frequency by "last used" recency to keep suggestions fresh.
   */
  getFrequentItems() {
    // 1. Get raw groups with counts and last date
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
    `).all();
    
    // 2. Score them (Optional: Could add more complex weighting here)
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

module.exports = new TransactionService();
