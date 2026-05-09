const db = require('../config/db');

class AnalyticsService {
  /**
   * Get total income, expense, and savings for a period.
   * Can be filtered by date.
   */
  getSummary(startDate, endDate) {
    let query = `
      SELECT 
        SUM(CASE WHEN cg.type = 'income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN cg.type = 'expense' THEN t.amount ELSE 0 END) as expense,
        SUM(CASE WHEN cg.type = 'savings' THEN t.amount ELSE 0 END) as savings
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      WHERE t.is_deleted = 0
    `;
    const params = [];
    if (startDate) {
      query += ` AND t.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.date <= ?`;
      params.push(endDate);
    }

    const row = db.prepare(query).get(...params);
    return {
      income: (row.income || 0) / 100,
      expense: (row.expense || 0) / 100,
      savings: (row.savings || 0) / 100
    };
  }

  /**
   * Get category breakdown for a period.
   */
  getCategoryBreakdown(startDate, endDate) {
    let query = `
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        cg.type as group_type,
        SUM(t.amount) as amount
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      WHERE t.is_deleted = 0
    `;
    const params = [];
    if (startDate) {
      query += ` AND t.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.date <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY c.id ORDER BY amount DESC`;

    const rows = db.prepare(query).all(...params);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      type: row.group_type,
      amount: row.amount / 100
    }));
  }

  /**
   * Get monthly aggregated data.
   */
  getMonthlyAggregation(startDate, endDate) {
    let query = `
      SELECT 
        strftime('%Y-%m', t.date) as month,
        SUM(CASE WHEN cg.type = 'income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN cg.type = 'expense' THEN t.amount ELSE 0 END) as expense,
        SUM(CASE WHEN cg.type = 'savings' THEN t.amount ELSE 0 END) as savings
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      WHERE t.is_deleted = 0
    `;
    const params = [];
    if (startDate) {
      query += ` AND t.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.date <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY month ORDER BY month ASC`;

    const rows = db.prepare(query).all(...params);
    return rows.map(row => ({
      month: row.month,
      income: (row.income || 0) / 100,
      expense: (row.expense || 0) / 100,
      savings: (row.savings || 0) / 100
    }));
  }
}

module.exports = new AnalyticsService();
