"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
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
        const row = db_1.default.prepare(query).get(...params);
        if (!row) {
            return { income: 0, expense: 0, savings: 0 };
        }
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
        query += ` GROUP BY category_id ORDER BY amount DESC`;
        const rows = db_1.default.prepare(query).all(...params);
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
        const rows = db_1.default.prepare(query).all(...params);
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
        const groupRows = db_1.default.prepare(groupQuery).all(...groupParams);
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
        const rows = db_1.default.prepare(query).all(...params);
        return rows.map(row => ({
            name: row.day_type_name,
            label: row.day_type_label,
            count: row.day_count,
            avg_expense: (row.total_expense / row.day_count) / 100
        }));
    }
}
exports.default = new AnalyticsService();
