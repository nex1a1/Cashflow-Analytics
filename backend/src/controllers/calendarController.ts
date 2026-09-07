import type { Request, Response, NextFunction } from 'express';
import calendarService from '../services/calendarService';
import { calendarDaySchema } from '../validations/calendarValidation';

export const getAllCalendarDays = (req: Request, res: Response, next: NextFunction) => {
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
    } catch (err: unknown) {
        next(err);
    }
};

export const upsertCalendarDay = (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = calendarDaySchema.parse(req.body);
        calendarService.upsert(validatedData.date, validatedData.type_id, validatedData.note || '');
        res.json({ success: true });
    } catch (err: unknown) {
        next(err);
    }
};
