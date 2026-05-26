const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/cashflow.db');

// Override for Demo Mode
if (process.env.USE_DEMO_DB === 'true') {
    const dbDir = path.dirname(DB_PATH);
    DB_PATH = path.join(dbDir, 'cashflow_demo.db');
    console.warn('⚠️ ===================================================');
    console.warn('⚠️ WARNING: RUNNING IN DEMO MODE (cashflow_demo.db)');
    console.warn('⚠️ ===================================================');
}

// สร้าง directory ถ้ายังไม่มี
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

function openDatabase(dbPath) {
    const d = new Database(dbPath, {
        verbose: (msg) => {
            if (/^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(msg.trim())) {
                console.log(`[DB MUTATION] ${msg}`);
            }
        }
    });
    
    // บังคับใช้โหมด DELETE แทน WAL เพื่อความเสถียรบน Docker Bind Mounts (Windows/macOS)
    // โหมด WAL มักมีปัญหากับระบบไฟล์จำลอง และอาจทำให้ข้อมูลไม่ถูกบันทึกจริงหาก Backend ปิดไม่ปกติ
    try {
        d.pragma('journal_mode = DELETE');
        d.pragma('synchronous = FULL'); // มั่นใจว่าเขียนลงดิสก์แน่นอน
        d.pragma('busy_timeout = 5000');
        d.pragma('foreign_keys = ON');
    } catch (e) {
        console.warn('⚠️ Could not set DB pragmas:', e.message);
    }
    
    return d;
}

const db = openDatabase(DB_PATH);

console.log('✅ SQLite database connected at', DB_PATH);
console.log('🛡️ Persistence Mode: DELETE (Safe for Docker)');

module.exports = db;
