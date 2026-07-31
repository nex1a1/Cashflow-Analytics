import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
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

// Static Frontend Asset Serving
const isPkg = Boolean((process as any).pkg);
const execDir = isPkg ? path.dirname(process.execPath) : process.cwd();

const staticDirs = [
  path.join(__dirname, 'frontend_dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(execDir, 'frontend_dist'),
  path.join(process.cwd(), 'frontend_dist')
];

let activeStaticDir = staticDirs.find(d => {
  try {
    return fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html'));
  } catch (e) {
    return false;
  }
});

if (activeStaticDir) {
  console.log(`🌐 Serving Web Client from: ${activeStaticDir}`);
  app.use(express.static(activeStaticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(activeStaticDir!, 'index.html'));
  });
} else {
  console.warn('⚠️ Warning: Web Client static directory not found!');
}

// Port setup
const PORT = process.env.PORT || 3000;
const serverUrl = `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log('\n====================================================================');
  console.log('🦈 CASHFLOW SHARK - ELITE FINANCIAL INTELLIGENCE');
  console.log('====================================================================');
  console.log(`[STATUS] 🟢 Server Active  : ${serverUrl}`);
  if (activeStaticDir) {
    console.log(`[STATUS] 🟢 Web UI Loaded   : Integrated (Single Port)`);
  }
  console.log('--------------------------------------------------------------------');
  console.log('  Shortcuts: [O] Re-open Browser  |  [B] Manual Backup  |  [Q] Exit');
  console.log('====================================================================\n');

  // Auto open browser in Windows environment
  if (process.env.NO_AUTO_OPEN !== 'true') {
    const startCmd = process.platform === 'win32' ? `start ${serverUrl}` :
                     process.platform === 'darwin' ? `open ${serverUrl}` : `xdg-open ${serverUrl}`;
    exec(startCmd, (err) => {
      if (!err) console.log(`🚀 Auto-opened browser at ${serverUrl}`);
    });
  }
});

// Interactive terminal shortcut listener
if (process.stdin.isTTY) {
  try {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key: string) => {
      const k = key.toLowerCase();
      if (k === 'o') {
        const startCmd = process.platform === 'win32' ? `start ${serverUrl}` :
                         process.platform === 'darwin' ? `open ${serverUrl}` : `xdg-open ${serverUrl}`;
        exec(startCmd);
        console.log(`\n🌐 Opening browser at ${serverUrl}...`);
      } else if (k === 'b') {
        console.log('\n📦 Triggering manual database backup...');
        performBackup({}, { status: () => ({ json: (data: any) => console.log('✅ Backup result:', data) }) } as any);
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

