// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, flush, act } from '@/test-utils/renderHook';

const api = vi.hoisted(() => ({
  portfolioService: { get: vi.fn(), refreshPrices: vi.fn(), saveAsset: vi.fn(), deleteAsset: vi.fn(), setManualPrice: vi.fn() },
}));
vi.mock('../../services/api', () => api);
const appData = vi.hoisted(() => ({ transactions: [] as unknown[] }));
vi.mock('../AppDataContext', () => ({ useAppData: () => appData }));
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('../ToastContext', () => ({ useToast: () => toast }));

import { PortfolioProvider, usePortfolio } from '../PortfolioContext';

const mount = async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <PortfolioProvider>{children}</PortfolioProvider>;
  const h = renderHook(() => usePortfolio(), wrapper);
  await flush();
  return h;
};

const online = vi.spyOn(navigator, 'onLine', 'get');
beforeEach(() => {
  online.mockReturnValue(true);
  api.portfolioService.get.mockReset().mockResolvedValue({ assets: [] });
  api.portfolioService.refreshPrices.mockReset();
  toast.showToast.mockClear();
});
afterEach(() => online.mockReturnValue(true));

describe('PortfolioContext price status', () => {
  it.each([
    ['ok', [{ assetId: 'a', ok: true }, { assetId: 'b', ok: true }]],
    ['partial', [{ assetId: 'a', ok: true }, { assetId: 'b', ok: false, message: 'HTTP 500' }]],
    ['offline', [{ assetId: 'a', ok: false }]],
    ['idle', []],
  ])('%s', async (status, results) => {
    api.portfolioService.refreshPrices.mockResolvedValue({ results });
    const { result, unmount } = await mount();
    expect(result.current.priceStatus).toBe(status);
    unmount();
  });

  it('lists the failed assets with their message', async () => {
    api.portfolioService.refreshPrices.mockResolvedValue({ results: [{ assetId: 'a', ok: true }, { assetId: 'b', ok: false, message: 'HTTP 500' }] });
    const { result, unmount } = await mount();
    expect(result.current.failedPrices).toEqual({ b: 'HTTP 500' });
    unmount();
  });

  it('a failed refresh request is offline and still loads the cached portfolio', async () => {
    api.portfolioService.refreshPrices.mockRejectedValue(new Error('Failed to fetch'));
    const { result, unmount } = await mount();
    expect(result.current.priceStatus).toBe('offline');
    expect(result.current.portfolio).toEqual({ assets: [] });
    expect(result.current.isRefreshing).toBe(false);
    unmount();
  });

  it('when the browser is offline it does not even try to fetch prices', async () => {
    online.mockReturnValue(false);
    const { result, unmount } = await mount();
    expect(result.current.priceStatus).toBe('offline');
    expect(api.portfolioService.refreshPrices).not.toHaveBeenCalled();
    unmount();
  });

  it('an unnamed failure still gets a readable message', async () => {
    api.portfolioService.refreshPrices.mockResolvedValue({ results: [{ assetId: 'x', ok: false }] });
    const { result, unmount } = await mount();
    expect(result.current.failedPrices).toEqual({ x: 'ดึงราคาไม่สำเร็จ' });
    unmount();
  });

  it('a later request that fails outright forgets the per-asset failures of the earlier one', async () => {
    api.portfolioService.refreshPrices.mockResolvedValue({ results: [{ assetId: 'x', ok: false, message: 'HTTP 500' }, { assetId: 'y', ok: true }] });
    const { result, unmount } = await mount();
    expect(result.current.failedPrices).toEqual({ x: 'HTTP 500' });
    api.portfolioService.refreshPrices.mockRejectedValue(new Error('down'));
    await act(async () => { await result.current.refreshPrices(); });
    expect(result.current.failedPrices).toEqual({});
    expect(result.current.priceStatus).toBe('offline');
    unmount();
  });

  it('a later good run clears an earlier offline state', async () => {
    api.portfolioService.refreshPrices.mockRejectedValue(new Error('down'));
    const { result, unmount } = await mount();
    expect(result.current.priceStatus).toBe('offline');
    api.portfolioService.refreshPrices.mockResolvedValue({ results: [{ assetId: 'x', ok: true }] });
    await act(async () => { await result.current.refreshPrices(); });
    expect(result.current.priceStatus).toBe('ok');
    expect(result.current.failedPrices).toEqual({});
    unmount();
  });
});

