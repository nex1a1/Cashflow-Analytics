"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardAnalytics = void 0;
const analyticsService_1 = __importDefault(require("../services/analyticsService"));
const getDashboardAnalytics = (req, res) => {
    const { startDate, endDate, excludeFuture } = req.query;
    const isExcludeFuture = excludeFuture === 'true';
    try {
        const summary = analyticsService_1.default.getSummary(startDate, endDate, isExcludeFuture);
        const categories = analyticsService_1.default.getCategoryBreakdown(startDate, endDate, isExcludeFuture);
        const monthly = analyticsService_1.default.getMonthlyAggregation(startDate, endDate, isExcludeFuture);
        const workLife = analyticsService_1.default.getWorkLifeAnalysis(startDate, endDate, isExcludeFuture);
        res.json({
            summary,
            categories,
            monthly,
            workLife
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getDashboardAnalytics = getDashboardAnalytics;
