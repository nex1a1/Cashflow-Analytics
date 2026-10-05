import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../config/db';
import { initSchema } from '../models/schema';
import transactionService from '../services/transactionService';
import categoryService from '../services/categoryService';
import groupService from '../services/groupService';
import dayTypeService from '../services/dayTypeService';
import { ApiError } from '../middleware/ApiError';
import { upsertTransactionSchema } from '../validations/transactionValidation';

// Regression tests for the 2026-10-04 bug audit. Own groups/categories (prefix test-fix-), never real data.
const G = { inc: 'test-fix-g-inc', need: 'test-fix-g-need', sav: 'test-fix-g-sav', empty: 'test-fix-g-empty' };
const C = { inc: 'test-fix-c-inc', food: 'test-fix-c-food', sav: 'test-fix-c-sav', other: 'test-fix-c-other' };
const DT = { used: 'test-fix-dt-used', free: 'test-fix-dt-free' };

const post = (rows: unknown[]) => transactionService.upsertMany(upsertTransactionSchema.parse(rows) as any[]);
const alloc = (id: string) => (db.prepare('SELECT allocation_type a FROM transactions WHERE id = ?').get(id) as { a: string | null }).a;
const count = (table: string) => (db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;

function apiError(fn: () => unknown, status: number): ApiError {
  try { fn(); } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).status).toBe(status);
    return e as ApiError;
  }
  throw new Error('expected ApiError ' + status + ' but nothing was thrown');
}

const cleanup = () => {
  db.prepare("DELETE FROM transactions WHERE id LIKE 'test-fix-%'").run();
  db.prepare("DELETE FROM calendar_days WHERE day_type_id LIKE 'test-fix-%'").run();
  db.prepare("DELETE FROM day_types WHERE id LIKE 'test-fix-%'").run();
  db.prepare("DELETE FROM categories WHERE id LIKE 'test-fix-%' OR name LIKE 'test-fix-%'").run();
  db.prepare("DELETE FROM cashflow_groups WHERE id LIKE 'test-fix-%'").run();
};

