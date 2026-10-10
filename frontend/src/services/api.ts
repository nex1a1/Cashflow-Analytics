import { API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL } from '../constants';
import {
    TransactionDisplay,
    TransactionPayload,
    FrequentItem,
    CashflowGroup,
    Category,
    DayType,
    CalendarDay,
    DashboardAnalytics,
    Portfolio,
    AssetInput,
    PriceRefreshResult,
    PricePreview,
    AssetKind
} from '../types';

const CATEGORIES_API_URL = API_URL.replace('/transactions', '/categories');
const GROUPS_API_URL = API_URL.replace('/transactions', '/groups');
const DAY_TYPES_API_URL = API_URL.replace('/transactions', '/day-types');
const ANALYTICS_API_URL = API_URL.replace('/transactions', '/analytics');
const PORTFOLIO_API_URL = API_URL.replace('/transactions', '/portfolio');
const ASSETS_API_URL = API_URL.replace('/transactions', '/assets');
const PRICES_REFRESH_API_URL = API_URL.replace('/transactions', '/prices/refresh');
const PRICES_PREVIEW_API_URL = API_URL.replace('/transactions', '/prices/preview');

// Error messages end up in toasts / inline errors, so the backend's generic English ones are turned into Thai;
// its own reasons (409 "ลบไม่ได้ …", trigger texts) are already written for the user and pass through.
const GENERIC_ERRORS: Record<string, (status: number) => string> = {
    'Validation Error': () => 'ข้อมูลที่ส่งไปไม่ถูกต้อง',
    'Internal Server Error': status => `เซิร์ฟเวอร์ขัดข้อง (HTTP ${status})`,
};

const request = async <T = any>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, init).catch(() => {
        throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    });
    if (!response.ok) {
        const reason: unknown = (await response.json().catch(() => null))?.error;
        if (typeof reason !== 'string' || !reason) throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${response.status})`);
        throw new Error(GENERIC_ERRORS[reason]?.(response.status) ?? reason);
    }
    return response.json();
};

const postJson = <T = any>(url: string, body: unknown) => request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

const del = (url: string) => request<{ success: boolean }>(url, { method: 'DELETE' });

const withDates = (url: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return params.toString() ? `${url}?${params.toString()}` : url;
};

export const transactionService = {
    getAll: (startDate?: string, endDate?: string) => request<TransactionDisplay[]>(withDates(API_URL, startDate, endDate)),
    getCount: () => request<{ count: number }>(`${API_URL}/count`),
    getPeriods: () => request<string[]>(`${API_URL}/periods`),
    getFrequentItems: () => request<FrequentItem[]>(`${API_URL}/frequent`),
    save: (items: TransactionPayload | TransactionPayload[]) =>
        postJson<{ success: boolean; count: number }>(API_URL, Array.isArray(items) ? items : [items]),
    deleteById: (id: string) => del(`${API_URL}/${id}`),
    deleteMonth: (isoMonth: string) => request<{ success: boolean; message?: string }>(`${API_URL}/month/${isoMonth}`, { method: 'DELETE' }),
    resetAll: () => request<{ success: boolean; message?: string }>(RESET_API_URL, {
        method: 'DELETE',
        headers: { 'X-Confirm-Reset': 'true' }
    }),
    search: (query: string) => request<TransactionDisplay[]>(`${API_URL}/search?q=${encodeURIComponent(query)}`)
};

export const analyticsService = {
    getDashboardData: (startDate?: string, endDate?: string) =>
        request<DashboardAnalytics>(withDates(ANALYTICS_API_URL, startDate, endDate))
};

export const calendarService = {
    getAll: () => request<CalendarDay[]>(CALENDAR_API_URL),
    /** note / note_icon: undefined = ไม่ส่งไป (backend คงของเดิม — เปลี่ยนแค่ประเภทวันต้องไม่ลบโน้ต), '' = ลบ */
    save: (date: string, type_id: string, note?: string, note_icon?: string) =>
        postJson<{ success: boolean }>(CALENDAR_API_URL, { date, type_id, note, note_icon })
};

export const dayTypeService = {
    getAll: () => request<DayType[]>(DAY_TYPES_API_URL),
    save: (dayType: Partial<DayType>) => postJson<{ success: boolean }>(DAY_TYPES_API_URL, dayType),
    deleteById: (id: string) => del(`${DAY_TYPES_API_URL}/${id}`)
};

export const settingsService = {
    getAll: () => request<Record<string, any>>(SETTINGS_API_URL),
    save: (key: string, value: any) => postJson<{ success: boolean }>(SETTINGS_API_URL, { key, value })
};

export const categoryService = {
    getAll: () => request<Category[]>(CATEGORIES_API_URL),
    save: (category: Partial<Category>) => postJson<{ success: boolean }>(CATEGORIES_API_URL, category),
    deleteById: (id: string) => del(`${CATEGORIES_API_URL}/${id}`)
};

export const groupService = {
    getAll: () => request<CashflowGroup[]>(GROUPS_API_URL),
    save: (group: Partial<CashflowGroup>) => postJson<{ success: boolean }>(GROUPS_API_URL, group),
    deleteById: (id: string) => del(`${GROUPS_API_URL}/${id}`)
};

export const portfolioService = {
    get: () => request<Portfolio>(PORTFOLIO_API_URL),
    saveAsset: (asset: AssetInput) => postJson<{ success: boolean; id: string }>(ASSETS_API_URL, asset),
    deleteAsset: (id: string) => del(`${ASSETS_API_URL}/${id}`),
    setManualPrice: (id: string, price: number) => postJson<{ success: boolean }>(`${ASSETS_API_URL}/${id}/price`, { price }),
    refreshPrices: () => request<{ results: PriceRefreshResult[] }>(PRICES_REFRESH_API_URL, { method: 'POST' }),
    previewPrice: (kind: AssetKind, symbol: string | null) => postJson<PricePreview>(PRICES_PREVIEW_API_URL, { kind, symbol })
};
