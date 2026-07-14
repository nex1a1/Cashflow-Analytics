import { Request, Response } from 'express';
import analyticsService from '../services/analyticsService';

export const getDashboardAnalytics = (req: Request, res: Response) => {
  const { startDate, endDate, excludeFuture } = req.query as { startDate?: string; endDate?: string; excludeFuture?: string };
  const isExcludeFuture = excludeFuture === 'true';
  try {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


