"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDayType = exports.upsertDayType = exports.getAllDayTypes = void 0;
const dayTypeService_1 = __importDefault(require("../services/dayTypeService"));
const dayTypeValidation_1 = require("../validations/dayTypeValidation");
const getAllDayTypes = (req, res, next) => {
    try {
        const rows = dayTypeService_1.default.getAll();
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
};
exports.getAllDayTypes = getAllDayTypes;
const upsertDayType = (req, res, next) => {
    try {
        const validatedData = dayTypeValidation_1.dayTypeSchema.parse(req.body);
        dayTypeService_1.default.upsert(validatedData);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.upsertDayType = upsertDayType;
const deleteDayType = (req, res, next) => {
    try {
        dayTypeService_1.default.delete(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteDayType = deleteDayType;
