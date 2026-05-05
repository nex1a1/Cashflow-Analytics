const { z } = require('zod');

const transactionSchema = z.object({
  id: z.coerce.string().min(1),
  date: z.string(), 
  category: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(), 
  description: z.string().nullable().optional().default(''),
  amount: z.coerce.number(),
  dayNote: z.string().nullable().optional().default(''),
  group_type: z.string().nullable().optional(), 
}).passthrough();

const upsertTransactionSchema = z.union([
  transactionSchema,
  z.array(transactionSchema)
]);

module.exports = {
  upsertTransactionSchema
};