const analyticsService = require('../services/analyticsService');

exports.getDashboardAnalytics = (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const summary = analyticsService.getSummary(startDate, endDate);
    const categories = analyticsService.getCategoryBreakdown(startDate, endDate);
    const monthly = analyticsService.getMonthlyAggregation(startDate, endDate);

    res.json({
      summary,
      categories,
      monthly
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
