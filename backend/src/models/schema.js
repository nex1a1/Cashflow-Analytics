const db = require('../config/db');

const initSchema = () => {
  // เปิด Foreign Key Support
  db.pragma('foreign_keys = ON');

  // สร้างตาราง settings ก่อนเพื่อตรวจสอบสถานะ
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ตรวจสอบว่าระบบเคยบันทึกสถานะตรวจสอบโครงสร้างและรัน Migration ไปแล้วหรือยัง
  let schemaVerified = false;
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get('schema_verified');
    if (row && row.value === 'true') {
      schemaVerified = true;
    }
  } catch (e) {
    console.warn('⚠️ ไม่สามารถอ่านข้อมูลความสมบูรณ์ของโครงสร้างได้:', e.message);
  }

  if (schemaVerified) {
    console.log('⚡ ระบบฐานข้อมูลและข้อมูลตั้งต้นพร้อมใช้งานแล้ว (ข้ามการเช็คโครงสร้างย้อนหลัง)');
    return;
  }

  // 1. สร้างตารางพื้นฐานทั้งหมด (กรณีเริ่มใช้งานครั้งแรก)
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
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
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
      allocation_type TEXT DEFAULT 'want' CHECK(allocation_type IN ('need', 'want', 'savings')),
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

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

    -- 2. วิวประมวลผลทางสถิติ (The Brain)
    
    -- 2.1 วิวสรุปรายเดือน
    CREATE VIEW IF NOT EXISTS v_monthly_summary AS
    SELECT 
      strftime('%Y-%m', t.date) as month,
      SUM(CASE WHEN cg.type = 'income' THEN t.amount ELSE 0 END) as income_satang,
      SUM(CASE WHEN cg.type = 'expense' THEN t.amount ELSE 0 END) as expense_satang,
      SUM(CASE WHEN cg.type = 'savings' THEN t.amount ELSE 0 END) as savings_satang
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
    WHERE t.is_deleted = 0
    GROUP BY month;

    -- 2.2 วิวอัตราการเผาผลาญรายวันและความสัมพันธ์กับประเภทวันทำงาน/วันหยุด
    CREATE VIEW IF NOT EXISTS v_daily_burn AS
    SELECT 
      t.date,
      strftime('%Y-%m', t.date) as month,
      SUM(CASE WHEN cg.type = 'expense' THEN t.amount ELSE 0 END) as daily_expense_satang,
      cd.day_type_id,
      dt.name as day_type_name,
      dt.label as day_type_label
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
    LEFT JOIN calendar_days cd ON t.date = cd.date
    LEFT JOIN day_types dt ON cd.day_type_id = dt.id
    WHERE t.is_deleted = 0
    GROUP BY t.date;

    -- 2.3 วิวแจกแจงค่าใช้จ่ายตามหมวดหมู่รายเดือน
    CREATE VIEW IF NOT EXISTS v_category_monthly AS
    SELECT 
      strftime('%Y-%m', t.date) as month,
      c.id as category_id,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color,
      cg.id as group_id,
      cg.type as group_type,
      SUM(t.amount) as amount_satang
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
    WHERE t.is_deleted = 0
    GROUP BY month, c.id;
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
  } catch (e) {
    console.warn('⚠️ ไม่สามารถสร้างดัชนีการค้นหาได้:', e.message);
  }

  // 4. บันทึกข้อมูลตั้งต้นที่จำเป็น
  seedInitialData();

  // 5. รัน Migration สำหรับกลุ่มซอฟต์แวร์/บริการรายเดือน
  runSubscriptionMigration();

  // 6. รัน Migration สำหรับกลุ่มไอที
  runITCategorySplitMigration();

  // บันทึกสถานะว่าได้จัดแจงความสมบูรณ์ของโครงสร้าง DB เรียบร้อยแล้ว
  try {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run('schema_verified', 'true');
    console.log('💾 บันทึกสถานะการตั้งค่าโครงสร้างเรียบร้อยแล้ว');
  } catch (e) {
    console.warn('⚠️ ไม่สามารถบันทึกสถานะตรวจสอบโครงสร้างได้:', e.message);
  }

  console.log('✅ ตั้งค่าโครงสร้างระบบฐานข้อมูล Cashflow Shark เรียบร้อยแล้ว!');
};


