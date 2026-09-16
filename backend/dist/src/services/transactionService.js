"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
const node_crypto_1 = __importDefault(require("node:crypto"));
class TransactionService {
    getAll(startDate, endDate) {
        let query = `
      SELECT 
        t.id, 
        t.date, 
        t.description, 
        t.amount, 
        t.category_id,
        t.allocation_type,
        t.created_at,
        c.name as category,
        c.icon as category_icon,
        cg.name as group_name,
        cg.type as group_type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      WHERE t.is_deleted = 0
    `;
        const params = [];
        if (startDate) {
            query += ` AND t.date >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND t.date <= ?`;
            params.push(endDate);
        }
        query += ` ORDER BY t.date ASC, t.created_at ASC`;
        return db_1.default.prepare(query).all(...params);
    }
    /**
     * Helper to find or create a category by name
     */
    getCategoryIdByName(name) {
        let cat = db_1.default.prepare("SELECT id FROM categories WHERE name = ?").get(name);
        if (!cat) {
            // Create a default category if not found
            // Find a default group (first one available)
            const defaultGroup = db_1.default.prepare("SELECT id FROM cashflow_groups LIMIT 1").get();
            if (defaultGroup) {
                const id = node_crypto_1.default.randomUUID();
                db_1.default.prepare("INSERT INTO categories (id, name, cashflow_group_id) VALUES (?, ?, ?)")
                    .run(id, name, defaultGroup.id);
                return id;
            }
            return null;
        }
        return cat.id;
    }
    /**
     * AI-Lite: Suggest category based on description keywords or historical matches
     */
    suggestCategory(description) {
        if (!description)
            return null;
        const desc = description.toLowerCase();
        // 1. Keyword Mapping (The "Shark" Rules)
        const rules = [
            { keywords: ['7-eleven', 'เซเว่น', 'cj express', 'lotus', 'big c', 'mart'], category: '🛒 สินค้าทั่วไป' },
            { keywords: ['grab', 'foodpanda', 'lineman', 'shopeefood', 'กิน', 'food', 'อาหาร', 'ข้าว', 'เตี๋ยว', 'ตำ'], category: '🍔 อาหารและเครื่องดื่ม' },
            { keywords: ['bts', 'mrt', 'grab taxi', 'bolt', 'เติมน้ำมัน', 'ptt', 'shell', 'caltex', 'บางจาก'], category: '🚗 การเดินทาง' },
            { keywords: ['ais', 'true', 'dtac', 'netflix', 'spotify', 'youtube', 'internet', 'เน็ต'], category: '🌐 บริการดิจิทัล' },
            { keywords: ['หอ', 'คอนโด', 'ไฟฟ้า', 'ประปา', 'ค่าส่วนกลาง', 'rent'], category: '🏠 ที่พักอาศัย' }
        ];
        for (const rule of rules) {
            if (rule.keywords.some(k => desc.includes(k))) {
                return this.getCategoryIdByName(rule.category);
            }
        }
        // 2. Historical Match (Exact description match from past transactions)
        const history = db_1.default.prepare(`
      SELECT category_id FROM transactions 
      WHERE LOWER(description) = ? AND is_deleted = 0 
      LIMIT 1
    `).get(desc);
        if (history)
            return history.category_id;
        // 3. Fuzzy Historical Match (Similar description)
        const fuzzy = db_1.default.prepare(`
      SELECT category_id FROM transactions 
      WHERE description LIKE ? AND is_deleted = 0 
      ORDER BY created_at DESC LIMIT 1
    `).get(`%${description.split(' ')[0]}%`);
        return fuzzy ? fuzzy.category_id : null;
    }
    normalizeDate(dateStr) {
        if (dateStr?.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return dateStr || '';
    }
    resolveCategoryId(tx) {
        let categoryId = tx.category_id;
        if (!categoryId || categoryId === '') {
            if (tx.category) {
                categoryId = this.getCategoryIdByName(tx.category);
            }
            if (!categoryId) {
                categoryId = this.suggestCategory(tx.description);
            }
        }
        if (!categoryId) {
            const fallback = db_1.default.prepare("SELECT id FROM categories WHERE name LIKE '%อื่น%' OR name LIKE '%เบ็ดเตล็ด%' LIMIT 1").get()
                || db_1.default.prepare("SELECT id FROM categories LIMIT 1").get();
            categoryId = fallback?.id;
        }
        return categoryId;
    }
    resolveAllocationType(categoryId, currentAlloc) {
        if (!categoryId)
            return currentAlloc ?? 'want';
        const categoryGroup = db_1.default.prepare(`
      SELECT cg.type 
      FROM cashflow_groups cg
      JOIN categories c ON c.cashflow_group_id = cg.id
      WHERE c.id = ?
    `).get(categoryId);
        if (categoryGroup?.type === 'income') {
            return null;
        }
        if (currentAlloc) {
            return currentAlloc;
        }
        const groupDefault = db_1.default.prepare(`
      SELECT cg.allocation_type 
      FROM cashflow_groups cg
      JOIN categories c ON c.cashflow_group_id = cg.id
      WHERE c.id = ?
    `).get(categoryId);
        return groupDefault?.allocation_type || 'want';
    }
    upsertMany(transactions) {
        const stmt = db_1.default.prepare(`
      INSERT INTO transactions (id, date, description, amount, category_id, allocation_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        description = excluded.description,
        amount = excluded.amount,
        category_id = excluded.category_id,
        allocation_type = excluded.allocation_type,
        updated_at = CURRENT_TIMESTAMP,
        is_deleted = 0
    `);
        const transactionAction = db_1.default.transaction((txs) => {
            for (const tx of txs) {
                const date = this.normalizeDate(tx.date);
                const amountSatang = Math.round(tx.amount * 100);
                const categoryId = this.resolveCategoryId(tx);
                const allocationType = this.resolveAllocationType(categoryId, tx.allocation_type);
                stmt.run(tx.id || node_crypto_1.default.randomUUID(), date, tx.description || '', amountSatang, categoryId, allocationType);
            }
        });
        transactionAction(transactions);
        const totalSatang = transactions.reduce((sum, tx) => sum + Math.round((Number(tx.amount) || 0) * 100), 0);
        const totalBaht = (totalSatang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        console.log(`💳 [Service: Upsert] บันทึกข้อมูลสำเร็จทั้งหมด ${transactions.length} รายการ | ยอดรวม: ฿${totalBaht}`);
        if (transactions.length <= 15) {
            transactions.forEach((tx, idx) => {
                const itemBaht = (Number(tx.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                console.log(`   ${idx + 1}. [${tx.date}] ID: ${tx.id || 'auto-generated'} | "${tx.description || 'ไม่ระบุ'}" | ฿${itemBaht} (${tx.allocation_type || 'default'})`);
            });
        }
        else {
            console.log(`   (รายการทั้งหมด ${transactions.length} รายการ ถูกบันทึกลงฐานข้อมูลเรียบร้อยแล้ว)`);
        }
    }
    delete(id) {
        const target = db_1.default.prepare(`
      SELECT t.id, t.date, t.description, t.amount, c.name as category 
      FROM transactions t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE t.id = ?
    `).get(id);
        const result = db_1.default.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        if (target) {
            const baht = (target.amount / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            console.log(`🗑️ [Service: Delete] ลบธุรกรรมสำเร็จ | ID: ${target.id} | วันที่: ${target.date} | "${target.description}" | ฿${baht} | หมวดหมู่: "${target.category || 'ไม่ระบุ'}" | (ผลลัพธ์: ${result.changes} แถว)`);
        }
        else {
            console.log(`🗑️ [Service: Delete] ลบธุรกรรม ID: ${id} | (ผลลัพธ์: ${result.changes} แถว)`);
        }
        return result;
    }
    deleteByMonth(isoMonth) {
        const [yearStr, monthStr] = isoMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const nextYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const startDate = `${yearStr}-${monthStr.padStart(2, '0')}-01`;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        // Query affected items before deletion to log exact details without truncation
        const targetRows = db_1.default.prepare(`
      SELECT t.id, t.date, t.description, t.amount, c.name as category
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.date >= ? AND t.date < ? AND t.is_deleted = 0
    `).all(startDate, endDate);
        const totalSatang = targetRows.reduce((sum, r) => sum + (r.amount || 0), 0);
        const totalBaht = (totalSatang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const result = db_1.default.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE date >= ? AND date < ? AND is_deleted = 0')
            .run(startDate, endDate);
        console.log(`🗑️ [Service: Delete Month] ลบข้อมูลทั้งเดือน: ${isoMonth} (ช่วงวันที่: ${startDate} ถึง ${endDate}) | จำนวนที่ได้รับผลกระทบ: ${result.changes} รายการ | ยอดเงินรวม: ฿${totalBaht}`);
        if (targetRows.length > 0) {
            console.log(`📋 [Service: Delete Month Details] รายการที่ถูกลบในเดือน ${isoMonth} (${targetRows.length} รายการ):`);
            targetRows.forEach((r, idx) => {
                const itemBaht = (r.amount / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                console.log(`   ${idx + 1}. [${r.date}] ID: ${r.id} | "${r.description}" | ฿${itemBaht} | หมวดหมู่: "${r.category || 'ไม่ระบุ'}"`);
            });
        }
        return result;
    }
    deleteAll() {
        return db_1.default.transaction(() => {
            const txCount = db_1.default.prepare('SELECT COUNT(*) as c FROM transactions WHERE is_deleted = 0').get().c;
            const calCount = db_1.default.prepare('SELECT COUNT(*) as c FROM calendar_days').get().c;
            const txResult = db_1.default.prepare('UPDATE transactions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE is_deleted = 0').run();
            const calResult = db_1.default.prepare('DELETE FROM calendar_days').run();
            console.log(`🚨 [Service: Reset All] ดำเนินการล้างข้อมูลทั้งหมด: ธุรกรรม ${txResult.changes} รายการ (จากทั้งหมด ${txCount}), ปฏิทิน ${calResult.changes} รายการ (จากทั้งหมด ${calCount})`);
        })();
    }
    /**
     * Returns a distinct list of YYYY-MM where transactions exist
     */
    getAvailablePeriods() {
        const rows = db_1.default.prepare(`
      SELECT DISTINCT strftime('%Y-%m', date) as period 
      FROM transactions 
      WHERE is_deleted = 0 
      ORDER BY period DESC
    `).all();
        return rows.map(r => r.period);
    }
    /**
     * Search transactions using Full-Text Search (FTS5) with safe sanitization and fallback
     */
    search(query) {
        const raw = (query || '').trim();
        if (!raw)
            return [];
        // Check if FTS index is empty but transactions exist (need first-time sync)
        const ftsCount = db_1.default.prepare("SELECT COUNT(*) as count FROM transactions_fts").get().count;
        const txCount = db_1.default.prepare("SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0").get().count;
        if (ftsCount === 0 && txCount > 0) {
            console.log('🔄 Rebuilding Search Index (FTS5)...');
            db_1.default.exec("INSERT INTO transactions_fts(rowid, id, description) SELECT rowid, id, description FROM transactions WHERE is_deleted = 0");
        }
        // Sanitize query to avoid FTS5 syntax errors
        const sanitized = raw
            .replace(/["'*(){}[\]^:?+\-~]/g, ' ')
            .replace(/\b(AND|OR|NOT|NEAR)\b/gi, ' ')
            .trim();
        const tokens = sanitized.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) {
            // If only symbols were entered, fallback directly to LIKE
            return db_1.default.prepare(`
        SELECT 
          t.id, t.date, t.description, t.amount, t.category_id, t.created_at, t.allocation_type,
          c.name as category, cg.type as group_type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
        WHERE (t.description LIKE ? OR c.name LIKE ?) AND t.is_deleted = 0
        ORDER BY t.date DESC
        LIMIT 50
      `).all(`%${raw}%`, `%${raw}%`);
        }
        const ftsQuery = tokens.map(t => `"${t}"*`).join(' ');
        try {
            const rows = db_1.default.prepare(`
        SELECT 
          t.id, t.date, t.description, t.amount, t.category_id, t.created_at, t.allocation_type,
          c.name as category, cg.type as group_type
        FROM transactions_fts f
        JOIN transactions t ON f.rowid = t.rowid
        JOIN categories c ON t.category_id = c.id
        JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
        WHERE transactions_fts MATCH ? AND t.is_deleted = 0
        ORDER BY rank
      `).all(ftsQuery);
            return rows;
        }
        catch (ftsErr) {
            console.warn('⚠️ FTS5 search query error, falling back to LIKE:', ftsErr.message);
            return db_1.default.prepare(`
        SELECT 
          t.id, t.date, t.description, t.amount, t.category_id, t.created_at, t.allocation_type,
          c.name as category, cg.type as group_type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
        WHERE (t.description LIKE ? OR c.name LIKE ?) AND t.is_deleted = 0
        ORDER BY t.date DESC
        LIMIT 50
      `).all(`%${raw}%`, `%${raw}%`);
        }
    }
    /**
     * Returns aggregated frequent transactions for all-time suggestions.
     */
    getFrequentItems() {
        const rows = db_1.default.prepare(`
      SELECT 
        t.category_id, 
        c.name as category_name,
        t.description, 
        t.amount, 
        t.allocation_type,
        COUNT(*) as count,
        MAX(t.date) as last_date
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.is_deleted = 0
      GROUP BY t.category_id, t.description, t.amount, t.allocation_type
      ORDER BY count DESC, last_date DESC
    `).all();
        return rows.map(row => ({
            categoryId: row.category_id,
            categoryName: row.category_name,
            description: row.description || '',
            amount: row.amount / 100, // Convert Satang to Baht
            allocation_type: row.allocation_type,
            count: row.count,
            lastDate: row.last_date
        }));
    }
}
exports.default = new TransactionService();
