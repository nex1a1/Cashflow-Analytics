import { z } from 'zod';

export const itemStatusSchema = z.enum([
  'planned',
  'cancelled',
  'purchased',
  'stored',
  'broken',
  'sold'
]);

export const createItemSchema = z.object({
  category_id: z.number().int().positive('Category ID must be a positive integer'),
  name: z.string().trim().min(1, 'Item name is required').max(200),
  brand_model: z.string().trim().max(200).nullable().optional(),
  source: z.string().trim().max(200).nullable().optional(),
  status: itemStatusSchema.default('planned'),
  price: z.number().min(0).nullable().optional(), // Price in Baht (converted to Satang internally)
  price_satang: z.number().int().min(0).nullable().optional(),
  purchased_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'purchased_at must be YYYY-MM-DD').nullable().optional(),
  broken_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'broken_at must be YYYY-MM-DD').nullable().optional(),
  warranty_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'warranty_until must be YYYY-MM-DD').nullable().optional(),
  priority: z.number().int().min(0).max(10).default(0),
  description: z.string().max(2000).nullable().optional(),
});

export const updateItemSchema = z.object({
  category_id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  brand_model: z.string().trim().max(200).nullable().optional(),
  source: z.string().trim().max(200).nullable().optional(),
  status: itemStatusSchema.optional(),
  price: z.number().min(0).nullable().optional(),
  price_satang: z.number().int().min(0).nullable().optional(),
  purchased_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  broken_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  warranty_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  priority: z.number().int().min(0).max(10).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const updateItemStatusSchema = z.object({
  status: itemStatusSchema,
  purchased_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  broken_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const linkTransactionsSchema = z.object({
  transaction_ids: z.array(z.string().min(1)).min(1, 'At least one transaction ID is required'),
});

export const itemCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
});
