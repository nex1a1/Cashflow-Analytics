"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const schema_1 = require("./src/models/schema");
const api_1 = __importDefault(require("./src/routes/api"));
const backupService_1 = __importDefault(require("./src/services/backupService"));
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)());
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
        process.stdin.on('data', (key) => {
            const k = key.toLowerCase();
            if (k === 'b') {
                console.log('\n📦 Triggering manual database backup...');
                backupService_1.default.createBackup()
                    .then(data => console.log('✅ Backup result:', data))
                    .catch(err => console.error('❌ Backup failed:', err.message));
            }
            else if (k === 'q' || key === '\u0003') { // q or Ctrl+C
                console.log('\n👋 Shutting down Cashflow Shark. Goodbye!');
                process.exit(0);
            }
        });
    }
    catch (err) {
        // Raw mode not supported in non-TTY environments (e.g. background services)
    }
}
