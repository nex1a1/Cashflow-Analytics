const db = require('../config/db');

class AnalyticsService {
  /**
   * Get total income, expense, and savings for a period.
   * Utilizes v_monthly_summary view.
   */
  getSummary(startDate, endDate) {
    let query = `
      SELECT 
        SUM(income_satang) as income,
        SUM(expense_satang) as expense,
        SUM(savings_satang) as savings
      FROM v_monthly_summary
      WHERE 1=1
    `;
    const params = [];
    if (startDate) {
      query += ` AND month >= ?`;
      params.push(startDate.substring(0, 7));
    }
    if (endDate) {
      query += ` AND month <= ?`;
      params.push(endDate.substring(0, 7));
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
   * Utilizes v_category_monthly view.
   */
  getCategoryBreakdown(startDate, endDate) {
    let query = `
      SELECT 
        category_id as id,
        category_name as name,
        category_icon as icon,
        category_color as color,
        group_type,
        SUM(amount_satang) as amount
      FROM v_category_monthly
      WHERE 1=1
    `;
    const params = [];
    if (startDate) {
      query += ` AND month >= ?`;
      params.push(startDate.substring(0, 7));
    }
    if (endDate) {
      query += ` AND month <= ?`;
      params.push(endDate.substring(0, 7));
    }

    query += ` GROUP BY id ORDER BY amount DESC`;

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
   * Get monthly aggregated data including group breakdown.
   * Utilizes v_monthly_summary and v_category_monthly.
   */
  getMonthlyAggregation(startDate, endDate) {
    // 1. Get monthly totals from view
    let query = `
      SELECT 
        month, income_satang as income, expense_satang as expense, savings_satang as savings
      FROM v_monthly_summary
      WHERE 1=1
    `;
    const params = [];
    if (startDate) {
      query += ` AND month >= ?`;
      params.push(startDate.substring(0, 7));
    }
    if (endDate) {
      query += ` AND month <= ?`;
      params.push(endDate.substring(0, 7));
    }
    query += ` ORDER BY month ASC`;
    const rows = db.prepare(query).all(...params);

    // 2. Get group totals per month from view
    let groupQuery = `
      SELECT 
        month, group_id, SUM(amount_satang) as amount
      FROM v_category_monthly
      WHERE 1=1
    `;
    const groupParams = [];
    if (startDate) {
      groupQuery += ` AND month >= ?`;
      groupParams.push(startDate.substring(0, 7));
    }
    if (endDate) {
      groupQuery += ` AND month <= ?`;
      groupParams.push(endDate.substring(0, 7));
    }
    groupQuery += ` GROUP BY month, group_id`;
    const groupRows = db.prepare(groupQuery).all(...groupParams);

    // Map group amounts into the main rows
    const result = rows.map(row => {
      const groups = {};
      groupRows.filter(g => g.month === row.month).forEach(g => {
        groups[g.group_id] = g.amount / 100;
      });
      
      return {
        month: row.month,
        income: (row.income || 0) / 100,
        expense: (row.expense || 0) / 100,
        savings: (row.savings || 0) / 100,
        groups: groups
      };
    });

    return result;
  }

  /**
   * Get day-type burn rate analysis (Work vs Holiday spend)
   */
  getWorkLifeAnalysis(startDate, endDate) {
    let query = `
      SELECT 
        day_type_name,
        day_type_label,
        COUNT(*) as day_count,
        SUM(daily_expense_satang) as total_expense
      FROM v_daily_burn
      WHERE day_type_name IS NOT NULL
    `;
    const params = [];
    if (startDate) {
      query += ` AND date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND date <= ?`;
      params.push(endDate);
    }
    query += ` GROUP BY day_type_name`;

    const rows = db.prepare(query).all(...params);
    return rows.map(row => ({
      name: row.day_type_name,
      label: row.day_type_label,
      count: row.day_count,
      avg_expense: (row.total_expense / row.day_count) / 100
    }));
  }

  /**
   * Get Sankey Flow Map (Nodes and Links)
   */
  getSankeyFlow(startDate, endDate) {
    const categories = db.prepare(`
      SELECT 
        c.id, c.name, c.color, c.cashflow_group_id as groupId,
        cg.name as groupName, cg.type as groupType, cg.color as groupColor,
        SUM(t.amount) as amount
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      WHERE t.is_deleted = 0
      ${startDate ? 'AND t.date >= ?' : ''}
      ${endDate ? 'AND t.date <= ?' : ''}
      GROUP BY c.id
      HAVING amount > 0
    `).all(...[startDate, endDate].filter(Boolean));

    const links = [];
    let totalInc = 0;
    let totalExp = 0;

    const groupTotals = {};
    categories.forEach(c => {
      if (!groupTotals[c.groupId]) {
        groupTotals[c.groupId] = { 
          name: c.groupName, 
          type: c.groupType, 
          color: c.groupColor, 
          amount: 0,
          categories: []
        };
      }
      groupTotals[c.groupId].amount += c.amount;
      groupTotals[c.groupId].categories.push(c);
      
      if (c.groupType === 'income') totalInc += c.amount;
      else totalExp += c.amount;
    });

    const labelTotalCash = `Total Cash`;
    const labelTotalExp = `Outflow`;
    const labelRemaining = `Remaining`;

    // 1. Income Groups -> Total Cash
    Object.values(groupTotals).filter(g => g.type === 'income').forEach(g => {
      links.push({ from: g.name, to: labelTotalCash, flow: g.amount / 100, color: g.color });
    });

    // 2. Total Cash -> Outflow
    if (totalInc > 0 && totalExp > 0) {
      links.push({ from: labelTotalCash, to: labelTotalExp, flow: Math.min(totalInc, totalExp) / 100, color: '#64748B' });
    }

    // 3. Total Cash -> Remaining / Overspent
    const net = totalInc - totalExp;
    if (net > 0) {
      links.push({ from: labelTotalCash, to: labelRemaining, flow: net / 100, color: '#10B981' });
    } else if (net < 0) {
      links.push({ from: 'Overspent', to: labelTotalExp, flow: Math.abs(net) / 100, color: '#EF4444' });
    }

    // 4. Outflow -> Expense Groups -> Categories
    Object.values(groupTotals).filter(g => g.type !== 'income').forEach(g => {
      links.push({ from: labelTotalExp, to: g.name, flow: g.amount / 100, color: g.color });
      
      g.categories.forEach(c => {
        links.push({ from: g.name, to: c.name, flow: c.amount / 100, color: c.color });
      });
    });

    return links;
  }
}

module.exports = new AnalyticsService();