describe('PortfolioContext loading and refreshing', () => {
  const calls = (fn: { mock: { calls: unknown[] } }) => fn.mock.calls.length;
  const ctl = { setTxs: (_: unknown[]) => {} };
  const mountCtl = async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      const [txs, setTxs] = React.useState<unknown[]>([]);
      appData.transactions = txs;
      ctl.setTxs = setTxs;
      return <PortfolioProvider>{children}</PortfolioProvider>;
    };
    const h = renderHook(() => usePortfolio(), wrapper);
    await flush();
    return h;
  };
  beforeEach(() => {
    api.portfolioService.refreshPrices.mockResolvedValue({ results: [] });
    appData.transactions = [];
  });

  it('loads the portfolio on mount and starts with no refresh running', async () => {
    api.portfolioService.get.mockResolvedValue({ assets: [{ id: 'a' }] });
    const { result, unmount } = await mount();
    expect(result.current.portfolio).toEqual({ assets: [{ id: 'a' }] });
    expect(result.current.isRefreshing).toBe(false);
    unmount();
  });

  it('keeps showing the old portfolio when a reload fails, and logs it instead of crashing', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.portfolioService.get.mockResolvedValue({ assets: [{ id: 'a' }] });
    const { result, unmount } = await mount();
    api.portfolioService.get.mockRejectedValue(new Error('db locked'));
    await act(async () => { await result.current.reload(); });
    expect(result.current.portfolio).toEqual({ assets: [{ id: 'a' }] });
    expect(err).toHaveBeenCalledTimes(1);
    err.mockRestore();
    unmount();
  });

  it('reloads whenever the transactions change, and fetches prices only once on open', async () => {
    const { unmount } = await mountCtl();
    expect(calls(api.portfolioService.refreshPrices)).toBe(1);
    const before = calls(api.portfolioService.get);
    await act(async () => { ctl.setTxs([{ id: 't1' }]); });
    await flush();
    expect(calls(api.portfolioService.get)).toBe(before + 1);
    expect(calls(api.portfolioService.refreshPrices)).toBe(1);
    unmount();
  });

  it('a slow older load never overwrites a newer one (latest request wins)', async () => {
    let slow!: (v: unknown) => void;
    api.portfolioService.get
      .mockReturnValueOnce(new Promise(r => { slow = r; })) // the load started on mount: still in flight
      .mockResolvedValue({ assets: [{ id: 'fresh' }] });   // the reload after the price refresh answers first
    const { result, unmount } = await mount();
    expect(result.current.portfolio).toEqual({ assets: [{ id: 'fresh' }] });
    await act(async () => { slow({ assets: [{ id: 'stale' }] }); });
    expect(result.current.portfolio).toEqual({ assets: [{ id: 'fresh' }] });
    unmount();
  });

  it('a refresh reloads the portfolio afterwards so new prices show', async () => {
    api.portfolioService.get.mockResolvedValue({ assets: [{ id: 'old' }] });
    const { result, unmount } = await mount();
    api.portfolioService.get.mockResolvedValue({ assets: [{ id: 'new' }] });
    await act(async () => { await result.current.refreshPrices(); });
    expect(result.current.portfolio).toEqual({ assets: [{ id: 'new' }] });
    unmount();
  });

  it('shows the spinner state while prices are being fetched, then releases it', async () => {
    let finish!: (v: unknown) => void;
    api.portfolioService.refreshPrices.mockReturnValue(new Promise(r => { finish = r; }));
    const { result, unmount } = await mount();
    expect(result.current.isRefreshing).toBe(true);
    await act(async () => { finish({ results: [] }); });
    await flush();
    expect(result.current.isRefreshing).toBe(false);
    unmount();
  });

  it('under React StrictMode (the app runs in it) effects run twice but prices are fetched once', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <React.StrictMode><PortfolioProvider>{children}</PortfolioProvider></React.StrictMode>;
    const h = renderHook(() => usePortfolio(), wrapper);
    await flush();
    expect(calls(api.portfolioService.refreshPrices)).toBe(1);
    h.unmount();
  });

  it('coming back online fetches prices again by itself; after unmount it stops listening', async () => {
    const { unmount } = await mount();
    expect(calls(api.portfolioService.refreshPrices)).toBe(1);
    await act(async () => { window.dispatchEvent(new Event('online')); });
    expect(calls(api.portfolioService.refreshPrices)).toBe(2);
    unmount();
    window.dispatchEvent(new Event('online'));
    expect(calls(api.portfolioService.refreshPrices)).toBe(2);
  });
});

