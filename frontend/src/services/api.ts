import { API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL } from '../constants';

const CATEGORIES_API_URL = API_URL.replace('/transactions', '/categories');
const GROUPS_API_URL = API_URL.replace('/transactions', '/groups');
const DAY_TYPES_API_URL = API_URL.replace('/transactions', '/day-types');
const ANALYTICS_API_URL = API_URL.replace('/transactions', '/analytics');

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network response was not ok' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const transactionService = {
    getAll: (startDate?: string, endDate?: string): Promise<any[]> => {
        let url = API_URL;
        if (startDate || endDate) {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            url += `?${params.toString()}`;
        }
        return fetch(url).then(handleResponse);
    },
    getPeriods: (): Promise<string[]> => fetch(`${API_URL}/periods`).then(handleResponse),
    getFrequentItems: (): Promise<any[]> => fetch(`${API_URL}/frequent`).then(handleResponse),
    save: (items: any | any[]): Promise<{ success: boolean; count: number }> => fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.isArray(items) ? items : [items])
    }).then(handleResponse),
    deleteById: (id: string): Promise<{ success: boolean }> => fetch(`${API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse),
    deleteMonth: (isoMonth: string): Promise<{ success: boolean }> => fetch(`${API_URL}/month/${isoMonth}`, { method: 'DELETE' }).then(handleResponse),
    deleteAll: (): Promise<{ success: boolean }> => fetch(API_URL, { method: 'DELETE' }).then(handleResponse),
    resetAll: (): Promise<{ success: boolean }> => fetch(RESET_API_URL, { method: 'DELETE' }).then(handleResponse),
    search: (query: string): Promise<any[]> => fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`).then(handleResponse)
};

export const analyticsService = {
    getDashboardData: (startDate?: string, endDate?: string, excludeFuture?: boolean): Promise<any> => {
        let url = ANALYTICS_API_URL;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (excludeFuture) params.append('excludeFuture', 'true');
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        return fetch(url).then(handleResponse);
    }
};

export const calendarService = {
    getAll: (): Promise<any[]> => fetch(CALENDAR_API_URL).then(handleResponse),
    save: (date: string, type_id: string, note = ''): Promise<{ success: boolean }> => fetch(CALENDAR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type_id, note })
    }).then(handleResponse)
};

export const dayTypeService = {
    getAll: (): Promise<any[]> => fetch(DAY_TYPES_API_URL).then(handleResponse),
    save: (dayType: any): Promise<{ success: boolean }> => fetch(DAY_TYPES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dayType)
    }).then(handleResponse),
    deleteById: (id: string): Promise<{ success: boolean }> => fetch(`${DAY_TYPES_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse)
};

export const settingsService = {
    getAll: (): Promise<Record<string, any>> => fetch(SETTINGS_API_URL).then(handleResponse),
    save: (key: string, value: any): Promise<{ success: boolean }> => fetch(SETTINGS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
    }).then(handleResponse)
};

export const categoryService = {
    getAll: (): Promise<any[]> => fetch(CATEGORIES_API_URL).then(handleResponse),
    save: (category: any): Promise<{ success: boolean }> => fetch(CATEGORIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
    }).then(handleResponse),
    deleteById: (id: string): Promise<{ success: boolean }> => fetch(`${CATEGORIES_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse)
};

export const groupService = {
    getAll: (): Promise<any[]> => fetch(GROUPS_API_URL).then(handleResponse),
    save: (group: any): Promise<{ success: boolean }> => fetch(GROUPS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group)
    }).then(handleResponse),
    deleteById: (id: string): Promise<{ success: boolean }> => fetch(`${GROUPS_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse)
};