const verifyTableColumns = () => {
  // --- รายการธุรกรรม (Transactions) ---
  const txInfo = db.prepare("PRAGMA table_info(transactions)").all();
  const txCols = txInfo.map(c => c.name);

  if (!txCols.includes('is_deleted')) {
    db.exec("ALTER TABLE transactions ADD COLUMN is_deleted INTEGER DEFAULT 0");
    console.log('🔹 เพิ่มคอลัมน์ is_deleted ในตารางรายการธุรกรรม (Transactions) เรียบร้อย');
  }
  if (!txCols.includes('category_id')) {
    try {
      db.exec("ALTER TABLE transactions ADD COLUMN category_id INTEGER DEFAULT 1");
      console.log('🔹 เพิ่มคอลัมน์ category_id ในตารางรายการธุรกรรม (Transactions) เรียบร้อย');
    } catch (e) {}
  }
  if (!txCols.includes('allocation_type')) {
    db.exec("ALTER TABLE transactions ADD COLUMN allocation_type TEXT DEFAULT 'want'");
    console.log('🔹 เพิ่มคอลัมน์ allocation_type ในตารางรายการธุรกรรม (Transactions) เรียบร้อย');
    
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
      console.log('✅ ย้ายการตั้งค่าสัดส่วน (allocation_type) จากกลุ่มมาไว้ที่แต่ละรายการธุรกรรมเรียบร้อย');
    } catch (e) {
      console.warn('⚠️ เกิดข้อผิดพลาดขณะย้ายข้อมูลสัดส่วนธุรกรรม:', e.message);
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
    console.log('🧹 เคลียร์ค่าสัดส่วนในรายการรายได้ให้เป็นค่าว่าง (NULL) เรียบร้อย');
  } catch (e) {
    console.warn('⚠️ เกิดข้อผิดพลาดขณะเคลียร์สัดส่วนรายได้:', e.message);
  }

  // --- หมวดหมู่ย่อย (Categories) ---
  const catInfo = db.prepare("PRAGMA table_info(categories)").all();
  const catCols = catInfo.map(c => c.name);
  if (catCols.length > 0 && !catCols.includes('order_index')) {
    db.exec("ALTER TABLE categories ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('🔹 เพิ่มคอลัมน์ order_index ในตารางหมวดหมู่ย่อย (Categories) เรียบร้อย');
  }
  if (catCols.includes('is_fixed')) {
    try {
      db.exec("ALTER TABLE categories DROP COLUMN is_fixed");
      console.log('🗑️ ลบคอลัมน์ is_fixed ออกจากตารางหมวดหมู่ย่อย (Categories) เรียบร้อย');
    } catch (e) {
      console.warn('⚠️ ไม่สามารถลบคอลัมน์ is_fixed ได้:', e.message);
    }
  }

  // --- กลุ่มรายจ่าย (Cashflow Groups) ---
  const groupInfo = db.prepare("PRAGMA table_info(cashflow_groups)").all();
  const groupCols = groupInfo.map(c => c.name);
  if (groupCols.length > 0 && !groupCols.includes('order_index')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('🔹 เพิ่มคอลัมน์ order_index ในตารางกลุ่มรายจ่าย (Cashflow Groups) เรียบร้อย');
  }
  if (groupCols.length > 0 && !groupCols.includes('highlight_bg')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN highlight_bg INTEGER DEFAULT 0");
    console.log('🔹 เพิ่มคอลัมน์ highlight_bg ในตารางกลุ่มรายจ่าย (Cashflow Groups) เรียบร้อย');
  }
  if (groupCols.length > 0 && !groupCols.includes('allocation_type')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN allocation_type TEXT DEFAULT 'want'");
    console.log('🔹 เพิ่มคอลัมน์ allocation_type ในตารางกลุ่มรายจ่าย (Cashflow Groups) เรียบร้อย');
  }

  // --- ประเภทวันทำงาน/วันหยุด (Day Types) ---
  const dayTypeInfo = db.prepare("PRAGMA table_info(day_types)").all();
  const dayTypeCols = dayTypeInfo.map(c => c.name);
  if (dayTypeCols.length > 0 && !dayTypeCols.includes('name')) {
    db.exec("ALTER TABLE day_types ADD COLUMN name TEXT DEFAULT ''");
    console.log('🔹 เพิ่มคอลัมน์ name ในตารางประเภทวัน (Day Types) เรียบร้อย');
  }
  if (dayTypeCols.length > 0 && !dayTypeCols.includes('order_index')) {
    db.exec("ALTER TABLE day_types ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('🔹 เพิ่มคอลัมน์ order_index ในตารางประเภทวัน (Day Types) เรียบร้อย');
  }

  // --- บันทึกปฏิทินวัน (Calendar Days) ---
  const calInfo = db.prepare("PRAGMA table_info(calendar_days)").all();
  const calCols = calInfo.map(c => c.name);
  if (calCols.length > 0 && !calCols.includes('note')) {
    db.exec("ALTER TABLE calendar_days ADD COLUMN note TEXT");
    console.log('🔹 เพิ่มคอลัมน์ note ในตารางบันทึกปฏิทินวัน (Calendar Days) เรียบร้อย');
  }
};

const seedInitialData = () => {
  const crypto = require('crypto');

  // --- นำเข้าข้อมูลประเภทวันทำงาน/วันหยุดเริ่มต้น ---
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
      console.log(`🌱 เพิ่มประเภทวันใหม่เรียบร้อย: ${dt.label}`);
    }
  });

  // --- นำเข้ากลุ่มกระแสเงินสดเริ่มต้น (กรณีเป็นศูนย์) ---
  const groupsCount = db.prepare("SELECT COUNT(*) as count FROM cashflow_groups").get().count;
  if (groupsCount === 0) {
    const insertGroup = db.prepare("INSERT INTO cashflow_groups (id, name, type, order_index, color, icon) VALUES (?, ?, ?, ?, ?, ?)");
    insertGroup.run(crypto.randomUUID(), 'รายได้หลัก', 'income', 1, '#10B981', '💰');
    insertGroup.run(crypto.randomUUID(), 'รายจ่ายคงที่', 'expense', 2, '#6366F1', '🏠');
    insertGroup.run(crypto.randomUUID(), 'รายจ่ายผันแปร', 'expense', 3, '#F59E0B', '🛒');
    console.log('🌱 เพิ่มกลุ่มรายจ่ายเริ่มต้นเรียบร้อย');
  }
};

