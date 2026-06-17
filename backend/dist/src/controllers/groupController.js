"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGroup = exports.upsertGroup = exports.getAllGroups = void 0;
const groupService_1 = __importDefault(require("../services/groupService"));
const groupValidation_1 = require("../validations/groupValidation");
const getAllGroups = (req, res) => {
    try {
        const rows = groupService_1.default.getAll();
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAllGroups = getAllGroups;
const upsertGroup = (req, res) => {
    try {
        const validatedData = groupValidation_1.groupSchema.parse(req.body);
        groupService_1.default.upsert(validatedData);
        res.json({ success: true });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation Error', details: err.errors });
        }
        res.status(500).json({ error: err.message });
    }
};
exports.upsertGroup = upsertGroup;
const deleteGroup = (req, res) => {
    try {
        groupService_1.default.delete(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteGroup = deleteGroup;