describe('PortfolioContext saving assets', () => {
  const calls = (fn: { mock: { calls: unknown[] } }) => fn.mock.calls.length;
  const loaded = { assets: [{ id: 'a1', kind: 'us_stock', symbol: 'AAPL' }, { id: 'a2', kind: 'gold_bar', symbol: null }] };
  beforeEach(() => {
    api.portfolioService.get.mockResolvedValue(loaded);
    api.portfolioService.refreshPrices.mockResolvedValue({ results: [] });
    api.portfolioService.saveAsset.mockReset().mockResolvedValue({ id: 'saved-id' });
  });
  const save = async (h: Awaited<ReturnType<typeof mount>>, asset: Parameters<ReturnType<typeof usePortfolio>['saveAsset']>[0]) => {
    let id: string | undefined;
    await act(async () => { id = await h.result.current.saveAsset(asset); });
    await flush();
    return id;
  };

  it('a brand new asset is saved, the portfolio reloaded, its price fetched, and the id returned', async () => {
    const h = await mount();
    const gets = calls(api.portfolioService.get);
    const id = await save(h, { name: 'AAPL', kind: 'us_stock', symbol: 'AAPL' });
    expect(id).toBe('saved-id');
    expect(api.portfolioService.saveAsset).toHaveBeenCalledWith({ name: 'AAPL', kind: 'us_stock', symbol: 'AAPL' });
    expect(calls(api.portfolioService.get)).toBeGreaterThan(gets);
    expect(calls(api.portfolioService.refreshPrices)).toBe(2); // once on open, once for the new asset
    h.unmount();
  });

  it('editing only the name does not refetch prices', async () => {
    const h = await mount();
    await save(h, { id: 'a1', name: 'Renamed', kind: 'us_stock', symbol: 'AAPL' });
    expect(calls(api.portfolioService.refreshPrices)).toBe(1);
    h.unmount();
  });

  it('a blank symbol equals "no symbol": no refetch for an asset that had none', async () => {
    const h = await mount();
    await save(h, { id: 'a2', name: 'Gold', kind: 'gold_bar', symbol: '  ' });
    await save(h, { id: 'a2', name: 'Gold', kind: 'gold_bar' });
    await save(h, { id: 'a2', name: 'Gold', kind: 'gold_bar', symbol: null });
    expect(calls(api.portfolioService.refreshPrices)).toBe(1);
    h.unmount();
  });

  it('a different symbol refetches (the old price belonged to another security)', async () => {
    const h = await mount();
    await save(h, { id: 'a1', name: 'x', kind: 'us_stock', symbol: 'MSFT' });
    expect(calls(api.portfolioService.refreshPrices)).toBe(2);
    h.unmount();
  });

  it('removing the symbol refetches', async () => {
    const h = await mount();
    await save(h, { id: 'a1', name: 'x', kind: 'us_stock', symbol: null });
    expect(calls(api.portfolioService.refreshPrices)).toBe(2);
    h.unmount();
  });

  it('a different kind refetches', async () => {
    const h = await mount();
    await save(h, { id: 'a2', name: 'x', kind: 'fund', symbol: null });
    expect(calls(api.portfolioService.refreshPrices)).toBe(2);
    h.unmount();
  });

  it('an id the portfolio does not know is treated as new', async () => {
    const h = await mount();
    await save(h, { id: 'ghost', name: 'x', kind: 'us_stock', symbol: 'AAPL' });
    expect(calls(api.portfolioService.refreshPrices)).toBe(2);
    h.unmount();
  });

  it('a failed save tells the user, returns nothing and does not reload or refetch', async () => {
    const h = await mount();
    const gets = calls(api.portfolioService.get);
    api.portfolioService.saveAsset.mockRejectedValue(new Error('ชื่อซ้ำ'));
    const id = await save(h, { name: 'x', kind: 'us_stock', symbol: 'AAPL' });
    expect(id).toBeUndefined();
    expect(toast.showToast).toHaveBeenCalledWith('บันทึกสินทรัพย์ไม่สำเร็จ: ชื่อซ้ำ', 'error');
    expect(calls(api.portfolioService.get)).toBe(gets);
    expect(calls(api.portfolioService.refreshPrices)).toBe(1);
    h.unmount();
  });
});

