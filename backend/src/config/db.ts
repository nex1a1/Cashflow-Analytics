import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const baseDir = path.join(__dirname, '../../');
let DB_PATH = process.env.DB_PATH || path.join(baseDir, 'data/cashflow.db');

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

function parseSqlValues(cleanSql: string): string[] {
    const match = /VALUES\s*\(([^)]+)\)/i.exec(cleanSql);
    if (!match) return [];

    const raw = match[1];
    const items: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        if ((char === "'" || char === '"') && (i === 0 || raw[i - 1] !== '\\')) {
            if (!inQuote) {
                inQuote = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuote = false;
            } else {
                current += char;
            }
        } else if (char === ',' && !inQuote) {
            items.push(current.trim());
            current = '';
        } else {
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

function formatTransactionMutation(clean: string): string | null {
    if (/INSERT INTO transactions\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 4) {
            const date = args[1] || '';
            const desc = args[2] || 'ไม่ระบุ';
            const satang = Number.parseFloat(args[3]) || 0;
            const baht = (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const allocRaw = args[5];
            const alloc = allocRaw && allocRaw !== 'NULL' && allocRaw !== '' ? ` (${allocRaw})` : '';

            return `💳 [ธุรกรรม] บันทึกข้อมูล: ${date} | "${desc}" | ฿${baht}${alloc}`;
        }
    }

    if (/UPDATE transactions SET is_deleted = 1/i.test(clean)) {
        if (/WHERE date >=/i.test(clean)) {
            return `🗑️ [ธุรกรรม] ลบข้อมูลรายเดือน (ลบทั้งช่วงเดือน)`;
        }
        const idMatch = /WHERE id = '([^']+)'/i.exec(clean);
        const fullId = idMatch ? idMatch[1] : '';
        return fullId ? `🗑️ [ธุรกรรม] ลบธุรกรรม (ID: ${fullId})` : `🗑️ [ธุรกรรม] ลบธุรกรรม (กลุ่ม/ทั้งหมด)`;
    }

    if (/UPDATE transactions SET is_deleted = 0/i.test(clean)) {
        return `♻️ [ธุรกรรม] กู้คืนข้อมูลธุรกรรม (Restore)`;
    }
    return null;
}

function formatSettingsMutation(clean: string): string | null {
    if (/INSERT INTO settings\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 2) {
            const key = args[0];
            const val = args[1];
            if (key === 'schema_verified') return ''; // Mute internal flag
            return `⚙️ [การตั้งค่า] อัปเดตค่า: ${key} = "${val}"`;
        }
    }
    return null;
}

function formatCalendarMutation(clean: string): string | null {
    if (/INSERT INTO calendar_days\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 2) {
            const date = args[0];
            const dayTypeId = args[1];
            return `📅 [ปฏิทิน] บันทึกประเภทวัน: ${date} (ประเภท: ${dayTypeId})`;
        }
    }
    return null;
}

function formatDayTypeMutation(clean: string): string | null {
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
        const idMatch = /WHERE id = '([^']+)'/i.exec(clean);
        return `🗑️ [ประเภทวัน] ลบประเภทวัน (ID: ${idMatch ? idMatch[1] : ''})`;
    }
    return null;
}

function formatCategoryMutation(clean: string): string | null {
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
        const idMatch = /WHERE id = '([^']+)'/i.exec(clean);
        return `🗑️ [หมวดหมู่] ลบหมวดหมู่ (ID: ${idMatch ? idMatch[1] : ''})`;
    }
    return null;
}

function formatCashflowGroupMutation(clean: string): string | null {
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
        const idMatch = /WHERE id = '([^']+)'/i.exec(clean);
        return `🗑️ [กลุ่มกระแสเงินสด] ลบกลุ่ม (ID: ${idMatch ? idMatch[1] : ''})`;
    }
    return null;
}

