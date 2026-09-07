"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertCalendarDay = exports.getAllCalendarDays = void 0;
const calendarService_1 = __importDefault(require("../services/calendarService"));
const calendarValidation_1 = require("../validations/calendarValidation");
const getAllCalendarDays = (req, res, next) => {
    try {
        const rows = calendarService_1.default.getAll();
        const data = rows.map(row => ({
            date: row.date,
            type_id: row.day_type_id,
            note: row.note,
            type_label: row.type_label,
            type_color: row.type_color
        }));
        res.json(data);
    }
    catch (err) {
        next(err);
    }
};
exports.getAllCalendarDays = getAllCalendarDays;
const upsertCalendarDay = (req, res, next) => {
    try {
        const validatedData = calendarValidation_1.calendarDaySchema.parse(req.body);
        calendarService_1.default.upsert(validatedData.date, validatedData.type_id, validatedData.note || '');
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.upsertCalendarDay = upsertCalendarDay;
