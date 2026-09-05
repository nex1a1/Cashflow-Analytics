import { z } from 'zod';

const transactionSchema = z.object({
  id: z.coerce.string().min(1),
  date: z.string(), 
  category: z.string().nullable().optional(),
  category_id: z.any().nullable().optional(), 
  description: z.string().nullable().optional().default(''),
  amount: z.coerce.number(),
  allocation_type: z.enum(['need', 'want', 'savings']).nullable().optional().default('want'),
  dayNote: z.string().nullable().optional().default(''),
  group_type: z.string().nullable().optional(), 
}).loose();

export const upsertTransactionSchema = z.union([
  transactionSchema,
  z.array(transactionSchema)
]);
