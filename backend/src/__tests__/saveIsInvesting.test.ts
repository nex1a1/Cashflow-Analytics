import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../config/db';
import { initSchema } from '../models/schema';
import transactionService from '../services/transactionService';
import groupService from '../services/groupService';
import { upsertTransactionSchema } from '../validations/transactionValidation';

// SAVE means investing only (2026-10-10): an expense row / expense group is NEED or WANT, a savings-group row is always SAVE.
// Own groups/categories (prefix test-save-), never real data.
const G = { inc: 'test-save-g-inc', need: 'test-save-g-need', want: 'test-save-g-want', sav: 'test-save-g-sav', legacy: 'test-save-g-legacy' };
const C = { inc: 'test-save-c-inc', need: 'test-save-c-need', want: 'test-save-c-want', sav: 'test-save-c-sav', legacy: 'test-save-c-legacy' };

const post = (rows: unknown[]) => transactionService.upsertMany(upsertTransactionSchema.parse(rows) as any[]);
const row = (id: string, category_id: string, allocation_type?: string) =>
  ({ id, date: '2099-02-01', description: id, amount: 100, category_id, ...(allocation_type ? { allocation_type } : {}) });
const alloc = (id: string) => (db.prepare('SELECT allocation_type a FROM transactions WHERE id = ?').get(id) as { a: string | null }).a;
const groupAlloc = (id: string) => (db.prepare('SELECT allocation_type a FROM cashflow_groups WHERE id = ?').get(id) as { a: string | null }).a;

const cleanup = () => {
  db.prepare("DELETE FROM transactions WHERE id LIKE 'test-save-%'").run();
  db.prepare("DELETE FROM categories WHERE id LIKE 'test-save-%'").run();
  db.prepare("DELETE FROM cashflow_groups WHERE id LIKE 'test-save-%'").run();
};

describe('SAVE means investing only', () => {
  beforeAll(() => {
    initSchema();
    cleanup();
    const g = db.prepare('INSERT INTO cashflow_groups (id, name, type, allocation_type, order_index) VALUES (?, ?, ?, ?, ?)');
    g.run(G.inc, 'test-save รายรับ', 'income', null, 951);
    g.run(G.need, 'test-save จำเป็น', 'expense', 'need', 952);
    g.run(G.want, 'test-save ตามใจ', 'expense', 'want', 953);
    g.run(G.sav, 'test-save ลงทุน', 'savings', 'savings', 954);
    g.run(G.legacy, 'test-save กลุ่มเก่า', 'expense', 'savings', 955); // stored before the rule
    const c = db.prepare('INSERT INTO categories (id, name, cashflow_group_id) VALUES (?, ?, ?)');
    c.run(C.inc, 'test-save-income', G.inc);
    c.run(C.need, 'test-save-need', G.need);
    c.run(C.want, 'test-save-want', G.want);
    c.run(C.sav, 'test-save-invest', G.sav);
    c.run(C.legacy, 'test-save-legacy', G.legacy);
  });
  afterAll(cleanup);

  describe('transactions', () => {
    it("an expense row sent as SAVE takes its group's NEED / WANT instead (e.g. a row moved out of an investing category)", () => {
      post([row('test-save-t1', C.need, 'savings'), row('test-save-t2', C.want, 'savings')]);
      expect(alloc('test-save-t1')).toBe('need');
      expect(alloc('test-save-t2')).toBe('want');
    });

    it("an expense row keeps its own NEED / WANT, and without one takes the group's", () => {
      post([row('test-save-t3', C.need, 'want'), row('test-save-t4', C.want, 'need'), row('test-save-t5', C.need)]);
      expect(alloc('test-save-t3')).toBe('want');
      expect(alloc('test-save-t4')).toBe('need');
      expect(alloc('test-save-t5')).toBe('need');
    });

    it('an expense group still stored as SAVE gives its rows WANT', () => {
      post([row('test-save-t6', C.legacy), row('test-save-t7', C.legacy, 'savings')]);
      expect(alloc('test-save-t6')).toBe('want');
      expect(alloc('test-save-t7')).toBe('want');
    });

    it('an investing row is always SAVE, whatever it was sent with; income has none', () => {
      post([row('test-save-t8', C.sav, 'need'), row('test-save-t9', C.sav), row('test-save-t10', C.inc, 'want')]);
      expect(alloc('test-save-t8')).toBe('savings');
      expect(alloc('test-save-t9')).toBe('savings');
      expect(alloc('test-save-t10')).toBeNull();
    });
  });

  describe('groups', () => {
    it('an expense group saved as SAVE becomes WANT (how the picker already shows it); NEED stays NEED', () => {
      groupService.upsert({ id: G.legacy, name: 'test-save กลุ่มเก่า', type: 'expense', allocation_type: 'savings' as any, order_index: 955 });
      expect(groupAlloc(G.legacy)).toBe('want');
      groupService.upsert({ id: G.need, name: 'test-save จำเป็น', type: 'expense', allocation_type: 'need', order_index: 952 });
      expect(groupAlloc(G.need)).toBe('need');
    });

    it('investing groups are always SAVE and income groups have none', () => {
      groupService.upsert({ id: G.sav, name: 'test-save ลงทุน', type: 'savings', allocation_type: 'want', order_index: 954 });
      expect(groupAlloc(G.sav)).toBe('savings');
      groupService.upsert({ id: G.inc, name: 'test-save รายรับ', type: 'income', allocation_type: 'need', order_index: 951 });
      expect(groupAlloc(G.inc)).toBeNull();
    });
  });
});
