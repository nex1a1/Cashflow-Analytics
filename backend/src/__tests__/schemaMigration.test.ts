import { describe, it, expect, afterAll, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

// db.ts opens its file at import time, so this test points DB_PATH at a throwaway legacy file BEFORE a
// fresh import and restores it afterwards (all backend test files share one process).
describe('migrateTablesToStrict', () => {
  const file = path.join(os.tmpdir(), `test-fix-migration-${Date.now()}.db`);
  const savedPath = process.env.DB_PATH;

  afterAll(() => {
    if (savedPath === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = savedPath;
    vi.resetModules();
    fs.rmSync(file, { force: true });
  });

  it('keeps note_icon when it rebuilds a legacy (non-STRICT) calendar_days table', async () => {
    const legacy = new Database(file);
    legacy.exec(`
      CREATE TABLE cashflow_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, allocation_type TEXT DEFAULT 'want', order_index INTEGER DEFAULT 0, color TEXT, icon TEXT, highlight_bg INTEGER DEFAULT 0);
      CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, order_index INTEGER DEFAULT 0, cashflow_group_id TEXT NOT NULL);
      CREATE TABLE day_types (id TEXT PRIMARY KEY, name TEXT NOT NULL, label TEXT NOT NULL, color TEXT, order_index INTEGER DEFAULT 0);
      CREATE TABLE calendar_days (date TEXT PRIMARY KEY, day_type_id TEXT NOT NULL, note TEXT, note_icon TEXT);
      CREATE TABLE transactions (id TEXT PRIMARY KEY, date TEXT NOT NULL, description TEXT, amount INTEGER NOT NULL, category_id TEXT NOT NULL, allocation_type TEXT, is_deleted INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO day_types (id, name, label, order_index) VALUES ('dt1', 'workday', 'ทำงาน', 1);
      INSERT INTO calendar_days VALUES ('2026-10-01', 'dt1', 'วันเกิด', 'cake');
    `);
    legacy.close();

    process.env.DB_PATH = file;
    vi.resetModules();
    const { default: db } = await import('../config/db');
    expect(db.name).toBe(file); // never run a migration on the real database
    const { initSchema } = await import('../models/schema');
    initSchema();

    const cols = (db.prepare('PRAGMA table_info(calendar_days)').all() as { name: string }[]).map(c => c.name);
    expect(cols).toContain('note_icon');
    expect(db.prepare("SELECT note, note_icon FROM calendar_days WHERE date = '2026-10-01'").get())
      .toEqual({ note: 'วันเกิด', note_icon: 'cake' });
    db.close();
  });
});
