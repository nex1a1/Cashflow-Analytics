import { Request, Response } from 'express';
import backupService from '../services/backupService';

export const performBackup = async (_req: Request, res: Response) => {
    try {
        const result = await backupService.createBackup();
        res.status(200).json({
            success: true,
            message: 'Backup completed successfully',
            filename: result.filename
        });
    } catch (error: any) {
        console.error('Backup Error:', error);
        res.status(500).json({
            success: false,
            message: 'Backup failed: ' + error.message
        });
    }
};

export const listBackups = (_req: Request, res: Response) => {
    try {
        const files = backupService.listBackups();
        res.json(files);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

