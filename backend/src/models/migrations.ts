import type Database from 'better-sqlite3';
import db from '../config/db';
import crypto from 'node:crypto';
import { recreateViews, recreateTriggersAndIndexes } from './views';

// Upgrades for databases created by older versions. Called from initSchema (schema.ts).

/**
 * Migrates existing tables to SQLite STRICT mode without data loss.
 */
export const migrateTablesToStrict = (): void => {
  const tables = ['settings', 'transactions', 'calendar_days', 'categories', 'day_types', 'cashflow_groups'];
  const tablesToMigrate: string[] = [];

  for (const table of tables) {
    const row = db.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = ?").get(table) as { sql: string } | undefined;
    if (row && row.sql && !/\bstrict\b/i.test(row.sql)) {
      tablesToMigrate.push(table);
    }
  }

  if (tablesToMigrate.length === 0) {
    return;
  }

  console.log(`เริ่มต้นกระบวนการยกระดับความปลอดภัย SQLite STRICT Mode (${tablesToMigrate.join(', ')})...`);

  db.pragma('foreign_keys = OFF');

  const migration = db.transaction(() => {
    // 0. Drop dependent views and virtual table before altering parent tables
    db.exec(`
      DROP VIEW IF EXISTS v_monthly_summary;
      DROP VIEW IF EXISTS v_daily_burn;
      DROP VIEW IF EXISTS v_category_monthly;
      DROP TRIGGER IF EXISTS trg_transactions_updated_at;
      DROP TRIGGER IF EXISTS trg_transactions_ai;
      DROP TRIGGER IF EXISTS trg_transactions_ad;
      DROP TRIGGER IF EXISTS trg_transactions_au;
      DROP TABLE IF EXISTS transactions_fts;
    `);

    // 1. settings
    if (tablesToMigrate.includes('settings')) {
      db.exec(`
        CREATE TABLE settings_strict (
          key   TEXT PRIMARY KEY,
          value TEXT
        ) STRICT;
        INSERT INTO settings_strict (key, value) SELECT key, value FROM settings;
        DROP TABLE settings;
        ALTER TABLE settings_strict RENAME TO settings;
      `);
    }

    // 2. transactions
    if (tablesToMigrate.includes('transactions')) {
      // ตารางที่ผ่านระบบลงทุนมาแล้วมีคอลัมน์ซื้อขาย — rebuild ต้องพกไปด้วย ไม่งั้น asset_id/trade_side/units หายเงียบๆ
      const hasTrade = (db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[]).some(c => c.name === 'asset_id');
      db.exec(`
        CREATE TABLE transactions_strict (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          description TEXT,
          amount INTEGER NOT NULL CHECK(amount >= 0),
          category_id TEXT NOT NULL,
          allocation_type TEXT CHECK(allocation_type IS NULL OR allocation_type IN ('need', 'want', 'savings')),
          is_deleted INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,${hasTrade ? `
          asset_id TEXT REFERENCES assets(id),
          trade_side TEXT CHECK(trade_side IS NULL OR trade_side IN ('buy', 'sell')),
          units REAL,` : ''}
          FOREIGN KEY (category_id) REFERENCES categories(id)
        ) STRICT;
        INSERT INTO transactions_strict (id, date, description, amount, category_id, allocation_type, is_deleted, created_at, updated_at${hasTrade ? ', asset_id, trade_side, units' : ''})
        SELECT
          id,
          date,
          description,
          CAST(amount AS INTEGER),
          category_id,
          allocation_type,
          COALESCE(is_deleted, 0),
          COALESCE(created_at, CURRENT_TIMESTAMP),
          COALESCE(updated_at, CURRENT_TIMESTAMP)${hasTrade ? ', asset_id, trade_side, units' : ''}
        FROM transactions;
        DROP TABLE transactions;
        ALTER TABLE transactions_strict RENAME TO transactions;
      `);
    }

    // 3. calendar_days
    if (tablesToMigrate.includes('calendar_days')) {
      // เหมือน transactions: ตารางที่เคยเพิ่ม note_icon แล้ว rebuild ต้องพกคอลัมน์ไปด้วย ไม่งั้นไอคอนโน้ตหายเงียบๆ
      const hasIcon = (db.prepare('PRAGMA table_info(calendar_days)').all() as { name: string }[]).some(c => c.name === 'note_icon');
      db.exec(`
        CREATE TABLE calendar_days_strict (
          date TEXT PRIMARY KEY,
          day_type_id TEXT NOT NULL,
          note TEXT,${hasIcon ? `
          note_icon TEXT,` : ''}
          FOREIGN KEY (day_type_id) REFERENCES day_types(id)
        ) STRICT;
        INSERT INTO calendar_days_strict (date, day_type_id, note${hasIcon ? ', note_icon' : ''})
        SELECT date, day_type_id, note${hasIcon ? ', note_icon' : ''} FROM calendar_days;
        DROP TABLE calendar_days;
        ALTER TABLE calendar_days_strict RENAME TO calendar_days;
      `);
    }

    // 4. categories
    if (tablesToMigrate.includes('categories')) {
      db.exec(`
        CREATE TABLE categories_strict (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          order_index INTEGER DEFAULT 0,
          cashflow_group_id TEXT NOT NULL,
          FOREIGN KEY (cashflow_group_id) REFERENCES cashflow_groups(id)
        ) STRICT;
        INSERT INTO categories_strict (id, name, icon, color, order_index, cashflow_group_id) 
        SELECT id, name, icon, color, CAST(COALESCE(order_index, 0) AS INTEGER), cashflow_group_id FROM categories;
        DROP TABLE categories;
        ALTER TABLE categories_strict RENAME TO categories;
      `);
    }

    // 5. day_types
    if (tablesToMigrate.includes('day_types')) {
      db.exec(`
        CREATE TABLE day_types_strict (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          label TEXT NOT NULL,
          color TEXT,
          order_index INTEGER DEFAULT 0
        ) STRICT;
        INSERT INTO day_types_strict (id, name, label, color, order_index) 
        SELECT id, name, label, color, CAST(COALESCE(order_index, 0) AS INTEGER) FROM day_types;
        DROP TABLE day_types;
        ALTER TABLE day_types_strict RENAME TO day_types;
      `);
    }

    // 6. cashflow_groups
    if (tablesToMigrate.includes('cashflow_groups')) {
      db.exec(`
        CREATE TABLE cashflow_groups_strict (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'savings')),
          allocation_type TEXT DEFAULT 'want' CHECK(allocation_type IN ('need', 'want', 'savings')),
          order_index INTEGER DEFAULT 0,
          color TEXT,
          icon TEXT,
          highlight_bg INTEGER DEFAULT 0
        ) STRICT;
        INSERT INTO cashflow_groups_strict (id, name, type, allocation_type, order_index, color, icon, highlight_bg) 
        SELECT id, name, type, COALESCE(allocation_type, 'want'), CAST(COALESCE(order_index, 0) AS INTEGER), color, icon, CAST(COALESCE(highlight_bg, 0) AS INTEGER) FROM cashflow_groups;
        DROP TABLE cashflow_groups;
        ALTER TABLE cashflow_groups_strict RENAME TO cashflow_groups;
      `);
    }

    // Recreate FTS Virtual Table
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
        id UNINDEXED,
        description,
        content='transactions'
      );
      INSERT INTO transactions_fts(rowid, id, description) 
      SELECT rowid, id, description FROM transactions WHERE is_deleted = 0;
    `);
  });

  migration();

  db.pragma('foreign_keys = ON');
  recreateViews();
  recreateTriggersAndIndexes();
  console.log('ทุกตารางถูกยกระดับเป็น SQLite STRICT Mode สำเร็จ 100% (ไร้การสูญหายของข้อมูล)');
};

/** รายรับไม่ใช้ NEED/WANT — ล้างค่า default 'want' ที่ค้างอยู่ในกลุ่มรายรับ (idempotent) */
export const clearIncomeAllocation = (): void => {
  try {
    const r = db.prepare("UPDATE cashflow_groups SET allocation_type = NULL WHERE type = 'income' AND allocation_type IS NOT NULL").run();
    if (r.changes > 0) console.log(`ล้าง allocation_type ของกลุ่มรายรับ ${r.changes} กลุ่ม`);
  } catch {
    // ครั้งแรกที่ยังไม่มีตาราง — จะถูกเรียกอีกครั้งหลัง seed
  }
};

/**
 * กลุ่มรายจ่ายที่จัดสรรเป็น SAVE (เช่น "ลงทุน/ออม") ย้ายไปเป็นชนิด 'savings' แยกจากรายจ่าย
 * รันครั้งเดียว (ผู้ใช้ยังตั้งกลุ่มรายจ่ายเป็น SAVE เองได้ภายหลังโดยไม่ถูกย้ายซ้ำ)
 */
export const promoteSavingsGroups = (): void => {
  try {
    const done = db.prepare("SELECT value FROM settings WHERE key = 'savings_groups_promoted'").get();
    if (done) return;
    const r = db.prepare("UPDATE cashflow_groups SET type = 'savings' WHERE type = 'expense' AND allocation_type = 'savings'").run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('savings_groups_promoted', 'true')").run();
    if (r.changes > 0) console.log(`ย้ายกลุ่มลงทุน/ออม ${r.changes} กลุ่ม ออกจากรายจ่ายเป็นชนิด savings`);
  } catch {
    // ตาราง cashflow_groups ยังไม่มี (DB ใหม่) — ไม่มีอะไรต้องย้าย
  }
};

/**
 * โน้ตประจำวันมีไอคอนได้: เพิ่มคอลัมน์ note_icon ให้ DB เดิม (idempotent)
 * ต้องรันทุกครั้งที่เปิดระบบ — verifyTableColumns ถูกข้ามเมื่อ schema_verified แล้ว DB เดิมจึงไม่เคยได้คอลัมน์นี้
 * DB ใหม่ยังไม่มีตาราง (จะถูกสร้างพร้อมคอลัมน์ใน initSchema) จึงข้ามเงียบๆ
 */
export const ensureCalendarNoteIcon = (database: Database.Database = db): void => {
  const cols = (database.prepare('PRAGMA table_info(calendar_days)').all() as { name: string }[]).map(c => c.name);
  if (cols.length > 0 && !cols.includes('note_icon')) {
    database.exec('ALTER TABLE calendar_days ADD COLUMN note_icon TEXT');
    console.log('เพิ่มคอลัมน์ note_icon ในตารางบันทึกปฏิทินวัน (Calendar Days) เรียบร้อย');
  }
};

/**
 * ระบบลงทุน: ตาราง assets / price_cache + คอลัมน์ซื้อขายใน transactions (idempotent, รันทุกครั้งที่เปิดระบบ)
 * แถวขาย = amount เก็บค่าสัมบูรณ์ + trade_side='sell' (ฝั่ง API แปลงเป็นค่าลบ)
 */
export const ensureInvestmentSchema = (): void => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('gold_bar', 'gold_ornament', 'us_stock', 'th_stock', 'crypto', 'fund', 'other')),
        symbol TEXT,
        unit_label TEXT,
        manual_price REAL,
        manual_price_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      ) STRICT;

      CREATE TABLE IF NOT EXISTS price_cache (
        asset_id TEXT PRIMARY KEY,
        price REAL NOT NULL,
        fetched_at TEXT NOT NULL,
        source TEXT NOT NULL,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      ) STRICT;

      -- มูลค่าพอร์ตวันละ 1 จุด (จดตอนดึงราคา/กรอกราคาเอง) ใช้วาดกราฟมูลค่าตามเวลา; สตางค์, เฉพาะสินทรัพย์ที่มีราคา
      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        date TEXT PRIMARY KEY,
        market_value INTEGER NOT NULL,
        cost INTEGER NOT NULL,
        recorded_at TEXT NOT NULL
      ) STRICT;
    `);

    const cols = new Set((db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[]).map(c => c.name));
    if (cols.size === 0) return; // DB ใหม่ — ตาราง transactions จะถูกสร้างพร้อมคอลัมน์ครบใน initSchema

    let changed = false;
    if (!cols.has('asset_id')) { db.exec('ALTER TABLE transactions ADD COLUMN asset_id TEXT REFERENCES assets(id)'); changed = true; }
    if (!cols.has('trade_side')) { db.exec("ALTER TABLE transactions ADD COLUMN trade_side TEXT CHECK(trade_side IS NULL OR trade_side IN ('buy', 'sell'))"); changed = true; }
    if (!cols.has('units')) { db.exec('ALTER TABLE transactions ADD COLUMN units REAL'); changed = true; }
    db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id)');

    // ด่านสุดท้ายระดับ DB (service ตรวจก่อนแล้ว): ผูกสินทรัพย์ต้องมีหน่วย > 0 + ทิศทาง, ไม่ผูกก็ห้ามมีหน่วย,
    // และทิศทาง/สินทรัพย์มีได้เฉพาะหมวดในกลุ่ม savings. ใช้ trigger แทน CHECK เพราะ CHECK ข้ามตารางไม่ได้และต้อง rebuild ตาราง
    const tradeBad = `
      (NEW.asset_id IS NULL AND NEW.units IS NOT NULL)
      OR (NEW.asset_id IS NOT NULL AND (NEW.units IS NULL OR NEW.units <= 0 OR NEW.trade_side IS NULL))
      OR (NEW.trade_side IS NOT NULL AND (
        SELECT cg.type FROM categories c JOIN cashflow_groups cg ON cg.id = c.cashflow_group_id WHERE c.id = NEW.category_id
      ) IS NOT 'savings')`;
    for (const op of ['INSERT', 'UPDATE']) {
      const name = `trg_transactions_trade_${op.toLowerCase()}`;
      if (db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'trigger' AND name = ?").get(name)) continue;
      db.exec(`
        CREATE TRIGGER ${name} BEFORE ${op} ON transactions WHEN ${tradeBad}
        BEGIN SELECT RAISE(ABORT, 'ข้อมูลซื้อขายไม่สอดคล้อง: ต้องมีสินทรัพย์ + หน่วย > 0 + ทิศทางครบ และอยู่ในกลุ่มลงทุน/ออมเท่านั้น'); END;
      `);
    }

    // view เดิมยังรวมแถวขายเป็นบวก — สร้างใหม่ให้ใช้ยอดมีเครื่องหมาย (ครั้งเดียว)
    const viewsDone = db.prepare("SELECT value FROM settings WHERE key = 'signed_savings_views'").get();
    if (changed || !viewsDone) {
      db.exec('DROP VIEW IF EXISTS v_monthly_summary; DROP VIEW IF EXISTS v_daily_burn; DROP VIEW IF EXISTS v_category_monthly;');
      recreateViews();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('signed_savings_views', 'true')").run();
      console.log('เพิ่มโครงสร้างระบบลงทุน (assets, price_cache, คอลัมน์ซื้อขาย) และสร้าง view ใหม่');
    }
  } catch (e: any) {
    console.warn('[WARN] ไม่สามารถเตรียมโครงสร้างระบบลงทุนได้:', e.message);
  }
};

