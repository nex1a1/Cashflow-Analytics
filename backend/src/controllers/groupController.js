const groupService = require('../services/groupService');

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
    groupService.upsert(req.body);
    res.json({ success: true });
  } catch (err) {
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
