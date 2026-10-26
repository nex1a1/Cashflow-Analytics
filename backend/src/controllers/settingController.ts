import type { Request, Response } from 'express';
import settingService from '../services/settingService';
import { upsertSettingSchema } from '../validations/settingValidation';

export const getAllSettings = (req: Request, res: Response) => {
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
};

export const upsertSetting = (req: Request, res: Response) => {
    const { key, value } = upsertSettingSchema.parse(req.body);
    settingService.upsert(key, value);
    res.json({ success: true });
};
