const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/cashflow.db');

// สร้าง directory ถ้ายังไม่มี
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// ปรับแต่ง SQLite เพื่อความเสถียรบน Docker/Windows
// ปิด WAL mode เพราะอาจมีปัญหาเรื่อง Shared Memory (SHM) บน Bind Mount
db.pragma('journal_mode = DELETE'); 
db.pragma('foreign_keys = ON');

console.log('✅ SQLite database connected at', DB_PATH);

module.exports = db;