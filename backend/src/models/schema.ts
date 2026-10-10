import db from '../config/db';
import crypto from 'node:crypto';
import { VIEWS_SQL } from './views';
import {
  migrateTablesToStrict, clearIncomeAllocation, promoteSavingsGroups, ensureInvestmentSchema,
  ensureCalendarNoteIcon, verifyTableColumns, runSubscriptionMigration,
} from './migrations';

interface DayTypeInput {
  name: string;
  label: string;
  color: string;
}

export const initSchema = (): void => {
  // เปิด Foreign Key Support
  db.pragma('foreign_keys = ON');

  // สร้างตาราง settings ก่อนเพื่อตรวจสอบสถานะ (STRICT)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    ) STRICT;
  `);

  // ตรวจสอบและยกระดับโครงสร้างตารางเดิมให้เป็น STRICT Mode หากยังไม่ได้เป็น
  migrateTablesToStrict();
  clearIncomeAllocation();
  promoteSavingsGroups();
  ensureInvestmentSchema();
  ensureCalendarNoteIcon();

  // ล้างตารางที่เลิกใช้งานแล้วจากฟีเจอร์เก่าที่ถูกถอดออก (Purge deprecated tables)
  db.exec(`
    DROP TABLE IF EXISTS item_transactions;
    DROP TABLE IF EXISTS items;
    DROP TABLE IF EXISTS item_categories;
  `);

  // ตรวจสอบว่าระบบเคยบันทึกสถานะตรวจสอบโครงสร้างและรัน Migration ไปแล้วหรือยัง
  let schemaVerified = false;
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get('schema_verified') as { value: string } | undefined;
    if (row?.value === 'true') {
      schemaVerified = true;
    }
  } catch (e: any) {
    console.warn('[WARN] ไม่สามารถอ่านข้อมูลความสมบูรณ์ของโครงสร้างได้:', e.message);
  }

  if (schemaVerified) {
    console.log('ระบบฐานข้อมูลและข้อมูลตั้งต้นพร้อมใช้งานแล้ว (ข้ามการเช็คโครงสร้างย้อนหลัง)');
    return;
  }

  // 1. สร้างตารางพื้นฐานทั้งหมด (กรณีเริ่มใช้งานครั้งแรก) — ทั้งหมดเป็น STRICT
  db.exec(`
    CREATE TABLE IF NOT EXISTS cashflow_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'savings')),
      allocation_type TEXT DEFAULT 'want' CHECK(allocation_type IN ('need', 'want', 'savings')),
      order_index INTEGER DEFAULT 0,
      color TEXT,
      icon TEXT,
      highlight_bg INTEGER DEFAULT 0
    ) STRICT;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      order_index INTEGER DEFAULT 0,
      cashflow_group_id TEXT NOT NULL,
      FOREIGN KEY (cashflow_group_id) REFERENCES cashflow_groups(id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS day_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT,
      order_index INTEGER DEFAULT 0
    ) STRICT;

    CREATE TABLE IF NOT EXISTS calendar_days (
      date TEXT PRIMARY KEY,
      day_type_id TEXT NOT NULL,
      note TEXT,
      note_icon TEXT,
      FOREIGN KEY (day_type_id) REFERENCES day_types(id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT,
      amount INTEGER NOT NULL CHECK(amount >= 0),
      category_id TEXT NOT NULL,
      allocation_type TEXT CHECK(allocation_type IS NULL OR allocation_type IN ('need', 'want', 'savings')),
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      asset_id TEXT REFERENCES assets(id),
      trade_side TEXT CHECK(trade_side IS NULL OR trade_side IN ('buy', 'sell')),
      units REAL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    ) STRICT;

    -- 1.1 Virtual Table สำหรับค้นหารวดเร็ว (Shark Search)
    CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
      id UNINDEXED,
      description,
      content='transactions'
    );

    -- 1.2 Triggers สำหรับอัปเดตข้อมูลอัตโนมัติ (updated_at)
    CREATE TRIGGER IF NOT EXISTS trg_transactions_updated_at 
    AFTER UPDATE ON transactions
    FOR EACH ROW
    BEGIN
      UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
    END;

    -- 1.3 Triggers สำหรับซิงก์ดัชนีการค้นหา (FTS5)
    CREATE TRIGGER IF NOT EXISTS trg_transactions_ai AFTER INSERT ON transactions BEGIN
      INSERT INTO transactions_fts(rowid, id, description) VALUES (new.rowid, new.id, new.description);
    END;
    CREATE TRIGGER IF NOT EXISTS trg_transactions_ad AFTER DELETE ON transactions BEGIN
      INSERT INTO transactions_fts(transactions_fts, rowid, id, description) VALUES('delete', old.rowid, old.id, old.description);
    END;
    CREATE TRIGGER IF NOT EXISTS trg_transactions_au AFTER UPDATE ON transactions BEGIN
      INSERT INTO transactions_fts(transactions_fts, rowid, id, description) VALUES('delete', old.rowid, old.id, old.description);
      INSERT INTO transactions_fts(rowid, id, description) VALUES (new.rowid, new.id, new.description);
    END;

    -- 2. วิวประมวลผลทางสถิติ (The Brain): v_monthly_summary / v_daily_burn / v_category_monthly
    ${VIEWS_SQL}
  `);

  // 2. ตรวจสอบคอลัมน์และปรับโครงสร้างตารางเดิมให้รองรับเวอร์ชันปัจจุบัน
  verifyTableColumns();

  // 3. สร้างดัชนี (Indexes) เพื่อเพิ่มความเร็วในการอ่านข้อมูล
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_deleted ON transactions(category_id, is_deleted);
      CREATE INDEX IF NOT EXISTS idx_calendar_days_day_type ON calendar_days(day_type_id);
    `);
  } catch (e: any) {
    console.warn('[WARN] ไม่สามารถสร้างดัชนีการค้นหาได้:', e.message);
  }

  // 3.1 ฐานข้อมูลใหม่: ensureInvestmentSchema ด้านบนข้ามไปเพราะยังไม่มีตาราง transactions — ทำซ้ำตอนนี้ (trigger/index ของระบบลงทุน)
  ensureInvestmentSchema();

  // 4. บันทึกข้อมูลตั้งต้นที่จำเป็น
  seedInitialData();
  clearIncomeAllocation();

  // 5. รัน Migration สำหรับกลุ่มซอฟต์แวร์/บริการรายเดือน
  runSubscriptionMigration();

  // บันทึกสถานะว่าได้จัดแจงความสมบูรณ์ของโครงสร้าง DB เรียบร้อยแล้ว
  try {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run('schema_verified', 'true');
    console.log('บันทึกสถานะการตั้งค่าโครงสร้างเรียบร้อยแล้ว');
  } catch (e: any) {
    console.warn('[WARN] ไม่สามารถบันทึกสถานะตรวจสอบโครงสร้างได้:', e.message);
  }

  console.log('ตั้งค่าโครงสร้างระบบฐานข้อมูล Cashflow Shark เรียบร้อยแล้ว!');
};