const runSubscriptionMigration = () => {
  const crypto = require('crypto');
  
  try {
    // 1. ค้นหาหรือสร้างกลุ่มเป้าหมาย 'บริการรายเดือน'
    let groupId;
    
    const group1 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'บริการรายเดือน'").get();
    const group2 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'รายเดือน'").get();
    const group3 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'รายเดือน/หนี้'").get();

    if (group1) {
      groupId = group1.id;
    } else if (group2) {
      db.prepare("UPDATE cashflow_groups SET name = ?, icon = ?, color = ? WHERE id = ?")
        .run('บริการรายเดือน', '🔄', '#8B5CF6', group2.id);
      groupId = group2.id;
      console.log('✅ เปลี่ยนชื่อกลุ่ม "รายเดือน" เป็น "บริการรายเดือน" เรียบร้อย');
    } else if (group3) {
      db.prepare("UPDATE cashflow_groups SET name = ?, icon = ?, color = ? WHERE id = ?")
        .run('บริการรายเดือน', '🔄', '#8B5CF6', group3.id);
      groupId = group3.id;
      console.log('✅ เปลี่ยนชื่อกลุ่ม "รายเดือน/หนี้" เป็น "บริการรายเดือน" เรียบร้อย');
    } else {
      groupId = crypto.randomUUID();
      db.prepare("INSERT INTO cashflow_groups (id, name, type, order_index, color, icon, allocation_type) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(groupId, 'บริการรายเดือน', 'expense', 4, '#8B5CF6', '🔄', 'want');
      console.log('🌱 สร้างกลุ่มใหม่ "บริการรายเดือน" เรียบร้อย');
    }

    // ย้ายหมวดหมู่และลบกลุ่มที่ซ้ำซ้อน
    const redundantGroups = [group2, group3].filter(g => g && g.id !== groupId);
    redundantGroups.forEach(rg => {
      const updateCats = db.prepare("UPDATE categories SET cashflow_group_id = ? WHERE cashflow_group_id = ?")
        .run(groupId, rg.id);
      if (updateCats.changes > 0) {
        console.log(`✅ รวมหมวดหมู่ ${updateCats.changes} รายการจากกลุ่มที่ซ้ำซ้อนเข้าสู่กลุ่ม "บริการรายเดือน" เรียบร้อย`);
      }
      
      db.prepare("DELETE FROM cashflow_groups WHERE id = ?").run(rg.id);
      console.log(`🗑️ ลบกลุ่มรายจ่ายที่ไม่ได้ใช้แล้วออกเรียบร้อย: ${rg.id}`);
    });

    // 2. ปรับแต่งและนำเข้าหมวดหมู่บริการรายเดือน
    let softwareCatId;
    let shoppingCatId;
    let entertainmentCatId;

    // 2.1 ซอฟต์แวร์ & AI (เปลี่ยนชื่อจากหมวดเก่า หรือสร้างใหม่หากไม่มี)
    const oldCat = db.prepare("SELECT id FROM categories WHERE name = 'บริการรายเดือน'").get();
    if (oldCat) {
      db.prepare("UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?")
        .run('ซอฟต์แวร์ & AI', '🤖', '#3B82F6', oldCat.id);
      softwareCatId = oldCat.id;
      console.log('✅ เปลี่ยนชื่อหมวดหมู่ "บริการรายเดือน" เป็น "ซอฟต์แวร์ & AI" เรียบร้อย');
    } else {
      const existingSoftwareCat = db.prepare("SELECT id FROM categories WHERE name = 'ซอฟต์แวร์ & AI' OR name = 'ซอฟต์แวร์'").get();
      if (existingSoftwareCat) {
        softwareCatId = existingSoftwareCat.id;
      } else {
        softwareCatId = crypto.randomUUID();
        db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
          .run(softwareCatId, 'ซอฟต์แวร์ & AI', '🤖', '#3B82F6', 1, groupId);
        console.log('🌱 สร้างหมวดหมู่ย่อยใหม่ "ซอฟต์แวร์ & AI" เรียบร้อย');
      }
    }

    // 2.2 สมาชิกช้อปปิ้ง & ส่งอาหาร
    const catLong = db.prepare("SELECT id FROM categories WHERE name = 'สมาชิกช้อปปิ้ง & ส่งอาหาร'").get();
    const catShort = db.prepare("SELECT id FROM categories WHERE name = 'สมาชิกช้อปปิ้ง'").get();

    if (catLong && catShort) {
      db.prepare("UPDATE transactions SET category_id = ? WHERE category_id = ?").run(catShort.id, catLong.id);
      db.prepare("DELETE FROM categories WHERE id = ?").run(catLong.id);
      console.log('🧹 รวมหมวดหมู่ "สมาชิกช้อปปิ้ง & ส่งอาหาร" เข้ากับหมวดหมู่ "สมาชิกช้อปปิ้ง" เรียบร้อย');
      shoppingCatId = catShort.id;
    } else if (catShort) {
      shoppingCatId = catShort.id;
    } else if (catLong) {
      shoppingCatId = catLong.id;
    } else {
      shoppingCatId = crypto.randomUUID();
      db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(shoppingCatId, 'สมาชิกช้อปปิ้ง & ส่งอาหาร', '🛍️', '#EC4899', 2, groupId);
      console.log('🌱 สร้างหมวดหมู่ย่อยใหม่ "สมาชิกช้อปปิ้ง & ส่งอาหาร" เรียบร้อย');
    }

    // 2.3 ความบันเทิง & สตรีมมิ่ง
    const entLong = db.prepare("SELECT id FROM categories WHERE name = 'ความบันเทิง & สตรีมมิ่ง'").get();
    const entShort = db.prepare("SELECT id FROM categories WHERE name = 'ความบันเทิง'").get();

    if (entLong && entShort) {
      db.prepare("UPDATE transactions SET category_id = ? WHERE category_id = ?").run(entShort.id, entLong.id);
      db.prepare("DELETE FROM categories WHERE id = ?").run(entLong.id);
      console.log('🧹 รวมหมวดหมู่ "ความบันเทิง & สตรีมมิ่ง" เข้ากับหมวดหมู่ "ความบันเทิง" เรียบร้อย');
      entertainmentCatId = entShort.id;
    } else if (entShort) {
      entertainmentCatId = entShort.id;
    } else if (entLong) {
      entertainmentCatId = entLong.id;
    } else {
      entertainmentCatId = crypto.randomUUID();
      db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(entertainmentCatId, 'ความบันเทิง & สตรีมมิ่ง', '🍿', '#EF4444', 3, groupId);
      console.log('🌱 สร้างหมวดหมู่ย่อยใหม่ "ความบันเทิง & สตรีมมิ่ง" เรียบร้อย');
    }

    // 3. จัดแจงคัดแยกประเภทรายการธุรกรรมเดิม (Smart Classification)
    const txs = db.prepare("SELECT id, description FROM transactions WHERE category_id = ? AND is_deleted = 0").all(softwareCatId);
    let shoppingCount = 0;
    let entertainmentCount = 0;

    const updateTx = db.prepare("UPDATE transactions SET category_id = ? WHERE id = ?");

    txs.forEach(tx => {
      if (!tx.description) return;
      const desc = tx.description.toLowerCase();

      const shoppingKeywords = ['shopee', 'lazada', 'grab', 'lineman', 'foodpanda', 'membership', 'vip', 'prime', 'delivery', 'ช้อป', 'ส่งอาหาร'];
      const entertainmentKeywords = ['netflix', 'spotify', 'youtube', 'disney', 'hbo', 'prime video', 'steam', 'playstation', 'xbox', 'nintendo', 'game', 'เพลง', 'หนัง', 'บันเทิง'];

      if (shoppingKeywords.some(k => desc.includes(k))) {
        updateTx.run(shoppingCatId, tx.id);
        shoppingCount++;
      } else if (entertainmentKeywords.some(k => desc.includes(k))) {
        updateTx.run(entertainmentCatId, tx.id);
        entertainmentCount++;
      }
    });

    if (shoppingCount > 0 || entertainmentCount > 0) {
      console.log(`🧠 จัดหมวดหมู่ธุรกรรมอัตโนมัติ: ย้ายไปที่ สมาชิกช้อปปิ้ง ${shoppingCount} รายการ และ ความบันเทิง & สตรีมมิ่ง ${entertainmentCount} รายการ`);
    }

  } catch (err) {
    console.error('⚠️ เกิดข้อผิดพลาดขณะรัน Migration ของหมวดหมู่รายเดือน:', err.message);
  }
};

const runITCategorySplitMigration = () => {
  const crypto = require('crypto');

  try {
    // 1. ค้นหากลุ่มรายจ่ายผันแปร
    let groupId;
    const groupVar = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'รายจ่ายผันแปร'").get();
    if (groupVar) {
      groupId = groupVar.id;
    } else {
      const anyExpenseGroup = db.prepare("SELECT id FROM cashflow_groups WHERE type = 'expense' ORDER BY order_index LIMIT 1").get();
      if (anyExpenseGroup) {
        groupId = anyExpenseGroup.id;
      } else {
        console.warn('⚠️ ไม่พบกลุ่มรายจ่ายผันแปรสำหรับหมวดหมู่ไอที');
        return;
      }
    }

    // 2. นำเข้าหมวดหมู่ IT เฉพาะกรณีที่ไม่มีอยู่จริง (ไม่เขียนทับสี/ไอคอนเดิมหากผู้ใช้แก้ไข)
    const newCategories = [
      { id: 'c7_comp', name: 'ประกอบคอม & ฮาร์ดแวร์', icon: '🖥️', color: '#00509E', order_index: 10 },
      { id: 'c7_gear', name: 'เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง', icon: '⌨️', color: '#6366F1', order_index: 11 },
      { id: 'c7_desk', name: 'เฟอร์นิเจอร์ & จัดโต๊ะคอม', icon: '🪑', color: '#06B6D4', order_index: 12 },
      { id: 'c7_phone', name: 'สมาร์ทโฟน & ไอทีพกพา', icon: '📱', color: '#8B5CF6', order_index: 13 }
    ];

    const insertCat = db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)");
    
    newCategories.forEach(cat => {
      const exists = db.prepare("SELECT id FROM categories WHERE id = ?").get(cat.id);
      if (!exists) {
        insertCat.run(cat.id, cat.name, cat.icon, cat.color, cat.order_index, groupId);
        console.log(`🌱 สร้างหมวดหมู่ย่อยใหม่เรียบร้อย: "${cat.name}"`);
      }
    });

  } catch (err) {
    console.error('⚠️ เกิดข้อผิดพลาดขณะรัน Migration ของหมวดหมู่ IT:', err.message);
  }
};

module.exports = { initSchema };
