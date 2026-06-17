"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorySchema = void 0;
const zod_1 = require("zod");
exports.categorySchema = zod_1.z.object({
    id: zod_1.z.string().optional(), // Can be undefined on initial creation
    name: zod_1.z.string().min(1, "Name is required"),
    icon: zod_1.z.string().nullable().optional(),
    color: zod_1.z.string().nullable().optional(),
    order_index: zod_1.z.number().int().optional().default(0),
    cashflow_group_id: zod_1.z.string().min(1, "Cashflow Group ID is required")
}).passthrough();
