import { useState, useEffect, useCallback } from 'react'
import { Search, Trash2, Edit, Check, X, Edit3, PlusCircle } from 'lucide-react'
import { format, subMonths, startOfMonth } from 'date-fns'
import { loadTransactions, loadCategories, updateTransaction, deleteTransaction, parseLocalDate, formatCurrency, loadSettings, addCategory } from '../utils/storage'
import { groupTransactionsByDescription, type TransactionGroup, type ImportedRow } from '../utils/smartImport'
import type { Transaction, Category, CurrencyConfig } from '../types'

function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories] = useState<Category[]>(loadCategories())
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense' | 'savings'>('all')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Bulk edit functionality state
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [transactionGroups, setTransactionGroups] = useState<TransactionGroup[]>([]);
  const [ungroupedTransactions, setUngroupedTransactions] = useState<Transaction[]>([])
  const [availableCategories, setAvailableCategories] = useState<Category[]>(loadCategories())
  const [showNewCategoryInputs, setShowNewCategoryInputs] = useState<Map<number, boolean>>(new Map())
  const [newCategoryNames, setNewCategoryNames] = useState<Map<number, string>>(new Map())
  
  // Edit functionality state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'expense' as 'income' | 'expense' | 'savings',
    date: ''
  })
  const [currency] = useState<CurrencyConfig>(() => loadSettings().currency)

  // Generate last 12 months for month filter
  const getLastTwelveMonths = useCallback(() => {
    const months = []
    const now = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = startOfMonth(subMonths(now, i))
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      })
    }
    
    return months
  }, [])

  const loadTransactionData = useCallback(() => {
    const data = loadTransactions()
    setTransactions(data)
  }, [])

  const filterAndSortTransactions = useCallback(() => {
    let filtered = [...transactions]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory) {
      if (selectedCategory === 'Uncategorized') {
        filtered = filtered.filter(t => t.category === 'Uncategorized' || !t.category || t.category.trim() === '')
      } else {
        filtered = filtered.filter(t => t.category === selectedCategory)
      }
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType)
    }

    // Filter by month
    if (selectedMonth) {
      filtered = filtered.filter(t => {
        const transactionDate = parseLocalDate(t.date)
        // Create filter date using same local date parsing to avoid timezone issues
        const [year, month] = selectedMonth.split('-').map(Number)
        const filterDate = new Date(year, month - 1, 1) // month is 0-indexed, same as parseLocalDate
        return transactionDate.getFullYear() === filterDate.getFullYear() &&
               transactionDate.getMonth() === filterDate.getMonth()
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'date') {
        comparison = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
      } else {
        comparison = a.amount - b.amount
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredTransactions(filtered)
  }, [transactions, searchTerm, selectedCategory, selectedType, selectedMonth, sortBy, sortOrder])

  useEffect(() => {
    loadTransactionData()
  }, [loadTransactionData])

  useEffect(() => {
    filterAndSortTransactions()
  }, [filterAndSortTransactions])

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const success = deleteTransaction(id)
      if (success) {
        loadTransactionData()
      }
    }
  }



  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName)
    return category?.color || '#667eea'
  }

  // Edit functionality
  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setEditFormData({
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      date: transaction.date
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditFormData({
      amount: '',
      description: '',
      category: '',
      type: 'expense',
      date: ''
    })
  }

  const saveEdit = () => {
    if (!editingId) return

    const success = updateTransaction(editingId, {
      amount: parseFloat(editFormData.amount),
      description: editFormData.description.trim(),
      category: editFormData.category,
      type: editFormData.type,
      date: editFormData.date
    })

    if (success) {
      loadTransactionData()
      cancelEditing()
    } else {
      alert('Failed to update transaction. Please try again.')
    }
  }

  const handleEditFormChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
  }

  // Format amount to 2 decimal places on blur for edit form
  const handleEditAmountBlur = () => {
    if (editFormData.amount && editFormData.amount.trim() !== '') {
      const numValue = parseFloat(editFormData.amount)
      if (!isNaN(numValue) && numValue > 0) {
        const formattedAmount = numValue.toFixed(2)
        setEditFormData(prev => ({
          ...prev,
          amount: formattedAmount
        }))
      }
    }
  }

  // Bulk edit helper functions
  const convertTransactionToParsed = (transaction: Transaction) => ({
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category,
    type: transaction.type,
    isDuplicate: false,
    confidence: 1.0,
    originalRow: {} as ImportedRow // Not needed for grouping existing transactions
  })

  const enterBulkEditMode = () => {
    // Convert transactions to ParsedTransaction format for grouping
    const parsedTransactions = filteredTransactions.map(convertTransactionToParsed)
    const groups = groupTransactionsByDescription(parsedTransactions)
    
    // Preserve existing categories by finding the most common category in each group
    const enhancedGroups = groups.map(group => {
      const categoryCount = new Map<string, number>()
      
      // First, ensure each transaction in the group has its original category preserved
      const updatedTransactions = group.transactions.map(t => {
        const originalTransaction = filteredTransactions.find(orig => orig.id === t.id)
        return {
          ...t,
          category: originalTransaction?.category || t.category || ''
        }
      })
      
      // Count categories in this group (ignore empty/uncategorized) using preserved data
      updatedTransactions.forEach(t => {
        if (t.category && t.category.trim() !== '' && t.category !== 'Uncategorized') {
          const current = categoryCount.get(t.category) || 0
          categoryCount.set(t.category, current + 1)
        }
      })
      
      // Find most common category
      let mostCommonCategory = ''
      let maxCount = 0
      for (const [category, count] of categoryCount) {
        if (count > maxCount) {
          maxCount = count
          mostCommonCategory = category
        }
      }
      
      return {
        ...group,
        transactions: updatedTransactions,
        suggestedCategory: mostCommonCategory
      }
    })
    
    // Get ungrouped transactions
    const groupedIds = new Set(enhancedGroups.flatMap(g => g.transactions.map(t => t.id)))
    const ungrouped = filteredTransactions.filter(t => !groupedIds.has(t.id))
    
    setTransactionGroups(enhancedGroups)
    setUngroupedTransactions(ungrouped)
    setIsBulkEditMode(true)
  }

  const exitBulkEditMode = () => {
    setIsBulkEditMode(false)
    setTransactionGroups([])
    setUngroupedTransactions([])
    loadTransactionData() // Refresh data in case of changes
  }

  const updateTransactionGroup = (groupIndex: number, updates: { category?: string, type?: 'income' | 'expense' | 'savings' }) => {
    const updatedGroups = [...transactionGroups]
    const group = updatedGroups[groupIndex]
    
    if (updates.category !== undefined || updates.type !== undefined) {
      // Update all transactions in the group
      const transactionIds = group.transactions.map(t => t.id)
      
      transactionIds.forEach(id => {
        const updateData: Partial<Transaction> = {}
        if (updates.category !== undefined) updateData.category = updates.category
        if (updates.type !== undefined) updateData.type = updates.type
        
        updateTransaction(id, updateData)
      })
      
      // Update the group state
      if (updates.category !== undefined) {
        group.suggestedCategory = updates.category
        group.transactions.forEach(t => t.category = updates.category)
      }
      if (updates.type !== undefined) {
        group.suggestedType = updates.type
        group.transactions.forEach(t => t.type = updates.type)
      }
      
      setTransactionGroups(updatedGroups)
    }
  }

  const updateIndividualTransaction = (transactionId: string, updates: { category?: string, type?: 'income' | 'expense' | 'savings' }) => {
    updateTransaction(transactionId, updates)
    
    // Update local state
    setUngroupedTransactions(prev => 
      prev.map(t => 
        t.id === transactionId 
          ? { ...t, ...updates }
          : t
      )
    )
  }

  const toggleNewCategoryInput = (groupIndex: number, show: boolean) => {
    setShowNewCategoryInputs(prev => {
      const updated = new Map(prev)
      updated.set(groupIndex, show)
      return updated
    })
    if (!show) {
      setNewCategoryNames(prev => {
        const updated = new Map(prev)
        updated.delete(groupIndex)
        return updated
      })
    }
  }

  const updateNewCategoryName = (groupIndex: number, name: string) => {
    setNewCategoryNames(prev => {
      const updated = new Map(prev)
      updated.set(groupIndex, name)
      return updated
    })
  }

  const handleAddNewCategory = (groupIndex: number, type: 'income' | 'expense' | 'savings') => {
    const categoryName = newCategoryNames.get(groupIndex)?.trim()
    if (!categoryName) return

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newCategory = addCategory({
      name: categoryName,
      color: randomColor,
      type: type
    })

    setAvailableCategories(prev => [newCategory, ...prev])
    updateTransactionGroup(groupIndex, { category: newCategory.name })
    
    // Reset input
    setNewCategoryNames(prev => {
      const updated = new Map(prev)
      updated.delete(groupIndex)
      return updated
    })
    setShowNewCategoryInputs(prev => {
      const updated = new Map(prev)
      updated.set(groupIndex, false)
      return updated
    })
  }

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalSavings = filteredTransactions
    .filter(t => t.type === 'savings')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="page-content">
      {/* Filters */}
      <div className="card">
        <div className="filters-grid">
          {/* Search */}
          <div className="filter-group">
            <div className="search-container">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              <option value="Uncategorized">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="filter-group">
            <select
              className="form-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'income' | 'expense' | 'savings')}
              aria-label="Filter by transaction type"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="savings">Savings</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="filter-group">
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Filter by month"
            >
              <option value="">All Months</option>
              {getLastTwelveMonths().map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="filter-group">
            <select
              className="form-select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-')
                setSortBy(by as 'date' | 'amount')
                setSortOrder(order as 'asc' | 'desc')
              }}
              aria-label="Sort transactions by"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Summary and Bulk Edit Toggle */}
        <div className="summary-and-actions">
          {filteredTransactions.length > 0 && (
            <div className="filter-summary">
              <div className="summary-item income">
                <span className="summary-label">Income:</span>
                <span className="summary-value">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="summary-item expense">
                <span className="summary-label">Expenses:</span>
                <span className="summary-value">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="summary-item savings">
                <span className="summary-label">Savings:</span>
                <span className="summary-value">{formatCurrency(totalSavings)}</span>
              </div>
              <div className="summary-item balance">
                <span className="summary-label">Net:</span>
                <span className="summary-value">{formatCurrency(totalIncome - totalExpenses - totalSavings)}</span>
              </div>
            </div>
          )}
          
          {filteredTransactions.length > 1 && (
            <div className="bulk-edit-actions">
              {!isBulkEditMode ? (
                <button 
                  className="btn btn-secondary"
                  onClick={enterBulkEditMode}
                >
                  <Edit3 size={16} />
                  Bulk Edit
                </button>
              ) : (
                <button 
                  className="btn btn-secondary"
                  onClick={exitBulkEditMode}
                >
                  <X size={16} />
                  Exit Bulk Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <h3>No Transactions Found</h3>
            <p>
              {transactions.length === 0 
                ? "You haven't added any transactions yet." 
                : "No transactions match your current filters."
              }
            </p>
          </div>
        ) : isBulkEditMode ? (
          // Bulk Edit Mode
          <div className="bulk-edit-content">
            {transactionGroups.length > 0 && (
              <>
                <div className="groups-summary">
                  <h3>Transaction Groups ({transactionGroups.length})</h3>
                  <p>Similar transactions grouped for bulk editing</p>
                </div>
                
                {transactionGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="transaction-group">
                    <div className="group-header">
                      <div className="group-info">
                        <div className="group-title-section">
                          <h4>{group.description}</h4>
                          <span className="group-count">{group.transactions.length} transactions</span>
                        </div>
                      </div>
                      
                      <div className="group-controls">
                        <select
                          className="form-select"
                          value={group.suggestedType || 'expense'}
                          onChange={(e) => updateTransactionGroup(groupIndex, { 
                            type: e.target.value as 'income' | 'expense' | 'savings' 
                          })}
                          aria-label="Transaction type"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="savings">Savings</option>
                        </select>
                        
                        {!showNewCategoryInputs.get(groupIndex) ? (
                          <select
                            className="form-select"
                            value={group.suggestedCategory || ''}
                            onChange={(e) => {
                              if (e.target.value === 'ADD_NEW') {
                                toggleNewCategoryInput(groupIndex, true)
                              } else {
                                updateTransactionGroup(groupIndex, { category: e.target.value })
                              }
                            }}
                            aria-label="Category"
                          >
                            <option value="">Select category...</option>
                            {availableCategories
                              .filter(cat => !group.suggestedType || cat.type === group.suggestedType)
                              .map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            <option value="ADD_NEW">+ Add New Category</option>
                          </select>
                        ) : (
                          <div className="new-category-input-group">
                            <input
                              type="text"
                              className="form-input new-category-input"
                              value={newCategoryNames.get(groupIndex) || ''}
                              onChange={(e) => updateNewCategoryName(groupIndex, e.target.value)}
                              placeholder="Enter new category name"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddNewCategory(groupIndex, group.suggestedType || 'expense')
                                } else if (e.key === 'Escape') {
                                  toggleNewCategoryInput(groupIndex, false)
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAddNewCategory(groupIndex, group.suggestedType || 'expense')}
                              disabled={!newCategoryNames.get(groupIndex)?.trim()}
                            >
                              <PlusCircle size={14} />
                              Add
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => toggleNewCategoryInput(groupIndex, false)}
                              aria-label="Cancel add new category"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="group-transactions">
                      {group.transactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="group-transaction">
                          <span className="description">{transaction.description}</span>
                          <span className="amount">{formatCurrency(transaction.amount)}</span>
                          <span className="date">{format(parseLocalDate(transaction.date), 'MMM dd, yyyy')}</span>
                        </div>
                      ))}
                      {group.transactions.length > 5 && (
                        <div className="more-transactions">
                          +{group.transactions.length - 5} more transactions
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {ungroupedTransactions.length > 0 && (
              <>
                <div className="groups-summary">
                  <h3>Individual Transactions ({ungroupedTransactions.length})</h3>
                  <p>Transactions that couldn't be grouped</p>
                </div>
                
                {ungroupedTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-group individual-transaction">
                    <div className="group-header">
                      <div className="group-info">
                        <div className="group-title-section">
                          <h4>{transaction.description}</h4>
                          <span className="group-count">{formatCurrency(transaction.amount)} on {format(parseLocalDate(transaction.date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      
                      <div className="group-controls">
                        <select
                          className="form-select"
                          value={transaction.type || 'expense'}
                          onChange={(e) => updateIndividualTransaction(transaction.id, { 
                            type: e.target.value as 'income' | 'expense' | 'savings' 
                          })}
                          aria-label="Transaction type"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="savings">Savings</option>
                        </select>
                        
                        <select
                          className="form-select"
                          value={transaction.category || ''}
                          onChange={(e) => updateIndividualTransaction(transaction.id, { category: e.target.value })}
                          aria-label="Category"
                        >
                          <option value="">Select category...</option>
                          {availableCategories
                            .filter(cat => !transaction.type || cat.type === transaction.type)
                            .map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {transactionGroups.length === 0 && ungroupedTransactions.length === 0 && (
              <div className="no-groups">
                <p>No transactions available for bulk editing.</p>
              </div>
            )}
          </div>
        ) : (
          // Normal View Mode
          <div className="transactions-list">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                {editingId === transaction.id ? (
                  // Edit Form
                  <div 
                    className="edit-form"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault()
                        saveEdit()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelEditing()
                      }
                    }}
                  >
                    <div className="edit-form-row">
                      <div className="form-group">
                        <label className="form-label">Type</label>
                        <select
                          className="form-select"
                          value={editFormData.type}
                          onChange={(e) => handleEditFormChange('type', e.target.value)}
                          aria-label="Transaction type"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Amount ({currency.name})</label>
                        <div className="amount-input-container">
                          {currency.position === 'before' && (
                            <span className="currency-symbol">{currency.symbol}</span>
                          )}
                          <input
                            type="text"
                            inputMode="decimal"
                            className="form-input amount-input"
                            value={editFormData.amount}
                            onChange={(e) => {
                              const value = e.target.value
                              // Allow empty string, numbers, and decimal point
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                // Prevent multiple decimal points
                                const decimalCount = (value.match(/\./g) || []).length
                                if (decimalCount <= 1) {
                                  handleEditFormChange('amount', value)
                                }
                              }
                            }}
                            onBlur={handleEditAmountBlur}
                            placeholder="0.00"
                            aria-label="Transaction amount"
                          />
                          {currency.position === 'after' && (
                            <span className="currency-symbol">{currency.symbol}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="edit-form-row">
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.description}
                          onChange={(e) => handleEditFormChange('description', e.target.value)}
                          placeholder="Transaction description"
                          aria-label="Transaction description"
                        />
                      </div>
                    </div>
                    
                    <div className="edit-form-row">
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                          className="form-select"
                          value={editFormData.category}
                          onChange={(e) => handleEditFormChange('category', e.target.value)}
                          aria-label="Transaction category"
                        >
                          <option value="">Select category</option>
                          {categories
                            .filter(cat => cat.type === editFormData.type)
                            .map(cat => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={editFormData.date}
                          onChange={(e) => handleEditFormChange('date', e.target.value)}
                          aria-label="Transaction date"
                        />
                      </div>
                    </div>
                    
                    <div className="edit-form-actions">
                      <div className="edit-form-hint">
                        <span>Ctrl+Enter to save • Escape to cancel</span>
                      </div>
                      <div className="edit-form-buttons">
                        <button
                          className="btn btn-primary"
                          onClick={saveEdit}
                          disabled={!editFormData.amount || !editFormData.description || !editFormData.category}
                        >
                          <Check size={16} />
                          Save
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={cancelEditing}
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Normal View
                  <>
                    <div className="transaction-main">
                      <div 
                        className="category-indicator"
                        style={{ backgroundColor: getCategoryColor(transaction.category) }}
                      />
                      <div className="transaction-details">
                        <div className="transaction-description">
                          {transaction.description}
                        </div>
                        <div className="transaction-meta">
                          <span className="transaction-category">
                            {transaction.category}
                          </span>
                          <span className="transaction-date">
                            {format(parseLocalDate(transaction.date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="transaction-amount">
                        <span className={`amount ${transaction.type}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="transaction-actions">
                      <button
                        className="action-button edit"
                        onClick={() => startEditing(transaction)}
                        title="Edit transaction"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-button delete"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        title="Delete transaction"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-item">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{filteredTransactions.length}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Avg Transaction</div>
          <div className="stat-value">
            {filteredTransactions.length > 0 
              ? formatCurrency(
                  filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length
                )
              : formatCurrency(0)
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionHistory