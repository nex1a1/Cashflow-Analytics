const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ตั้งค่าการเชื่อมต่อ PostgreSQL
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

// สร้างตาราง Database อัตโนมัติ (v1.0)
const initDB = async () => {
  try {
    // 1. ตารางรายการบัญชี
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        date VARCHAR(50),
        category VARCHAR(255),
        description TEXT,
        amount NUMERIC,
        day_note TEXT
      );
    `);

    // 2. ตารางชนิดวันของปฏิทิน
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_days (
        date VARCHAR(20) PRIMARY KEY,
        type_id VARCHAR(50) NOT NULL
      );
    `);

    // 3. ตารางสำหรับเก็บการตั้งค่าระบบ (หมวดหมู่, ชนิดวัน)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT
      );
    `);

    // 4. สร้าง Index เพื่อความรวดเร็วในการ Query
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_calendar_days_date ON calendar_days(date);
    `);

    console.log("✅ Database tables and indexes are ready (v1.0).");
  } catch (err) {
    console.error("❌ Database Initialization Error:", err);
  }
};
initDB();

// ==========================================
// API: รายการบัญชี (Transactions)
// ==========================================

// ดึงข้อมูลบัญชีทั้งหมด
app.get('/api/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date ASC');
    const formatted = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      category: row.category,
      description: row.description,
      amount: parseFloat(row.amount),
      dayNote: row.day_note
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// บันทึกข้อมูล (รองรับการเซฟทีละรายการ และหลายรายการพร้อมกัน)
app.post('/api/transactions', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  try {
    await pool.query('BEGIN');
    for (let item of items) {
      await pool.query(`
        INSERT INTO transactions (id, date, category, description, amount, day_note)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          date = EXCLUDED.date,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          amount = EXCLUDED.amount,
          day_note = EXCLUDED.day_note;
      `, [item.id, item.date, item.category, item.description, item.amount, item.dayNote || '']);
    }
    await pool.query('COMMIT');
    res.json({ success: true, count: items.length });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ลบข้อมูล 1 รายการ
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ล้างข้อมูล transactions ทั้งหมด
app.delete('/api/transactions', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE transactions');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API: ระบบ Calendar (ชนิดวัน)
// ==========================================

app.get('/api/calendar', async (req, res) => {
  try {
    const result = await pool.query('SELECT date, type_id FROM calendar_days');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar', async (req, res) => {
  const { date, type_id } = req.body;
  try {
    const query = `
      INSERT INTO calendar_days (date, type_id)
      VALUES ($1, $2)
      ON CONFLICT (date) DO UPDATE SET type_id = EXCLUDED.type_id;
    `;
    await pool.query(query, [date, type_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API: ระบบ Settings (หมวดหมู่ และ ชนิดวัน)
// ==========================================

app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = JSON.parse(row.setting_value);
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;
  try {
    await pool.query(`
      INSERT INTO settings (setting_key, setting_value)
      VALUES ($1, $2)
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
    `, [key, JSON.stringify(value)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API: ระบบ Reset (ล้างข้อมูลทั้งหมด)
// ==========================================

app.delete('/api/reset-all', async (req, res) => {
  try {
    await pool.query('BEGIN');
    await pool.query('TRUNCATE TABLE transactions');
    await pool.query('TRUNCATE TABLE calendar_days');
    // โค้ดนี้จะเก็บ Settings ไว้ (เผื่อล้างข้อมูลแล้วไม่ต้องตั้งค่าหมวดหมู่ใหม่)
    await pool.query('COMMIT');
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));