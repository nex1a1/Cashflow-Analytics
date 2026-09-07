import type { Request, Response, NextFunction } from 'express';
import backupService from '../services/backupService';

export const performBackup = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await backupService.createBackup();
        res.status(200).json({
            success: true,
            message: 'Backup completed successfully',
            filename: result.filename
        });
    } catch (err: unknown) {
        next(err);
    }
};

export const listBackups = (_req: Request, res: Response, next: NextFunction) => {
    try {
        const files = backupService.listBackups();
        res.json(files);
    } catch (err: unknown) {
        next(err);
    }
};

