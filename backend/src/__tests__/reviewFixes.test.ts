import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../config/db';
import { initSchema } from '../models/schema';
import transactionService from '../services/transactionService';
import assetService from '../services/assetService';
import settingService from '../services/settingService';
import { ApiError } from '../middleware/ApiError';
import { getAllSettings } from '../controllers/settingController';
import { predictCategories } from '../controllers/transactionController';

// Regression tests for the 2026-10-06 code review. Own rows (prefix test-rv-), never real data.
const ASSET = 'test-rv-asset';
const KEY = 'test-rv-setting';

/** Minimal Express res: records status + json body. */
const fakeRes = () => {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (s: number) => { res.statusCode = s; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  return res;
};

const cleanup = () => {
  db.prepare("DELETE FROM transactions WHERE id LIKE 'test-rv-%'").run();
  db.prepare('DELETE FROM price_cache WHERE asset_id = ?').run(ASSET);
  db.prepare('DELETE FROM assets WHERE id = ?').run(ASSET);
  db.prepare('DELETE FROM settings WHERE key = ?').run(KEY);
};

describe('code review regressions', () => {
  beforeAll(() => { initSchema(); cleanup(); });
  afterAll(cleanup);

  it('refuses a row with no category instead of filing it under any "อื่น…" category', () => {
    const before = transactionService.count();
    expect(() => transactionService.upsertMany([
      { id: 'test-rv-t1', date: '2099-02-01', description: 'test-rv ไม่มีประวัติ zzqx', amount: 10 },
    ])).toThrow(ApiError);
    expect(transactionService.count()).toBe(before);
  });

  it('drops the manual price when an asset changes symbol (it priced the old symbol)', () => {
    assetService.upsert({ id: ASSET, name: 'test-rv', kind: 'crypto', symbol: 'BTC' });
    assetService.setManualPrice(ASSET, 2_000_000);
    assetService.upsert({ id: ASSET, name: 'test-rv', kind: 'crypto', symbol: 'ETH' });
    const row = db.prepare('SELECT manual_price, manual_price_at FROM assets WHERE id = ?').get(ASSET) as any;
    expect(row).toEqual({ manual_price: null, manual_price_at: null });
  });

  it('keeps the manual price when only the name changes', () => {
    assetService.setManualPrice(ASSET, 100_000);
    assetService.upsert({ id: ASSET, name: 'test-rv renamed', kind: 'crypto', symbol: 'ETH' });
    expect((db.prepare('SELECT manual_price p FROM assets WHERE id = ?').get(ASSET) as any).p).toBe(100_000);
  });

  it('round-trips a numeric-looking string setting as a string', () => {
    settingService.upsert(KEY, '123');
    const res = fakeRes();
    getAllSettings({} as any, res, () => {});
    expect(res.body[KEY]).toBe('123');
  });

  it('answers 400 (not 500) when predict gets non-string descriptions', () => {
    const res = fakeRes();
    predictCategories({ body: { descriptions: ['ok', 42] } } as any, res, () => {});
    expect(res.statusCode).toBe(400);
  });
});
