const categoryService = require('../services/categoryService');
const { categorySchema } = require('../validations/categoryValidation');

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
    const validatedData = categorySchema.parse(req.body);
    categoryService.upsert(validatedData);
    res.json({ success: true });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
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
