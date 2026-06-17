"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarDaySchema = void 0;
const zod_1 = require("zod");
exports.calendarDaySchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    type_id: zod_1.z.string().min(1, "Type ID is required"),
    note: zod_1.z.string().nullable().optional()
}).passthrough();
