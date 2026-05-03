const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transactionController');
const calendarController = require('../controllers/calendarController');
const settingController = require('../controllers/settingController');
const backupController = require('../controllers/backupController');

// Transactions
router.get('/transactions', transactionController.getAllTransactions);
router.post('/transactions', transactionController.upsertTransactions);
router.delete('/transactions/:id', transactionController.deleteTransaction);
router.delete('/transactions/month/:isoMonth', transactionController.deleteMonth);

// Calendar
router.get('/calendar', calendarController.getAllCalendarDays);
router.post('/calendar', calendarController.upsertCalendarDay);

// Settings
router.get('/settings', settingController.getAllSettings);
router.post('/settings', settingController.upsertSetting);

// Backup
router.post('/backup', backupController.performBackup);
router.get('/backups', backupController.listBackups);

// Reset
router.delete('/reset-all', transactionController.resetAllData);

module.exports = router;