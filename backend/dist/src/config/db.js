"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Since we are compiling to CommonJS, __dirname is globally available.
let DB_PATH = process.env.DB_PATH || path_1.default.join(__dirname, '../../data/cashflow.db');
// Override for Demo Mode
if (process.env.USE_DEMO_DB === 'true') {
    const dbDir = path_1.default.dirname(DB_PATH);
    DB_PATH = path_1.default.join(dbDir, 'cashflow_demo.db');
    console.warn('⚠️ ===================================================');
    console.warn('⚠️ WARNING: RUNNING IN DEMO MODE (cashflow_demo.db)');
    console.warn('⚠️ ===================================================');
}
// สร้าง directory ถ้ายังไม่มี
const dbDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
function openDatabase(dbPath) {
    const d = new better_sqlite3_1.default(dbPath, {
        verbose: (msg) => {
            const msgStr = typeof msg === 'string' ? msg : String(msg || '');
            if (/^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(msgStr.trim())) {
                console.log(`[DB MUTATION] ${msgStr}`);
            }
        }
    });
    // บังคับใช้โหมด DELETE แทน WAL เพื่อความเสถียรบน Docker Bind Mounts (Windows/macOS)
    try {
        d.pragma('journal_mode = DELETE');
        d.pragma('synchronous = FULL'); // มั่นใจว่าเขียนลงดิสก์แน่นอน
        d.pragma('busy_timeout = 5000');
        d.pragma('foreign_keys = ON');
    }
    catch (e) {
        console.warn('⚠️ Could not set DB pragmas:', e.message);
    }
    return d;
}
const db = openDatabase(DB_PATH);
console.log('✅ SQLite database connected at', DB_PATH);
console.log('🛡️ Persistence Mode: DELETE (Safe for Docker)');
exports.default = db;
