const express = require('express');
const cors = require('cors');
const { initSchema } = require('./src/models/schema');
const { migrateDates } = require('./src/models/migration');
const apiRoutes = require('./src/routes/api');
const { performBackup } = require('./src/controllers/backupController');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Database Schema & Run Migrations
initSchema();
migrateDates();

// Auto-backup on startup (optional but recommended)
console.log('📦 Initializing auto-backup...');
performBackup({}, { status: () => ({ json: () => {} }) });

// Routes
app.use('/api', apiRoutes);

// Port setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend modular server running on port ${PORT}`);
});