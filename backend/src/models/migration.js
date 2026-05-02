const db = require('../config/db');

/**
 * ฟังก์ชันช่วยแปลง DD/MM/YYYY เป็น YYYY-MM-DD
 */
const convertToISO = (dateStr) => {
    if (!dateStr || !dateStr.includes('/')) return dateStr;
    const [d, m, y] = dateStr.split('/');
    if (!d || !m || !y) return dateStr;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const migrateDates = () => {
    console.log('🚀 Starting Date Format Migration...');

    // 1. จัดการตาราง transactions
    try {
        // เช็กว่ามีคอลัมน์ iso_date หรือยัง
        const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
        const hasIsoDate = tableInfo.some(c => c.name === 'iso_date');

        if (!hasIsoDate) {
            console.log('Adding iso_date column to transactions...');
            db.exec('ALTER TABLE transactions ADD COLUMN iso_date TEXT');
        }

        // อัปเดตข้อมูล iso_date จาก date เดิม
        const rows = db.prepare("SELECT id, date FROM transactions WHERE iso_date IS NULL OR iso_date = ''").all();
        if (rows.length > 0) {
            console.log(`Updating ${rows.length} rows in transactions...`);
            const updateStmt = db.prepare("UPDATE transactions SET iso_date = ? WHERE id = ?");
            
            const transaction = db.transaction((items) => {
                for (const row of items) {
                    updateStmt.run(convertToISO(row.date), row.id);
                }
            });
            transaction(rows);
        }
        
        // สร้าง Index สำหรับ iso_date เพื่อความเร็ว
        db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_iso_date ON transactions(iso_date)');
        console.log('✅ Transactions table migration complete.');
    } catch (err) {
        console.error('❌ Error migrating transactions:', err);
    }

    // 2. จัดการตาราง calendar_days
    try {
        // สำหรับ calendar_days เนื่องจาก date เป็น Primary Key และเราเก็บเป็น DD/MM/YYYY
        // วิธีที่ปลอดภัยที่สุดคือสร้างตารางใหม่ (ถ้าต้องการเปลี่ยน PK) 
        // แต่ในที่นี้เราจะเพิ่มคอลัมน์ iso_date เข้าไปก่อนเพื่อความปลอดภัย
        const tableInfo = db.prepare("PRAGMA table_info(calendar_days)").all();
        const hasIsoDate = tableInfo.some(c => c.name === 'iso_date');

        if (!hasIsoDate) {
            console.log('Adding iso_date column to calendar_days...');
            db.exec('ALTER TABLE calendar_days ADD COLUMN iso_date TEXT');
        }

        const rows = db.prepare("SELECT date FROM calendar_days WHERE iso_date IS NULL OR iso_date = ''").all();
        if (rows.length > 0) {
            console.log(`Updating ${rows.length} rows in calendar_days...`);
            const updateStmt = db.prepare("UPDATE calendar_days SET iso_date = ? WHERE date = ?");
            
            const transaction = db.transaction((items) => {
                for (const row of items) {
                    updateStmt.run(convertToISO(row.date), row.date);
                }
            });
            transaction(rows);
        }
        
        db.exec('CREATE INDEX IF NOT EXISTS idx_calendar_iso_date ON calendar_days(iso_date)');
        console.log('✅ Calendar_days table migration complete.');
    } catch (err) {
        console.error('❌ Error migrating calendar_days:', err);
    }
};

module.exports = { migrateDates };
