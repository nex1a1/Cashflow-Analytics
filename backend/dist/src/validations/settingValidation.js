"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertSettingSchema = void 0;
const zod_1 = require("zod");
exports.upsertSettingSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    value: zod_1.z.any(),
});
