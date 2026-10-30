import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { log } from '../utils/logger';

const baseDir = path.join(__dirname, '../../');
let DB_PATH = process.env.DB_PATH || path.join(baseDir, 'data/cashflow.db');

// Override for Demo Mode
if (process.env.USE_DEMO_DB === 'true') {
    const dbDir = path.dirname(DB_PATH);
    DB_PATH = path.join(dbDir, 'cashflow_demo.db');
    log.warn('db', 'โหมดสาธิต: ใช้ฐานข้อมูล cashflow_demo.db ไม่ใช่ข้อมูลจริง');
}

// สร้าง directory ถ้ายังไม่มี
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

function openDatabase(dbPath: string): Database.Database {
    const d = new Database(dbPath);
    
    // บังคับใช้โหมด DELETE แทน WAL เพื่อความเสถียรบน Docker Bind Mounts (Windows/macOS)
    try {
        d.pragma('journal_mode = DELETE');
        d.pragma('synchronous = FULL'); // มั่นใจว่าเขียนลงดิสก์แน่นอน
        d.pragma('busy_timeout = 5000');
        d.pragma('foreign_keys = ON');
    } catch (e: unknown) {
        log.warn('db', 'ตั้งค่า PRAGMA ไม่สำเร็จ:', e);
    }
    
    return d;
}

const db = openDatabase(DB_PATH);

log.info('db', `เปิดฐานข้อมูล ${DB_PATH} (journal DELETE)`);

export default db;
