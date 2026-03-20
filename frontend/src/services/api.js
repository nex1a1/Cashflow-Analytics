import { API_URL, CALENDAR_API_URL, RESET_API_URL, SETTINGS_API_URL } from '../constants';

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network response was not ok' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const transactionService = {
    getAll: () => fetch(API_URL).then(handleResponse),
    save: (items) => fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Array.isArray(items) ? items : [items])
    }).then(handleResponse),
    deleteById: (id) => fetch(`${API_URL}/${id}`, { method: 'DELETE' }).then(handleResponse),
    deleteAll: () => fetch(API_URL, { method: 'DELETE' }).then(handleResponse),
    resetAll: () => fetch(RESET_API_URL, { method: 'DELETE' }).then(handleResponse)
};

export const calendarService = {
    getAll: () => fetch(CALENDAR_API_URL).then(handleResponse),
    save: (date, type_id) => fetch(CALENDAR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type_id })
    }).then(handleResponse)
};

export const settingsService = {
    getAll: () => fetch(SETTINGS_API_URL).then(handleResponse),
    save: (key, value) => fetch(SETTINGS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
    }).then(handleResponse)
};