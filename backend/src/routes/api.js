const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transactionController');
const calendarController = require('../controllers/calendarController');
const settingController = require('../controllers/settingController');
const backupController = require('../controllers/backupController');

// Transactions
router.get('/transactions', transactionController.getAllTransactions);
router.post('/transactions', transactionController.upsertTransactions);
router.delete('/transactions', transactionController.deleteAllTransactions);
router.delete('/transactions/:id', transactionController.deleteTransactionById);

// Calendar
router.get('/calendar', calendarController.getCalendar);
router.post('/calendar', calendarController.upsertCalendar);

// Settings
router.get('/settings', settingController.getSettings);
router.post('/settings', settingController.upsertSetting);

// Backup
router.post('/backup', backupController.performBackup);
router.get('/backups', backupController.listBackups);

// Reset
router.delete('/reset-all', transactionController.resetAllData);

module.exports = router;