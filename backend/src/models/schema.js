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

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- 1.1 Virtual Table for Full-Text Search (Shark Search)
    CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
      id UNINDEXED,
      description,
      content='transactions'
    );

    -- 1.2 Triggers for Automated Metadata (updated_at)
    CREATE TRIGGER IF NOT EXISTS trg_transactions_updated_at 
    AFTER UPDATE ON transactions
    FOR EACH ROW
    BEGIN
      UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
    END;

    -- 1.3 Triggers for Search Index Sync
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

    -- 2. Analytical Views (The Brain)
    
    -- 2.1 Monthly Summary View
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

    -- 2.2 Daily Burn & Work-Life Correlation View
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

    -- 2.3 Category Monthly Breakdown View
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

  // 2. ตรวจสอบและอัปเดต Column แบบบังคับ (กรณีตารางมีอยู่แล้วแต่โครงสร้างเก่า)
  verifyTableColumns();

  // 3. สร้าง Indexes (หลังจากมั่นใจว่า Column มีอยู่จริง)
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_deleted ON transactions(category_id, is_deleted);
      CREATE INDEX IF NOT EXISTS idx_calendar_days_day_type ON calendar_days(day_type_id);
    `);
  } catch (e) {
    console.warn('⚠️ Index creation warning:', e.message);
  }

  // 4. Seed Initial Data
  seedInitialData();

  // 5. Run Custom Migrations (Subscription Category Split)
  runSubscriptionMigration();

  // 6. Run IT Category Split Migration
  runITCategorySplitMigration();

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
  if (!txCols.includes('allocation_type')) {
    db.exec("ALTER TABLE transactions ADD COLUMN allocation_type TEXT DEFAULT 'want'");
    console.log('🔹 Forced: Added column allocation_type to transactions');
    
    // Migration logic: Move from group to transaction
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
      console.log('✅ Migrated allocation_type from Groups to Transactions');
    } catch (e) {
      console.warn('⚠️ Migration warning:', e.message);
    }
  }

  // Clean up allocation_type for existing income transactions to NULL
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
    console.log('🧹 Cleaned allocation_type for existing income transactions to NULL');
  } catch (e) {
    console.warn('⚠️ Income allocation cleanup warning:', e.message);
  }

  // --- Categories ---
  const catInfo = db.prepare("PRAGMA table_info(categories)").all();
  const catCols = catInfo.map(c => c.name);
  if (catCols.length > 0 && !catCols.includes('order_index')) {
    db.exec("ALTER TABLE categories ADD COLUMN order_index INTEGER DEFAULT 0");
    console.log('🔹 Forced: Added column order_index to categories');
  }
  if (catCols.includes('is_fixed')) {
    try {
      db.exec("ALTER TABLE categories DROP COLUMN is_fixed");
      console.log('🗑️ Removed is_fixed from categories');
    } catch (e) {
      console.warn('⚠️ Could not drop is_fixed from categories:', e.message);
    }
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
  if (groupCols.length > 0 && !groupCols.includes('allocation_type')) {
    db.exec("ALTER TABLE cashflow_groups ADD COLUMN allocation_type TEXT DEFAULT 'want'");
    console.log('🔹 Forced: Added column allocation_type to cashflow_groups');
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

const runSubscriptionMigration = () => {
  const crypto = require('crypto');
  
  try {
    // 1. Find or create the target group 'บริการรายเดือน'
    let groupId;
    
    // Check if 'บริการรายเดือน' group already exists
    const group1 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'บริการรายเดือน'").get();
    // Check if 'รายเดือน' group exists
    const group2 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'รายเดือน'").get();
    // Check if old 'รายเดือน/หนี้' group exists
    const group3 = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'รายเดือน/หนี้'").get();

    if (group1) {
      groupId = group1.id;
    } else if (group2) {
      db.prepare("UPDATE cashflow_groups SET name = ?, icon = ?, color = ? WHERE id = ?")
        .run('บริการรายเดือน', '🔄', '#8B5CF6', group2.id);
      groupId = group2.id;
      console.log('✅ Migrated Group: Renamed "รายเดือน" to "บริการรายเดือน"');
    } else if (group3) {
      db.prepare("UPDATE cashflow_groups SET name = ?, icon = ?, color = ? WHERE id = ?")
        .run('บริการรายเดือน', '🔄', '#8B5CF6', group3.id);
      groupId = group3.id;
      console.log('✅ Migrated Group: Renamed "รายเดือน/หนี้" to "บริการรายเดือน"');
    } else {
      groupId = crypto.randomUUID();
      db.prepare("INSERT INTO cashflow_groups (id, name, type, order_index, color, icon, allocation_type) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(groupId, 'บริการรายเดือน', 'expense', 4, '#8B5CF6', '🔄', 'want');
      console.log('🌱 Created Group: "บริการรายเดือน"');
    }

    // Move categories and delete redundant groups
    const redundantGroups = [group2, group3].filter(g => g && g.id !== groupId);
    redundantGroups.forEach(rg => {
      // Move all categories from redundant group to the target group
      const updateCats = db.prepare("UPDATE categories SET cashflow_group_id = ? WHERE cashflow_group_id = ?")
        .run(groupId, rg.id);
      if (updateCats.changes > 0) {
        console.log(`✅ Merged ${updateCats.changes} categories from redundant group to "บริการรายเดือน"`);
      }
      
      // Delete the redundant group
      db.prepare("DELETE FROM cashflow_groups WHERE id = ?").run(rg.id);
      console.log(`🗑️ Deleted redundant cashflow group: ${rg.id}`);
    });

    // 2. Add / Rename Categories
    let softwareCatId;
    let shoppingCatId;
    let entertainmentCatId;

    // 2.1 Software & AI (Rename old 'บริการรายเดือน' category if exists, or create new)
    const oldCat = db.prepare("SELECT id FROM categories WHERE name = 'บริการรายเดือน'").get();
    if (oldCat) {
      db.prepare("UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?")
        .run('ซอฟต์แวร์ & AI', '🤖', '#3B82F6', oldCat.id);
      softwareCatId = oldCat.id;
      console.log('✅ Migrated Category: Renamed "บริการรายเดือน" to "ซอฟต์แวร์ & AI"');
    } else {
      const existingSoftwareCat = db.prepare("SELECT id FROM categories WHERE name = 'ซอฟต์แวร์ & AI' OR name = 'ซอฟต์แวร์'").get();
      if (existingSoftwareCat) {
        softwareCatId = existingSoftwareCat.id;
      } else {
        softwareCatId = crypto.randomUUID();
        db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
          .run(softwareCatId, 'ซอฟต์แวร์ & AI', '🤖', '#3B82F6', 1, groupId);
        console.log('🌱 Created Category: "ซอฟต์แวร์ & AI"');
      }
    }

    // 2.2 Shopping & Food Delivery VIP (Create if not exists, merge duplicates if both exist)
    const catLong = db.prepare("SELECT id FROM categories WHERE name = 'สมาชิกช้อปปิ้ง & ส่งอาหาร'").get();
    const catShort = db.prepare("SELECT id FROM categories WHERE name = 'สมาชิกช้อปปิ้ง'").get();

    if (catLong && catShort) {
      // Both exist! Merge long into short (user preferred short)
      db.prepare("UPDATE transactions SET category_id = ? WHERE category_id = ?").run(catShort.id, catLong.id);
      db.prepare("DELETE FROM categories WHERE id = ?").run(catLong.id);
      console.log('🧹 Merged duplicate category "สมาชิกช้อปปิ้ง & ส่งอาหาร" into "สมาชิกช้อปปิ้ง"');
      shoppingCatId = catShort.id;
    } else if (catShort) {
      shoppingCatId = catShort.id;
    } else if (catLong) {
      shoppingCatId = catLong.id;
    } else {
      shoppingCatId = crypto.randomUUID();
      db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(shoppingCatId, 'สมาชิกช้อปปิ้ง & ส่งอาหาร', '🛍️', '#EC4899', 2, groupId);
      console.log('🌱 Created Category: "สมาชิกช้อปปิ้ง & ส่งอาหาร"');
    }

    // 2.3 Entertainment & Streaming (Create if not exists, merge duplicates if both exist)
    const entLong = db.prepare("SELECT id FROM categories WHERE name = 'ความบันเทิง & สตรีมมิ่ง'").get();
    const entShort = db.prepare("SELECT id FROM categories WHERE name = 'ความบันเทิง'").get();

    if (entLong && entShort) {
      db.prepare("UPDATE transactions SET category_id = ? WHERE category_id = ?").run(entShort.id, entLong.id);
      db.prepare("DELETE FROM categories WHERE id = ?").run(entLong.id);
      console.log('🧹 Merged duplicate category "ความบันเทิง & สตรีมมิ่ง" into "ความบันเทิง"');
      entertainmentCatId = entShort.id;
    } else if (entShort) {
      entertainmentCatId = entShort.id;
    } else if (entLong) {
      entertainmentCatId = entLong.id;
    } else {
      entertainmentCatId = crypto.randomUUID();
      db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(entertainmentCatId, 'ความบันเทิง & สตรีมมิ่ง', '🍿', '#EF4444', 3, groupId);
      console.log('🌱 Created Category: "ความบันเทิง & สตรีมมิ่ง"');
    }

    // 3. Smart Transaction Re-classification
    // Select transactions under the 'ซอฟต์แวร์ & AI' category to classify them
    const txs = db.prepare("SELECT id, description FROM transactions WHERE category_id = ? AND is_deleted = 0").all(softwareCatId);
    let shoppingCount = 0;
    let entertainmentCount = 0;

    const updateTx = db.prepare("UPDATE transactions SET category_id = ? WHERE id = ?");

    txs.forEach(tx => {
      if (!tx.description) return;
      const desc = tx.description.toLowerCase();

      // Shopping / Food VIP keywords
      const shoppingKeywords = ['shopee', 'lazada', 'grab', 'lineman', 'foodpanda', 'membership', 'vip', 'prime', 'delivery', 'ช้อป', 'ส่งอาหาร'];
      // Entertainment keywords
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
      console.log(`🧠 Smart Re-classified: Moved ${shoppingCount} to Shopping VIP, ${entertainmentCount} to Entertainment & Streaming`);
    }

  } catch (err) {
    console.error('⚠️ Subscription Migration error:', err.message);
  }
};

const runITCategorySplitMigration = () => {
  const crypto = require('crypto');

  try {
    // 1. Find the target group for these expense categories
    let groupId;
    const groupVar = db.prepare("SELECT id FROM cashflow_groups WHERE name = 'รายจ่ายผันแปร'").get();
    if (groupVar) {
      groupId = groupVar.id;
    } else {
      const anyExpenseGroup = db.prepare("SELECT id FROM cashflow_groups WHERE type = 'expense' ORDER BY order_index LIMIT 1").get();
      if (anyExpenseGroup) {
        groupId = anyExpenseGroup.id;
      } else {
        console.warn('⚠️ No expense group found for IT categories');
        return;
      }
    }

    // 2. Define the new IT categories
    const newCategories = [
      { id: 'c7_comp', name: 'ประกอบคอม & ฮาร์ดแวร์', icon: '🖥️', color: '#00509E', order_index: 10 },
      { id: 'c7_gear', name: 'เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง', icon: '⌨️', color: '#6366F1', order_index: 11 },
      { id: 'c7_desk', name: 'เฟอร์นิเจอร์ & จัดโต๊ะคอม', icon: '🪑', color: '#06B6D4', order_index: 12 },
      { id: 'c7_phone', name: 'สมาร์ทโฟน & ไอทีพกพา', icon: '📱', color: '#8B5CF6', order_index: 13 }
    ];

    const insertCat = db.prepare("INSERT INTO categories (id, name, icon, color, order_index, cashflow_group_id) VALUES (?, ?, ?, ?, ?, ?)");
    const updateCatColor = db.prepare("UPDATE categories SET color = ?, icon = ? WHERE id = ?");
    
    newCategories.forEach(cat => {
      const exists = db.prepare("SELECT id FROM categories WHERE id = ?").get(cat.id);
      if (!exists) {
        insertCat.run(cat.id, cat.name, cat.icon, cat.color, cat.order_index, groupId);
        console.log(`🌱 Created Category: "${cat.name}"`);
      } else {
        updateCatColor.run(cat.color, cat.icon, cat.id);
      }
    });

    // 3. Sync 'ค่าเช่า/ค่าหอพัก' color if it exists in the database
    const rentCat = db.prepare("SELECT id FROM categories WHERE name = 'ค่าเช่า/ค่าหอพัก' OR id = 'c13'").get();
    if (rentCat) {
      updateCatColor.run('#B45309', '🏢', rentCat.id);
      console.log(`🏢 Synced "ค่าเช่า/ค่าหอพัก" color to #B45309`);
    }

  } catch (err) {
    console.error('⚠️ IT Category Migration error:', err.message);
  }
};

module.exports = { initSchema };

