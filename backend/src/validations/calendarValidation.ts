import { z } from 'zod';

export const calendarDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  type_id: z.string().min(1, "Type ID is required"),
  note: z.string().max(200, "Note must be at most 200 characters").nullable().optional(),
  note_icon: z.string().max(40, "Icon key must be at most 40 characters").nullable().optional()
}).loose();
