"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupSchema = void 0;
const zod_1 = require("zod");
exports.groupSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "ID is required"),
    name: zod_1.z.string().min(1, "Name is required"),
    type: zod_1.z.enum(['income', 'expense', 'savings'], {
        message: "Type must be 'income', 'expense', or 'savings'"
    }),
    allocation_type: zod_1.z.enum(['need', 'want', 'savings']).optional().default('want'),
    order_index: zod_1.z.number().int().optional().default(0),
    color: zod_1.z.string().nullable().optional(),
    icon: zod_1.z.string().nullable().optional(),
    highlightBg: zod_1.z.boolean().or(zod_1.z.number().min(0).max(1)).optional().default(false)
}).passthrough();
