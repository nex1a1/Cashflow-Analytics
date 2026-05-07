const dayTypeService = require('../services/dayTypeService');
const { dayTypeSchema } = require('../validations/dayTypeValidation');

exports.getAllDayTypes = (req, res) => {
  try {
    const rows = dayTypeService.getAll();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertDayType = (req, res) => {
  try {
    const validatedData = dayTypeSchema.parse(req.body);
    dayTypeService.upsert(validatedData);
    res.json({ success: true });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDayType = (req, res) => {
  try {
    dayTypeService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
