const db = require('../config/db');

class TransactionService {
  getAll() {
    return db.prepare('SELECT * FROM transactions ORDER BY iso_date ASC, id ASC').all();
  }

  upsert(transaction) {
    const stmt = db.prepare(`
      INSERT INTO transactions (id, date, iso_date, category, description, amount, day_note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        iso_date = excluded.iso_date,
        category = excluded.category,
        description = excluded.description,
        amount = excluded.amount,
        day_note = excluded.day_note
    `);
    return stmt.run(
      transaction.id,
      transaction.date,
      transaction.iso_date,
      transaction.category,
      transaction.description,
      transaction.amount,
      transaction.dayNote || ''
    );
  }

  /**
   * Performs multiple upserts within a single atomic transaction.
   * Ensures data consistency for batch operations.
   */
  upsertMany(transactions) {
    const stmt = db.prepare(`
      INSERT INTO transactions (id, date, iso_date, category, description, amount, day_note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        iso_date = excluded.iso_date,
        category = excluded.category,
        description = excluded.description,
        amount = excluded.amount,
        day_note = excluded.day_note
    `);

    const transactionAction = db.transaction((txs) => {
      for (const tx of txs) {
        // Calculate iso_date if not provided
        let iso_date = tx.iso_date;
        if (!iso_date && tx.date) {
            const [d, m, y] = tx.date.split('/');
            iso_date = `${y}-${m}-${d}`;
        }
        
        stmt.run(
          tx.id,
          tx.date,
          iso_date,
          tx.category,
          tx.description || tx.category,
          tx.amount,
          tx.dayNote || ''
        );
      }
    });

    return transactionAction(transactions);
  }

  delete(id) {
    return db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  }

  deleteByMonth(isoMonth) {
    return db.prepare('DELETE FROM transactions WHERE iso_date LIKE ?').run(`${isoMonth}%`);
  }

  deleteAll() {
    return db.transaction(() => {
      db.prepare('DELETE FROM transactions').run();
      db.prepare('DELETE FROM settings').run();
      db.prepare('DELETE FROM calendar_days').run();
    })();
  }
}

module.exports = new TransactionService();