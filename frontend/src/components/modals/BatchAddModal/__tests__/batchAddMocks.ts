// Shared state behind the mocked contexts and API of the BatchAddModal tests.
// Each test file mocks the modules with a factory that imports these objects:
//   vi.mock('@/services/api', () => import('./batchAddMocks').then(m => m.api));
// This file must not import the modal itself, or the factory would import a module that is still loading.
export const h = {
  portfolio: null as unknown,
  history: [] as any[],
  hidden: [] as string[],
  period: '2026-10',
  saved: [] as Array<[string, unknown]>,
};

export const portfolioContext = { usePortfolio: () => ({ portfolio: h.portfolio }) };
export const appFilterContext = { useAppFilter: () => ({ filterPeriod: h.period }) };
export const api = {
  transactionService: { getAll: () => Promise.resolve(h.history) },
  settingsService: {
    getAll: () => Promise.resolve({ recurring_hidden: h.hidden }),
    save: (k: string, v: unknown) => { h.saved.push([k, v]); return Promise.resolve({ success: true }); },
  },
};
