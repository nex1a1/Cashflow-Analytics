const db = require('../config/db');

const initSchema = () => {
  // เปิด Foreign Key Support
  db.pragma('foreign_keys = ON');

  // 1. สร้างตารางพื้นฐาน (กรณีเริ่มจากศูนย์)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cashflow_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'savings')),
      order_index INTEGER DEFAULT 0,
      color TEXT,
      icon TEXT,
      highlight_bg INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      is_fixed INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      cashflow_group_id TEXT NOT NULL,
      FOREIGN KEY (cashflow_group_id) REFERENCES cashflow_groups(id)
    );

    CREATE TABLE IF NOT EXISTS day_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS calendar_days (
      date TEXT PRIMARY KEY,
      day_type_id TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (day_type_id) REFERENCES day_types(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT,
      amount INTEGER NOT NULL CHECK(amount >= 0),
      category_id TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // 2. ตรวจสอบและอัปเดต Column แบบบังคับ (กรณีตารางมีอยู่แล้วแต่โครงสร้างเก่า)
  verifyTableColumns();

  // 3. สร้าง Indexes (หลังจากมั่นใจว่า Column มีอยู่จริง)
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_calendar_days_day_type ON calendar_days(day_type_id);
    `);
  } catch (e) {
    console.warn('⚠️ Index creation warning:', e.message);
  }

  // 4. Seed Initial Data
  seedInitialData();

  console.log('✅ Database Schema initialized and verified');
};

const verifyTableColumns = () => {
  // --- Transactions ---
  const txInfo = db.prepare("PRAGMA table_info(transactions)").all();
  const txCols = txInfo.map(c => c.name);

  if (!txCols.includes('is_deleted')) {
    db.exec("ALTER TABLE transactions ADD COLUMN is_deleted INTEGER DEFAULT 0");
    console.log('🔹 Forced: Added column is_deleted to transactions');
  }
  if (!txCols.includes('category_id')) {
    try {
      db.exec("ALTER TABLE transactions ADD COLUMN category_id INTEGER DEFAULT 1");
      console.log('🔹 Forced: Added column category_id to transactions');
    } catch (e) {}
  }

  // --- Categories ---
  const catInfo = db.prepare("PRAGMA table_info(categories)").all();
  const catCols = catInfo.map(c => c.name);
  if (catCols.length > 0 && !catCols.includes('order_index')) {
    db.exec("ALTER TABLE categories ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('🔹 Forced: Added column order_index to categories');
  }

  // --- Cashflow Groups ---
  const groupInfo = db.prepare("PRAGMA table_info(cashflow_groups)").all();
  const groupCols = groupInfo.map(c => c.name);
  if (groupCols.length > 0 && !groupCols.includes('order_index')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('🔹 Forced: Added column order_index to cashflow_groups');
  }
  if (groupCols.length > 0 && !groupCols.includes('highlight_bg')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN highlight_bg INTEGER DEFAULT 0");
    console.log('🔹 Forced: Added column highlight_bg to cashflow_groups');
  }

  // --- Day Types ---
  const dayTypeInfo = db.prepare("PRAGMA table_info(day_types)").all();
  const dayTypeCols = dayTypeInfo.map(c => c.name);
  if (dayTypeCols.length > 0 && !dayTypeCols.includes('name')) {
    db.exec("ALTER TABLE day_types ADD COLUMN name TEXT DEFAULT ''");
    console.log('🔹 Forced: Added column name to day_types');
  }
  if (dayTypeCols.length > 0 && !dayTypeCols.includes('order_index')) {
    db.exec("ALTER TABLE day_types ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('🔹 Forced: Added column order_index to day_types');
  }

  // --- Calendar Days ---
  const calInfo = db.prepare("PRAGMA table_info(calendar_days)").all();
  const calCols = calInfo.map(c => c.name);
  if (calCols.length > 0 && !calCols.includes('note')) {
    db.exec("ALTER TABLE calendar_days ADD COLUMN note TEXT");
    console.log('🔹 Forced: Added column note to calendar_days');
  }
};

const seedInitialData = () => {
  const crypto = require('crypto');

  // --- Seed Day Types ---
  const requestedDayTypes = [
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
      console.log(`🌱 Seeded day type: ${dt.label}`);
    }
  });

  // --- Seed Cashflow Groups ---
  const groupsCount = db.prepare("SELECT COUNT(*) as count FROM cashflow_groups").get().count;
  if (groupsCount === 0) {
    const insertGroup = db.prepare("INSERT INTO cashflow_groups (id, name, type, order_index, color, icon) VALUES (?, ?, ?, ?, ?, ?)");
    insertGroup.run(crypto.randomUUID(), 'รายได้หลัก', 'income', 1, '#10B981', '💰');
    insertGroup.run(crypto.randomUUID(), 'รายจ่ายคงที่', 'expense', 2, '#6366F1', '🏠');
    insertGroup.run(crypto.randomUUID(), 'รายจ่ายผันแปร', 'expense', 3, '#F59E0B', '🛒');
  }
};

module.exports = { initSchema };