describe('audit regressions', () => {
  beforeAll(() => {
    initSchema();
    cleanup();
    const g = db.prepare('INSERT INTO cashflow_groups (id, name, type, allocation_type, order_index) VALUES (?, ?, ?, ?, ?)');
    g.run(G.inc, 'test-fix รายรับ', 'income', null, 901);
    g.run(G.need, 'test-fix ค่ากิน', 'expense', 'need', 902);
    g.run(G.sav, 'test-fix ออม', 'savings', 'savings', 903);
    g.run(G.empty, 'test-fix ว่าง', 'expense', 'want', 904);
    const c = db.prepare('INSERT INTO categories (id, name, cashflow_group_id) VALUES (?, ?, ?)');
    c.run(C.inc, 'test-fix-income', G.inc);
    c.run(C.food, 'test-fix-food', G.need);
    c.run(C.sav, 'test-fix-savings', G.sav);
    c.run(C.other, 'test-fix-other', G.need);
    const d = db.prepare('INSERT INTO day_types (id, name, label, order_index) VALUES (?, ?, ?, ?)');
    d.run(DT.used, 'test-fix-used', 'test-fix ใช้อยู่', 901);
    d.run(DT.free, 'test-fix-free', 'test-fix ว่าง', 902);
    db.prepare('INSERT INTO calendar_days (date, day_type_id) VALUES (?, ?)').run('2099-01-01', DT.used);
  });
  afterAll(cleanup);

  describe('allocation_type default (CSV import sends none)', () => {
    it("falls back to the group's allocation instead of 'want'", () => {
      post([
        { id: 'test-fix-a1', date: '2099-01-05', category_id: C.food, description: 'x', amount: 60 },
        { id: 'test-fix-a2', date: '2099-01-05', category_id: C.sav, description: 'x', amount: 500 },
      ]);
      expect(alloc('test-fix-a1')).toBe('need');
      expect(alloc('test-fix-a2')).toBe('savings');
    });

    it('keeps an explicit allocation_type', () => {
      post([{ id: 'test-fix-a3', date: '2099-01-05', category_id: C.food, description: 'x', amount: 60, allocation_type: 'want' }]);
      expect(alloc('test-fix-a3')).toBe('want');
    });
  });

  describe('suggestCategory / predict', () => {
    it('never creates categories (predict is read-only)', () => {
      const before = count('categories');
      expect(transactionService.suggestCategory('Netflix เดือนนี้')).toBeNull();
      expect(count('categories')).toBe(before);
    });

    it('still answers from the user history', () => {
      post([{ id: 'test-fix-h1', date: '2099-01-06', category_id: C.food, description: 'test-fix ข้าวมันไก่ร้านประจำ', amount: 50 }]);
      expect(transactionService.suggestCategory('test-fix ข้าวมันไก่ร้านประจำ')).toBe(C.food);
    });
  });

  describe('category given by name (import)', () => {
    it('rejects an unknown name with 400 and creates nothing', () => {
      const before = count('categories');
      apiError(() => post([{ id: 'test-fix-n1', date: '2099-01-07', category: 'test-fix-หมวดที่ไม่มี', description: 'x', amount: 10 }]), 400);
      expect(count('categories')).toBe(before);
    });

    it('resolves an existing name', () => {
      post([{ id: 'test-fix-n2', date: '2099-01-07', category: 'test-fix-food', description: 'x', amount: 10 }]);
      expect((db.prepare("SELECT category_id c FROM transactions WHERE id = 'test-fix-n2'").get() as { c: string }).c).toBe(C.food);
    });
  });

  describe('date validation', () => {
    it.each(['1/2', '2026-02-30', 'abc', '5/10/26', '', '2026-1-5'])('rejects %j with 400', (date) => {
      apiError(() => post([{ id: 'test-fix-d0', date, category_id: C.food, description: 'x', amount: 1 }]), 400);
      expect(db.prepare("SELECT 1 FROM transactions WHERE id = 'test-fix-d0'").get()).toBeUndefined();
    });

    it.each([
      ['5/10/2026', '2026-10-05'],
      ['05/10/2026', '2026-10-05'],
      ['5/10/2569', '2026-10-05'],
      ['2569-10-05', '2026-10-05'],
      ['2026-10-05', '2026-10-05'],
    ])('stores %s as %s', (input, expected) => {
      post([{ id: 'test-fix-d1', date: input, category_id: C.food, description: 'x', amount: 1 }]);
      expect((db.prepare("SELECT date d FROM transactions WHERE id = 'test-fix-d1'").get() as { d: string }).d).toBe(expected);
    });

    it('rolls back the whole batch when one row has a bad date', () => {
      apiError(() => post([
        { id: 'test-fix-d2', date: '2099-02-01', category_id: C.food, description: 'x', amount: 1 },
        { id: 'test-fix-d3', date: '1/2', category_id: C.food, description: 'x', amount: 1 },
      ]), 400);
      expect(db.prepare("SELECT 1 FROM transactions WHERE id IN ('test-fix-d2','test-fix-d3')").get()).toBeUndefined();
    });
  });

  describe('search (Thai has no spaces, FTS5 only matches word starts)', () => {
    beforeAll(() => {
      post([{ id: 'test-fix-s1', date: '2099-03-01', category_id: C.food, description: 'ข้าวมันไก่ test-fix', amount: 50 }]);
    });
    const hit = (q: string) => transactionService.search(q).some((r: any) => r.id === 'test-fix-s1');

    it('finds a word start (FTS path)', () => expect(hit('ข้าวมัน')).toBe(true));
    it('finds a word in the middle', () => expect(hit('มันไก่')).toBe(true));
    it('finds the last syllable', () => expect(hit('ไก่')).toBe(true));
    it('treats % and _ literally', () => expect(hit('%')).toBe(false));
  });

  describe('getAll ordering', () => {
    it('keeps entry order for rows of the same date', () => {
      post([
        { id: 'test-fix-o9', date: '2099-04-01', category_id: C.food, description: 'first', amount: 1 },
        { id: 'test-fix-o1', date: '2099-04-01', category_id: C.food, description: 'second', amount: 1 },
        { id: 'test-fix-o5', date: '2099-04-01', category_id: C.food, description: 'third', amount: 1 },
      ]);
      const ids = transactionService.getAll('2099-04-01', '2099-04-01').map(r => r.id);
      expect(ids).toEqual(['test-fix-o9', 'test-fix-o1', 'test-fix-o5']);
    });
  });

  describe('deleting a category', () => {
    it('is refused (409) while it still has live rows, and keeps them', () => {
      post([{ id: 'test-fix-k1', date: '2020-01-01', category_id: C.other, description: 'old history', amount: 100 }]);
      apiError(() => categoryService.delete(C.other), 409);
      expect(db.prepare("SELECT 1 FROM transactions WHERE id = 'test-fix-k1' AND is_deleted = 0").get()).toBeDefined();
      expect(categoryService.getById(C.other)).toBeDefined();
    });

    it('works once the rows are deleted (soft-deleted leftovers go with it)', () => {
      transactionService.delete('test-fix-k1');
      categoryService.delete(C.other);
      expect(categoryService.getById(C.other)).toBeUndefined();
      expect(db.prepare("SELECT 1 FROM transactions WHERE id = 'test-fix-k1'").get()).toBeUndefined();
    });
  });

  describe('deleting a group / day type that is still in use', () => {
    it('refuses a group that has categories with 409 and a readable message', () => {
      const e = apiError(() => groupService.delete(G.need), 409);
      expect(e.message).toMatch(/หมวดหมู่/);
      expect(db.prepare('SELECT 1 FROM cashflow_groups WHERE id = ?').get(G.need)).toBeDefined();
    });
    it('deletes an empty group', () => {
      groupService.delete(G.empty);
      expect(db.prepare('SELECT 1 FROM cashflow_groups WHERE id = ?').get(G.empty)).toBeUndefined();
    });
    it('refuses a day type used by the calendar with 409', () => {
      const e = apiError(() => dayTypeService.delete(DT.used), 409);
      expect(e.message).toMatch(/ปฏิทิน/);
    });
    it('deletes an unused day type', () => {
      dayTypeService.delete(DT.free);
      expect(db.prepare('SELECT 1 FROM day_types WHERE id = ?').get(DT.free)).toBeUndefined();
    });
  });
});
