const recurringService = require('../services/recurringService');

exports.getAll = (req, res) => {
  try {
    const rows = recurringService.getAll();
    const data = rows.map(r => ({
      ...r,
      amount: r.amount / 100, // Convert to Baht
      is_active: !!r.is_active
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsert = (req, res) => {
  try {
    recurringService.upsert(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = (req, res) => {
  try {
    recurringService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
