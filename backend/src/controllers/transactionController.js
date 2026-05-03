const transactionService = require('../services/transactionService');
const { upsertTransactionSchema } = require('../validations/transactionValidation');

exports.getAllTransactions = (req, res) => {
  try {
    const rows = transactionService.getAll();
    res.json(rows.map(row => ({
      id:          row.id,
      date:        row.date,
      category:    row.category,
      description: row.description,
      amount:      row.amount,
      dayNote:     row.day_note
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertTransactions = (req, res) => {
  try {
    const validatedData = upsertTransactionSchema.parse(req.body);
    const items = Array.isArray(validatedData) ? validatedData : [validatedData];

    // Use upsertMany for atomic transaction
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