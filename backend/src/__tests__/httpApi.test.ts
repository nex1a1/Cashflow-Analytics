import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// End-to-end HTTP tests: real Express stack (json parser → auditLogger → /api routes → errorHandler), real SQLite.
// The file gets its OWN database + backup folder (env is set before the app modules are imported), so unlike the
// service tests it can safely exercise DELETE /reset-all and POST /backup without touching any real data.
// server.ts itself is not imported (it listens, backs up and traps signals on load), so helmet/CORS are not covered here.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'http-api-test-'));
const dbFile = path.join(tmp, 'http.db');
const backupDir = path.join(tmp, 'backups');
const savedEnv = { DB_PATH: process.env.DB_PATH, BACKUP_DIR: process.env.BACKUP_DIR };

let server: Server;
let base = '';
let logs: string[] = [];

type Res = { status: number; json: any };
async function api(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const hasBody = body !== undefined;
  const res = await fetch(base + url, {
    method,
    headers: hasBody ? { 'content-type': 'application/json', ...headers } : headers,
    body: !hasBody ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = text;
  try { json = JSON.parse(text); } catch { /* not JSON (never expected from this API) */ }
  return { status: res.status, json };
}
const get = (url: string) => api('GET', url);
const post = (url: string, body?: unknown) => api('POST', url, body);
const del = (url: string, headers?: Record<string, string>) => api('DELETE', url, undefined, headers);

// Fixture ids (created through the API itself in beforeAll)
const G = { inc: 'http-g-inc', exp: 'http-g-exp', sav: 'http-g-sav', empty: 'http-g-empty' };
const C = { inc: 'http-c-inc', food: 'http-c-food', sav: 'http-c-sav', spare: 'http-c-spare' };
const DT = { a: 'http-dt-a', b: 'http-dt-b' };
const RANGE_MAY = '?startDate=2099-05-01&endDate=2099-05-31';

const tx = (id: string, date: string, category_id: string, amount: number, description = id, extra: object = {}) =>
  ({ id, date, category_id, amount, description, ...extra });

beforeAll(async () => {
  process.env.DB_PATH = dbFile;
  process.env.BACKUP_DIR = backupDir;
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });

  const db = (await import('../config/db')).default;
  // Hard stop: never write anything unless the app really is on the throwaway database.
  if (path.resolve(db.name) !== path.resolve(dbFile)) throw new Error(`HTTP tests would use ${db.name}, expected ${dbFile}`);

  const { initSchema } = await import('../models/schema');
  const express = (await import('express')).default;
  const apiRoutes = (await import('../routes/api')).default;
  const { auditLogger } = await import('../middleware/auditLogger');
  const { errorHandler } = await import('../middleware/errorHandler');
  initSchema();

  const app = express();
  app.use(express.json({ limit: '5mb' })); // same stack and limit as server.ts
  app.use(auditLogger);
  app.use('/api', apiRoutes);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>(r => server.once('listening', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const must = async (r: Promise<Res>) => { const x = await r; if (x.status !== 200) throw new Error(`fixture failed: ${x.status} ${JSON.stringify(x.json)}`); };
  await must(post('/api/groups', { id: G.inc, name: 'http รายรับ', type: 'income', order_index: 9001 }));
  await must(post('/api/groups', { id: G.exp, name: 'http รายจ่าย', type: 'expense', allocation_type: 'need', order_index: 9002 }));
  await must(post('/api/groups', { id: G.sav, name: 'http ลงทุน', type: 'savings', order_index: 9003 }));
  await must(post('/api/groups', { id: G.empty, name: 'http ว่าง', type: 'expense', order_index: 9004 }));
  await must(post('/api/categories', { id: C.inc, name: 'http-income', cashflow_group_id: G.inc }));
  await must(post('/api/categories', { id: C.food, name: 'http-food', cashflow_group_id: G.exp }));
  await must(post('/api/categories', { id: C.sav, name: 'http-savings', cashflow_group_id: G.sav }));
  await must(post('/api/categories', { id: C.spare, name: 'http-spare', cashflow_group_id: G.exp }));
  await must(post('/api/day-types', { id: DT.a, name: 'http-a', label: 'http วัน A', order_index: 9001 }));
  await must(post('/api/day-types', { id: DT.b, name: 'http-b', label: 'http วัน B', order_index: 9002 }));
});

afterAll(async () => {
  await new Promise<void>(r => (server ? server.close(() => r()) : r()));
  vi.restoreAllMocks();
  for (const k of ['DB_PATH', 'BACKUP_DIR'] as const) {
    if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k];
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('error pipeline (body parser → errorHandler)', () => {
  it('rejects malformed JSON with 400 instead of 500', async () => {
    const r = await api('POST', '/api/settings', '{"key": ');
    expect(r.status).toBe(400);
    expect(r.json.error).toBe('รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง');
  });

  it('rejects a body over the 5mb limit with 413', async () => {
    const r = await post('/api/settings', { key: 'big', value: 'x'.repeat(5 * 1024 * 1024 + 10) });
    expect(r.status).toBe(413);
    expect(r.json.error).toContain('ใหญ่เกินไป');
  });

  it('sends Zod issues as `details` on a validation error', async () => {
    const r = await post('/api/settings', {});
    expect(r.status).toBe(400);
    expect(r.json.error).toBe('Validation Error');
    expect(Array.isArray(r.json.details)).toBe(true);
    expect(r.json.details.length).toBeGreaterThan(0);
  });
});

describe('audit logger', () => {
  it('writes one [AUDIT] line for a mutation and [AUDIT ERROR] for a failed request', async () => {
    logs = [];
    await post('/api/settings', { key: 'audit-probe', value: 1 });
    await post('/api/settings', {});
    await new Promise(r => setTimeout(r, 20)); // 'finish' fires after the response is flushed
    expect(logs.some(l => /^\[AUDIT\] .*POST \/api\/settings - HTTP 200 .*\[คำสั่งตั้งค่า\] อัปเดตการตั้งค่า audit-probe/.test(l))).toBe(true);
    expect(logs.some(l => /^\[AUDIT ERROR\] .*POST \/api\/settings - HTTP 400/.test(l))).toBe(true);
  });

  it('stays silent for successful reads', async () => {
    logs = [];
    await get('/api/settings');
    await new Promise(r => setTimeout(r, 20));
    expect(logs.filter(l => l.includes('/api/settings'))).toEqual([]);
  });
});

describe('settings', () => {
  it('round-trips objects, and keeps numeric-looking strings as strings', async () => {
    expect((await post('/api/settings', { key: 'http-budget', value: { g1: 500000 } })).status).toBe(200);
    expect((await post('/api/settings', { key: 'http-str', value: '123' })).status).toBe(200);
    const s = (await get('/api/settings')).json;
    expect(s['http-budget']).toEqual({ g1: 500000 });
    expect(s['http-str']).toBe('123');
  });

  it('upserts instead of duplicating', async () => {
    await post('/api/settings', { key: 'http-dup', value: 1 });
    await post('/api/settings', { key: 'http-dup', value: 2 });
    expect((await get('/api/settings')).json['http-dup']).toBe(2);
  });

  it('rejects an empty key', async () => {
    expect((await post('/api/settings', { key: '', value: 1 })).status).toBe(400);
  });
});

describe('groups', () => {
  it('lists groups with highlightBg as a boolean and no allocation for income', async () => {
    const list = (await get('/api/groups')).json as any[];
    const inc = list.find(g => g.id === G.inc);
    const exp = list.find(g => g.id === G.exp);
    expect(inc.allocation_type).toBeNull();
    expect(exp.allocation_type).toBe('need');
    expect(typeof exp.highlightBg).toBe('boolean');
  });

  it('forces savings groups to the savings allocation', async () => {
    const sav = ((await get('/api/groups')).json as any[]).find(g => g.id === G.sav);
    expect(sav.allocation_type).toBe('savings');
  });

  it('rejects an unknown group type with a detail on `type`', async () => {
    const r = await post('/api/groups', { id: 'http-g-bad', name: 'bad', type: 'bogus' });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.json.details)).toContain('type');
  });

  it('refuses to delete a group that still has categories (409), then deletes an empty one', async () => {
    const blocked = await del(`/api/groups/${G.exp}`);
    expect(blocked.status).toBe(409);
    expect(blocked.json.error).toContain('หมวดหมู่');
    expect((await del(`/api/groups/${G.empty}`)).status).toBe(200);
    expect(((await get('/api/groups')).json as any[]).some(g => g.id === G.empty)).toBe(false);
  });
});

describe('categories', () => {
  it('lists categories with their group type', async () => {
    const food = ((await get('/api/categories')).json as any[]).find(c => c.id === C.food);
    expect(food.group_type).toBe('expense');
    expect(food.allocation_type).toBe('need');
  });

  it('requires a name and a group', async () => {
    expect((await post('/api/categories', { cashflow_group_id: G.exp })).status).toBe(400);
    expect((await post('/api/categories', { name: 'no group' })).status).toBe(400);
  });

  it('maps an unknown group to 409 (foreign key), not 500', async () => {
    const r = await post('/api/categories', { name: 'orphan', cashflow_group_id: 'http-g-nope' });
    expect(r.status).toBe(409);
  });

  it('refuses to delete a category with live rows, but deletes an unused one', async () => {
    expect((await post('/api/transactions', tx('http-cat-live', '2099-04-01', C.spare, 10))).status).toBe(200);
    const blocked = await del(`/api/categories/${C.spare}`);
    expect(blocked.status).toBe(409);
    expect(blocked.json.error).toContain('ยังมี');

    expect((await post('/api/categories', { id: 'http-c-tmp', name: 'http-tmp', cashflow_group_id: G.exp })).status).toBe(200);
    expect((await del('/api/categories/http-c-tmp')).status).toBe(200);
    expect(((await get('/api/categories')).json as any[]).some(c => c.id === 'http-c-tmp')).toBe(false);
  });
});

describe('day types and calendar', () => {
  it('validates day types', async () => {
    expect((await post('/api/day-types', { id: 'http-dt-bad' })).status).toBe(400); // label required
    expect((await post('/api/day-types', { label: 'no id' })).status).toBe(400);
    expect(((await get('/api/day-types')).json as any[]).some(d => d.id === DT.a)).toBe(true);
  });

  it('saves a day with note + icon and returns the joined type label', async () => {
    expect((await post('/api/calendar', { date: '2099-05-05', type_id: DT.a, note: 'วันเกิด', note_icon: 'cake' })).status).toBe(200);
    const day = ((await get('/api/calendar')).json as any[]).find(d => d.date === '2099-05-05');
    expect(day).toMatchObject({ type_id: DT.a, note: 'วันเกิด', note_icon: 'cake', type_label: 'http วัน A' });
  });

  it('keeps the note when only the day type changes, and clears note + icon with an empty note', async () => {
    await post('/api/calendar', { date: '2099-05-05', type_id: DT.b });
    let day = ((await get('/api/calendar')).json as any[]).find(d => d.date === '2099-05-05');
    expect(day).toMatchObject({ type_id: DT.b, note: 'วันเกิด', note_icon: 'cake' });

    await post('/api/calendar', { date: '2099-05-05', type_id: DT.b, note: '' });
    day = ((await get('/api/calendar')).json as any[]).find(d => d.date === '2099-05-05');
    expect(day.note).toBe('');
    expect(day.note_icon).toBe('');
  });

  it('rejects a bad date, an empty type, and over-long note / icon', async () => {
    expect((await post('/api/calendar', { date: '5/5/2099', type_id: DT.a })).status).toBe(400);
    expect((await post('/api/calendar', { date: '2099-05-06', type_id: '' })).status).toBe(400);
    expect((await post('/api/calendar', { date: '2099-05-06', type_id: DT.a, note: 'ก'.repeat(201) })).status).toBe(400);
    expect((await post('/api/calendar', { date: '2099-05-06', type_id: DT.a, note: 'ok', note_icon: 'i'.repeat(41) })).status).toBe(400);
  });

  it('maps an unknown day type to 409 (foreign key), not 500', async () => {
    expect((await post('/api/calendar', { date: '2099-05-07', type_id: 'http-dt-nope' })).status).toBe(409);
  });

  it('refuses to delete a day type the calendar uses (409) and deletes an unused one', async () => {
    const blocked = await del(`/api/day-types/${DT.b}`); // 2099-05-05 uses B
    expect(blocked.status).toBe(409);
    expect(blocked.json.error).toContain('ปฏิทิน');
    expect((await del(`/api/day-types/${DT.a}`)).status).toBe(200); // moved to B above
  });
});

describe('transactions', () => {
  beforeAll(async () => {
    const r = await post('/api/transactions', [
      tx('http-inc1', '2099-05-01', C.inc, 30000, 'เงินเดือน'),
      tx('http-food1', '2099-05-02', C.food, 120.5, 'ข้าวมันไก่'),
      tx('http-food2', '2099-05-03', C.food, 80, 'ก๋วยเตี๋ยว'),
      tx('http-sav1', '2099-05-04', C.sav, 1000, 'ออมเงิน'),
      tx('http-jun1', '2099-06-01', C.food, 55, 'นอกช่วง'),
    ]);
    expect(r.json).toEqual({ success: true, count: 5 });
  });

  it('accepts a single object (not only arrays)', async () => {
    expect((await post('/api/transactions', tx('http-single', '2099-09-01', C.food, 9))).json).toEqual({ success: true, count: 1 });
  });

  it('returns rows for the date range only, in baht, with group + allocation', async () => {
    const rows = (await get(`/api/transactions${RANGE_MAY}`)).json as any[];
    expect(rows.map(r => r.id)).toEqual(['http-inc1', 'http-food1', 'http-food2', 'http-sav1']);
    const food = rows.find(r => r.id === 'http-food1');
    expect(food).toMatchObject({ amount: 120.5, category: 'http-food', group_type: 'expense', allocation_type: 'need', asset_id: null, units: null });
    expect(rows.find(r => r.id === 'http-inc1').allocation_type).toBeNull();
  });

  it('rejects a malformed date range', async () => {
    expect((await get('/api/transactions?startDate=2099-5-1')).status).toBe(400);
    expect((await get('/api/transactions?endDate=tomorrow')).status).toBe(400);
  });

  it('rejects bad input with a readable 400', async () => {
    const noId = await post('/api/transactions', { date: '2099-05-01', category_id: C.food, amount: 1 });
    expect(noId.status).toBe(400);
    expect(noId.json.error).toBe('Validation Error');

    const badDate = await post('/api/transactions', tx('http-bad1', '2099-02-30', C.food, 1));
    expect(badDate.status).toBe(400);
    expect(badDate.json.error).toContain('วันที่ไม่ถูกต้อง');

    const noCat = await post('/api/transactions', { id: 'http-bad2', date: '2099-05-01', category: 'ไม่มีหมวดนี้', amount: 1 });
    expect(noCat.status).toBe(400);
    expect(noCat.json.error).toContain('ไม่พบหมวดหมู่');

    const negExpense = await post('/api/transactions', tx('http-bad3', '2099-05-01', C.food, -5));
    expect(negExpense.status).toBe(400);
    expect(negExpense.json.error).toContain('ติดลบ');
  });

  it('is atomic: one bad row in a batch saves none of them', async () => {
    const r = await post('/api/transactions', [
      tx('http-atomic-ok', '2099-10-01', C.food, 5),
      tx('http-atomic-bad', 'not-a-date', C.food, 5),
    ]);
    expect(r.status).toBe(400);
    const rows = (await get('/api/transactions?startDate=2099-10-01&endDate=2099-10-31')).json as any[];
    expect(rows).toEqual([]);
  });

  it('accepts D/M/YYYY dates and Buddhist years', async () => {
    const saved = await post('/api/transactions', [tx('http-dmy', '3/11/2099', C.food, 1), tx('http-be', '04/11/2642', C.food, 2)]); // 2642 BE = 2099
    expect(saved.status).toBe(200);
    const rows = (await get('/api/transactions?startDate=2099-11-01&endDate=2099-11-30')).json as any[];
    expect(rows.map(r => r.date)).toEqual(['2099-11-03', '2099-11-04']);
  });

  it('upserts by id', async () => {
    await post('/api/transactions', tx('http-food2', '2099-05-03', C.food, 85, 'ก๋วยเตี๋ยว'));
    const row = ((await get(`/api/transactions${RANGE_MAY}`)).json as any[]).find(r => r.id === 'http-food2');
    expect(row.amount).toBe(85);
    await post('/api/transactions', tx('http-food2', '2099-05-03', C.food, 80, 'ก๋วยเตี๋ยว'));
  });

  it('count equals the number of live rows, periods lists the months', async () => {
    const all = (await get('/api/transactions')).json as any[];
    expect((await get('/api/transactions/count')).json).toEqual({ count: all.length });
    const periods = (await get('/api/transactions/periods')).json as string[];
    expect(periods).toContain('2099-05');
    expect(periods).toEqual([...periods].sort().reverse());
  });

  it('soft-deletes one row (404 for an unknown id) and re-posting the same id restores it', async () => {
    expect((await del('/api/transactions/http-food2')).json).toEqual({ success: true });
    let rows = (await get(`/api/transactions${RANGE_MAY}`)).json as any[];
    expect(rows.some(r => r.id === 'http-food2')).toBe(false);

    expect((await del('/api/transactions/http-no-such-row')).status).toBe(404);

    await post('/api/transactions', tx('http-food2', '2099-05-03', C.food, 80, 'ก๋วยเตี๋ยว')); // the "undo" path
    rows = (await get(`/api/transactions${RANGE_MAY}`)).json as any[];
    expect(rows.some(r => r.id === 'http-food2')).toBe(true);
  });

  it('deletes a whole calendar month and validates the month', async () => {
    await post('/api/transactions', [tx('http-aug1', '2099-08-01', C.food, 1), tx('http-aug2', '2099-08-31', C.food, 2), tx('http-sep1', '2099-09-01', C.food, 3)]);
    const r = await del('/api/transactions/month/2099-08');
    expect(r.status).toBe(200);
    expect(r.json.affected).toBe(2);
    expect(((await get('/api/transactions?startDate=2099-08-01&endDate=2099-08-31')).json as any[])).toEqual([]);
    expect(((await get('/api/transactions?startDate=2099-09-01&endDate=2099-09-30')).json as any[]).some(x => x.id === 'http-sep1')).toBe(true);
    expect((await del('/api/transactions/month/2099-8')).status).toBe(400);
  });

  describe('search', () => {
    it('finds a word prefix and a Thai substring (FTS cannot split Thai, falls back to LIKE)', async () => {
      const prefix = (await get('/api/transactions/search?q=' + encodeURIComponent('ข้าว'))).json as any[];
      expect(prefix.some(r => r.id === 'http-food1')).toBe(true);
      const mid = (await get('/api/transactions/search?q=' + encodeURIComponent('มันไก่'))).json as any[];
      expect(mid.some(r => r.id === 'http-food1')).toBe(true);
      expect(mid.find(r => r.id === 'http-food1').amount).toBe(120.5);
    });

    it('also matches the category name', async () => {
      const rows = (await get('/api/transactions/search?q=http-food')).json as any[];
      expect(rows.some(r => r.id === 'http-food1')).toBe(true);
    });

    it('does not break on quotes / FTS operators, and returns [] for empty or unmatched', async () => {
      for (const q of ['"', "'", 'a OR', '*', '(', 'ข้าว"']) {
        expect((await get('/api/transactions/search?q=' + encodeURIComponent(q))).status).toBe(200);
      }
      expect((await get('/api/transactions/search?q=')).json).toEqual([]);
      expect((await get('/api/transactions/search?q=zzzz-no-such-text')).json).toEqual([]);
    });

    it('rejects a query over 200 characters', async () => {
      expect((await get('/api/transactions/search?q=' + 'a'.repeat(201))).status).toBe(400);
    });
  });

  describe('predict + frequent', () => {
    it('predicts the category from history and answers null for unknown text', async () => {
      const r = await post('/api/transactions/predict', { descriptions: ['ข้าวมันไก่', 'ไม่เคยมีในประวัติเลย'] });
      expect(r.status).toBe(200);
      expect(r.json['ข้าวมันไก่']).toEqual({ id: C.food, name: 'http-food' });
      expect(r.json['ไม่เคยมีในประวัติเลย']).toBeNull();
    });

    it('is read-only: predicting creates no category or row', async () => {
      const before = [(await get('/api/categories')).json.length, (await get('/api/transactions/count')).json.count];
      await post('/api/transactions/predict', { descriptions: ['กาแฟ', 'netflix'] });
      expect([(await get('/api/categories')).json.length, (await get('/api/transactions/count')).json.count]).toEqual(before);
    });

    it('rejects a body that is not an array of strings', async () => {
      expect((await post('/api/transactions/predict', {})).status).toBe(400);
      expect((await post('/api/transactions/predict', { descriptions: 'ข้าว' })).status).toBe(400);
      expect((await post('/api/transactions/predict', { descriptions: ['ok', 5] })).status).toBe(400);
    });

    it('lists frequent items in baht', async () => {
      const r = await get('/api/transactions/frequent');
      expect(r.status).toBe(200);
      const item = (r.json as any[]).find(i => i.description === 'ก๋วยเตี๋ยว');
      expect(item).toMatchObject({ categoryId: C.food, amount: 80 });
    });
  });
});

describe('analytics', () => {
  it('summarises one month from the views (income / expense / savings in baht)', async () => {
    const r = await get('/api/analytics' + RANGE_MAY);
    expect(r.status).toBe(200);
    expect(Object.keys(r.json).sort()).toEqual(['categories', 'monthly', 'summary', 'workLife']);
    expect(r.json.summary).toEqual({ income: 30000, expense: 200.5, savings: 1000 });
    expect(r.json.categories.find((c: any) => c.id === C.food)).toMatchObject({ name: 'http-food', amount: 200.5 });
    const may = r.json.monthly.find((m: any) => m.month === '2099-05');
    expect(may).toMatchObject({ income: 30000, expense: 200.5, savings: 1000 });
    expect(Array.isArray(r.json.workLife)).toBe(true);
  });

  it('answers with zeros for an empty period and 400 for a bad date', async () => {
    const empty = await get('/api/analytics?startDate=2098-01-01&endDate=2098-01-31');
    expect(empty.json.summary).toEqual({ income: 0, expense: 0, savings: 0 });
    expect((await get('/api/analytics?startDate=2099-5-1')).status).toBe(400);
  });
});

describe('portfolio, assets and trades', () => {
  let assetId = '';

  it('validates assets', async () => {
    expect((await post('/api/assets', { name: '   ', kind: 'fund' })).status).toBe(400);
    expect((await post('/api/assets', { name: 'x', kind: 'bogus' })).status).toBe(400);
  });

  it('creates an asset and lists it in the (empty) portfolio', async () => {
    const r = await post('/api/assets', { name: 'กองทุนทดสอบ', kind: 'fund', unit_label: 'หน่วย' });
    expect(r.status).toBe(200);
    assetId = r.json.id;
    expect(assetId).toBeTruthy();
    const p = (await get('/api/portfolio')).json;
    expect(p.assets.find((a: any) => a.id === assetId)).toMatchObject({ name: 'กองทุนทดสอบ', units: 0, price: null, autoPrice: false });
  });

  it('rejects trades without units, with units <= 0, or with an unknown asset', async () => {
    const noUnits = await post('/api/transactions', tx('http-t-bad1', '2099-07-09', C.sav, 100, 'x', { asset_id: assetId }));
    expect(noUnits.status).toBe(400);
    expect(noUnits.json.error).toContain('จำนวนหน่วย');
    expect((await post('/api/transactions', tx('http-t-bad2', '2099-07-09', C.sav, 100, 'x', { asset_id: assetId, units: 0 }))).status).toBe(400);
    const ghost = await post('/api/transactions', tx('http-t-bad3', '2099-07-09', C.sav, 100, 'x', { asset_id: 'http-no-asset', units: 1 }));
    expect(ghost.status).toBe(400);
    expect(ghost.json.error).toContain('ไม่พบสินทรัพย์');
  });

  it('values a buy then a partial sell with weighted-average cost (sell is a negative amount)', async () => {
    expect((await post('/api/transactions', [
      tx('http-t-buy', '2099-07-10', C.sav, 1000, 'ซื้อ', { asset_id: assetId, units: 2 }),
      tx('http-t-sell', '2099-07-11', C.sav, -600, 'ขาย', { asset_id: assetId, units: 1 }),
    ])).status).toBe(200);

    const rows = (await get('/api/transactions?startDate=2099-07-01&endDate=2099-07-31')).json as any[];
    expect(rows.find(r => r.id === 'http-t-buy')).toMatchObject({ amount: 1000, asset_id: assetId, units: 2 });
    expect(rows.find(r => r.id === 'http-t-sell')).toMatchObject({ amount: -600, units: 1 }); // sign = direction

    const a = (await get('/api/portfolio')).json.assets.find((x: any) => x.id === assetId);
    expect(a).toMatchObject({ units: 1, cost: 500, avgCostPerUnit: 500, realized: 100, price: null, marketValue: null });
    expect(a.trades.map((t: any) => t.side)).toEqual(['sell', 'buy']); // newest first
  });

  it('keeps net savings = buys − sells in analytics', async () => {
    const r = await get('/api/analytics?startDate=2099-07-01&endDate=2099-07-31');
    expect(r.json.summary.savings).toBe(400);
    expect(r.json.summary.expense).toBe(0); // investing is not an expense
  });

  it('prices the holding from a manual price and records a snapshot', async () => {
    expect((await post(`/api/assets/${assetId}/price`, { price: '800' })).status).toBe(200); // strings are coerced
    const p = (await get('/api/portfolio')).json;
    const a = p.assets.find((x: any) => x.id === assetId);
    expect(a).toMatchObject({ price: 800, priceSource: 'กรอกเอง', marketValue: 800, unrealized: 300 });
    expect(p.totals).toMatchObject({ cost: 500, marketValue: 800, unrealized: 300, realized: 100 });
    expect(p.generalSavings).toBe(1000); // the plain 'ออมเงิน' row, no asset
    expect(p.history.length).toBeGreaterThan(0);
  });

  it('rejects a non-positive price and answers 404 for an unknown asset', async () => {
    expect((await post(`/api/assets/${assetId}/price`, { price: 0 })).status).toBe(400);
    expect((await post(`/api/assets/${assetId}/price`, { price: -1 })).status).toBe(400);
    expect((await post(`/api/assets/${assetId}/price`, { price: 'abc' })).status).toBe(400);
    expect((await post('/api/assets/http-no-asset/price', { price: 10 })).status).toBe(404);
  });

  it('protects trade rows: group / category cannot leave savings, category and asset cannot be deleted', async () => {
    const group = await post('/api/groups', { id: G.sav, name: 'http ลงทุน', type: 'expense' });
    expect(group.status).toBe(409);
    expect(group.json.error).toContain('รายการซื้อขาย');

    const move = await post('/api/categories', { id: C.sav, name: 'http-savings', cashflow_group_id: G.exp });
    expect(move.status).toBe(409);

    expect((await del(`/api/categories/${C.sav}`)).status).toBe(409);
    expect((await del(`/api/assets/${assetId}`)).status).toBe(409);
  });

  it('rejects a negative amount for a savings row only as a sell, never for a plain expense', async () => {
    expect((await post('/api/transactions', tx('http-t-negexp', '2099-07-12', C.food, -1))).status).toBe(400);
  });

  it('refresh and preview never fail the request for manual-priced kinds (no network involved)', async () => {
    const refresh = await post('/api/prices/refresh');
    expect(refresh.status).toBe(200);
    expect(refresh.json).toEqual({ results: [] }); // the only asset is a manual fund

    const preview = await post('/api/prices/preview', { kind: 'fund', symbol: 'ABC' });
    expect(preview.status).toBe(200);
    expect(preview.json).toMatchObject({ ok: false, manual: true });
    expect((await post('/api/prices/preview', { kind: 'bogus' })).status).toBe(400);
  });

  it('deletes the asset once its trades are deleted', async () => {
    expect((await del('/api/transactions/http-t-buy')).status).toBe(200);
    expect((await del('/api/transactions/http-t-sell')).status).toBe(200);
    expect((await del(`/api/assets/${assetId}`)).json).toEqual({ success: true });
    expect((await get('/api/portfolio')).json.assets.some((a: any) => a.id === assetId)).toBe(false);
  });
});

describe('backup', () => {
  it('creates a dated backup file and lists it', async () => {
    const r = await post('/api/backup');
    expect(r.status).toBe(200);
    expect(r.json.success).toBe(true);
    expect(r.json.filename).toMatch(/^backup-\d{4}-\d{2}-\d{2}\.db$/);
    expect(fs.existsSync(path.join(backupDir, r.json.filename))).toBe(true);

    const list = (await get('/api/backups')).json as any[];
    const f = list.find(x => x.name === r.json.filename);
    expect(f.size).toBeGreaterThan(0);
  });
});

// Last on purpose: wipes the (throwaway) ledger.
describe('reset-all', () => {
  it('refuses without the confirmation header, and deletes nothing', async () => {
    const before = (await get('/api/transactions/count')).json.count;
    expect(before).toBeGreaterThan(0);
    for (const headers of [{}, { 'x-confirm-reset': 'false' }, { 'x-confirm-reset': '1' }]) {
      const r = await del('/api/reset-all', headers);
      expect(r.status).toBe(400);
      expect(r.json.error).toContain('X-Confirm-Reset');
    }
    expect((await get('/api/transactions/count')).json.count).toBe(before);
  });

  it('takes a pre-reset backup first, then clears rows and calendar but keeps groups / categories', async () => {
    const r = await del('/api/reset-all', { 'x-confirm-reset': 'true' });
    expect(r.status).toBe(200);
    expect(r.json.backup).toMatch(/^pre-reset-\d{4}-\d{2}-\d{2}-\d{6}\.db$/);
    expect(fs.existsSync(path.join(backupDir, r.json.backup))).toBe(true);

    expect((await get('/api/transactions/count')).json.count).toBe(0);
    expect((await get('/api/calendar')).json).toEqual([]);
    expect(((await get('/api/groups')).json as any[]).some(g => g.id === G.exp)).toBe(true);
    expect(((await get('/api/categories')).json as any[]).some(c => c.id === C.food)).toBe(true);
    expect((await get('/api/portfolio')).json.history).toEqual([]);
  });
});