const verifyTransactionColumns = (): void => {
  const txInfo = db.prepare("PRAGMA table_info(transactions)").all() as Array<{ name: string }>;
  const txCols = new Set(txInfo.map(c => c.name));

  if (!txCols.has('is_deleted')) {
    db.exec("ALTER TABLE transactions ADD COLUMN is_deleted INTEGER DEFAULT 0");
    console.log('เพิ่มคอลัมน์ is_deleted ในตารางรายการธุรกรรม (Transactions) เรียบร้อย');
  }
  if (!txCols.has('category_id')) {
    try {
      db.exec("ALTER TABLE transactions ADD COLUMN category_id TEXT DEFAULT '1'");
      console.log('เพิ่มคอลัมน์ category_id ในตารางรายการธุรกรรม (Transactions) เรียบร้อย');
    } catch (_e: unknown) {
      // Ignored: category_id column may already exist in certain SQLite environments
    }
  }
  if (!txCols.has('allocation_type')) {
    db.exec("ALTER TABLE transactions ADD COLUMN allocation_type TEXT DEFAULT 'want'");
    console.log('เพิ่มคอลัมน์ allocation_type ในตารางรายการธุรกรรม (Transactions) เรียบร้อย');
    
    // ย้ายค่า allocation_type จากกลุ่มมาใส่ที่รายการธุรกรรม
    try {
      db.exec(`
        UPDATE transactions 
        SET allocation_type = (
          SELECT allocation_type 
          FROM cashflow_groups cg
          JOIN categories c ON c.cashflow_group_id = cg.id
          WHERE c.id = transactions.category_id
        )
        WHERE allocation_type = 'want'
      `);
      console.log('ย้ายการตั้งค่าสัดส่วน (allocation_type) จากกลุ่มมาไว้ที่แต่ละรายการธุรกรรมเรียบร้อย');
    } catch (e: any) {
      console.warn('[WARN] เกิดข้อผิดพลาดขณะย้ายข้อมูลสัดส่วนธุรกรรม:', e.message);
    }
  }

  // เคลียร์ค่าสัดส่วนในรายการรายได้ให้เป็นค่าว่าง (NULL)
  try {
    db.exec(`
      UPDATE transactions 
      SET allocation_type = NULL 
      WHERE category_id IN (
        SELECT c.id 
        FROM categories c
        JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
        WHERE cg.type = 'income'
      )
    `);
    console.log('เคลียร์ค่าสัดส่วนในรายการรายได้ให้เป็นค่าว่าง (NULL) เรียบร้อย');
  } catch (e: any) {
    console.warn('[WARN] เกิดข้อผิดพลาดขณะเคลียร์สัดส่วนรายได้:', e.message);
  }
};

