"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Since we are compiling to CommonJS, __dirname is globally available.
let DB_PATH = process.env.DB_PATH || path_1.default.join(__dirname, '../../data/cashflow.db');
// Override for Demo Mode
if (process.env.USE_DEMO_DB === 'true') {
    const dbDir = path_1.default.dirname(DB_PATH);
    DB_PATH = path_1.default.join(dbDir, 'cashflow_demo.db');
    console.warn('⚠️ ===================================================');
    console.warn('⚠️ WARNING: RUNNING IN DEMO MODE (cashflow_demo.db)');
    console.warn('⚠️ ===================================================');
}
// สร้าง directory ถ้ายังไม่มี
const dbDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
function parseSqlValues(cleanSql) {
    const match = cleanSql.match(/VALUES\s*\(([^)]+)\)/i);
    if (!match)
        return [];
    const raw = match[1];
    const items = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        if ((char === "'" || char === '"') && (i === 0 || raw[i - 1] !== '\\')) {
            if (!inQuote) {
                inQuote = true;
                quoteChar = char;
            }
            else if (char === quoteChar) {
                inQuote = false;
            }
            else {
                current += char;
            }
        }
        else if (char === ',' && !inQuote) {
            items.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    if (current.trim()) {
        items.push(current.trim());
    }
    return items.map(item => {
        let cleaned = item.replace(/\/\*.*?\*\//g, '').trim();
        if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
            cleaned = cleaned.substring(1, cleaned.length - 1);
        }
        return cleaned;
    });
}
function formatDbMutationLog(msgStr) {
    const clean = msgStr.replace(/\s+/g, ' ').trim();
    // 0. Mute internal FTS index trigger sync noise
    if (/transactions_fts/i.test(clean)) {
        return null;
    }
    // 1. 💳 Transactions (INSERT / UPSERT / DELETE)
    if (/INSERT INTO transactions\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 4) {
            const date = args[1] || '';
            const desc = args[2] || 'ไม่ระบุ';
            const satang = parseFloat(args[3]) || 0;
            const baht = (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const allocRaw = args[5];
            const alloc = allocRaw && allocRaw !== 'NULL' && allocRaw !== '' ? ` (${allocRaw})` : '';
            return `💳 [ธุรกรรม] บันทึกข้อมูล: ${date} | "${desc}" | ฿${baht}${alloc}`;
        }
    }
    if (/UPDATE transactions SET is_deleted = 1/i.test(clean)) {
        const idMatch = clean.match(/WHERE id = '([^']+)'/i);
        const shortId = idMatch ? idMatch[1].substring(0, 8) : '';
        return `🗑️ [ธุรกรรม] ลบธุรกรรม (ID: ${shortId}...)`;
    }
    // 2. ⚙️ Settings (INSERT / UPDATE)
    if (/INSERT INTO settings\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 2) {
            const key = args[0];
            const val = args[1];
            if (key === 'schema_verified')
                return null; // ข้าม log ตั้งค่าภายใน
            return `⚙️ [การตั้งค่า] อัปเดตค่า: ${key} = "${val}"`;
        }
    }
    // 3. 📅 Calendar Days (INSERT / UPDATE)
    if (/INSERT INTO calendar_days\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 2) {
            const date = args[0];
            const dayTypeId = args[1];
            return `📅 [ปฏิทิน] บันทึกประเภทวัน: ${date} (ประเภท: ${dayTypeId})`;
        }
    }
    // 4. 📆 Day Types (INSERT / UPDATE / DELETE)
    if (/INSERT INTO day_types\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 3) {
            const name = args[1];
            const label = args[2];
            const color = args[3] && args[3] !== 'NULL' ? ` (สี: ${args[3]})` : '';
            return `📆 [ประเภทวัน] เพิ่ม/อัปเดตประเภทวัน: "${label}" [${name}]${color}`;
        }
    }
    if (/DELETE FROM day_types/i.test(clean)) {
        const idMatch = clean.match(/WHERE id = '([^']+)'/i);
        return `🗑️ [ประเภทวัน] ลบประเภทวัน (ID: ${idMatch ? idMatch[1] : ''})`;
    }
    // 5. 🏷️ Categories (INSERT / UPDATE / DELETE)
    if (/INSERT INTO categories\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 2) {
            const name = args[1];
            const icon = args[2] && args[2] !== 'NULL' ? `${args[2]} ` : '';
            const color = args[3] && args[3] !== 'NULL' ? ` (${args[3]})` : '';
            return `🏷️ [หมวดหมู่] บันทึกหมวดหมู่: ${icon}"${name}"${color}`;
        }
    }
    if (/DELETE FROM categories/i.test(clean)) {
        const idMatch = clean.match(/WHERE id = '([^']+)'/i);
        return `🗑️ [หมวดหมู่] ลบหมวดหมู่ (ID: ${idMatch ? idMatch[1] : ''})`;
    }
    // 6. 📁 Cashflow Groups (INSERT / UPDATE / DELETE)
    if (/INSERT INTO cashflow_groups\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 3) {
            const name = args[1];
            const type = args[2];
            const alloc = args[3] && args[3] !== 'NULL' ? `, สัดส่วน: ${args[3]}` : '';
            const icon = args[6] && args[6] !== 'NULL' ? `${args[6]} ` : '';
            return `📁 [กลุ่มกระแสเงินสด] บันทึกกลุ่ม: ${icon}"${name}" (ประเภท: ${type}${alloc})`;
        }
    }
    if (/DELETE FROM cashflow_groups/i.test(clean)) {
        const idMatch = clean.match(/WHERE id = '([^']+)'/i);
        return `🗑️ [กลุ่มกระแสเงินสด] ลบกลุ่ม (ID: ${idMatch ? idMatch[1] : ''})`;
    }
    // Fallback: Clean single line truncated if too long
    const truncated = clean.length > 130 ? clean.substring(0, 127) + '...' : clean;
    return `⚡ [DB] ${truncated}`;
}
function openDatabase(dbPath) {
    const d = new better_sqlite3_1.default(dbPath, {
        verbose: (msg) => {
            const msgStr = typeof msg === 'string' ? msg : String(msg || '');
            if (/^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(msgStr.trim())) {
                const formatted = formatDbMutationLog(msgStr);
                if (formatted) {
                    console.log(`[DB MUTATION] ${formatted}`);
                }
            }
        }
    });
    // บังคับใช้โหมด DELETE แทน WAL เพื่อความเสถียรบน Docker Bind Mounts (Windows/macOS)
    try {
        d.pragma('journal_mode = DELETE');
        d.pragma('synchronous = FULL'); // มั่นใจว่าเขียนลงดิสก์แน่นอน
        d.pragma('busy_timeout = 5000');
        d.pragma('foreign_keys = ON');
    }
    catch (e) {
        console.warn('⚠️ Could not set DB pragmas:', e.message);
    }
    return d;
}
const db = openDatabase(DB_PATH);
console.log('✅ SQLite database connected at', DB_PATH);
console.log('🛡️ Persistence Mode: DELETE (Safe for Docker)');
exports.default = db;
