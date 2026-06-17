"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayTypeSchema = void 0;
const zod_1 = require("zod");
exports.dayTypeSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "ID is required"),
    name: zod_1.z.string().optional().default(''),
    label: zod_1.z.string().min(1, "Label is required"),
    color: zod_1.z.string().nullable().optional(),
    order_index: zod_1.z.number().int().optional().default(0)
}).passthrough();