const verifyCategoryColumns = (): void => {
  const catInfo = db.prepare("PRAGMA table_info(categories)").all() as Array<{ name: string }>;
  const catCols = catInfo.map(c => c.name);
  if (catCols.length > 0 && !catCols.includes('order_index')) {
    db.exec("ALTER TABLE categories ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('เพิ่มคอลัมน์ order_index ในตารางหมวดหมู่ย่อย (Categories) เรียบร้อย');
  }
  if (catCols.includes('is_fixed')) {
    try {
      db.exec("ALTER TABLE categories DROP COLUMN is_fixed");
      console.log('ลบคอลัมน์ is_fixed ออกจากตารางหมวดหมู่ย่อย (Categories) เรียบร้อย');
    } catch (e: any) {
      console.warn('[WARN] ไม่สามารถลบคอลัมน์ is_fixed ได้:', e.message);
    }
  }
};

const verifyGroupColumns = (): void => {
  const groupInfo = db.prepare("PRAGMA table_info(cashflow_groups)").all() as Array<{ name: string }>;
  const groupCols = groupInfo.map(c => c.name);
  if (groupCols.length > 0 && !groupCols.includes('order_index')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('เพิ่มคอลัมน์ order_index ในตารางกลุ่มรายจ่าย (Cashflow Groups) เรียบร้อย');
  }
  if (groupCols.length > 0 && !groupCols.includes('highlight_bg')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN highlight_bg INTEGER DEFAULT 0");
    console.log('เพิ่มคอลัมน์ highlight_bg ในตารางกลุ่มรายจ่าย (Cashflow Groups) เรียบร้อย');
  }
  if (groupCols.length > 0 && !groupCols.includes('allocation_type')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN allocation_type TEXT DEFAULT 'want'");
    console.log('เพิ่มคอลัมน์ allocation_type ในตารางกลุ่มรายจ่าย (Cashflow Groups) เรียบร้อย');
  }
};

const verifyDayTypeColumns = (): void => {
  const dayTypeInfo = db.prepare("PRAGMA table_info(day_types)").all() as Array<{ name: string }>;
  const dayTypeCols = dayTypeInfo.map(c => c.name);
  if (dayTypeCols.length > 0 && !dayTypeCols.includes('name')) {
    db.exec("ALTER TABLE day_types ADD COLUMN name TEXT DEFAULT ''");
    console.log('เพิ่มคอลัมน์ name ในตารางประเภทวัน (Day Types) เรียบร้อย');
  }
  if (dayTypeCols.length > 0 && !dayTypeCols.includes('order_index')) {
    db.exec("ALTER TABLE day_types ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('เพิ่มคอลัมน์ order_index ในตารางประเภทวัน (Day Types) เรียบร้อย');
  }
};

const verifyCalendarDayColumns = (): void => {
  const calInfo = db.prepare("PRAGMA table_info(calendar_days)").all() as Array<{ name: string }>;
  const calCols = calInfo.map(c => c.name);
  if (calCols.length > 0 && !calCols.includes('note')) {
    db.exec("ALTER TABLE calendar_days ADD COLUMN note TEXT");
    console.log('เพิ่มคอลัมน์ note ในตารางบันทึกปฏิทินวัน (Calendar Days) เรียบร้อย');
  }
};

export const verifyTableColumns = (): void => {
  verifyTransactionColumns();
  verifyCategoryColumns();
  verifyGroupColumns();
  verifyDayTypeColumns();
  verifyCalendarDayColumns();
};

function ensureSubscriptionGroup(): string {
  const group1 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'บริการรายเดือน'").get() as { id: string } | undefined;
  const group2 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'รายเดือน'").get() as { id: string } | undefined;
  const group3 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'รายเดือน/หนี้'").get() as { id: string } | undefined;

  let groupId: string;
  if (group1) {
    groupId = group1.id;
  } else if (group2) {
    db.prepare("UPDATE cashflow_groups SET name = ?, icon = ?, color = ? WHERE id = ?")
      .run('บริการรายเดือน', '🔄', '#8B5CF6', group2.id);
    groupId = group2.id;
    console.log('เปลี่ยนชื่อกลุ่ม "รายเดือน" เป็น "บริการรายเดือน" เรียบร้อย');
  } else if (group3) {
    db.prepare("UPDATE cashflow_groups SET name = ?, icon = ?, color = ? WHERE id = ?")
      .run('บริการรายเดือน', '🔄', '#8B5CF6', group3.id);
    groupId = group3.id;
    console.log('เปลี่ยนชื่อกลุ่ม "รายเดือน/หนี้" เป็น "บริการรายเดือน" เรียบร้อย');
  } else {
    groupId = crypto.randomUUID();
    db.prepare("INSERT INTO cashflow_groups (id, name, type, order_index, color, icon, allocation_type) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(groupId, 'บริการรายเดือน', 'expense', 4, '#8B5CF6', '🔄', 'want');
    console.log('สร้างกลุ่มใหม่ "บริการรายเดือน" เรียบร้อย');
  }

  // ย้ายหมวดหมู่และลบกลุ่มที่ซ้ำซ้อน
  const redundantGroups = [group2, group3].filter((g): g is { id: string } => !!(g && g.id !== groupId));
  redundantGroups.forEach(rg => {
    const updateCats = db.prepare("UPDATE categories SET cashflow_group_id = ? WHERE cashflow_group_id = ?")
      .run(groupId, rg.id);
    if (updateCats.changes > 0) {
      console.log(`รวมหมวดหมู่ ${updateCats.changes} รายการจากกลุ่มที่ซ้ำซ้อนเข้าสู่กลุ่ม "บริการรายเดือน" เรียบร้อย`);
    }
    
    db.prepare("DELETE FROM cashflow_groups WHERE id = ?").run(rg.id);
    console.log(`ลบกลุ่มรายจ่ายที่ไม่ได้ใช้แล้วออกเรียบร้อย: ${rg.id}`);
  });

  return groupId;
}

function ensureSoftwareCategory(groupId: string): string {
  const oldCat = db.prepare("SELECT id FROM categories WHERE name = 'บริการรายเดือน'").get() as { id: string } | undefined;
  if (oldCat) {
    db.prepare("UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?")
      .run('ซอฟต์แวร์ & AI', '🤖', '#3B82F6', oldCat.id);
    console.log('เปลี่ยนชื่อหมวดหมู่ "บริการรายเดือน" เป็น "ซอฟต์แวร์ & AI" เรียบร้อย');
    return oldCat.id;
  }

  const existingSoftwareCat = db.prepare("SELECT id FROM categories WHERE name = 'ซอฟต์แวร์ & AI' OR name = 'ซอฟต์แวร์'").get() as { id: string } | undefined;
  if (existingSoftwareCat) {
    return existingSoftwareCat.id;
  }

  const softwareCatId = crypto.randomUUID();
  db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run(softwareCatId, 'ซอฟต์แวร์ & AI', '🤖', '#3B82F6', 1, groupId);
  console.log('สร้างหมวดหมู่ย่อยใหม่ "ซอฟต์แวร์ & AI" เรียบร้อย');
  return softwareCatId;
}

function ensureShoppingCategory(groupId: string): string {
  const catLong = db.prepare("SELECT id FROM categories WHERE name = 'สมาชิกช้อปปิ้ง & ส่งอาหาร'").get() as { id: string } | undefined;
  const catShort = db.prepare("SELECT id FROM categories WHERE name = 'สมาชิกช้อปปิ้ง'").get() as { id: string } | undefined;

  if (catLong && catShort) {
    db.prepare("UPDATE transactions SET category_id = ? WHERE category_id = ?").run(catShort.id, catLong.id);
    db.prepare("DELETE FROM categories WHERE id = ?").run(catLong.id);
    console.log('รวมหมวดหมู่ "สมาชิกช้อปปิ้ง & ส่งอาหาร" เข้ากับหมวดหมู่ "สมาชิกช้อปปิ้ง" เรียบร้อย');
    return catShort.id;
  }
  if (catShort) return catShort.id;
  if (catLong) return catLong.id;

  const shoppingCatId = crypto.randomUUID();
  db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run(shoppingCatId, 'สมาชิกช้อปปิ้ง & ส่งอาหาร', '🛍️', '#EC4899', 2, groupId);
  console.log('สร้างหมวดหมู่ย่อยใหม่ "สมาชิกช้อปปิ้ง & ส่งอาหาร" เรียบร้อย');
  return shoppingCatId;
}

function ensureEntertainmentCategory(groupId: string): string {
  const entLong = db.prepare("SELECT id FROM categories WHERE name = 'ความบันเทิง & สตรีมมิ่ง'").get() as { id: string } | undefined;
  const entShort = db.prepare("SELECT id FROM categories WHERE name = 'ความบันเทิง'").get() as { id: string } | undefined;

  if (entLong && entShort) {
    db.prepare("UPDATE transactions SET category_id = ? WHERE category_id = ?").run(entShort.id, entLong.id);
    db.prepare("DELETE FROM categories WHERE id = ?").run(entLong.id);
    console.log('รวมหมวดหมู่ "ความบันเทิง & สตรีมมิ่ง" เข้ากับหมวดหมู่ "ความบันเทิง" เรียบร้อย');
    return entShort.id;
  }
  if (entShort) return entShort.id;
  if (entLong) return entLong.id;

  const entertainmentCatId = crypto.randomUUID();
  db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run(entertainmentCatId, 'ความบันเทิง & สตรีมมิ่ง', '🍿', '#EF4444', 3, groupId);
  console.log('สร้างหมวดหมู่ย่อยใหม่ "ความบันเทิง & สตรีมมิ่ง" เรียบร้อย');
  return entertainmentCatId;
}

function reclassifySubscriptionTransactions(softwareCatId: string, shoppingCatId: string, entertainmentCatId: string): void {
  const txs = db.prepare("SELECT id, description FROM transactions WHERE category_id = ? AND is_deleted = 0").all(softwareCatId) as Array<{ id: string, description: string | null }>;
  let shoppingCount = 0;
  let entertainmentCount = 0;

  const updateTx = db.prepare("UPDATE transactions SET category_id = ? WHERE id = ?");

  const shoppingKeywords = ['shopee', 'lazada', 'grab', 'lineman', 'foodpanda', 'membership', 'vip', 'prime', 'delivery', 'ช้อป', 'ส่งอาหาร'];
  const entertainmentKeywords = ['netflix', 'spotify', 'youtube', 'disney', 'hbo', 'prime video', 'steam', 'playstation', 'xbox', 'nintendo', 'game', 'เพลง', 'หนัง', 'บันเทิง'];

  txs.forEach(tx => {
    if (!tx.description) return;
    const desc = tx.description.toLowerCase();

    if (shoppingKeywords.some(k => desc.includes(k))) {
      updateTx.run(shoppingCatId, tx.id);
      shoppingCount++;
    } else if (entertainmentKeywords.some(k => desc.includes(k))) {
      updateTx.run(entertainmentCatId, tx.id);
      entertainmentCount++;
    }
  });

  if (shoppingCount > 0 || entertainmentCount > 0) {
    console.log(`จัดหมวดหมู่ธุรกรรมอัตโนมัติ: ย้ายไปที่ สมาชิกช้อปปิ้ง ${shoppingCount} รายการ และ ความบันเทิง & สตรีมมิ่ง ${entertainmentCount} รายการ`);
  }
}

export const runSubscriptionMigration = (): void => {
  try {
    const groupId = ensureSubscriptionGroup();
    const softwareCatId = ensureSoftwareCategory(groupId);
    const shoppingCatId = ensureShoppingCategory(groupId);
    const entertainmentCatId = ensureEntertainmentCategory(groupId);
    reclassifySubscriptionTransactions(softwareCatId, shoppingCatId, entertainmentCatId);
  } catch (err: any) {
    console.error('[WARN] เกิดข้อผิดพลาดขณะรัน Migration ของหมวดหมู่รายเดือน:', err.message);
  }
};
