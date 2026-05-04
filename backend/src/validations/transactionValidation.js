const { z } = require('zod');

const transactionSchema = z.object({
  id: z.string().min(1),
  date: z.string(), // Allow both DD/MM/YYYY and YYYY-MM-DD
  category: z.string().optional(),
  category_id: z.number().optional(),
  description: z.string().optional().default(''),
  amount: z.number(),
  dayNote: z.string().optional().default(''),
});

const upsertTransactionSchema = z.union([
  transactionSchema,
  z.array(transactionSchema)
]);

module.exports = {
  upsertTransactionSchema
};