const calendarService = require('../services/calendarService');

exports.getAllCalendarDays = (req, res) => {
    try {
        const rows = calendarService.getAll();
        const data = rows.map(row => ({
            date: row.date,
            type_id: row.day_type_id,
            note: row.note,
            type_label: row.type_label,
            type_color: row.type_color
        }));
        res.json(data);
    } catch (err) {
        console.error('❌ Error in getAllCalendarDays:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.upsertCalendarDay = (req, res) => {
    const { date, type_id, note } = req.body;
    
    if (!date || type_id === undefined) {
        return res.status(400).json({ error: 'Missing date or type_id' });
    }

    try {
        calendarService.upsert(date, type_id, note);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error in upsertCalendarDay:', err);
        res.status(500).json({ error: err.message });
    }
};