function formatItemMutation(clean: string): string | null {
    if (/INSERT INTO items\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        if (args.length >= 2) {
            const name = args[1] || 'ไม่ระบุ';
            const brand = args[2] && args[2] !== 'NULL' ? ` (${args[2]})` : '';
            const status = args[4] || 'planned';
            const satang = Number.parseFloat(args[5]) || 0;
            const baht = (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const statusMap: Record<string, string> = {
                planned: 'วางแผนจะซื้อ (Wishlist)',
                purchased: 'ใช้งานอยู่',
                stored: 'เก็บเข้ากรุ',
                broken: 'พัง/ชำรุด',
                sold: 'ขายแล้ว',
                cancelled: 'ยกเลิก'
            };
            const statusTH = statusMap[status] || status;
            return `📦 [บันทึกสิ่งของ] เพิ่มรายการ: "${name}"${brand} | สถานะ: ${statusTH} | ฿${baht}`;
        }
    }

    if (/UPDATE items SET\b/i.test(clean)) {
        const idMatch = /WHERE id = (\d+)/i.exec(clean);
        const id = idMatch ? idMatch[1] : '';
        if (/status = '([^']+)'/i.test(clean)) {
            const stMatch = /status = '([^']+)'/i.exec(clean);
            const st = stMatch ? stMatch[1] : '';
            return `📦 [บันทึกสิ่งของ] อัปเดตสถานะสิ่งของ (ID: ${id}) เป็น "${st}"`;
        }
        return id ? `📦 [บันทึกสิ่งของ] แก้ไขข้อมูลสิ่งของ (ID: ${id})` : `📦 [บันทึกสิ่งของ] แก้ไขข้อมูลสิ่งของ`;
    }

    if (/DELETE FROM items\b/i.test(clean)) {
        const idMatch = /WHERE id = (\d+)/i.exec(clean);
        return `🗑️ [บันทึกสิ่งของ] ลบสิ่งของ (ID: ${idMatch ? idMatch[1] : ''})`;
    }

    return null;
}

function formatItemCategoryMutation(clean: string): string | null {
    if (/INSERT INTO item_categories\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        const name = args[0] || 'ไม่ระบุ';
        return `🏷️ [หมวดหมู่สิ่งของ] เพิ่มหมวดหมู่: "${name}"`;
    }
    if (/UPDATE item_categories SET\b/i.test(clean)) {
        const idMatch = /WHERE id = (\d+)/i.exec(clean);
        const nameMatch = /name = '([^']+)'/i.exec(clean);
        const name = nameMatch ? nameMatch[1] : '';
        return `🏷️ [หมวดหมู่สิ่งของ] แก้ไขชื่อหมวดหมู่ (ID: ${idMatch ? idMatch[1] : ''}): "${name}"`;
    }
    if (/DELETE FROM item_categories\b/i.test(clean)) {
        const idMatch = /WHERE id = (\d+)/i.exec(clean);
        return `🗑️ [หมวดหมู่สิ่งของ] ลบหมวดหมู่ (ID: ${idMatch ? idMatch[1] : ''})`;
    }
    return null;
}

function formatItemTransactionMutation(clean: string): string | null {
    if (/INSERT INTO item_transactions\b/i.test(clean)) {
        const args = parseSqlValues(clean);
        const itemId = args[0] || '';
        const txId = args[1] || '';
        return `🔗 [ผูกรายการบัญชี] ผูกธุรกรรมกับสิ่งของ: สิ่งของ ID ${itemId} <-> รายการ ID ${txId}`;
    }
    if (/DELETE FROM item_transactions\b/i.test(clean)) {
        const idMatch = /WHERE item_id = (\d+)/i.exec(clean);
        return `🔗 [ผูกรายการบัญชี] รีเซ็ต/ล้างการผูกธุรกรรม (สิ่งของ ID: ${idMatch ? idMatch[1] : ''})`;
    }
    return null;
}

function formatDbMutationLog(msgStr: string): string | null {
    const clean = msgStr.replace(/\s+/g, ' ').trim();

    // 0. Mute internal FTS index trigger sync noise
    if (/transactions_fts/i.test(clean)) {
        return null;
    }

    const formatted = formatTransactionMutation(clean)
        ?? formatItemMutation(clean)
        ?? formatItemCategoryMutation(clean)
        ?? formatItemTransactionMutation(clean)
        ?? formatSettingsMutation(clean)
        ?? formatCalendarMutation(clean)
        ?? formatDayTypeMutation(clean)
        ?? formatCategoryMutation(clean)
        ?? formatCashflowGroupMutation(clean);

    if (formatted !== null) {
        return formatted === '' ? null : formatted;
    }

    // Fallback: Full query without truncation
    return `⚡ [DB SQL] ${clean}`;
}

function openDatabase(dbPath: string): Database.Database {
    const d = new Database(dbPath, {
        verbose: (msg?: any) => {
            const msgStr = typeof msg === 'string' ? msg : String(msg || '');
            if (/^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(msgStr.trim())) {
                const formatted = formatDbMutationLog(msgStr);
                if (formatted) {
                    const now = new Date();
                    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
                    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
                    console.log(`[DB MUTATION] [${ts}] ${formatted}`);
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
    } catch (e: unknown) {
        console.warn('⚠️ Could not set DB pragmas:', e instanceof Error ? e.message : 'Unknown error');
    }
    
    return d;
}

const db = openDatabase(DB_PATH);

console.log('✅ SQLite database connected at', DB_PATH);
console.log('🛡️ Persistence Mode: DELETE (Safe for Docker)');

export default db;
