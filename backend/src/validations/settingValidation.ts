import { z } from 'zod';

export const upsertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});
