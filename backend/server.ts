import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initSchema } from './src/models/schema';
import apiRoutes from './src/routes/api';
import backupService from './src/services/backupService';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Initialize Database Schema
initSchema();

// Auto-backup on startup
console.log('📦 Initializing auto-backup...');
backupService.createBackup().catch(err => {
  console.warn('⚠️ Startup auto-backup failed:', err.message);
});

// Routes
app.use('/api', apiRoutes);

// Static Frontend Asset Serving (Production Build)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist) && fs.existsSync(path.join(frontendDist, 'index.html'))) {
  console.log(`🌐 Serving Web Client from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err && typeof err === 'object' && 'name' in err && (err as any).name === 'ZodError') {
    return res.status(400).json({ error: 'Validation Error', details: (err as any).errors });
  }
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('[API Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Port setup
const PORT = process.env.PORT || 3000;
const serverUrl = `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log('\n====================================================================');
  console.log('🦈 CASHFLOW SHARK - ELITE FINANCIAL INTELLIGENCE');
  console.log('====================================================================');
  console.log(`[STATUS] 🟢 Server Active  : ${serverUrl}`);
  console.log('--------------------------------------------------------------------');
  console.log('  Shortcuts: [B] Manual Backup  |  [Q] Exit');
  console.log('====================================================================\n');
});

// Interactive terminal shortcut listener
if (process.stdin.isTTY) {
  try {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key: string) => {
      const k = key.toLowerCase();
      if (k === 'b') {
        console.log('\n📦 Triggering manual database backup...');
        backupService.createBackup()
          .then(data => console.log('✅ Backup result:', data))
          .catch(err => console.error('❌ Backup failed:', err.message));
      } else if (k === 'q' || key === '\u0003') { // q or Ctrl+C
        console.log('\n👋 Shutting down Cashflow Shark. Goodbye!');
        process.exit(0);
      }
    });
  } catch (err) {
    // Raw mode not supported in non-TTY environments (e.g. background services)
  }
}

export {};

