const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transactionController');
const calendarController = require('../controllers/calendarController');
const settingController = require('../controllers/settingController');
const backupController = require('../controllers/backupController');
const categoryController = require('../controllers/categoryController');
const groupController = require('../controllers/groupController');
const dayTypeController = require('../controllers/dayTypeController');
const analyticsController = require('../controllers/analyticsController');

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

module.exports = router;
