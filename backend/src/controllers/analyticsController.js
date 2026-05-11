const analyticsService = require('../services/analyticsService');

exports.getDashboardAnalytics = (req, res) => {
  const { startDate, endDate } = req.query;
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSankeyFlow = (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const flows = analyticsService.getSankeyFlow(startDate, endDate);
    res.json(flows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
