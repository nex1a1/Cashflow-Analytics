const db = require('../config/db');

exports.getAllTransactions = (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM transactions ORDER BY date ASC').all();
    res.json(rows.map(row => ({
      id:              row.id,
      date:            row.date,
      category:        row.category,
      description:     row.description,
      amount:          parseFloat(row.amount),
      dayNote:         row.day_note,
      paymentMethodId: row.payment_method_id || null, 
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertTransactions = (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  
  const upsert = db.prepare(`
    INSERT INTO transactions (id, date, category, description, amount, day_note, payment_method_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date              = excluded.date,
      category          = excluded.category,
      description       = excluded.description,
      amount            = excluded.amount,
      day_note          = excluded.day_note,
      payment_method_id = excluded.payment_method_id
  `);

  const runAll = db.transaction((rows) => {
    for (const item of rows) {
      upsert.run(
        item.id, 
        item.date, 
        item.category, 
        item.description, 
        item.amount, 
        item.dayNote || '',
        item.paymentMethodId || null
      );
    }
  });

  try {
    runAll(items);
    res.json({ success: true, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTransactionById = (req, res) => {
  try {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAllTransactions = (req, res) => {
  try {
    db.prepare('DELETE FROM transactions').run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetAllData = (req, res) => {
  const resetAll = db.transaction(() => {
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM calendar_days').run();
  });
  try {
    resetAll();
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};