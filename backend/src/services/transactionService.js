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

  upsertMany(transactions) {
    const stmt = db.prepare(`
      INSERT INTO transactions (id, date, description, amount, category_id, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        description = excluded.description,
        amount = excluded.amount,
        category_id = excluded.category_id,
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
        // Assume input is Baht (float)
        const amountSatang = Math.round(tx.amount * 100);

        // Category mapping
        let categoryId = tx.category_id;
        // หากไม่มี category_id (เป็น null/undefined) ค่อยไปหาจากชื่อ category
        if (categoryId === undefined || categoryId === null || categoryId === '') {
          if (tx.category) {
            categoryId = this.getCategoryIdByName(tx.category);
          }
        }

        if (!categoryId) {
          throw new Error(`Category not found or could not be created for: ${tx.category || 'Unknown'}`);
        }

        stmt.run(
          tx.id,
          date,
          tx.description || '',
          amountSatang,
          categoryId
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
   * Returns aggregated frequent transactions for all-time suggestions
   */
  getFrequentItems() {
    const rows = db.prepare(`
      SELECT 
        t.category_id, 
        c.name as category_name,
        t.description, 
        t.amount, 
        COUNT(*) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.is_deleted = 0
      GROUP BY t.category_id, t.description, t.amount
      ORDER BY count DESC, t.amount DESC
    `).all();
    
    return rows.map(row => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      description: row.description || '',
      amount: row.amount / 100, // Convert Satang to Baht
      count: row.count
    }));
  }
}

module.exports = new TransactionService();
