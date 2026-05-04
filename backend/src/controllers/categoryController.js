const categoryService = require('../services/categoryService');

exports.getAllCategories = (req, res) => {
  try {
    const rows = categoryService.getAll();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertCategory = (req, res) => {
  try {
    categoryService.upsert(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCategory = (req, res) => {
  try {
    categoryService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
