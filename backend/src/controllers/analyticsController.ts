import type { Request, Response, NextFunction } from 'express';
import analyticsService from '../services/analyticsService';
import { analyticsQuerySchema } from '../validations/queryValidation';

export const getDashboardAnalytics = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, excludeFuture } = analyticsQuerySchema.parse(req.query);
    const isExcludeFuture = excludeFuture === 'true';
    const summary = analyticsService.getSummary(startDate, endDate, isExcludeFuture);
    const categories = analyticsService.getCategoryBreakdown(startDate, endDate, isExcludeFuture);
    const monthly = analyticsService.getMonthlyAggregation(startDate, endDate, isExcludeFuture);
    const workLife = analyticsService.getWorkLifeAnalysis(startDate, endDate, isExcludeFuture);

    res.json({
      summary,
      categories,
      monthly,
      workLife
    });
  } catch (err: unknown) {
    next(err);
  }
};


