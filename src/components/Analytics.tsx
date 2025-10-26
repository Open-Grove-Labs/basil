import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  loadTransactions,
  loadCategories,
  parseLocalDate,
} from "../utils/storage";
import type { Transaction, CategorySpending, SpendingTrend } from "../types";
import { formatCurrency } from "../utils/currency";

type MonthlyCategoryData = {
  date: string;
  [categoryName: string]: string | number; // date as string, categories as numbers
};

function Analytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>(
    [],
  );
  const [monthlyTrends, setMonthlyTrends] = useState<SpendingTrend[]>([]);
  const [monthlyCategoryBreakdown, setMonthlyCategoryBreakdown] = useState<
    MonthlyCategoryData[]
  >([]);
  const [timeRange, setTimeRange] = useState<"3m" | "6m" | "1y" | "2y" | "3y">(
    "6m",
  );
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [projectionTrends, setProjectionTrends] = useState<SpendingTrend[]>([]);
  const [availableTimeRanges, setAvailableTimeRanges] = useState<
    Array<"3m" | "6m" | "1y" | "2y" | "3y">
  >(["3m", "6m", "1y"]);

  // Calculate available time ranges based on transaction history
  const getAvailableTimeRanges = useCallback((): Array<"3m" | "6m" | "1y" | "2y" | "3y"> => {
    const allTransactions = loadTransactions();
    if (allTransactions.length === 0) {
      return ["3m", "6m", "1y"]; // Default options if no transactions
    }

    // Find oldest transaction
    const oldestDate = allTransactions
      .map((t) => parseLocalDate(t.date))
      .reduce((oldest, current) => (current < oldest ? current : oldest));

    const now = new Date();
    const monthsOfHistory = Math.floor(
      (now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    ); // Average month length

    const availableRanges: Array<"3m" | "6m" | "1y" | "2y" | "3y"> = [
      "3m",
      "6m",
      "1y",
    ];

    if (monthsOfHistory >= 24) {
      availableRanges.push("2y");
    }
    if (monthsOfHistory >= 36) {
      availableRanges.push("3y");
    }

    return availableRanges;
  }, []);

  const loadAnalyticsData = useCallback(() => {
    const allTransactions = loadTransactions();
    const categories = loadCategories();

    // Update available time ranges based on data
    const ranges = getAvailableTimeRanges();
    setAvailableTimeRanges(ranges);

    // Filter transactions based on time range
    const now = new Date();
    const months =
      timeRange === "3m"
        ? 3
        : timeRange === "6m"
          ? 6
          : timeRange === "1y"
            ? 12
            : timeRange === "2y"
              ? 24
              : 36; // 3y
    const startDate = subMonths(now, months);

    const filteredTransactions = allTransactions.filter(
      (t) => parseLocalDate(t.date) >= startDate,
    );

    setTransactions(filteredTransactions);

    // Calculate category spending
    const expenseTransactions = filteredTransactions.filter(
      (t) => t.type === "expense",
    );
    const totalExpenses = expenseTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    const categoryTotals = new Map<string, number>();
    expenseTransactions.forEach((t) => {
      // Skip transactions without valid category names
      if (!t.category || t.category.trim() === "") return;

      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
    });

    const categoryData: CategorySpending[] = Array.from(
      categoryTotals.entries(),
    )
      .map(([categoryName, amount]) => {
        const category = categories.find((c) => c.name === categoryName);
        return {
          category: categoryName,
          amount: Number(amount), // Ensure amount is a number
          color: category?.color || "#667eea",
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        };
      })
      .filter((item) => item.amount > 0) // Only include categories with spending
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8); // Top 8 categories

    // Debug logging
    console.log("Category spending data:", categoryData);

    setCategorySpending(categoryData);

    // Calculate monthly trends with cumulative net balance
    const trends: SpendingTrend[] = [];
    let cumulativeBalance = 0;

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const monthTransactions = filteredTransactions.filter((t) =>
        isWithinInterval(parseLocalDate(t.date), {
          start: monthStart,
          end: monthEnd,
        }),
      );

      const monthIncome = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpenses = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthBalance = monthIncome - monthExpenses;

      // Add this month's net balance to the cumulative total
      cumulativeBalance += monthBalance;

      trends.push({
        date: format(monthStart, "MMM yyyy"),
        income: monthIncome,
        expenses: monthExpenses,
        balance: monthBalance,
        cumulativeBalance: cumulativeBalance, // Show cumulative net balance - the key metric!
        isProjection: false,
      });
    }

    setMonthlyTrends(trends);

    // Calculate monthly category breakdown for stacked area chart
    const categoryBreakdown: MonthlyCategoryData[] = [];

    // Get all unique expense categories
    const allCategories = new Set<string>();
    filteredTransactions
      .filter(
        (t) => t.type === "expense" && t.category && t.category.trim() !== "",
      )
      .forEach((t) => allCategories.add(t.category));

    // Calculate spending by category for each month
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const monthTransactions = filteredTransactions.filter(
        (t) =>
          t.type === "expense" &&
          t.category &&
          t.category.trim() !== "" &&
          isWithinInterval(parseLocalDate(t.date), {
            start: monthStart,
            end: monthEnd,
          }),
      );

      const monthData: MonthlyCategoryData = {
        date: format(monthStart, "MMM yyyy"),
      };

      // Calculate spending for each category in this month
      allCategories.forEach((category) => {
        const categorySpending = monthTransactions
          .filter((t) => t.category === category)
          .reduce((sum, t) => sum + t.amount, 0);
        monthData[category] = categorySpending;
      });

      categoryBreakdown.push(monthData);
    }

    setMonthlyCategoryBreakdown(categoryBreakdown);

    // Calculate future projections based on current trends
    if (trends.length >= 2) {
      // Calculate averages from recent data (use last 3 months or available data)
      const recentCount = Math.min(3, trends.length);
      const recentTrends = trends.slice(-recentCount);
      const avgIncome =
        recentTrends.reduce((sum, t) => sum + (t.income || 0), 0) /
        recentTrends.length;
      const avgExpenses =
        recentTrends.reduce((sum, t) => sum + (t.expenses || 0), 0) /
        recentTrends.length;

      // Create combined historical and projected data
      const projections: SpendingTrend[] = [];

      // Add historical data
      trends.forEach((trend) => {
        projections.push({
          ...trend,
          isProjection: false,
          projectedIncome: null,
          projectedExpenses: null,
          projectedBalance: null,
          projectedCumulativeBalance: null,
        });
      });

      // Add bridge point (last historical point as first projection point)
      const lastTrend = trends[trends.length - 1];
      const avgBalance = avgIncome - avgExpenses;
      let projectedCumulativeBalance = lastTrend.cumulativeBalance || 0;

      projections.push({
        date: lastTrend.date,
        income: null,
        expenses: null,
        balance: null,
        cumulativeBalance: null,
        projectedIncome: avgIncome,
        projectedExpenses: avgExpenses,
        projectedBalance: avgBalance,
        projectedCumulativeBalance: projectedCumulativeBalance,
        isProjection: true,
      });

      // Add future projections
      for (let i = 1; i <= months; i++) {
        const futureDate = format(subMonths(now, -i), "MMM yyyy");
        projectedCumulativeBalance += avgBalance; // Accumulate net balance - this shows the financial trajectory!

        projections.push({
          date: futureDate,
          income: null,
          expenses: null,
          balance: null,
          cumulativeBalance: null,
          projectedIncome: avgIncome,
          projectedExpenses: avgExpenses,
          projectedBalance: avgBalance,
          projectedCumulativeBalance: projectedCumulativeBalance,
          isProjection: true,
        });
      }

      setProjectionTrends(projections);
    } else {
      setProjectionTrends([]);
    }
  }, [timeRange, getAvailableTimeRanges]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Wrapper functions for chart formatters
  const formatCurrencyForChart = (value: number) => formatCurrency(value);

  const totalExpenses = categorySpending.reduce(
    (sum, cat) => sum + cat.amount,
    0,
  );
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate projection totals if available
  const projectedData = projectionTrends.filter(
    (t) => t.isProjection && t.projectedIncome !== null,
  );
  const projectedTotalIncome = projectedData.reduce(
    (sum, t) => sum + (t.projectedIncome || 0),
    0,
  );
  const projectedTotalExpenses = projectedData.reduce(
    (sum, t) => sum + (t.projectedExpenses || 0),
    0,
  );

  return (
    <div className="page-content">
      <div className="analytics-header">
        <div className="time-range-selector">
          {availableTimeRanges.map((range) => (
            <button
              key={range}
              className={`time-range-button ${
                timeRange === range ? "active" : ""
              }`}
              onClick={() => setTimeRange(range)}
            >
              {range === "3m"
                ? "3 Months"
                : range === "6m"
                  ? "6 Months"
                  : range === "1y"
                    ? "1 Year"
                    : range === "2y"
                      ? "2 Years"
                      : "3 Years"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="analytics-summary">
        <div className="summary-card income">
          <div className="summary-label">Total Income</div>
          <div className="summary-value">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="summary-card expense">
          <div className="summary-label">Total Expenses</div>
          <div className="summary-value">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="summary-card balance">
          <div className="summary-label">Net Balance</div>
          <div className="summary-value">
            {formatCurrency(totalIncome - totalExpenses)}
          </div>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      {monthlyTrends.length > 0 && (
        <div className="card">
          <h3 className="card-title">Monthly Trends</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={formatCurrencyForChart} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Category Breakdown */}
      {monthlyCategoryBreakdown.length > 0 && (
        <div className="card">
          <h3 className="card-title">Expense Category Breakdown</h3>
          <p className="card-subtitle">
            See how your expense categories add up to total spending each month
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={monthlyCategoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={formatCurrencyForChart} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name,
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                {/* Generate Area components for each category */}
                {categorySpending.slice(0, 8).map((category) => (
                  <Area
                    key={category.category}
                    type="monotone"
                    dataKey={category.category}
                    stackId="1"
                    stroke={category.color}
                    fill={category.color}
                    fillOpacity={0.8}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Financial Projection Chart */}
      {projectionTrends.length > 0 && (
        <div className="card">
          <h3 className="card-title">Net Worth Trajectory</h3>
          <p className="card-subtitle">
            Track your cumulative financial position over time. The thick green
            line shows your net worth trajectory - if it's trending up, you're
            building wealth; if down, you may need to adjust spending.
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={projectionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={formatCurrencyForChart} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name,
                  ]}
                  labelFormatter={(label, payload) => {
                    const isProjected = payload?.[0]?.payload?.isProjection;
                    return `${label}${isProjected ? " (Projected)" : ""}`;
                  }}
                />
                {/* Historical Lines */}
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Monthly Net Balance"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeBalance"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Cumulative Net Worth"
                  connectNulls={false}
                />
                {/* Projected Lines */}
                <Line
                  type="monotone"
                  dataKey="projectedBalance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  name="Projected Monthly Balance"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="projectedCumulativeBalance"
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  name="Projected Net Worth"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="projection-legend">
            <div className="projection-note">
              <span className="solid-line"></span>
              <span>Historical Data</span>
            </div>
            <div className="projection-note">
              <span className="dashed-line"></span>
              <span>Projected Averages</span>
            </div>
          </div>

          {/* Projection Summary */}
          {projectedData.length > 0 && (
            <div className="projection-summary">
              <h4 className="projection-title">
                Projected Totals (
                {timeRange === "3m"
                  ? "Next 3 Months"
                  : timeRange === "6m"
                    ? "Next 6 Months"
                    : timeRange === "1y"
                      ? "Next Year"
                      : timeRange === "2y"
                        ? "Next 2 Years"
                        : "Next 3 Years"}
                )
              </h4>
              <div className="projection-stats">
                <div className="projection-stat balance">
                  <span>
                    Avg Monthly Net:{" "}
                    {formatCurrency(
                      (projectedTotalIncome - projectedTotalExpenses) /
                        Math.max(1, projectedData.length),
                    )}
                  </span>
                </div>
              </div>

              {/* Net Worth Trajectory Summary */}
              <div className="savings-trajectory">
                <div className="trajectory-info">
                  <strong>Net Worth Trajectory:</strong>
                  {(() => {
                    const currentNetWorth =
                      projectionTrends.find(
                        (t) => !t.isProjection && t.cumulativeBalance !== null,
                      )?.cumulativeBalance || 0;
                    const finalProjectedNetWorth =
                      projectedData.length > 0
                        ? projectedData[projectedData.length - 1]
                            .projectedCumulativeBalance || 0
                        : 0;

                    if (finalProjectedNetWorth > currentNetWorth) {
                      return (
                        <span className="trajectory-positive">
                          📈 Growing by{" "}
                          {formatCurrency(
                            finalProjectedNetWorth - currentNetWorth,
                          )}
                        </span>
                      );
                    } else if (finalProjectedNetWorth < currentNetWorth) {
                      return (
                        <span className="trajectory-negative">
                          📉 Declining by{" "}
                          {formatCurrency(
                            currentNetWorth - finalProjectedNetWorth,
                          )}
                        </span>
                      );
                    } else {
                      return (
                        <span className="trajectory-stable">
                          ➡️ Remaining stable at{" "}
                          {formatCurrency(currentNetWorth)}
                        </span>
                      );
                    }
                  })()}
                </div>
                <div className="trajectory-details">
                  {(() => {
                    const currentNetWorth =
                      projectionTrends.find(
                        (t) => !t.isProjection && t.cumulativeBalance !== null,
                      )?.cumulativeBalance || 0;
                    const finalProjectedNetWorth =
                      projectedData.length > 0
                        ? projectedData[projectedData.length - 1]
                            .projectedCumulativeBalance || 0
                        : 0;

                    return (
                      <>
                        <span>
                          Current Net Worth: {formatCurrency(currentNetWorth)}
                        </span>
                        <span>
                          Projected Net Worth:{" "}
                          {formatCurrency(finalProjectedNetWorth)}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Legal Disclaimer */}
              <div className="legal-disclaimer">
                <p>
                  <strong>Disclaimer:</strong> The information provided by this application is for general 
                  informational and educational purposes only and is not a substitute for professional 
                  financial advice. This app is not a financial planner, broker, or tax advisor. We are 
                  not engaged in rendering legal, tax, or financial advice.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="charts-grid">
        {/* Combined Category Chart with Toggle */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Spending by Category</h3>
            <div className="chart-toggle">
              <button
                className={`toggle-btn ${chartType === "pie" ? "active" : ""}`}
                onClick={() => setChartType("pie")}
              >
                <PieChartIcon size={16} />
                Pie
              </button>
              <button
                className={`toggle-btn ${chartType === "bar" ? "active" : ""}`}
                onClick={() => setChartType("bar")}
              >
                <BarChart3 size={16} />
                Bar
              </button>
            </div>
          </div>

          {categorySpending.length > 0 ? (
            <>
              <div
                className="chart-container"
                role="img"
                aria-labelledby="category-chart-description"
              >
                <div id="category-chart-description" className="sr-only">
                  Category spending chart showing {categorySpending.length}{" "}
                  categories.
                  {chartType === "pie" ? "Pie chart" : "Bar chart"} displaying
                  spending amounts and percentages.
                </div>
                <ResponsiveContainer
                  width="100%"
                  height={chartType === "pie" ? 300 : 350}
                >
                  {chartType === "pie" ? (
                    <PieChart>
                      <Pie
                        data={categorySpending.map((cat) => ({
                          ...cat,
                          value: cat.amount,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        nameKey="category"
                      >
                        {categorySpending.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  ) : (
                    <BarChart
                      data={categorySpending}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="category"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tickFormatter={formatCurrencyForChart} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Category: ${label}`}
                      />
                      <Bar dataKey="amount" name="Amount">
                        {categorySpending.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Data Table Alternative for Screen Readers */}
              <table className="sr-only" aria-label="Category spending data">
                <caption>
                  Category spending breakdown for selected time period
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Percentage of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySpending.map((category) => (
                    <tr key={category.category}>
                      <th scope="row">{category.category}</th>
                      <td>{formatCurrency(category.amount)}</td>
                      <td>{category.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Category Legend - only show for pie chart */}
              <div className="category-legend">
                {categorySpending.map((category) => (
                  <div key={category.category} className="legend-item">
                    <div
                      className="legend-color"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="legend-details">
                      <div className="legend-name">{category.category}</div>
                      <div className="legend-amount">
                        {formatCurrency(category.amount)} (
                        {category.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No expense data available for the selected time period.</p>
            </div>
          )}
        </div>
      </div>

      {transactions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Data Yet</h3>
          <p>Add some transactions to see your spending analytics!</p>
        </div>
      )}
    </div>
  );
}

export default Analytics;
