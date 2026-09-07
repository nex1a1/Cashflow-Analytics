import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../config/db';
import { initSchema } from '../models/schema';
import transactionService from '../services/transactionService';

describe('transactionService', () => {
  beforeAll(() => {
    initSchema();
  });

  const testTxId1 = 'test-tx-uuid-1';
  const testTxId2 = 'test-tx-uuid-2';
  const testTxId3 = 'test-tx-uuid-3';

  afterAll(() => {
    // Clean up test transactions from database
    db.prepare('DELETE FROM transactions WHERE id IN (?, ?, ?)').run(testTxId1, testTxId2, testTxId3);
  });

  it('upserts transactions and stores amount as satang integer', () => {
    transactionService.upsertMany([
      {
        id: testTxId1,
        date: '2026-09-01',
        description: 'Shark Test Income Salary',
        amount: 50000.50, // 50,000.50 Baht = 5,000,050 Satang
        category: 'เงินเดือน',
        allocation_type: null,
      },
      {
        id: testTxId2,
        date: '2026-09-15',
        description: 'Shark Test Food Expense',
        amount: 350.25, // 350.25 Baht = 35,025 Satang
        category: 'อาหาร',
        allocation_type: 'want',
      },
      {
        id: testTxId3,
        date: '2026-10-05',
        description: 'Shark Test Oct Expense',
        amount: 1000,
        category: 'อาหาร',
        allocation_type: 'need',
      }
    ]);

    const row1 = db.prepare('SELECT * FROM transactions WHERE id = ?').get(testTxId1) as any;
    expect(row1).toBeDefined();
    expect(row1.amount).toBe(5000050); // Satang integer
    expect(row1.is_deleted).toBe(0);

    const row2 = db.prepare('SELECT * FROM transactions WHERE id = ?').get(testTxId2) as any;
    expect(row2).toBeDefined();
    expect(row2.amount).toBe(35025);
    expect(row2.allocation_type).toBe('want');
  });

  it('retrieves transactions filtered by date range', () => {
    const sepTransactions = transactionService.getAll('2026-09-01', '2026-09-30');
    const ids = sepTransactions.map(t => t.id);

    expect(ids).toContain(testTxId1);
    expect(ids).toContain(testTxId2);
    expect(ids).not.toContain(testTxId3); // Oct transaction must not be included
  });

  it('performs FTS5 search on transaction descriptions', () => {
    const searchResults = transactionService.search('Salary');
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
    expect(searchResults.some(r => r.id === testTxId1)).toBe(true);
  });

  it('deletes transactions by month using index-friendly date range query', () => {
    // Delete month 2026-09
    transactionService.deleteByMonth('2026-09');

    const row1 = db.prepare('SELECT is_deleted FROM transactions WHERE id = ?').get(testTxId1) as any;
    const row2 = db.prepare('SELECT is_deleted FROM transactions WHERE id = ?').get(testTxId2) as any;
    const row3 = db.prepare('SELECT is_deleted FROM transactions WHERE id = ?').get(testTxId3) as any;

    expect(row1.is_deleted).toBe(1); // 2026-09 marked deleted
    expect(row2.is_deleted).toBe(1); // 2026-09 marked deleted
    expect(row3.is_deleted).toBe(0); // 2026-10 remains active
  });

  it('deletes a single transaction by id', () => {
    transactionService.delete(testTxId3);
    const row3 = db.prepare('SELECT is_deleted FROM transactions WHERE id = ?').get(testTxId3) as any;
    expect(row3.is_deleted).toBe(1);
  });

  describe('SQLite STRICT Mode Verification (Issue #13)', () => {
    it('ensures all core application tables are defined with STRICT mode', () => {
      const coreTables = ['settings', 'cashflow_groups', 'categories', 'day_types', 'calendar_days', 'transactions'];
      
      for (const table of coreTables) {
        const row = db.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = ?").get(table) as { sql: string } | undefined;
        expect(row, `Table ${table} should exist in sqlite_schema`).toBeDefined();
        expect(row?.sql, `Table ${table} schema definition must contain STRICT`).toMatch(/\bstrict\b/i);
      }
    });

    it('strictly rejects incorrect data types at storage engine level', () => {
      // Trying to insert a string into integer column (amount) must be rejected by SQLite STRICT
      expect(() => {
        db.prepare(`
          INSERT INTO transactions (id, date, description, amount, category_id)
          VALUES ('test-strict-err', '2026-09-01', 'Invalid', 'NOT_AN_INTEGER', 'cat_salary')
        `).run();
      }).toThrow();
    });
  });
});
