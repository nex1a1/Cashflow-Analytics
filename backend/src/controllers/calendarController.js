const calendarService = require('../services/calendarService');

exports.getAllCalendarDays = (req, res) => {
    try {
        const rows = calendarService.getAll();
        const data = {};
        rows.forEach(row => {
            data[row.date_str] = row.type;
        });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.upsertCalendarDay = (req, res) => {
    const { dateStr, type } = req.body;
    
    if (!dateStr || !type) {
        return res.status(400).json({ error: 'Missing dateStr or type' });
    }

    try {
        calendarService.upsert(dateStr, type);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};