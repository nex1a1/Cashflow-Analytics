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
function openDatabase(dbPath) {
    return new Database(dbPath, {
        verbose: (msg) => {
            // สนใจเฉพาะคำสั่งที่มีการเปลี่ยนแปลงข้อมูล (ลดความรกของ Log จากคำสั่ง SELECT)
            if (/^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(msg.trim())) {
                console.log(`[DB MUTATION] ${msg}`);
            }
        }
    });
}

let db = openDatabase(DB_PATH);

// ปรับแต่ง SQLite เพื่อความเสถียรและความเร็ว
try {
    db.pragma('journal_mode = WAL'); 
} catch (err) {
    if (err.code === 'SQLITE_IOERR_SHMOPEN') {
        console.warn('⚠️ WAL mode is not supported on this filesystem (SQLITE_IOERR_SHMOPEN). Falling back to journal_mode = DELETE.');
        try {
            db.pragma('journal_mode = DELETE');
        } catch (err2) {
            // กรณีที่ DB ติดค้างอยู่ในโหมด WAL และไม่สามารถเปลี่ยนเป็น DELETE ได้บน filesystem นี้
            if (err2.code === 'SQLITE_IOERR_SHMOPEN') {
                console.warn('🚨 Database is STUCK in WAL mode and cannot be opened on this filesystem.');
                console.log('🔄 Attempting emergency recovery via /tmp migration...');
                
                db.close();
                
                const tempDbPath = path.join('/tmp', `recovery_${Date.now()}.db`);
                try {
                    fs.copyFileSync(DB_PATH, tempDbPath);
                    
                    const tempDb = new Database(tempDbPath);
                    tempDb.pragma('journal_mode = DELETE');
                    tempDb.close();
                    
                    fs.copyFileSync(tempDbPath, DB_PATH);
                    console.log('✅ Recovery successful: Database header updated to DELETE mode.');
                    
                    // ลบไฟล์ WAL/SHM ที่อาจค้างอยู่ (พยายามลบ หรือทำให้ว่างเปล่า)
                    ['wal', 'shm'].forEach(ext => {
                        const f = `${DB_PATH}-${ext}`;
                        try {
                            if (fs.existsSync(f)) {
                                try {
                                    fs.unlinkSync(f);
                                } catch (e) {
                                    // ถ้าลบไม่ได้ (ติด Lock บน Windows) ให้ลองเขียนทับให้ว่างเปล่า
                                    fs.writeFileSync(f, Buffer.alloc(0));
                                    console.log(`🧹 Truncated locked file: ${f}`);
                                }
                            }
                        } catch (e) {
                            console.warn(`⚠️ Could not clean up ${f}: ${e.message}`);
                        }
                    });
                } catch (recoveryErr) {
                    console.error('❌ Emergency recovery failed:', recoveryErr.message);
                } finally {
                    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
                }
                
                // ลองเปิดใหม่อีกครั้ง
                try {
                    db = openDatabase(DB_PATH);
                    db.pragma('journal_mode = DELETE');
                } catch (e) {
                    console.error('🚨 STILL failing after recovery. This filesystem is extremely restrictive.');
                    console.log('🛡️ Entering SAFE MODE: Using a clean filename to bypass locks...');
                    
                    const safeDbPath = DB_PATH.replace('.db', '_safe.db');
                    if (!fs.existsSync(safeDbPath)) {
                        fs.copyFileSync(DB_PATH, safeDbPath);
                    }
                    db = openDatabase(safeDbPath);
                    db.pragma('journal_mode = DELETE');
                    console.log(`✅ Safe mode active: Connected to ${safeDbPath}`);
                }
            } else {
                throw err2;
            }
        }
    } else {
        throw err;
    }
}

// Wrap pragmas in try-catch to ensure the server starts even with minor I/O issues
try {
    db.pragma('synchronous = NORMAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
} catch (e) {
    console.warn('⚠️ Some DB pragmas could not be set, but the server will attempt to run:', e.message);
}

console.log('✅ SQLite database connected at', DB_PATH);

module.exports = db;