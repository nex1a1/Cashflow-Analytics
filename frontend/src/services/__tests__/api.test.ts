import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  transactionService, analyticsService, calendarService, dayTypeService, settingsService,
  categoryService, groupService, portfolioService,
} from '../api';

const BASE = 'http://localhost:3000/api';
type Call = [string, RequestInit | undefined];

/** Stubs fetch with one answer; returns the recorded calls. */
function stub(answer: { ok?: boolean; status?: number; body?: unknown; badJson?: boolean } = {}) {
  const { ok = true, status = 200, body = { success: true }, badJson = false } = answer;
  const fetchMock = vi.fn(async () => ({
    ok, status,
    json: async () => { if (badJson) throw new SyntaxError('Unexpected token <'); return body; },
  }));
  vi.stubGlobal('fetch', fetchMock);
  return {
    last: () => fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as unknown as Call,
    body: () => JSON.parse((fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as unknown as Call)[1]!.body as string),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('reads: URL and parsed answer', () => {
  it.each([
    ['transactions count', () => transactionService.getCount(), `${BASE}/transactions/count`],
    ['periods', () => transactionService.getPeriods(), `${BASE}/transactions/periods`],
    ['frequent items', () => transactionService.getFrequentItems(), `${BASE}/transactions/frequent`],
    ['calendar', () => calendarService.getAll(), `${BASE}/calendar`],
    ['day types', () => dayTypeService.getAll(), `${BASE}/day-types`],
    ['settings', () => settingsService.getAll(), `${BASE}/settings`],
    ['categories', () => categoryService.getAll(), `${BASE}/categories`],
    ['groups', () => groupService.getAll(), `${BASE}/groups`],
    ['portfolio', () => portfolioService.get(), `${BASE}/portfolio`],
  ])('%s', async (_n, call, url) => {
    const s = stub({ body: { hello: 1 } });
    await expect(call()).resolves.toEqual({ hello: 1 });
    expect(s.last()[0]).toBe(url);
    expect(s.last()[1]?.method ?? 'GET').toBe('GET');
  });

  it('transactions: no dates → no query; one or both dates → only those', async () => {
    const s = stub({ body: [] });
    await transactionService.getAll();
    expect(s.last()[0]).toBe(`${BASE}/transactions`);
    await transactionService.getAll('2026-10-01');
    expect(s.last()[0]).toBe(`${BASE}/transactions?startDate=2026-10-01`);
    await transactionService.getAll(undefined, '2026-10-31');
    expect(s.last()[0]).toBe(`${BASE}/transactions?endDate=2026-10-31`);
    await transactionService.getAll('2026-10-01', '2026-10-31');
    expect(s.last()[0]).toBe(`${BASE}/transactions?startDate=2026-10-01&endDate=2026-10-31`);
  });

  it('analytics: same query rules', async () => {
    const s = stub({ body: {} });
    await analyticsService.getDashboardData();
    expect(s.last()[0]).toBe(`${BASE}/analytics`);
    await analyticsService.getDashboardData('2026-10-01');
    expect(s.last()[0]).toBe(`${BASE}/analytics?startDate=2026-10-01`);
    await analyticsService.getDashboardData(undefined, '2026-10-31');
    expect(s.last()[0]).toBe(`${BASE}/analytics?endDate=2026-10-31`);
    await analyticsService.getDashboardData('2026-10-01', '2026-10-31');
    expect(s.last()[0]).toBe(`${BASE}/analytics?startDate=2026-10-01&endDate=2026-10-31`);
  });

  it('search escapes Thai, spaces and symbols', async () => {
    const s = stub({ body: [] });
    await transactionService.search('ข้าว & น้ำ?');
    expect(s.last()[0]).toBe(`${BASE}/transactions/search?q=${encodeURIComponent('ข้าว & น้ำ?')}`);
    expect(s.last()[0]).not.toContain(' ');
  });
});

describe('writes: method, URL, headers and body', () => {
  const json = { 'Content-Type': 'application/json' };

  it('saving one transaction sends a one-item array; a list is sent as is', async () => {
    const s = stub({ body: { success: true, count: 1 } });
    const row = { date: '2026-10-01', amount: 50 } as any;
    await expect(transactionService.save(row)).resolves.toEqual({ success: true, count: 1 });
    expect(s.last()[0]).toBe(`${BASE}/transactions`);
    expect(s.last()[1]).toMatchObject({ method: 'POST', headers: json });
    expect(s.body()).toEqual([row]);
    await transactionService.save([row, row]);
    expect(s.body()).toEqual([row, row]);
  });

  it.each([
    ['transaction', () => transactionService.deleteById('t1'), `${BASE}/transactions/t1`],
    ['month', () => transactionService.deleteMonth('2026-10'), `${BASE}/transactions/month/2026-10`],
    ['day type', () => dayTypeService.deleteById('d1'), `${BASE}/day-types/d1`],
    ['category', () => categoryService.deleteById('c1'), `${BASE}/categories/c1`],
    ['group', () => groupService.deleteById('g1'), `${BASE}/groups/g1`],
    ['asset', () => portfolioService.deleteAsset('a1'), `${BASE}/assets/a1`],
  ])('delete %s', async (_n, call, url) => {
    const s = stub();
    await call();
    expect(s.last()[0]).toBe(url);
    expect(s.last()[1]).toMatchObject({ method: 'DELETE' });
  });

  it('reset-all carries the confirmation header the backend demands', async () => {
    const s = stub();
    await transactionService.resetAll();
    expect(s.last()[0]).toBe(`${BASE}/reset-all`);
    expect(s.last()[1]).toEqual({ method: 'DELETE', headers: { 'X-Confirm-Reset': 'true' } });
  });

  it.each([
    ['day type', () => dayTypeService.save({ id: 'd1', label: 'ทำงาน' }), `${BASE}/day-types`, { id: 'd1', label: 'ทำงาน' }],
    ['setting', () => settingsService.save('group_budgets', { g: 100 }), `${BASE}/settings`, { key: 'group_budgets', value: { g: 100 } }],
    ['category', () => categoryService.save({ id: 'c1', name: 'อาหาร' }), `${BASE}/categories`, { id: 'c1', name: 'อาหาร' }],
    ['group', () => groupService.save({ id: 'g1', name: 'ค่ากิน' }), `${BASE}/groups`, { id: 'g1', name: 'ค่ากิน' }],
    ['asset', () => portfolioService.saveAsset({ name: 'ทอง', kind: 'gold_bar' } as any), `${BASE}/assets`, { name: 'ทอง', kind: 'gold_bar' }],
    ['manual price', () => portfolioService.setManualPrice('a1', 41250.5), `${BASE}/assets/a1/price`, { price: 41250.5 }],
    ['price preview', () => portfolioService.previewPrice('us_stock', 'AAPL'), `${BASE}/prices/preview`, { kind: 'us_stock', symbol: 'AAPL' }],
    ['price preview without symbol', () => portfolioService.previewPrice('gold_bar', null), `${BASE}/prices/preview`, { kind: 'gold_bar', symbol: null }],
  ])('save %s', async (_n, call, url, body) => {
    const s = stub();
    await call();
    expect(s.last()[0]).toBe(url);
    expect(s.last()[1]).toMatchObject({ method: 'POST', headers: json });
    expect(s.body()).toEqual(body);
  });

  it('refreshing prices is a bare POST', async () => {
    const s = stub({ body: { results: [] } });
    await expect(portfolioService.refreshPrices()).resolves.toEqual({ results: [] });
    expect(s.last()[0]).toBe(`${BASE}/prices/refresh`);
    expect(s.last()[1]).toEqual({ method: 'POST' });
  });
});

describe('errors reach the user in Thai', () => {
  it("the backend's own (Thai) reason is passed through", async () => {
    stub({ ok: false, status: 409, body: { error: 'ลบไม่ได้ หมวดนี้ยังมีรายการอยู่' } });
    await expect(categoryService.deleteById('c1')).rejects.toThrow('ลบไม่ได้ หมวดนี้ยังมีรายการอยู่');
  });

  it('a validation failure is not shown as "Validation Error"', async () => {
    stub({ ok: false, status: 400, body: { error: 'Validation Error', details: [] } });
    await expect(transactionService.save([])).rejects.toThrow(/^ข้อมูลที่ส่งไปไม่ถูกต้อง$/);
  });

  it('a server crash is not shown as "Internal Server Error"', async () => {
    stub({ ok: false, status: 500, body: { error: 'Internal Server Error' } });
    await expect(groupService.getAll()).rejects.toThrow(/^เซิร์ฟเวอร์ขัดข้อง \(HTTP 500\)$/);
    stub({ ok: false, status: 503, body: { error: 'Internal Server Error' } });
    await expect(groupService.getAll()).rejects.toThrow(/^เซิร์ฟเวอร์ขัดข้อง \(HTTP 503\)$/);
  });

  it('an answer that is not JSON, or JSON without a reason, names the status', async () => {
    stub({ ok: false, status: 502, badJson: true });
    await expect(groupService.getAll()).rejects.toThrow('เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP 502)');
    stub({ ok: false, status: 404, body: {} });
    await expect(groupService.getAll()).rejects.toThrow('เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP 404)');
    stub({ ok: false, status: 400, body: { error: '' } });
    await expect(groupService.getAll()).rejects.toThrow(/^เซิร์ฟเวอร์ตอบกลับผิดพลาด \(HTTP 400\)$/);
    stub({ ok: false, status: 400, body: { error: { code: 1 } } });
    await expect(groupService.getAll()).rejects.toThrow(/^เซิร์ฟเวอร์ตอบกลับผิดพลาด \(HTTP 400\)$/);
  });

  it('the server not running at all says so instead of "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(settingsService.save('k', 1)).rejects.toThrow('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  });
});