describe('PortfolioContext deleting and pricing', () => {
  const calls = (fn: { mock: { calls: unknown[] } }) => fn.mock.calls.length;
  beforeEach(() => {
    api.portfolioService.refreshPrices.mockResolvedValue({ results: [] });
    api.portfolioService.deleteAsset.mockReset().mockResolvedValue(undefined);
    api.portfolioService.setManualPrice.mockReset().mockResolvedValue(undefined);
  });

  it('delete: calls the API, reloads, reports success', async () => {
    const h = await mount();
    const gets = calls(api.portfolioService.get);
    let ok: boolean | undefined;
    await act(async () => { ok = await h.result.current.deleteAsset('a1'); });
    expect(ok).toBe(true);
    expect(api.portfolioService.deleteAsset).toHaveBeenCalledWith('a1');
    expect(calls(api.portfolioService.get)).toBe(gets + 1);
    h.unmount();
  });

  it('delete refused: the server message is shown as is, nothing reloads', async () => {
    const h = await mount();
    const gets = calls(api.portfolioService.get);
    api.portfolioService.deleteAsset.mockRejectedValue(new Error('ลบไม่ได้ มีรายการซื้อขายอยู่'));
    let ok: boolean | undefined;
    await act(async () => { ok = await h.result.current.deleteAsset('a1'); });
    expect(ok).toBe(false);
    expect(toast.showToast).toHaveBeenCalledWith('ลบไม่ได้ มีรายการซื้อขายอยู่', 'error');
    expect(calls(api.portfolioService.get)).toBe(gets);
    h.unmount();
  });

  it('manual price: sends id and price, reloads, reports success', async () => {
    const h = await mount();
    const gets = calls(api.portfolioService.get);
    let ok: boolean | undefined;
    await act(async () => { ok = await h.result.current.setManualPrice('a1', 12.5); });
    expect(ok).toBe(true);
    expect(api.portfolioService.setManualPrice).toHaveBeenCalledWith('a1', 12.5);
    expect(calls(api.portfolioService.get)).toBe(gets + 1);
    h.unmount();
  });

  it('manual price failing: toast with the reason, returns false, no reload', async () => {
    const h = await mount();
    const gets = calls(api.portfolioService.get);
    api.portfolioService.setManualPrice.mockRejectedValue(new Error('ราคาไม่ถูกต้อง'));
    let ok: boolean | undefined;
    await act(async () => { ok = await h.result.current.setManualPrice('a1', -1); });
    expect(ok).toBe(false);
    expect(toast.showToast).toHaveBeenCalledWith('บันทึกราคาไม่สำเร็จ: ราคาไม่ถูกต้อง', 'error');
    expect(calls(api.portfolioService.get)).toBe(gets);
    h.unmount();
  });
});

describe('usePortfolio', () => {
  it('refuses to work outside its provider', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => usePortfolio())).toThrow('usePortfolio must be used within PortfolioProvider');
    err.mockRestore();
  });
});
