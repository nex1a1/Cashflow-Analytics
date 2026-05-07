const { z } = require('zod');

const categorySchema = z.object({
  id: z.string().optional(), // Can be undefined on initial creation
  name: z.string().min(1, "Name is required"),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  is_fixed: z.boolean().or(z.number().min(0).max(1)).optional().default(false),
  order_index: z.number().int().optional().default(0),
  cashflow_group_id: z.string().min(1, "Cashflow Group ID is required")
}).passthrough();

module.exports = {
  categorySchema
};
