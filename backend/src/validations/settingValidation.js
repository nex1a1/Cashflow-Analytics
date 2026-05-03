const { z } = require('zod');

const upsertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

module.exports = {
  upsertSettingSchema
};