"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
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
// Port setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Backend modular server running on port ${PORT}`);
});
