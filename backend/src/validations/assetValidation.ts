import { z } from 'zod';

export const assetSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, 'ต้องมีชื่อสินทรัพย์'),
  kind: z.enum(['gold_bar', 'gold_ornament', 'us_stock', 'th_stock', 'crypto', 'fund', 'other']),
  symbol: z.string().trim().nullable().optional(),
  unit_label: z.string().trim().nullable().optional(),
});

export const manualPriceSchema = z.object({
  price: z.coerce.number().positive('ราคาต้องมากกว่า 0'),
});

/** ทดสอบสัญลักษณ์/ประเภทก่อนบันทึก — ไม่เขียนอะไรลงฐานข้อมูล */
export const pricePreviewSchema = z.object({
  kind: assetSchema.shape.kind,
  symbol: z.string().trim().nullable().optional(),
});
