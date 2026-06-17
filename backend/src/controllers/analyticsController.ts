import { Request, Response } from 'express';
import analyticsService from '../services/analyticsService';

export const getDashboardAnalytics = (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  try {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


