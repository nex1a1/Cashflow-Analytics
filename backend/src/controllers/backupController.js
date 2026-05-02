const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Path สำหรับเก็บ backup
const BACKUP_DIR = path.join(__dirname, '../../backups');

const performBackup = async (req, res) => {
    try {
        // สร้าง directory ถ้ายังไม่มี
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const dbPath = db.name; // better-sqlite3 เก็บ path ไว้ใน .name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `cashflow_backup_${timestamp}.db`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);

        // ใช้คำสั่ง backup ของ better-sqlite3 (แนะนำเพราะปลอดภัยต่อ WAL mode)
        await db.backup(backupPath);

        // ลบ backup เก่าๆ เก็บไว้แค่ 5 อันล่าสุด
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('cashflow_backup_'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 5) {
            files.slice(5).forEach(f => {
                fs.unlinkSync(path.join(BACKUP_DIR, f.name));
            });
        }

        res.status(200).json({
            success: true,
            message: 'Backup completed successfully',
            filename: backupFileName
        });
    } catch (error) {
        console.error('Backup Error:', error);
        res.status(500).json({
            success: false,
            message: 'Backup failed: ' + error.message
        });
    }
};

const listBackups = (req, res) => {
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
            .sort((a, b) => b.createdAt - a.createdAt);

        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    performBackup,
    listBackups
};
