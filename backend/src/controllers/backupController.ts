import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../config/db';

// Since we compile to CommonJS, __dirname is globally available.
const BACKUP_DIR = path.join(__dirname, '../../backups');

export const performBackup = async (req: Partial<Request>, res: Partial<Response>) => {
    try {
        // สร้าง directory ถ้ายังไม่มี
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const now = new Date();
        const dayName = days[now.getDay()];
        
        // Pro Rotation: backup-Mon.db, backup-Tue.db, etc.
        const backupFileName = `backup-${dayName}.db`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);

        // ใช้คำสั่ง backup ของ better-sqlite3
        await db.backup(backupPath);

        // Also keep one timestamped "Master" backup per month
        const monthStr = now.toISOString().substring(0, 7);
        const masterFileName = `master-${monthStr}.db`;
        const masterPath = path.join(BACKUP_DIR, masterFileName);
        
        if (!fs.existsSync(masterPath)) {
            await db.backup(masterPath);
            console.log(`📦 Master backup created for ${monthStr}`);
        }

        console.log(`📡 Backup successful: ${backupFileName}`);

        if (res && res.status && res.json) {
            res.status(200).json({
                success: true,
                message: 'Backup completed successfully',
                filename: backupFileName
            });
        }
    } catch (error: any) {
        console.error('Backup Error:', error);
        if (res && res.status && res.json) {
            res.status(500).json({
                success: false,
                message: 'Backup failed: ' + error.message
            });
        }
    }
};

export const listBackups = (req: Request, res: Response) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return res.json([]);
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .map(f => ({
                name: f,
                size: fs.statSync(path.join(BACKUP_DIR, f)).size,
                createdAt: fs.statSync(path.join(BACKUP_DIR, f)).mtime
            }))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        res.json(files);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
