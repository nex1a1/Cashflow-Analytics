import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { initSchema } from './src/models/schema';
import apiRoutes from './src/routes/api';
import backupService from './src/services/backupService';
import db from './src/config/db';
import { auditLogger } from './src/middleware/auditLogger';
import { ApiError } from './src/middleware/ApiError';
import { errorHandler } from './src/middleware/errorHandler';
import { log } from './src/utils/logger';

const app = express();

// Security Middlewares (Helmet & Restricted CORS)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to prevent blocking inline charts and dev scripts
  crossOriginEmbedderPolicy: false,
}));

const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5172', 'http://127.0.0.1:5172', 'http://localhost:3000'];
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : defaultAllowedOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow local CLI/curl, same-origin, or trusted frontend origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new ApiError(403, `Origin ${origin} not allowed by CORS`));
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
backupService.createBackup().catch(err => {
  log.warn('backup', `สำรองข้อมูลตอนเริ่มระบบไม่สำเร็จ: ${err.message}`);
});

// Routes
app.use('/api', apiRoutes);

// Static Frontend Asset Serving (Production Build)
const frontendDist = process.env.PUBLIC_DIR || path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist) && fs.existsSync(path.join(frontendDist, 'index.html'))) {
  log.info('app', `เสิร์ฟหน้าเว็บจาก ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Port setup
const PORT = process.env.PORT || 3000;
const serverUrl = `http://localhost:${PORT}`;

const server = app.listen(PORT, () => {
  log.info('app', `Cashflow Shark พร้อมใช้งานที่ ${serverUrl}`);
  // ปุ่มลัดใช้ได้เฉพาะตอนรันในเทอร์มินัลจริง (ใน Docker ไม่มี TTY)
  if (process.stdin.isTTY) log.info('app', 'ปุ่มลัด: [B] สำรองข้อมูล · [Q] ปิดระบบ');
});

// Graceful Shutdown Handler
let isShuttingDown = false;
const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log.info('app', `ได้รับ ${signal} กำลังปิดระบบ…`);

  // Force exit fallback timeout (5s)
  const forceExitTimeout = setTimeout(() => {
    log.warn('app', 'ปิดไม่ทันใน 5 วินาที บังคับปิด');
    process.exit(1);
  }, 5000);
  forceExitTimeout.unref();

  server.close((err) => {
    if (err) log.error('app', 'ปิด HTTP server ไม่สำเร็จ:', err);

    try {
      db.close();
    } catch (dbErr: any) {
      log.error('db', 'ปิดฐานข้อมูลไม่สำเร็จ:', dbErr?.message || dbErr);
    }

    log.info('app', 'ปิดระบบเรียบร้อย');
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
        backupService.createBackup()
          .catch(err => log.error('backup', `สำรองข้อมูลไม่สำเร็จ: ${err.message}`));
      } else if (k === 'q' || key === '\u0003') { // q or Ctrl+C
        gracefulShutdown('KEYBOARD_QUIT');
      }
    });
  } catch (err) {
    // Raw mode not supported in non-TTY environments (e.g. background services)
  }
}

export {};

