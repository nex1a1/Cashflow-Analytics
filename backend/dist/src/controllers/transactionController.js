"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictCategories = exports.getFrequentItems = exports.searchTransactions = exports.getAvailablePeriods = exports.resetAllData = exports.deleteMonth = exports.deleteTransaction = exports.upsertTransactions = exports.getAllTransactions = void 0;
const transactionService_1 = __importDefault(require("../services/transactionService"));
const categoryService_1 = __importDefault(require("../services/categoryService"));
const transactionValidation_1 = require("../validations/transactionValidation");
const getAllTransactions = (req, res, next) => {
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
        next(err);
    }
};
exports.getAllTransactions = getAllTransactions;
const upsertTransactions = (req, res, next) => {
    try {
        const validatedData = transactionValidation_1.upsertTransactionSchema.parse(req.body);
        const items = Array.isArray(validatedData) ? validatedData : [validatedData];
        transactionService_1.default.upsertMany(items);
        res.json({ success: true, count: items.length });
    }
    catch (err) {
        next(err);
    }
};
exports.upsertTransactions = upsertTransactions;
const deleteTransaction = (req, res, next) => {
    const { id } = req.params;
    try {
        const result = transactionService_1.default.delete(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteTransaction = deleteTransaction;
const deleteMonth = (req, res, next) => {
    const { isoMonth } = req.params; // Expecting YYYY-MM
    try {
        transactionService_1.default.deleteByMonth(isoMonth);
        res.json({ success: true, message: `Deleted data for ${isoMonth}` });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteMonth = deleteMonth;
const resetAllData = (req, res, next) => {
    if (req.headers['x-confirm-reset'] !== 'true') {
        return res.status(400).json({ error: 'Confirmation required. Send X-Confirm-Reset: true header.' });
    }
    try {
        transactionService_1.default.deleteAll();
        res.json({ success: true, message: 'All data cleared successfully' });
    }
    catch (err) {
        next(err);
    }
};
exports.resetAllData = resetAllData;
const getAvailablePeriods = (req, res, next) => {
    try {
        const periods = transactionService_1.default.getAvailablePeriods();
        res.json(periods);
    }
    catch (err) {
        next(err);
    }
};
exports.getAvailablePeriods = getAvailablePeriods;
const searchTransactions = (req, res, next) => {
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
        next(err);
    }
};
exports.searchTransactions = searchTransactions;
const getFrequentItems = (req, res, next) => {
    try {
        const items = transactionService_1.default.getFrequentItems();
        res.json(items);
    }
    catch (err) {
        next(err);
    }
};
exports.getFrequentItems = getFrequentItems;
const predictCategories = (req, res, next) => {
    const { descriptions } = req.body;
    if (!Array.isArray(descriptions)) {
        return res.status(400).json({ error: 'descriptions must be an array' });
    }
    try {
        const predictions = {};
        for (const desc of descriptions) {
            const categoryId = transactionService_1.default.suggestCategory(desc);
            if (categoryId) {
                // Find category details via service
                const cat = categoryService_1.default.getById(categoryId);
                predictions[desc] = cat ? { id: cat.id, name: cat.name } : null;
            }
            else {
                predictions[desc] = null;
            }
        }
        res.json(predictions);
    }
    catch (err) {
        next(err);
    }
};
exports.predictCategories = predictCategories;
