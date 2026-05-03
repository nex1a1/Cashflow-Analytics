const settingService = require('../services/settingService');
const { upsertSettingSchema } = require('../validations/settingValidation');

exports.getAllSettings = (req, res) => {
    try {
        const rows = settingService.getAll();
        const settings = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.upsertSetting = (req, res) => {
    try {
        const { key, value } = upsertSettingSchema.parse(req.body);
        settingService.upsert(key, value);
        res.json({ success: true });
    } catch (err) {
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation failed', details: err.errors });
        }
        res.status(500).json({ error: err.message });
    }
};