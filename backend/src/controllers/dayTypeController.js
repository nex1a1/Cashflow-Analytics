const dayTypeService = require('../services/dayTypeService');

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
    dayTypeService.upsert(req.body);
    res.json({ success: true });
  } catch (err) {
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
