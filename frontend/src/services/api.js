import { API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL } from '../constants';

const CATEGORIES_API_URL = API_URL.replace('/transactions', '/categories');
const GROUPS_API_URL = API_URL.replace('/transactions', '/groups');
const DAY_TYPES_API_URL = API_URL.replace('/transactions', '/day-types');
const ANALYTICS_API_URL = API_URL.replace('/transactions', '/analytics');

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network response was not ok' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const transactionService = {
    getAll: (startDate, endDate) => {
        let url = API_URL;
        if (startDate || endDate) {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            url += `?${params.toString()}`;
        }
        return fetch(url).then(handleResponse);
    },
    getPeriods: () => fetch(`${API_URL}/periods`).then(handleResponse),
    getFrequentItems: () => fetch(`${API_URL}/frequent`).then(handleResponse),
    save: (items) => fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.isArray(items) ? items : [items])
    }).then(handleResponse),
    deleteById: (id) => fetch(`${API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse),
    deleteAll: () => fetch(API_URL, { method: 'DELETE' }).then(handleResponse),
    resetAll: () => fetch(RESET_API_URL, { method: 'DELETE' }).then(handleResponse)
};

export const analyticsService = {
    getDashboardData: (startDate, endDate) => {
        let url = ANALYTICS_API_URL;
        if (startDate || endDate) {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            url += `?${params.toString()}`;
        }
        return fetch(url).then(handleResponse);
    }
};

export const calendarService = {
    getAll: () => fetch(CALENDAR_API_URL).then(handleResponse),
    save: (date, type_id, note = '') => fetch(CALENDAR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type_id, note })
    }).then(handleResponse)
};

export const dayTypeService = {
    getAll: () => fetch(DAY_TYPES_API_URL).then(handleResponse),
    save: (dayType) => fetch(DAY_TYPES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dayType)
    }).then(handleResponse),
    deleteById: (id) => fetch(`${DAY_TYPES_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse)
};

export const settingsService = {
    getAll: () => fetch(SETTINGS_API_URL).then(handleResponse),
    save: (key, value) => fetch(SETTINGS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
    }).then(handleResponse)
};

export const categoryService = {
    getAll: () => fetch(CATEGORIES_API_URL).then(handleResponse),
    save: (category) => fetch(CATEGORIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
    }).then(handleResponse),
    deleteById: (id) => fetch(`${CATEGORIES_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse)
};

export const groupService = {
    getAll: () => fetch(GROUPS_API_URL).then(handleResponse),
    save: (group) => fetch(GROUPS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group)
    }).then(handleResponse),
    deleteById: (id) => fetch(`${GROUPS_API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse)
};
