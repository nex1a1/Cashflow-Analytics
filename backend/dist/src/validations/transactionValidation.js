"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertTransactionSchema = void 0;
const zod_1 = require("zod");
const transactionSchema = zod_1.z.object({
    id: zod_1.z.coerce.string().min(1),
    date: zod_1.z.string(),
    category: zod_1.z.string().nullable().optional(),
    category_id: zod_1.z.any().nullable().optional(),
    description: zod_1.z.string().nullable().optional().default(''),
    amount: zod_1.z.coerce.number(),
    allocation_type: zod_1.z.enum(['need', 'want', 'savings']).nullable().optional().default('want'),
    dayNote: zod_1.z.string().nullable().optional().default(''),
    group_type: zod_1.z.string().nullable().optional(),
}).passthrough();
exports.upsertTransactionSchema = zod_1.z.union([
    transactionSchema,
    zod_1.z.array(transactionSchema)
]);
