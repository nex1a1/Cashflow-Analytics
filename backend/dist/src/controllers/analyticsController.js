"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardAnalytics = void 0;
const analyticsService_1 = __importDefault(require("../services/analyticsService"));
const queryValidation_1 = require("../validations/queryValidation");
const getDashboardAnalytics = (req, res, next) => {
    try {
        const { startDate, endDate, excludeFuture } = queryValidation_1.analyticsQuerySchema.parse(req.query);
        const isExcludeFuture = excludeFuture === 'true';
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
        next(err);
    }
};
exports.getDashboardAnalytics = getDashboardAnalytics;
