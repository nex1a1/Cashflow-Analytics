const db = require('../config/db');

class TransactionService {
  getAll() {
    return db.prepare(`
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
      ORDER BY t.date ASC, t.created_at ASC
    `).all();
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
        const result = db.prepare("INSERT INTO categories (name, cashflow_group_id) VALUES (?, ?)")
          .run(name, defaultGroup.id);
        return result.lastInsertRowid;
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
        if (!categoryId && tx.category) {
          categoryId = this.getCategoryIdByName(tx.category);
        }

        if (!categoryId) {
          throw new Error(`Category not found or could not be created for: ${tx.category}`);
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
}

module.exports = new TransactionService();
