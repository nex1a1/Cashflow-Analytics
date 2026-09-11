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
    BackupFileInfo,
    ItemWithDetails,
    ItemCategory,
    ItemStatus,
    CreateItemPayload,
    UpdateItemPayload,
    LinkedTransactionInfo
} from '../types';

const CATEGORIES_API_URL = API_URL.replace('/transactions', '/categories');
const GROUPS_API_URL = API_URL.replace('/transactions', '/groups');
const DAY_TYPES_API_URL = API_URL.replace('/transactions', '/day-types');
const ANALYTICS_API_URL = API_URL.replace('/transactions', '/analytics');
const BACKUP_API_URL = API_URL.replace('/transactions', '/backup');
const BACKUPS_API_URL = API_URL.replace('/transactions', '/backups');
const ITEMS_API_URL = API_URL.replace('/transactions', '/items');
const ITEM_CATEGORIES_API_URL = API_URL.replace('/transactions', '/item-categories');

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
    resetAll: (): Promise<{ success: boolean; message?: string }> => fetch(RESET_API_URL, {
        method: 'DELETE',
        headers: { 'X-Confirm-Reset': 'true' }
    }).then(handleResponse<{ success: boolean; message?: string }>),
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

export const itemService = {
    getAll: (params?: { status?: string; categoryId?: number; includeCancelled?: boolean }): Promise<ItemWithDetails[]> => {
        let url = ITEMS_API_URL;
        const qp = new URLSearchParams();
        if (params?.status) qp.append('status', params.status);
        if (params?.categoryId) qp.append('category_id', String(params.categoryId));
        if (params?.includeCancelled) qp.append('include_cancelled', 'true');
        const qs = qp.toString();
        if (qs) url += `?${qs}`;
        return fetch(url).then(handleResponse<ItemWithDetails[]>);
    },
    getById: (id: number): Promise<ItemWithDetails & { linked_transactions: import('../types').LinkedTransactionInfo[] }> => fetch(`${ITEMS_API_URL}/${id}`).then(handleResponse<ItemWithDetails & { linked_transactions: import('../types').LinkedTransactionInfo[] }>),
    create: (item: CreateItemPayload): Promise<ItemWithDetails> => fetch(ITEMS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    }).then(handleResponse<ItemWithDetails>),
    update: (id: number, item: UpdateItemPayload): Promise<ItemWithDetails> => fetch(`${ITEMS_API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    }).then(handleResponse<ItemWithDetails>),
    updateStatus: (id: number, status: ItemStatus, dates?: { purchased_at?: string | null; broken_at?: string | null }): Promise<ItemWithDetails> => fetch(`${ITEMS_API_URL}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...dates })
    }).then(handleResponse<ItemWithDetails>),
    delete: (id: number): Promise<{ success: boolean }> => fetch(`${ITEMS_API_URL}/${id}`, {
        method: 'DELETE'
    }).then(handleResponse<{ success: boolean }>),
    linkTransactions: (id: number, transactionIds: string[]): Promise<ItemWithDetails & { linked_transactions: LinkedTransactionInfo[] }> => fetch(`${ITEMS_API_URL}/${id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_ids: transactionIds })
    }).then(handleResponse<ItemWithDetails & { linked_transactions: LinkedTransactionInfo[] }>),
    unlinkTransaction: (id: number, transactionId: string): Promise<ItemWithDetails & { linked_transactions: LinkedTransactionInfo[] }> => fetch(`${ITEMS_API_URL}/${id}/transactions/${transactionId}`, {
        method: 'DELETE'
    }).then(handleResponse<ItemWithDetails & { linked_transactions: LinkedTransactionInfo[] }>),
    getCategories: (): Promise<ItemCategory[]> => fetch(ITEM_CATEGORIES_API_URL).then(handleResponse<ItemCategory[]>),
    createCategory: (name: string): Promise<ItemCategory> => fetch(ITEM_CATEGORIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    }).then(handleResponse<ItemCategory>),
    updateCategory: (id: number, name: string): Promise<ItemCategory> => fetch(`${ITEM_CATEGORIES_API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    }).then(handleResponse<ItemCategory>),
    reorderCategories: (orderedIds: number[]): Promise<{ success: boolean }> => fetch(`${ITEM_CATEGORIES_API_URL}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
    }).then(handleResponse<{ success: boolean }>),
    deleteCategory: (id: number): Promise<{ success: boolean }> => fetch(`${ITEM_CATEGORIES_API_URL}/${id}`, {
        method: 'DELETE'
    }).then(handleResponse<{ success: boolean }>)
};

