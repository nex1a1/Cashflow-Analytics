import type { Portfolio, PortfolioAsset, PortfolioTrade } from '@/types';

/** pricePerUnit follows the amount so a row reads like a real trade. */
export const trade = (id: string, date: string, side: 'buy' | 'sell', units: number, amount: number, description = ''): PortfolioTrade =>
  ({ id, date, side, units, amount, pricePerUnit: units ? amount / units : 0, description });

export const mkAsset = (id: string, over: Partial<PortfolioAsset> = {}): PortfolioAsset => ({
  id, name: id, kind: 'us_stock', symbol: null, unitLabel: null, autoPrice: true, units: 1, cost: 100, avgCostPerUnit: 100,
  price: null, priceAt: null, priceSource: null, marketValue: null, unrealized: null, unrealizedPct: null, realized: 0, oversold: false, trades: [], ...over,
});

export const mkPortfolio = (assets: PortfolioAsset[], totals: Partial<Portfolio['totals']> = {}, extra: Partial<Portfolio> = {}): Portfolio => ({
  assets,
  totals: { cost: 0, marketValue: 0, unrealized: 0, realized: 0, bought: 0, unpricedCount: 0, unpricedCost: 0, oldestPriceAt: null, ...totals },
  generalSavings: 0,
  history: [],
  ...extra,
});
