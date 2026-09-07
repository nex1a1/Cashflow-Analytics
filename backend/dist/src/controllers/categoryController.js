"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.upsertCategory = exports.getAllCategories = void 0;
const categoryService_1 = __importDefault(require("../services/categoryService"));
const categoryValidation_1 = require("../validations/categoryValidation");
const getAllCategories = (req, res, next) => {
    try {
        const rows = categoryService_1.default.getAll();
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
};
exports.getAllCategories = getAllCategories;
const upsertCategory = (req, res, next) => {
    try {
        const validatedData = categoryValidation_1.categorySchema.parse(req.body);
        categoryService_1.default.upsert(validatedData);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.upsertCategory = upsertCategory;
const deleteCategory = (req, res, next) => {
    try {
        categoryService_1.default.delete(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteCategory = deleteCategory;
