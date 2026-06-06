import { z } from 'zod';

export const dayTypeSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().optional().default(''),
  label: z.string().min(1, "Label is required"),
  color: z.string().nullable().optional(),
  order_index: z.number().int().optional().default(0)
}).passthrough();
