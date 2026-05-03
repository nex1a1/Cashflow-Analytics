const { z } = require('zod');

const transactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in DD/MM/YYYY format'),
  category: z.string().min(1),
  description: z.string().optional().default(''),
  amount: z.number().positive(),
  dayNote: z.string().optional().default(''),
});

const upsertTransactionSchema = z.union([
  transactionSchema,
  z.array(transactionSchema)
]);

module.exports = {
  upsertTransactionSchema
};