import { useState, useEffect } from 'react'
import { Target, TrendingDown, Calculator, Save, X, Plus } from 'lucide-react'
import { loadTransactions, loadCategories, loadSettings, formatCurrency } from '../utils/storage'
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { parseLocalDate } from '../utils/storage'
import type { Transaction, Category, CurrencyConfig } from '../types'

interface BudgetItem {
  categoryId: string
  categoryName: string
  limit: number
  spent: number
  remaining: number
}

interface BudgetData {
  categoryId: string
  limit: number
}

type BudgetTarget = 'stabilize' | 'reduce'

function Budget() {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [budgetData, setBudgetData] = useState<BudgetData[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currency] = useState<CurrencyConfig>(() => loadSettings().currency)
  const [isEditing, setIsEditing] = useState(false)
  const [editingLimits, setEditingLimits] = useState<Record<string, string>>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<BudgetTarget>('stabilize')

  // Categories that get 10% reduction in "reduce expenses" mode
  const REDUCIBLE_CATEGORIES = [
    'Shopping', 'Food & Dining', 'Hobbies', 'Home Improvement', 
    'Subscription', 'Personal Care', 'Entertainment'
  ]

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = () => {
    const allTransactions = loadTransactions()
    const allCategories = loadCategories()
    const savedBudgets = JSON.parse(localStorage.getItem('basil_budgets') || '[]')

    setTransactions(allTransactions)
    setCategories(allCategories)
    setBudgetData(savedBudgets)

    calculateBudgetItems(allTransactions, allCategories, savedBudgets)
  }

  const calculateBudgetItems = (
    transactions: Transaction[], 
    categories: Category[], 
    budgets: BudgetData[]
  ) => {
    const currentMonth = new Date()
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    // Get current month's spending by category
    const currentSpending = transactions
      .filter(t => 
        t.type === 'expense' && 
        isWithinInterval(parseLocalDate(t.date), { start: monthStart, end: monthEnd })
      )
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)

    // Create budget items for expense categories
    const items: BudgetItem[] = categories
      .filter(cat => cat.type === 'expense')
      .map(cat => {
        const budget = budgets.find(b => b.categoryId === cat.id)
        const spent = currentSpending[cat.name] || 0
        const limit = budget?.limit || 0

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          limit,
          spent,
          remaining: limit - spent
        }
      })
      .sort((a, b) => b.limit - a.limit) // Sort by budget amount (highest first)

    setBudgetItems(items)
  }

  const calculateAverageSpending = (categoryName: string, months: number = 3) => {
    const now = new Date()
    const startDate = startOfMonth(subMonths(now, months))
    const endDate = endOfMonth(subMonths(now, 1)) // Exclude current month

    const relevantTransactions = transactions.filter(t =>
      t.type === 'expense' &&
      t.category === categoryName &&
      isWithinInterval(parseLocalDate(t.date), { start: startDate, end: endDate })
    )

    // Debug logging for troubleshooting
    if (categoryName === 'Rent / Mortgage') {
      console.log('=== Rent / Mortgage Debug ===')
      console.log('Months requested:', months)
      console.log('Current date (now):', now)
      console.log('Date range:', startDate, 'to', endDate)
      
      // Show all transactions for this category
      const allCategoryTransactions = transactions.filter(t => t.category === categoryName)
      console.log('All transactions for category:', allCategoryTransactions.length)
      console.log('All category transactions:', allCategoryTransactions.map(t => ({
        date: t.date,
        parsedDate: parseLocalDate(t.date),
        amount: t.amount,
        type: t.type,
        inDateRange: isWithinInterval(parseLocalDate(t.date), { start: startDate, end: endDate })
      })))
      
      console.log('Relevant transactions found:', relevantTransactions.length)
      console.log('Relevant transactions:', relevantTransactions.map(t => ({
        date: t.date,
        amount: t.amount,
        parsedDate: parseLocalDate(t.date)
      })))
      const totalSpent = relevantTransactions.reduce((sum, t) => sum + t.amount, 0)
      console.log('Total spent:', totalSpent)
      console.log('Average (total/months):', Math.round(totalSpent / months))
      console.log('==============================')
    }

    if (relevantTransactions.length === 0) return 0

    const totalSpent = relevantTransactions.reduce((sum, t) => sum + t.amount, 0)
    return Math.round(totalSpent / months)
  }

  const generateSuggestions = (target: BudgetTarget) => {
    const suggestions: Record<string, number> = {}

    budgetItems.forEach(item => {
      if (target === 'reduce') {
        // For reduce: use 3 months average, then apply 10% reduction for certain categories
        const avgSpending = calculateAverageSpending(item.categoryName, 3)
        if (REDUCIBLE_CATEGORIES.includes(item.categoryName)) {
          suggestions[item.categoryId] = Math.round(avgSpending * 0.9)
        } else {
          suggestions[item.categoryId] = avgSpending
        }
      } else {
        // For stabilize: use 2 months average
        const avgSpending = calculateAverageSpending(item.categoryName, 2)
        suggestions[item.categoryId] = avgSpending
      }
    })

    return suggestions
  }

  const handleTargetChange = (target: BudgetTarget) => {
    setSelectedTarget(target)
    
    // Automatically apply suggestions when target changes
    const suggestions = generateSuggestions(target)
    setEditingLimits(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(suggestions).map(([id, amount]) => [id, amount.toString()])
      )
    }))
  }

  const openSuggestions = () => {
    setShowSuggestions(true)
    
    // Auto-apply initial suggestions based on current target
    const suggestions = generateSuggestions(selectedTarget)
    setEditingLimits(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(suggestions).map(([id, amount]) => [id, amount.toString()])
      )
    }))
  }

  const applySuggestions = () => {
    const suggestions = generateSuggestions(selectedTarget)
    
    // Create new budget data from suggestions
    const newBudgets: BudgetData[] = Object.entries(suggestions).map(([categoryId, amount]) => ({
      categoryId,
      limit: amount
    }))

    // Save to localStorage immediately
    setBudgetData(newBudgets)
    localStorage.setItem('basil_budgets', JSON.stringify(newBudgets))
    
    // Recalculate budget items with new limits to update the display
    calculateBudgetItems(transactions, categories, newBudgets)
    
    // Close the suggestions modal
    setShowSuggestions(false)
    
    // Clear editing state since we've saved directly
    setEditingLimits({})
  }

  const startEditing = () => {
    setIsEditing(true)
    // Initialize editing limits with current values, but preserve any existing editing limits
    // (e.g., from applied suggestions)
    const limits = budgetItems.reduce((acc, item) => {
      // Use existing editing limit if available, otherwise use current budget limit
      acc[item.categoryId] = editingLimits[item.categoryId] || item.limit.toString()
      return acc
    }, {} as Record<string, string>)
    setEditingLimits(limits)
  }

  const saveChanges = () => {
    const newBudgets: BudgetData[] = Object.entries(editingLimits).map(([categoryId, limitStr]) => ({
      categoryId,
      limit: parseFloat(limitStr) || 0
    }))

    setBudgetData(newBudgets)
    localStorage.setItem('basil_budgets', JSON.stringify(newBudgets))
    
    // Recalculate budget items with new limits
    calculateBudgetItems(transactions, categories, newBudgets)
    
    setIsEditing(false)
    setEditingLimits({})
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditingLimits({})
    setShowSuggestions(false)
  }

  const updateLimit = (categoryId: string, value: string) => {
    setEditingLimits(prev => ({
      ...prev,
      [categoryId]: value
    }))
  }

  const getTotalBudget = () => budgetItems.reduce((sum, item) => sum + item.limit, 0)
  const getTotalSpent = () => budgetItems.reduce((sum, item) => sum + item.spent, 0)
  const getTotalRemaining = () => getTotalBudget() - getTotalSpent()

  const getProgressPercentage = (spent: number, limit: number) => {
    if (limit === 0) return 0
    return Math.min((spent / limit) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'var(--color-expense)'
    if (percentage >= 80) return 'var(--color-warning)'
    return 'var(--color-income)'
  }

  return (
    <div className="page-content">
      <div className="budget-header">
        <div className="budget-summary-cards">
          <div className="budget-summary-card">
            <div className="budget-summary-label">Total Budget</div>
            <div className="budget-summary-value">{formatCurrency(getTotalBudget(), currency)}</div>
          </div>
          <div className="budget-summary-card">
            <div className="budget-summary-label">Total Spent</div>
            <div className="budget-summary-value expense">{formatCurrency(getTotalSpent(), currency)}</div>
          </div>
          <div className="budget-summary-card">
            <div className="budget-summary-label">Remaining</div>
            <div className={`budget-summary-value ${getTotalRemaining() >= 0 ? 'income' : 'expense'}`}>
              {formatCurrency(getTotalRemaining(), currency)}
            </div>
          </div>
        </div>

        <div className="budget-actions">
          {!isEditing ? (
            <>
              <button
                className="btn btn-primary"
                onClick={startEditing}
              >
                <Plus size={16} />
                {budgetItems.some(item => item.limit > 0) ? 'Edit Budget' : 'Set Budget'}
              </button>
              {transactions.length > 0 && (
                <button
                  className="btn btn-secondary"
                  onClick={openSuggestions}
                >
                  <Calculator size={16} />
                  Auto-Suggest
                </button>
              )}
            </>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={saveChanges}
              >
                <Save size={16} />
                Save Changes
              </button>
              <button
                className="btn btn-secondary"
                onClick={cancelEditing}
              >
                <X size={16} />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Auto-Suggestion Modal */}
      {showSuggestions && (
        <div className="modal-overlay" onClick={() => setShowSuggestions(false)}>
          <div className="modal suggestion-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Budget Suggestions</h3>
              <button
                className="modal-close-button"
                onClick={() => setShowSuggestions(false)}
                aria-label="Close suggestions"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p>Choose a target to automatically suggest budget limits based on your recent spending history:</p>
              
              <div className="target-options">
                <label className="target-option">
                  <input
                    type="radio"
                    name="target"
                    value="stabilize"
                    checked={selectedTarget === 'stabilize'}
                    onChange={(e) => handleTargetChange(e.target.value as BudgetTarget)}
                  />
                  <div className="target-info">
                    <div className="target-title">
                      <Target size={16} />
                      Stabilize Expenses
                    </div>
                    <div className="target-description">
                      Set budgets at your 2-month average spending per category
                    </div>
                  </div>
                </label>

                <label className="target-option">
                  <input
                    type="radio"
                    name="target"
                    value="reduce"
                    checked={selectedTarget === 'reduce'}
                    onChange={(e) => handleTargetChange(e.target.value as BudgetTarget)}
                  />
                  <div className="target-info">
                    <div className="target-title">
                      <TrendingDown size={16} />
                      Reduce Expenses
                    </div>
                    <div className="target-description">
                      Set most budgets 10% below average (Shopping, Dining, Entertainment, etc.)
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={applySuggestions}
              >
                Apply Suggestions
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowSuggestions(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Items */}
      <div className="budget-items">
        {budgetItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No Categories Found</h3>
            <p>Add some expense categories to start budgeting!</p>
          </div>
        ) : (
          budgetItems.map((item) => {
            const progressPercentage = getProgressPercentage(item.spent, item.limit)
            const progressColor = getProgressColor(progressPercentage)

            return (
              <div key={item.categoryId} className="budget-item">
                <div className="budget-item-header">
                  <h4 className="budget-category-name">{item.categoryName}</h4>
                  {!isEditing && (
                    <div className="budget-amounts">
                      <span className="budget-spent">{formatCurrency(item.spent, currency)}</span>
                      {item.limit > 0 && (
                        <>
                          <span className="budget-separator">of</span>
                          <span className="budget-limit">{formatCurrency(item.limit, currency)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="budget-edit-section">
                    <label className="form-label">Budget Limit</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingLimits[item.categoryId] || ''}
                      onChange={(e) => updateLimit(item.categoryId, e.target.value)}
                      placeholder="Enter budget limit"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ) : item.limit > 0 ? (
                  <div className="budget-progress-section">
                    <div className="budget-progress-bar">
                      <div
                        className="budget-progress-fill"
                        style={{
                          width: `${progressPercentage}%`,
                          backgroundColor: progressColor
                        }}
                      />
                    </div>
                    <div className="budget-progress-info">
                      <span className={`budget-remaining ${item.remaining >= 0 ? 'positive' : 'negative'}`}>
                        {item.remaining >= 0 ? 'Remaining: ' : 'Over by: '}
                        {formatCurrency(Math.abs(item.remaining), currency)}
                      </span>
                      <span className="budget-percentage">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="budget-no-limit">
                    <span className="budget-no-limit-text">No budget set</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Budget