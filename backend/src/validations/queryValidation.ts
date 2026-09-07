import { z } from 'zod';

export const dateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in format YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in format YYYY-MM-DD').optional(),
});

export const analyticsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in format YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in format YYYY-MM-DD').optional(),
  excludeFuture: z.enum(['true', 'false']).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().max(200).optional().default(''),
});

export const monthParamSchema = z.object({
  isoMonth: z.string().regex(/^\d{4}-\d{2}$/, 'isoMonth must be in format YYYY-MM'),
});
