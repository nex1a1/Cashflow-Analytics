const db = require('../config/db');

const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id                TEXT PRIMARY KEY,
      date              TEXT,
      iso_date          TEXT,
      category          TEXT,
      description       TEXT,
      amount            REAL,
      day_note          TEXT,
      payment_method_id TEXT
    );

    CREATE TABLE IF NOT EXISTS calendar_days (
      date_str TEXT PRIMARY KEY,
      type     TEXT NOT NULL,
      iso_date TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_iso_date ON transactions(iso_date);
    CREATE INDEX IF NOT EXISTS idx_calendar_days_date_str ON calendar_days(date_str);
  `);

  // ตรวจสอบและเพิ่มคอลัมน์ถ้ายังไม่มี (Migration สำหรับ legacy tables)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    if (!tableInfo.some(c => c.name === 'iso_date')) {
      db.exec('ALTER TABLE transactions ADD COLUMN iso_date TEXT');
    }
    if (!tableInfo.some(c => c.name === 'day_note')) {
      db.exec('ALTER TABLE transactions ADD COLUMN day_note TEXT');
    }
    console.log('✅ Transactions table columns verified');
  } catch (err) {
    console.error('Error verifying transactions table:', err);
  }
};

module.exports = { initSchema };