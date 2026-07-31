"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = exports.performBackup = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("../config/db"));
// Determine base directory depending on whether running in PKG executable mode
const isPkg = Boolean(process.pkg);
const baseDir = isPkg ? path_1.default.dirname(process.execPath) : path_1.default.join(__dirname, '../../');
const BACKUP_DIR = path_1.default.join(baseDir, 'backups');
const performBackup = async (req, res) => {
    try {
        // สร้าง directory ถ้ายังไม่มี
        if (!fs_1.default.existsSync(BACKUP_DIR)) {
            fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const now = new Date();
        const dayName = days[now.getDay()];
        // Pro Rotation: backup-Mon.db, backup-Tue.db, etc.
        const backupFileName = `backup-${dayName}.db`;
        const backupPath = path_1.default.join(BACKUP_DIR, backupFileName);
        // ใช้คำสั่ง backup ของ better-sqlite3
        await db_1.default.backup(backupPath);
        // Also keep one timestamped "Master" backup per month
        const monthStr = now.toISOString().substring(0, 7);
        const masterFileName = `master-${monthStr}.db`;
        const masterPath = path_1.default.join(BACKUP_DIR, masterFileName);
        if (!fs_1.default.existsSync(masterPath)) {
            await db_1.default.backup(masterPath);
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
    }
    catch (error) {
        console.error('Backup Error:', error);
        if (res && res.status && res.json) {
            res.status(500).json({
                success: false,
                message: 'Backup failed: ' + error.message
            });
        }
    }
};
exports.performBackup = performBackup;
const listBackups = (req, res) => {
    try {
        if (!fs_1.default.existsSync(BACKUP_DIR)) {
            return res.json([]);
        }
        const files = fs_1.default.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .map(f => ({
            name: f,
            size: fs_1.default.statSync(path_1.default.join(BACKUP_DIR, f)).size,
            createdAt: fs_1.default.statSync(path_1.default.join(BACKUP_DIR, f)).mtime
        }))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        res.json(files);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.listBackups = listBackups;
