import { Request, Response } from 'express';
import calendarService from '../services/calendarService';
import { calendarDaySchema } from '../validations/calendarValidation';

export const getAllCalendarDays = (req: Request, res: Response) => {
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
    } catch (err: any) {
        console.error('❌ Error in getAllCalendarDays:', err);
        res.status(500).json({ error: err.message });
    }
};

export const upsertCalendarDay = (req: Request, res: Response) => {
    try {
        const validatedData = calendarDaySchema.parse(req.body);
        calendarService.upsert(validatedData.date, validatedData.type_id, validatedData.note || '');
        res.json({ success: true });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation Error', details: err.errors });
        }
        console.error('❌ Error in upsertCalendarDay:', err);
        res.status(500).json({ error: err.message });
    }
};
