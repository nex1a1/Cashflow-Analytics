"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const schema_1 = require("./src/models/schema");
const api_1 = __importDefault(require("./src/routes/api"));
const backupService_1 = __importDefault(require("./src/services/backupService"));
const db_1 = __importDefault(require("./src/config/db"));
const app = (0, express_1.default)();
// Security Middlewares (Helmet & Restricted CORS)
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disabled to prevent blocking inline charts and dev scripts
    crossOriginEmbedderPolicy: false,
}));
const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : defaultAllowedOrigins;
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow local CLI/curl, same-origin, or trusted frontend origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '5mb' }));
// Initialize Database Schema
(0, schema_1.initSchema)();
// Auto-backup on startup
console.log('📦 Initializing auto-backup...');
backupService_1.default.createBackup().catch(err => {
    console.warn('⚠️ Startup auto-backup failed:', err.message);
});
// Routes
app.use('/api', api_1.default);
// Static Frontend Asset Serving (Production Build)
const frontendDist = path_1.default.join(__dirname, '../frontend/dist');
if (fs_1.default.existsSync(frontendDist) && fs_1.default.existsSync(path_1.default.join(frontendDist, 'index.html'))) {
    console.log(`🌐 Serving Web Client from: ${frontendDist}`);
    app.use(express_1.default.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api'))
            return next();
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
// Global Error Handler
app.use((err, _req, res, _next) => {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation Error', details: err.errors });
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
const gracefulShutdown = (signal) => {
    if (isShuttingDown)
        return;
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
        }
        else {
            console.log('✅ HTTP server closed.');
        }
        try {
            db_1.default.close();
            console.log('✅ SQLite database connection closed.');
        }
        catch (dbErr) {
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
        process.stdin.on('data', (key) => {
            const k = key.toLowerCase();
            if (k === 'b') {
                console.log('\n📦 Triggering manual database backup...');
                backupService_1.default.createBackup()
                    .then(data => console.log('✅ Backup result:', data))
                    .catch(err => console.error('❌ Backup failed:', err.message));
            }
            else if (k === 'q' || key === '\u0003') { // q or Ctrl+C
                gracefulShutdown('KEYBOARD_QUIT');
            }
        });
    }
    catch (err) {
        // Raw mode not supported in non-TTY environments (e.g. background services)
    }
}
