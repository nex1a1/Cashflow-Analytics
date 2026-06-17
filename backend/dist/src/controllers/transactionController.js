"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictCategories = exports.getFrequentItems = exports.searchTransactions = exports.getAvailablePeriods = exports.resetAllData = exports.deleteMonth = exports.deleteTransaction = exports.upsertTransactions = exports.getAllTransactions = void 0;
const transactionService_1 = __importDefault(require("../services/transactionService"));
const db_1 = __importDefault(require("../config/db"));
const transactionValidation_1 = require("../validations/transactionValidation");
const getAllTransactions = (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const rows = transactionService_1.default.getAll(startDate, endDate);
        res.json(rows.map(row => ({
            id: row.id,
            date: row.date,
            category: row.category,
            category_id: row.category_id,
            description: row.description,
            amount: row.amount / 100, // Convert Satang to Baht
            group_type: row.group_type,
            allocation_type: row.allocation_type
        })));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAllTransactions = getAllTransactions;
const upsertTransactions = (req, res) => {
    try {
        const validatedData = transactionValidation_1.upsertTransactionSchema.parse(req.body);
        const items = Array.isArray(validatedData) ? validatedData : [validatedData];
        transactionService_1.default.upsertMany(items);
        res.json({ success: true, count: items.length });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation failed', details: err.errors });
        }
        res.status(500).json({ error: err.message });
    }
};
exports.upsertTransactions = upsertTransactions;
const deleteTransaction = (req, res) => {
    const { id } = req.params;
    try {
        transactionService_1.default.delete(id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteTransaction = deleteTransaction;
const deleteMonth = (req, res) => {
    const { isoMonth } = req.params; // Expecting YYYY-MM
    try {
        transactionService_1.default.deleteByMonth(isoMonth);
        res.json({ success: true, message: `Deleted data for ${isoMonth}` });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteMonth = deleteMonth;
const resetAllData = (req, res) => {
    try {
        transactionService_1.default.deleteAll();
        res.json({ success: true, message: 'All data cleared successfully' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.resetAllData = resetAllData;
const getAvailablePeriods = (req, res) => {
    try {
        const periods = transactionService_1.default.getAvailablePeriods();
        res.json(periods);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAvailablePeriods = getAvailablePeriods;
const searchTransactions = (req, res) => {
    const { q } = req.query;
    try {
        const rows = transactionService_1.default.search(q || '');
        res.json(rows.map(row => ({
            id: row.id,
            date: row.date,
            category: row.category,
            category_id: row.category_id,
            description: row.description,
            amount: row.amount / 100, // Convert Satang to Baht
            group_type: row.group_type,
            allocation_type: row.allocation_type
        })));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.searchTransactions = searchTransactions;
const getFrequentItems = (req, res) => {
    try {
        const items = transactionService_1.default.getFrequentItems();
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getFrequentItems = getFrequentItems;
const predictCategories = (req, res) => {
    const { descriptions } = req.body;
    if (!Array.isArray(descriptions)) {
        return res.status(400).json({ error: 'descriptions must be an array' });
    }
    try {
        const predictions = {};
        for (const desc of descriptions) {
            const categoryId = transactionService_1.default.suggestCategory(desc);
            if (categoryId) {
                // Find category details
                const cat = db_1.default.prepare("SELECT name, id FROM categories WHERE id = ?").get(categoryId);
                predictions[desc] = cat ? { id: cat.id, name: cat.name } : null;
            }
            else {
                predictions[desc] = null;
            }
        }
        res.json(predictions);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.predictCategories = predictCategories;
