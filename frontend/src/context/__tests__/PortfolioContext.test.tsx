// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, flush } from '@/test-utils/renderHook';

const api = vi.hoisted(() => ({
  portfolioService: { get: vi.fn(), refreshPrices: vi.fn(), saveAsset: vi.fn(), deleteAsset: vi.fn(), setManualPrice: vi.fn() },
}));
vi.mock('../../services/api', () => api);
const appData = vi.hoisted(() => ({ transactions: [] as unknown[] }));
vi.mock('../AppDataContext', () => ({ useAppData: () => appData }));
vi.mock('../ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

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
});
