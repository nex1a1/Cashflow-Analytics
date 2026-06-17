"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertSetting = exports.getAllSettings = void 0;
const settingService_1 = __importDefault(require("../services/settingService"));
const settingValidation_1 = require("../validations/settingValidation");
const getAllSettings = (req, res) => {
    try {
        const rows = settingService_1.default.getAll();
        const settings = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            }
            catch (e) {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAllSettings = getAllSettings;
const upsertSetting = (req, res) => {
    try {
        const { key, value } = settingValidation_1.upsertSettingSchema.parse(req.body);
        settingService_1.default.upsert(key, value);
        res.json({ success: true });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation failed', details: err.errors });
        }
        res.status(500).json({ error: err.message });
    }
};
exports.upsertSetting = upsertSetting;
