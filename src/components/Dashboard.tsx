import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { loadTransactions, loadCategories, parseLocalDate, formatCurrency } from '../utils/storage'
import type { Transaction } from '../types'

interface MonthlyData {
  income: number
  expenses: number
  balance: number
  categoryTotals: Array<{
    category: string
    amount: number
    color: string
  }>
}

interface DashboardSummary {
  currentMonth: MonthlyData
  lastMonth: MonthlyData
  secondLastMonth: MonthlyData
  currentMonthName: string
  lastMonthName: string
  secondLastMonthName: string
}

function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>({
    currentMonth: { income: 0, expenses: 0, balance: 0, categoryTotals: [] },
    lastMonth: { income: 0, expenses: 0, balance: 0, categoryTotals: [] },
    secondLastMonth: { income: 0, expenses: 0, balance: 0, categoryTotals: [] },
    currentMonthName: '',
    lastMonthName: '',
    secondLastMonthName: ''
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = () => {
    const transactions = loadTransactions()
    const categories = loadCategories()
    
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    
    const lastMonthDate = subMonths(now, 1)
    const lastMonthStart = startOfMonth(lastMonthDate)
    const lastMonthEnd = endOfMonth(lastMonthDate)
    
    const secondLastMonthDate = subMonths(now, 2)
    const secondLastMonthStart = startOfMonth(secondLastMonthDate)
    const secondLastMonthEnd = endOfMonth(secondLastMonthDate)
    
    // Filter transactions by month
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = parseLocalDate(t.date)
      return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd
    })
    
    const lastMonthTransactions = transactions.filter(t => {
      const transactionDate = parseLocalDate(t.date)
      return transactionDate >= lastMonthStart && transactionDate <= lastMonthEnd
    })
    
    const secondLastMonthTransactions = transactions.filter(t => {
      const transactionDate = parseLocalDate(t.date)
      return transactionDate >= secondLastMonthStart && transactionDate <= secondLastMonthEnd
    })
    
    // Calculate current month data
    const currentMonthIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const currentMonthExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // Calculate last month data
    const lastMonthIncome = lastMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const lastMonthExpenses = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // Calculate second last month data
    const secondLastMonthIncome = secondLastMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const secondLastMonthExpenses = secondLastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // Calculate category totals for current month
    const currentCategoryTotals = new Map<string, number>()
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = currentCategoryTotals.get(t.category) || 0
        currentCategoryTotals.set(t.category, current + t.amount)
      })
    
    // Calculate category totals for last month
    const lastCategoryTotals = new Map<string, number>()
    lastMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = lastCategoryTotals.get(t.category) || 0
        lastCategoryTotals.set(t.category, current + t.amount)
      })
    
    // Calculate category totals for second last month
    const secondLastCategoryTotals = new Map<string, number>()
    secondLastMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = secondLastCategoryTotals.get(t.category) || 0
        secondLastCategoryTotals.set(t.category, current + t.amount)
      })
    
    // Get all unique categories from all three months
    const allCategories = new Set([
      ...Array.from(currentCategoryTotals.keys()),
      ...Array.from(lastCategoryTotals.keys()),
      ...Array.from(secondLastCategoryTotals.keys())
    ])
    
    const currentCategoriesData = Array.from(allCategories)
      .map(categoryName => {
        const category = categories.find(c => c.name === categoryName)
        return {
          category: categoryName,
          amount: currentCategoryTotals.get(categoryName) || 0,
          color: category?.color || '#667eea'
        }
      })
      .sort((a, b) => b.amount - a.amount)
    
    const lastCategoriesData = Array.from(allCategories)
      .map(categoryName => {
        const category = categories.find(c => c.name === categoryName)
        return {
          category: categoryName,
          amount: lastCategoryTotals.get(categoryName) || 0,
          color: category?.color || '#667eea'
        }
      })
      .sort((a, b) => b.amount - a.amount)
    
    const secondLastCategoriesData = Array.from(allCategories)
      .map(categoryName => {
        const category = categories.find(c => c.name === categoryName)
        return {
          category: categoryName,
          amount: secondLastCategoryTotals.get(categoryName) || 0,
          color: category?.color || '#667eea'
        }
      })
      .sort((a, b) => b.amount - a.amount)
    
    setSummary({
      currentMonth: {
        income: currentMonthIncome,
        expenses: currentMonthExpenses,
        balance: currentMonthIncome - currentMonthExpenses,
        categoryTotals: currentCategoriesData
      },
      lastMonth: {
        income: lastMonthIncome,
        expenses: lastMonthExpenses,
        balance: lastMonthIncome - lastMonthExpenses,
        categoryTotals: lastCategoriesData
      },
      secondLastMonth: {
        income: secondLastMonthIncome,
        expenses: secondLastMonthExpenses,
        balance: secondLastMonthIncome - secondLastMonthExpenses,
        categoryTotals: secondLastCategoriesData
      },
      currentMonthName: format(now, 'MMMM yyyy'),
      lastMonthName: format(lastMonthDate, 'MMMM yyyy'),
      secondLastMonthName: format(secondLastMonthDate, 'MMMM yyyy')
    })
  }



  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const getChangeIcon = (current: number, previous: number, isExpense = false) => {
    const change = current - previous
    const isPositive = isExpense ? change < 0 : change > 0
    return isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />
  }

  const getChangeColor = (current: number, previous: number, isExpense = false) => {
    const change = current - previous
    const isPositive = isExpense ? change < 0 : change > 0
    return isPositive ? 'positive' : 'negative'
  }

  return (
    <div className="page-content">
      {/* Monthly Overview */}
      <section aria-labelledby="monthly-overview" className="grid grid-3 monthly-overview">
        <h2 id="monthly-overview" className="sr-only">Monthly Financial Overview</h2>
        
        {/* Second Last Month */}
        <div className="card month-card">
          <div className="month-header">
            <h3>{summary.secondLastMonthName}</h3>
            <div className="month-balance">
              Net: <span className={summary.secondLastMonth.balance >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(summary.secondLastMonth.balance)}
              </span>
            </div>
          </div>
          <div className="month-details">
            <div className="month-item">
              <div className="month-item-icon income">
                <TrendingUp size={16} />
              </div>
              <div className="month-item-details">
                <div className="month-item-label">Income</div>
                <div className="month-item-amount">
                  {formatCurrency(summary.secondLastMonth.income)}
                </div>
              </div>
            </div>
            <div className="month-item">
              <div className="month-item-icon expense">
                <TrendingDown size={16} />
              </div>
              <div className="month-item-details">
                <div className="month-item-label">Expenses</div>
                <div className="month-item-amount">
                  {formatCurrency(summary.secondLastMonth.expenses)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Last Month */}
        <div className="card month-card">
          <div className="month-header">
            <h3>{summary.lastMonthName}</h3>
            <div className="month-balance">
              Net: <span className={summary.lastMonth.balance >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(summary.lastMonth.balance)}
              </span>
            </div>
          </div>
          <div className="month-details">
            <div className="month-item">
              <div className="month-item-icon income">
                <TrendingUp size={16} />
              </div>
              <div className="month-item-details">
                <div className="month-item-label">Income</div>
                <div className="month-item-amount">
                  {formatCurrency(summary.lastMonth.income)}
                </div>
              </div>
            </div>
            <div className="month-item">
              <div className="month-item-icon expense">
                <TrendingDown size={16} />
              </div>
              <div className="month-item-details">
                <div className="month-item-label">Expenses</div>
                <div className="month-item-amount">
                  {formatCurrency(summary.lastMonth.expenses)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current Month */}
        <div className="card month-card current-month">
          <div className="month-header">
            <h3>{summary.currentMonthName}</h3>
            <div className="month-balance">
              Net: <span className={summary.currentMonth.balance >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(summary.currentMonth.balance)}
              </span>
            </div>
          </div>
          <div className="month-details">
            <div className="month-item">
              <div className="month-item-icon income">
                <TrendingUp size={16} />
              </div>
              <div className="month-item-details">
                <div className="month-item-label">Income</div>
                <div className="month-item-amount positive">
                  {formatCurrency(summary.currentMonth.income)}
                </div>
                <div className={`month-item-change ${getChangeColor(summary.currentMonth.income, summary.lastMonth.income)}`}>
                  {getChangeIcon(summary.currentMonth.income, summary.lastMonth.income)}
                  {Math.abs(getChangePercentage(summary.currentMonth.income, summary.lastMonth.income)).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="month-item">
              <div className="month-item-icon expense">
                <TrendingDown size={16} />
              </div>
              <div className="month-item-details">
                <div className="month-item-label">Expenses</div>
                <div className="month-item-amount negative">
                  {formatCurrency(summary.currentMonth.expenses)}
                </div>
                <div className={`month-item-change ${getChangeColor(summary.currentMonth.expenses, summary.lastMonth.expenses, true)}`}>
                  {getChangeIcon(summary.currentMonth.expenses, summary.lastMonth.expenses, true)}
                  {Math.abs(getChangePercentage(summary.currentMonth.expenses, summary.lastMonth.expenses)).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Comparison */}
      <section aria-labelledby="category-comparison" className="card">
        <div className="card-header">
          <h2 id="category-comparison" className="card-title">Category Spending: Last 3 Months</h2>
        </div>
        
        {summary.currentMonth.categoryTotals.length === 0 && summary.lastMonth.categoryTotals.length === 0 && summary.secondLastMonth.categoryTotals.length === 0 ? (
          <div className="empty-state">
            <TrendingDown size={48} className="empty-icon" />
            <p>No expense categories yet. Add some transactions to see your spending patterns!</p>
          </div>
        ) : (
          <div className="category-comparison">
            {Array.from(new Set([
              ...summary.currentMonth.categoryTotals.map(c => c.category),
              ...summary.lastMonth.categoryTotals.map(c => c.category),
              ...summary.secondLastMonth.categoryTotals.map(c => c.category)
            ])).map((categoryName) => {
              const currentCategory = summary.currentMonth.categoryTotals.find(c => c.category === categoryName)
              const lastCategory = summary.lastMonth.categoryTotals.find(c => c.category === categoryName)
              const secondLastCategory = summary.secondLastMonth.categoryTotals.find(c => c.category === categoryName)
              const currentAmount = currentCategory?.amount || 0
              const lastAmount = lastCategory?.amount || 0
              const secondLastAmount = secondLastCategory?.amount || 0
              const color = currentCategory?.color || lastCategory?.color || secondLastCategory?.color || '#667eea'
              
              return (
                <div key={categoryName} className="category-comparison-row">
                  <div className="category-info">
                    <div 
                      className="category-dot"
                      style={{ backgroundColor: color }}
                    />
                    <div className="category-name">{categoryName}</div>
                  </div>
                  
                  <div className="category-amounts">
                    <div className="amount-second-last">
                      <div className="amount-label">{summary.secondLastMonthName}</div>
                      <div className="amount-value second-last">
                        {formatCurrency(secondLastAmount)}
                      </div>
                    </div>
                    
                    <div className="amount-last">
                      <div className="amount-label">{summary.lastMonthName}</div>
                      <div className="amount-value last">
                        {formatCurrency(lastAmount)}
                      </div>
                    </div>
                    
                    <div className="amount-current">
                      <div className="amount-label">{summary.currentMonthName}</div>
                      <div className="amount-value current">
                        {formatCurrency(currentAmount)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini sparkline graph */}
                  <div className="category-sparkline">
                    {(() => {
                      const values = [secondLastAmount, lastAmount, currentAmount]
                      const maxValue = Math.max(...values, 1) // Avoid division by zero
                      const points = values.map((value, index) => {
                        const x = (index * 20) + 10 // 0, 20, 40 + 10 offset
                        const y = 20 - (value / maxValue) * 15 // Inverted Y, scaled to 15px height
                        return `${x},${y}`
                      }).join(' ')
                      
                      return (
                        <svg width="50" height="20" className="sparkline-svg">
                          <polyline
                            points={points}
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                          {values.map((value, index) => (
                            <circle
                              key={index}
                              cx={(index * 20) + 10}
                              cy={20 - (value / maxValue) * 15}
                              r="1.5"
                              fill={color}
                            />
                          ))}
                        </svg>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard