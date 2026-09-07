"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = exports.performBackup = void 0;
const backupService_1 = __importDefault(require("../services/backupService"));
const performBackup = async (_req, res, next) => {
    try {
        const result = await backupService_1.default.createBackup();
        res.status(200).json({
            success: true,
            message: 'Backup completed successfully',
            filename: result.filename
        });
    }
    catch (err) {
        next(err);
    }
};
exports.performBackup = performBackup;
const listBackups = (_req, res, next) => {
    try {
        const files = backupService_1.default.listBackups();
        res.json(files);
    }
    catch (err) {
        next(err);
    }
};
exports.listBackups = listBackups;
