const { z } = require('zod');

const calendarDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  type_id: z.string().min(1, "Type ID is required"),
  note: z.string().nullable().optional()
}).passthrough();

module.exports = {
  calendarDaySchema
};