const seedInitialData = (): void => {
  // --- นำเข้าข้อมูลประเภทวันทำงาน/วันหยุดเริ่มต้น ---
  const requestedDayTypes: DayTypeInput[] = [
    { name: 'workday',    label: 'ทำงาน',         color: '#3B82F6' },
    { name: 'holiday',    label: 'วันหยุด',        color: '#EF4444' },
    { name: 'sick_leave',  label: 'ลาป่วย',        color: '#F59E0B' },
    { name: 'personal_leave', label: 'ลากิจ',       color: '#D97706' },
    { name: 'sick_half',   label: 'ลาป่วยครึ่งวัน',   color: '#FBBF24' },
    { name: 'personal_half', label: 'ลากิจครึ่งวัน',   color: '#F59E0B' },
    { name: 'ot',         label: 'ทำ OT',         color: '#10B981' },
    { name: 'vacation',   label: 'ลาพักร้อน',       color: '#8B5CF6' },
    { name: 'vacation_half', label: 'ลาพักร้อนครึ่งวัน', color: '#A78BFA' },
    { name: 'company_act', label: 'กิจกรรม บ.',      color: '#6366F1' }
  ];

  const insertDayType = db.prepare("INSERT INTO day_types (id, name, label, color, order_index) VALUES (?, ?, ?, ?, ?)");
  
  requestedDayTypes.forEach((dt, idx) => {
    const exists = db.prepare("SELECT id FROM day_types WHERE label = ?").get(dt.label);
    if (!exists) {
      insertDayType.run(crypto.randomUUID(), dt.name, dt.label, dt.color, idx + 1);
      console.log(`เพิ่มประเภทวันใหม่เรียบร้อย: ${dt.label}`);
    }
  });

  // --- นำเข้ากลุ่มกระแสเงินสดเริ่มต้น (กรณีเป็นศูนย์) ---
  const groupsCount = (db.prepare("SELECT COUNT(*) as count FROM cashflow_groups").get() as { count: number }).count;
  if (groupsCount === 0) {
    const insertGroup = db.prepare("INSERT INTO cashflow_groups (id, name, type, order_index, color, icon) VALUES (?, ?, ?, ?, ?, ?)");
    insertGroup.run(crypto.randomUUID(), 'รายได้หลัก', 'income', 1, '#10B981', '💰');
    insertGroup.run(crypto.randomUUID(), 'รายจ่ายคงที่', 'expense', 2, '#6366F1', '🏠');
    insertGroup.run(crypto.randomUUID(), 'รายจ่ายผันแปร', 'expense', 3, '#F59E0B', '🛒');
    console.log('เพิ่มกลุ่มรายจ่ายเริ่มต้นเรียบร้อย');
  }
};
