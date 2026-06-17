"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.upsertCategory = exports.getAllCategories = void 0;
const categoryService_1 = __importDefault(require("../services/categoryService"));
const categoryValidation_1 = require("../validations/categoryValidation");
const getAllCategories = (req, res) => {
    try {
        const rows = categoryService_1.default.getAll();
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAllCategories = getAllCategories;
const upsertCategory = (req, res) => {
    try {
        const validatedData = categoryValidation_1.categorySchema.parse(req.body);
        categoryService_1.default.upsert(validatedData);
        res.json({ success: true });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation Error', details: err.errors });
        }
        res.status(500).json({ error: err.message });
    }
};
exports.upsertCategory = upsertCategory;
const deleteCategory = (req, res) => {
    try {
        categoryService_1.default.delete(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteCategory = deleteCategory;
