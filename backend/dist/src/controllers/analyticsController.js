"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSankeyFlow = exports.getDashboardAnalytics = void 0;
const analyticsService_1 = __importDefault(require("../services/analyticsService"));
const getDashboardAnalytics = (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const summary = analyticsService_1.default.getSummary(startDate, endDate);
        const categories = analyticsService_1.default.getCategoryBreakdown(startDate, endDate);
        const monthly = analyticsService_1.default.getMonthlyAggregation(startDate, endDate);
        const workLife = analyticsService_1.default.getWorkLifeAnalysis(startDate, endDate);
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
const getSankeyFlow = (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const flows = analyticsService_1.default.getSankeyFlow(startDate, endDate);
        res.json(flows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getSankeyFlow = getSankeyFlow;
