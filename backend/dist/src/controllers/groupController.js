"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGroup = exports.upsertGroup = exports.getAllGroups = void 0;
const groupService_1 = __importDefault(require("../services/groupService"));
const groupValidation_1 = require("../validations/groupValidation");
const getAllGroups = (req, res, next) => {
    try {
        const rows = groupService_1.default.getAll();
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
};
exports.getAllGroups = getAllGroups;
const upsertGroup = (req, res, next) => {
    try {
        const validatedData = groupValidation_1.groupSchema.parse(req.body);
        groupService_1.default.upsert(validatedData);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.upsertGroup = upsertGroup;
const deleteGroup = (req, res, next) => {
    try {
        groupService_1.default.delete(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteGroup = deleteGroup;
