"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const transactionController = __importStar(require("../controllers/transactionController"));
const calendarController = __importStar(require("../controllers/calendarController"));
const settingController = __importStar(require("../controllers/settingController"));
const backupController = __importStar(require("../controllers/backupController"));
const categoryController = __importStar(require("../controllers/categoryController"));
const groupController = __importStar(require("../controllers/groupController"));
const dayTypeController = __importStar(require("../controllers/dayTypeController"));
const analyticsController = __importStar(require("../controllers/analyticsController"));
// Transactions
router.get('/transactions', transactionController.getAllTransactions);
router.get('/transactions/search', transactionController.searchTransactions);
router.get('/transactions/periods', transactionController.getAvailablePeriods);
router.get('/transactions/frequent', transactionController.getFrequentItems);
router.post('/transactions/predict', transactionController.predictCategories);
router.post('/transactions', transactionController.upsertTransactions);
router.delete('/transactions/:id', transactionController.deleteTransaction);
router.delete('/transactions/month/:isoMonth', transactionController.deleteMonth);
// Calendar
router.get('/calendar', calendarController.getAllCalendarDays);
router.post('/calendar', calendarController.upsertCalendarDay);
// Day Types
router.get('/day-types', dayTypeController.getAllDayTypes);
router.post('/day-types', dayTypeController.upsertDayType);
router.delete('/day-types/:id', dayTypeController.deleteDayType);
// Categories
router.get('/categories', categoryController.getAllCategories);
router.post('/categories', categoryController.upsertCategory);
router.delete('/categories/:id', categoryController.deleteCategory);
// Groups
router.get('/groups', groupController.getAllGroups);
router.post('/groups', groupController.upsertGroup);
router.delete('/groups/:id', groupController.deleteGroup);
// Settings
router.get('/settings', settingController.getAllSettings);
router.post('/settings', settingController.upsertSetting);
// Analytics
router.get('/analytics', analyticsController.getDashboardAnalytics);
router.get('/analytics/sankey', analyticsController.getSankeyFlow);
// Backup
router.post('/backup', backupController.performBackup);
router.get('/backups', backupController.listBackups);
// Reset
router.delete('/reset-all', transactionController.resetAllData);
exports.default = router;
