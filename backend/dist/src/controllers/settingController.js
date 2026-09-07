"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertSetting = exports.getAllSettings = void 0;
const settingService_1 = __importDefault(require("../services/settingService"));
const settingValidation_1 = require("../validations/settingValidation");
const getAllSettings = (req, res, next) => {
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
        next(err);
    }
};
exports.getAllSettings = getAllSettings;
const upsertSetting = (req, res, next) => {
    try {
        const { key, value } = settingValidation_1.upsertSettingSchema.parse(req.body);
        settingService_1.default.upsert(key, value);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.upsertSetting = upsertSetting;
