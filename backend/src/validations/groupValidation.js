const { z } = require('zod');

const groupSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  type: z.enum(['income', 'expense', 'savings'], {
    errorMap: () => ({ message: "Type must be 'income', 'expense', or 'savings'" })
  }),
  order_index: z.number().int().optional().default(0),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  highlightBg: z.boolean().or(z.number().min(0).max(1)).optional().default(false)
}).passthrough();

module.exports = {
  groupSchema
};
