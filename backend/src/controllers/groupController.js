const groupService = require('../services/groupService');
const { groupSchema } = require('../validations/groupValidation');

exports.getAllGroups = (req, res) => {
  try {
    const rows = groupService.getAll();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertGroup = (req, res) => {
  try {
    const validatedData = groupSchema.parse(req.body);
    groupService.upsert(validatedData);
    res.json({ success: true });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.deleteGroup = (req, res) => {
  try {
    groupService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
