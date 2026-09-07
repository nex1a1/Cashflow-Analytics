import type { Request, Response, NextFunction } from 'express';
import settingService from '../services/settingService';
import { upsertSettingSchema } from '../validations/settingValidation';

export const getAllSettings = (req: Request, res: Response, next: NextFunction) => {
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
    } catch (err: unknown) {
        next(err);
    }
};

export const upsertSetting = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { key, value } = upsertSettingSchema.parse(req.body);
        settingService.upsert(key, value);
        res.json({ success: true });
    } catch (err: unknown) {
        next(err);
    }
};
