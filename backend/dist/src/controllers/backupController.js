"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = exports.performBackup = void 0;
const backupService_1 = __importDefault(require("../services/backupService"));
const performBackup = async (_req, res) => {
    try {
        const result = await backupService_1.default.createBackup();
        res.status(200).json({
            success: true,
            message: 'Backup completed successfully',
            filename: result.filename
        });
    }
    catch (error) {
        console.error('Backup Error:', error);
        res.status(500).json({
            success: false,
            message: 'Backup failed: ' + error.message
        });
    }
};
exports.performBackup = performBackup;
const listBackups = (_req, res) => {
    try {
        const files = backupService_1.default.listBackups();
        res.json(files);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.listBackups = listBackups;
