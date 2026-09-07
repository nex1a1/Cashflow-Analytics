import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { initSchema } from './src/models/schema';
import apiRoutes from './src/routes/api';
import backupService from './src/services/backupService';
import db from './src/config/db';
import { auditLogger } from './src/middleware/auditLogger';

const app = express();

// Security Middlewares (Helmet & Restricted CORS)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to prevent blocking inline charts and dev scripts
  crossOriginEmbedderPolicy: false,
}));

const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : defaultAllowedOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow local CLI/curl, same-origin, or trusted frontend origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Audit Logging Middleware (Tracks WHO, WHAT, WHERE, HOW with zero truncation)
app.use(auditLogger);

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

const server = app.listen(PORT, () => {
  console.log('\n====================================================================');
  console.log('🦈 CASHFLOW SHARK - ELITE FINANCIAL INTELLIGENCE');
  console.log('====================================================================');
  console.log(`[STATUS] 🟢 Server Active  : ${serverUrl}`);
  console.log('--------------------------------------------------------------------');
  console.log('  Shortcuts: [B] Manual Backup  |  [Q] Exit');
  console.log('====================================================================\n');
});

// Graceful Shutdown Handler
let isShuttingDown = false;
const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 [${signal}] Initiating graceful shutdown...`);

  // Force exit fallback timeout (5s)
  const forceExitTimeout = setTimeout(() => {
    console.error('⚠️ Forcing process exit after shutdown timeout.');
    process.exit(1);
  }, 5000);
  forceExitTimeout.unref();

  server.close((err) => {
    if (err) {
      console.error('❌ Error closing HTTP server:', err);
    } else {
      console.log('✅ HTTP server closed.');
    }

    try {
      db.close();
      console.log('✅ SQLite database connection closed.');
    } catch (dbErr: any) {
      console.error('❌ Error closing SQLite database:', dbErr?.message || dbErr);
    }

    console.log('👋 Cashflow Shark shutdown complete. Goodbye!\n');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
        gracefulShutdown('KEYBOARD_QUIT');
      }
    });
  } catch (err) {
    // Raw mode not supported in non-TTY environments (e.g. background services)
  }
}

export {};

