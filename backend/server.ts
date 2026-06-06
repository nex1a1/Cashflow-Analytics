import express from 'express';
import cors from 'cors';
import { initSchema } from './src/models/schema';
import apiRoutes from './src/routes/api';
import { performBackup } from './src/controllers/backupController';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Database Schema
initSchema();

// Auto-backup on startup (optional but recommended)
console.log('📦 Initializing auto-backup...');
performBackup({}, { status: () => ({ json: () => {} }) } as any);

// Routes
app.use('/api', apiRoutes);

// Port setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend modular server running on port ${PORT}`);
});
export {};
