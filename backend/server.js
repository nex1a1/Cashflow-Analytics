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

// สร้างตาราง Database อัตโนมัติ
const initDB = async () => {
  try {
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
    console.log("✅ Database table 'transactions' is ready.");
  } catch (err) {
    console.error("❌ Database Initialization Error:", err);
  }
};
initDB();

// API: ดึงข้อมูลบัญชีทั้งหมด
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

// API: บันทึกข้อมูล (รองรับการเซฟทีละรายการ และหลายรายการพร้อมกัน)
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

// API: ลบข้อมูล 1 รายการ
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ล้างข้อมูลทั้งหมดในฐานข้อมูล
app.delete('/api/transactions', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE transactions');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));