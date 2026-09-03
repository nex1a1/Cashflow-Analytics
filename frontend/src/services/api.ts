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
    BackupFileInfo
} from '../types';

const CATEGORIES_API_URL = API_URL.replace('/transactions', '/categories');
const GROUPS_API_URL = API_URL.replace('/transactions', '/groups');
const DAY_TYPES_API_URL = API_URL.replace('/transactions', '/day-types');
const ANALYTICS_API_URL = API_URL.replace('/transactions', '/analytics');
const BACKUP_API_URL = API_URL.replace('/transactions', '/backup');
const BACKUPS_API_URL = API_URL.replace('/transactions', '/backups');

const handleResponse = async <T = any>(response: Response): Promise<T> => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network response was not ok' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const transactionService = {
    getAll: (startDate?: string, endDate?: string): Promise<TransactionDisplay[]> => {
        let url = API_URL;
        if (startDate || endDate) {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            url += `?${params.toString()}`;
        }
        return fetch(url).then(handleResponse<TransactionDisplay[]>);
    },
    getPeriods: (): Promise<string[]> => fetch(`${API_URL}/periods`).then(handleResponse<string[]>),
    getFrequentItems: (): Promise<FrequentItem[]> => fetch(`${API_URL}/frequent`).then(handleResponse<FrequentItem[]>),
    save: (items: TransactionPayload | TransactionPayload[]): Promise<{ success: boolean; count: number }> => fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.isArray(items) ? items : [items])
    }).then(handleResponse<{ success: boolean; count: number }>),
    deleteById: (id: string): Promise<{ success: boolean }> => fetch(`${API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse<{ success: boolean }>),
    deleteMonth: (isoMonth: string): Promise<{ success: boolean; message?: string }> => fetch(`${API_URL}/month/${isoMonth}`, { method: 'DELETE' }).then(handleResponse<{ success: boolean; message?: string }>),
    deleteAll: (): Promise<{ success: boolean }> => fetch(API_URL, { method: 'DELETE' }).then(handleResponse<{ success: boolean }>),
    resetAll: (): Promise<{ success: boolean; message?: string }> => fetch(RESET_API_URL, { method: 'DELETE' }).then(handleResponse<{ success: boolean; message?: string }>),
    search: (query: string): Promise<TransactionDisplay[]> => fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`).then(handleResponse<TransactionDisplay[]>)
};

export const analyticsService = {
    getDashboardData: (startDate?: string, endDate?: string, excludeFuture?: boolean): Promise<DashboardAnalytics> => {
        let url = ANALYTICS_API_URL;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (excludeFuture) params.append('excludeFuture', 'true');
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        return fetch(url).then(handleResponse<DashboardAnalytics>);
    }
};

export const calendarService = {
    getAll: (): Promise<CalendarDay[]> => fetch(CALENDAR_API_URL).then(handleResponse<CalendarDay[]>),
    save: (date: string, type_id: string, note = ''): Promise<{ success: boolean }> => fetch(CALENDAR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type_id, note })
    }).then(handleResponse<{ success: boolean }>)
};

export const dayTypeService = {
    getAll: (): Promise<DayType[]> => fetch(DAY_TYPES_API_URL).then(handleResponse<DayType[]>),
    save: (dayType: Partial<DayType>): Promise<{ success: boolean }> => fetch(DAY_TYPES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dayType)
    }).then(handleResponse<{ success: boolean }>),
    deleteById: (id: string): Promise<{ success: boolean }> => fetch(`${DAY_TYPES_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse<{ success: boolean }>)
};

export const settingsService = {
    getAll: (): Promise<Record<string, any>> => fetch(SETTINGS_API_URL).then(handleResponse<Record<string, any>>),
    save: (key: string, value: any): Promise<{ success: boolean }> => fetch(SETTINGS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
    }).then(handleResponse<{ success: boolean }>)
};

export const categoryService = {
    getAll: (): Promise<Category[]> => fetch(CATEGORIES_API_URL).then(handleResponse<Category[]>),
    save: (category: Partial<Category>): Promise<{ success: boolean }> => fetch(CATEGORIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
    }).then(handleResponse<{ success: boolean }>),
    deleteById: (id: string): Promise<{ success: boolean }> => fetch(`${CATEGORIES_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse<{ success: boolean }>)
};

export const groupService = {
    getAll: (): Promise<CashflowGroup[]> => fetch(GROUPS_API_URL).then(handleResponse<CashflowGroup[]>),
    save: (group: Partial<CashflowGroup>): Promise<{ success: boolean }> => fetch(GROUPS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group)
    }).then(handleResponse<{ success: boolean }>),
    deleteById: (id: string): Promise<{ success: boolean }> => fetch(`${GROUPS_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse<{ success: boolean }>)
};

export const backupService = {
    list: (): Promise<BackupFileInfo[]> => fetch(BACKUPS_API_URL).then(handleResponse<BackupFileInfo[]>),
    create: (): Promise<{ success: boolean; message: string; filename: string }> => fetch(BACKUP_API_URL, {
        method: 'POST'
    }).then(handleResponse<{ success: boolean; message: string; filename: string }>)
};
