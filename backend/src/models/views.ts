import db from '../config/db';

// ยอดเงินแบบมีเครื่องหมาย: แถว "ขาย" (เงินกลับจากการลงทุน) เป็นลบ — ทำให้ออมสุทธิ = ซื้อ − ขาย
const SIGNED_AMOUNT = "CASE WHEN t.trade_side = 'sell' THEN -t.amount ELSE t.amount END";

export const VIEWS_SQL = `
  CREATE VIEW IF NOT EXISTS v_monthly_summary AS
  SELECT 
    strftime('%Y-%m', t.date) as month,
    SUM(CASE WHEN cg.type = 'income' THEN t.amount ELSE 0 END) as income_satang,
    SUM(CASE WHEN cg.type = 'expense' THEN t.amount ELSE 0 END) as expense_satang,
    SUM(CASE WHEN cg.type = 'savings' THEN ${SIGNED_AMOUNT} ELSE 0 END) as savings_satang
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
  WHERE t.is_deleted = 0
  GROUP BY month;

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

  CREATE VIEW IF NOT EXISTS v_category_monthly AS
  SELECT 
    strftime('%Y-%m', t.date) as month,
    c.id as category_id,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    cg.id as group_id,
    cg.type as group_type,
    SUM(CASE WHEN cg.type = 'savings' THEN ${SIGNED_AMOUNT} ELSE t.amount END) as amount_satang
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
  WHERE t.is_deleted = 0
  GROUP BY month, c.id;
`;

// Recreates views after schema migrations
export const recreateViews = (): void => {
  try {
    db.exec(VIEWS_SQL);
  } catch (e: any) {
    console.warn('[WARN] Error creating views:', e.message);
  }
};

// Recreates indexes and triggers after schema migrations
export const recreateTriggersAndIndexes = (): void => {
  try {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_transactions_updated_at 
      AFTER UPDATE ON transactions
      FOR EACH ROW
      BEGIN
        UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
      END;

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

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_deleted ON transactions(category_id, is_deleted);
      CREATE INDEX IF NOT EXISTS idx_calendar_days_day_type ON calendar_days(day_type_id);
    `);
  } catch (e: any) {
    console.warn('[WARN] Error creating triggers/indexes:', e.message);
  }
};
