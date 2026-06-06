import { Request, Response } from 'express';
import settingService from '../services/settingService';
import { upsertSettingSchema } from '../validations/settingValidation';

export const getAllSettings = (req: Request, res: Response) => {
    try {
        const rows = settingService.getAll();
        const settings: Record<string, any> = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const upsertSetting = (req: Request, res: Response) => {
    try {
        const { key, value } = upsertSettingSchema.parse(req.body);
        settingService.upsert(key, value);
        res.json({ success: true });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation failed', details: err.errors });
        }
        res.status(500).json({ error: err.message });
    }
};
