import type { Request, Response } from 'express';
import backupService from '../services/backupService';

export const performBackup = async (_req: Request, res: Response) => {
    const result = await backupService.createBackup();
    res.status(200).json({
        success: true,
        message: 'Backup completed successfully',
        filename: result.filename
    });
};

export const listBackups = (_req: Request, res: Response) => {
    const files = backupService.listBackups();
    res.json(files);
};

