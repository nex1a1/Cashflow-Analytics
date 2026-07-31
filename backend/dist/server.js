"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const schema_1 = require("./src/models/schema");
const api_1 = __importDefault(require("./src/routes/api"));
const backupController_1 = require("./src/controllers/backupController");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
// Initialize Database Schema
(0, schema_1.initSchema)();
// Auto-backup on startup (optional but recommended)
console.log('📦 Initializing auto-backup...');
(0, backupController_1.performBackup)({}, { status: () => ({ json: () => { } }) });
// Routes
app.use('/api', api_1.default);
// Static Frontend Asset Serving
const isPkg = Boolean(process.pkg);
const execDir = isPkg ? path_1.default.dirname(process.execPath) : process.cwd();
const staticDirs = [
    path_1.default.join(__dirname, 'frontend_dist'),
    path_1.default.join(__dirname, '../frontend/dist'),
    path_1.default.join(execDir, 'frontend_dist'),
    path_1.default.join(process.cwd(), 'frontend_dist')
];
let activeStaticDir = staticDirs.find(d => {
    try {
        return fs_1.default.existsSync(d) && fs_1.default.existsSync(path_1.default.join(d, 'index.html'));
    }
    catch (e) {
        return false;
    }
});
if (activeStaticDir) {
    console.log(`🌐 Serving Web Client from: ${activeStaticDir}`);
    app.use(express_1.default.static(activeStaticDir));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api'))
            return next();
        res.sendFile(path_1.default.join(activeStaticDir, 'index.html'));
    });
}
else {
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
        (0, child_process_1.exec)(startCmd, (err) => {
            if (!err)
                console.log(`🚀 Auto-opened browser at ${serverUrl}`);
        });
    }
});
// Interactive terminal shortcut listener
if (process.stdin.isTTY) {
    try {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (key) => {
            const k = key.toLowerCase();
            if (k === 'o') {
                const startCmd = process.platform === 'win32' ? `start ${serverUrl}` :
                    process.platform === 'darwin' ? `open ${serverUrl}` : `xdg-open ${serverUrl}`;
                (0, child_process_1.exec)(startCmd);
                console.log(`\n🌐 Opening browser at ${serverUrl}...`);
            }
            else if (k === 'b') {
                console.log('\n📦 Triggering manual database backup...');
                (0, backupController_1.performBackup)({}, { status: () => ({ json: (data) => console.log('✅ Backup result:', data) }) });
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
