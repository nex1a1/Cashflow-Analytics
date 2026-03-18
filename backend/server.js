const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ตำแหน่งไฟล์ SQLite — mount ไว้ใน volume เพื่อ persist ข้อมูล
const DB_PATH = process.env.DB_PATH || '/app/data/cashflow.db';

// สร้าง directory ถ้ายังไม่มี
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

// เปิด WAL mode — เร็วขึ้นมากสำหรับ write
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==========================================
// สร้างตาราง + Index อัตโนมัติ
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    date        TEXT,
    category    TEXT,
    description TEXT,
    amount      REAL,
    day_note    TEXT
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

// 🌟 [เพิ่มใหม่] พยายามเพิ่มคอลัมน์ payment_method_id ถ้ายังไม่มี
try {
  db.exec('ALTER TABLE transactions ADD COLUMN payment_method_id TEXT');
  console.log('✅ Added payment_method_id column to transactions');
} catch (err) {
  // ถ้ามีคอลัมน์นี้อยู่แล้ว SQLite จะ Error ออกมา เราก็จับ catch ไว้เงียบๆ ไม่ต้องทำอะไร
}

console.log('✅ SQLite database ready at', DB_PATH);

// ==========================================
// API: รายการบัญชี (Transactions)
// ==========================================

app.get('/api/transactions', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM transactions ORDER BY date ASC').all();
    res.json(rows.map(row => ({
      id:              row.id,
      date:            row.date,
      category:        row.category,
      description:     row.description,
      amount:          parseFloat(row.amount),
      dayNote:         row.day_note,
      // 🌟 [เพิ่มใหม่] ส่ง paymentMethodId กลับไปให้ Frontend ด้วย
      paymentMethodId: row.payment_method_id || null, 
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  
  // 🌟 [เพิ่มใหม่] แก้ SQL ให้บันทึกและอัปเดต payment_method_id ด้วย
  const upsert = db.prepare(`
    INSERT INTO transactions (id, date, category, description, amount, day_note, payment_method_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date              = excluded.date,
      category          = excluded.category,
      description       = excluded.description,
      amount            = excluded.amount,
      day_note          = excluded.day_note,
      payment_method_id = excluded.payment_method_id
  `);

  const runAll = db.transaction((rows) => {
    for (const item of rows) {
      // 🌟 [เพิ่มใหม่] ส่งค่า item.paymentMethodId เข้าไปใน .run()
      upsert.run(
        item.id, 
        item.date, 
        item.category, 
        item.description, 
        item.amount, 
        item.dayNote || '',
        item.paymentMethodId || null
      );
    }
  });

  try {
    runAll(items);
    res.json({ success: true, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions', (req, res) => {
  try {
    db.prepare('DELETE FROM transactions').run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API: ระบบ Calendar (ชนิดวัน)
// ==========================================

app.get('/api/calendar', (req, res) => {
  try {
    res.json(db.prepare('SELECT date, type_id FROM calendar_days').all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar', (req, res) => {
  const { date, type_id } = req.body;
  try {
    db.prepare(`
      INSERT INTO calendar_days (date, type_id) VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET type_id = excluded.type_id
    `).run(date, type_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API: Settings
// ==========================================

app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = JSON.parse(row.setting_value);
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  try {
    db.prepare(`
      INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
    `).run(key, JSON.stringify(value));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API: Reset ล้างข้อมูลทั้งหมด
// ==========================================

app.delete('/api/reset-all', (req, res) => {
  const resetAll = db.transaction(() => {
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM calendar_days').run();
    // เก็บ settings ไว้ ไม่ลบหมวดหมู่
  });
  try {
    resetAll();
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));