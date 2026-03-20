const db = require('../config/db');

const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id                TEXT PRIMARY KEY,
      date              TEXT,
      category          TEXT,
      description       TEXT,
      amount            REAL,
      day_note          TEXT,
      payment_method_id TEXT
    );

    CREATE TABLE IF NOT EXISTS calendar_days (
      date    TEXT PRIMARY KEY,
      type_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      setting_key   TEXT PRIMARY KEY,
      setting_value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_calendar_days_date ON calendar_days(date);
  `);

  // ตรวจสอบและเพิ่มคอลัมน์ถ้ายังไม่มี (Migration)
  try {
    db.exec('ALTER TABLE transactions ADD COLUMN payment_method_id TEXT');
    console.log('✅ Column payment_method_id verified/added');
  } catch (err) {
    // Column already exists
  }
};

module.exports = { initSchema };