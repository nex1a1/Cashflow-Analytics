const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/cashflow.db');

// สร้าง directory ถ้ายังไม่มี
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// เพิ่ม Logging ลงใน Docker เพื่อให้ Debug ง่ายขึ้น (กรองเฉพาะการเขียน/อัปเดต)
const db = new Database(DB_PATH, {
    verbose: (msg) => {
        // สนใจเฉพาะคำสั่งที่มีการเปลี่ยนแปลงข้อมูล (ลดความรกของ Log จากคำสั่ง SELECT)
        if (/^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(msg.trim())) {
            console.log(`[DB MUTATION] ${msg}`);
        }
    }
});

// ปรับแต่ง SQLite เพื่อความเสถียรและความเร็ว
db.pragma('journal_mode = WAL'); 
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

console.log('✅ SQLite database connected at', DB_PATH);

module.exports = db;