import type { Request, Response, NextFunction } from 'express';
import analyticsService from '../services/analyticsService';
import { analyticsQuerySchema } from '../validations/queryValidation';

export const getDashboardAnalytics = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = analyticsQuerySchema.parse(req.query);
    const summary = analyticsService.getSummary(startDate, endDate);
    const categories = analyticsService.getCategoryBreakdown(startDate, endDate);
    const monthly = analyticsService.getMonthlyAggregation(startDate, endDate);
    const workLife = analyticsService.getWorkLifeAnalysis(startDate, endDate);

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


