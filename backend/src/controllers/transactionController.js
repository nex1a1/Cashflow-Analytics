const transactionService = require('../services/transactionService');
const db = require('../config/db');
const { upsertTransactionSchema } = require('../validations/transactionValidation');

exports.getAllTransactions = (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const rows = transactionService.getAll(startDate, endDate);
    res.json(rows.map(row => ({
      id:          row.id,
      date:        row.date,
      category:    row.category,
      category_id: row.category_id,
      description: row.description,
      amount:      row.amount / 100, // Convert Satang to Baht
      group_type:  row.group_type
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertTransactions = (req, res) => {
  try {
    const validatedData = upsertTransactionSchema.parse(req.body);
    const items = Array.isArray(validatedData) ? validatedData : [validatedData];

    transactionService.upsertMany(items);

    res.json({ success: true, count: items.length });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTransaction = (req, res) => {
  const { id } = req.params;
  try {
    transactionService.delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMonth = (req, res) => {
  const { isoMonth } = req.params; // Expecting YYYY-MM
  try {
    transactionService.deleteByMonth(isoMonth);
    res.json({ success: true, message: `Deleted data for ${isoMonth}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetAllData = (req, res) => {
  try {
    transactionService.deleteAll();
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailablePeriods = (req, res) => {
  try {
    const periods = transactionService.getAvailablePeriods();
    res.json(periods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchTransactions = (req, res) => {
  const { q } = req.query;
  try {
    const rows = transactionService.search(q);
    res.json(rows.map(row => ({
      id:          row.id,
      date:        row.date,
      category:    row.category,
      category_id: row.category_id,
      description: row.description,
      amount:      row.amount / 100, // Convert Satang to Baht
      group_type:  row.group_type
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFrequentItems = (req, res) => {
  try {
    const items = transactionService.getFrequentItems();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.predictCategories = (req, res) => {
  const { descriptions } = req.body;
  if (!Array.isArray(descriptions)) {
    return res.status(400).json({ error: 'descriptions must be an array' });
  }

  try {
    const predictions = {};
    for (const desc of descriptions) {
      const categoryId = transactionService.suggestCategory(desc);
      if (categoryId) {
        // Find category details
        const cat = db.prepare("SELECT name, id FROM categories WHERE id = ?").get(categoryId);
        predictions[desc] = cat ? { id: cat.id, name: cat.name } : null;
      } else {
        predictions[desc] = null;
      }
    }
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
