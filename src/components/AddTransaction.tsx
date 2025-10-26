import { useState, useEffect, useRef } from 'react'
import { Plus, Check, PlusCircle, Edit, Trash2, X, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { addTransaction, addCategory, getCategoriesByUsage, loadTransactions, loadSettings, parseLocalDate, updateTransaction, deleteTransaction, loadCategories } from '../utils/storage'
import type { Category, Transaction, CurrencyConfig } from '../types'
import ImportWizard from './ImportWizard'
import { formatCurrency } from '../utils/currency'

interface AddTransactionProps {
  onSuccess: () => void
}

// Helper function to get local date in YYYY-MM-DD format
const getTodayLocalDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function AddTransaction({ onSuccess }: AddTransactionProps) {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    date: getTodayLocalDate() // Today's date in local timezone YYYY-MM-DD format
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showErrorMessage, setShowErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    amount: false,
    description: false,
    category: false
  })
  const [currency, setCurrency] = useState<CurrencyConfig>(() => loadSettings().currency)
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [previousTransactions, setPreviousTransactions] = useState<Transaction[]>([])
  const descriptionInputRef = useRef<HTMLInputElement>(null)
  
  // Recent transactions state
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  
  // Import wizard state
  const [viewMode, setViewMode] = useState<'manual' | 'import'>('manual')
  
  // Edit functionality state for recent transactions
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    date: ''
  })
  const [allCategories, setAllCategories] = useState<Category[]>([])

  useEffect(() => {
    const sortedCategories = getCategoriesByUsage(formData.type)
    setCategories(sortedCategories)
    
    // Load all categories for edit form
    setAllCategories(loadCategories())
  }, [formData.type])

  // Load categories and previous transactions on component mount
  useEffect(() => {
    const loadedCategories = getCategoriesByUsage(formData.type)
    setCategories(loadedCategories)
    
    const loadedTransactions = loadTransactions()
    setPreviousTransactions(loadedTransactions)
    
    // Load recent transactions (most recent 10, sorted by creation date)
    const recentTrans = loadedTransactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
    setRecentTransactions(recentTrans)
  }, [formData.type])

  // Listen for currency changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrency(loadSettings().currency)
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName)
    return category?.color || '#667eea'
  }

  // Edit functionality for recent transactions
  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const success = deleteTransaction(id)
      if (success) {
        // Refresh recent transactions
        const updatedTransactions = loadTransactions()
        const recentTrans = updatedTransactions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
        setRecentTransactions(recentTrans)
        
        // Notify parent to refresh
        onSuccess()
      }
    }
  }

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
      // Refresh recent transactions
      const updatedTransactions = loadTransactions()
      const recentTrans = updatedTransactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
      setRecentTransactions(recentTrans)
      
      cancelEditing()
      
      // Notify parent to refresh
      onSuccess()
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

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return

    // Generate a color for the new category
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newCategory = addCategory({
      name: newCategoryName.trim(),
      color: randomColor,
      type: formData.type
    })

    // Update local state
    setCategories(prev => [newCategory, ...prev])
    
    // Set the new category as selected
    setFormData(prev => ({ ...prev, category: newCategory.name }))
    
    // Reset new category input
    setNewCategoryName('')
    setShowNewCategoryInput(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting) {
      console.warn('Form submission already in progress')
      return
    }

    // Clear previous errors
    setShowErrorMessage('')
    setFieldErrors({
      amount: false,
      description: false,
      category: false
    })
    
    // Comprehensive validation with specific error messages
    const missingFields = []
    const errors = {
      amount: false,
      description: false,
      category: false
    }

    if (!formData.amount || formData.amount.trim() === '') {
      missingFields.push('Amount')
      errors.amount = true
    }
    if (!formData.description || formData.description.trim() === '') {
      missingFields.push('Description')
      errors.description = true
    }
    if (!formData.category || formData.category.trim() === '') {
      missingFields.push('Category')
      errors.category = true
    }

    // Additional amount validation
    let amount = 0
    if (formData.amount && formData.amount.trim() !== '') {
      amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        missingFields.push('Valid amount greater than 0')
        errors.amount = true
      }
    }

    if (missingFields.length > 0) {
      setFieldErrors(errors)
      setShowErrorMessage(`Please fill in the following required fields: ${missingFields.join(', ')}`)
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setShowErrorMessage('')
        setFieldErrors({
          amount: false,
          description: false,
          category: false
        })
      }, 5000)
      
      return
    }

    setIsSubmitting(true)

    try {
      console.log('Adding transaction:', {
        amount,
        description: formData.description.trim(),
        category: formData.category,
        type: formData.type,
        date: formData.date
      })

      await addTransaction({
        amount,
        description: formData.description.trim(),
        category: formData.category,
        type: formData.type,
        date: formData.date
      })

      console.log('Transaction added successfully')

      // Reset form
      setFormData({
        amount: '',
        description: '',
        category: '',
        type: 'expense',
        date: getTodayLocalDate()
      })

      // Clear autocomplete state
      setSuggestions([])
      setShowSuggestions(false)
      setActiveSuggestionIndex(-1)

      // Refresh recent transactions
      const updatedTransactions = loadTransactions()
      const recentTrans = updatedTransactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
      setRecentTransactions(recentTrans)

      // Show success message
      setShowSuccessMessage(true)
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 3000)

      // Notify parent component to refresh data
      onSuccess()

    } catch (error) {
      console.error('Failed to add transaction:', error)
      // Show a user-friendly error message
      alert(`Failed to add transaction: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error for this field when user starts typing
    if (fieldErrors[field as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: false
      }))
    }

    // Clear general error message if user is fixing issues
    if (showErrorMessage) {
      setShowErrorMessage('')
    }

    // Handle description autocomplete
    if (field === 'description') {
      handleDescriptionChange(value)
    }
  }

  // Special handler for amount input that only accepts numbers
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    // Allow empty string, numbers, and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      // Prevent multiple decimal points
      const decimalCount = (value.match(/\./g) || []).length
      if (decimalCount <= 1) {
        handleInputChange('amount', value)
      }
    }
  }

  // Format amount to 2 decimal places on blur
  const handleAmountBlur = () => {
    if (formData.amount && formData.amount.trim() !== '') {
      const numValue = parseFloat(formData.amount)
      if (!isNaN(numValue) && numValue > 0) {
        const formattedAmount = numValue.toFixed(2)
        setFormData(prev => ({
          ...prev,
          amount: formattedAmount
        }))
      }
    }
  }  // Autocomplete functions
  const handleDescriptionChange = (value: string) => {
    if (value.length >= 2) {
      // Get unique descriptions from previous transactions
      const uniqueDescriptions = [...new Set(previousTransactions.map(t => t.description))]
      
      // Filter descriptions that match the input (case insensitive)
      const matchingSuggestions = uniqueDescriptions
        .filter(desc => desc.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5) // Limit to 5 suggestions
        
      setSuggestions(matchingSuggestions)
      setShowSuggestions(matchingSuggestions.length > 0)
      setActiveSuggestionIndex(-1)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, description: suggestion }))
    setShowSuggestions(false)
    setActiveSuggestionIndex(-1)
    
    // Auto-set category based on previous transaction with same description
    const matchingTransaction = previousTransactions.find(t => 
      t.description.toLowerCase() === suggestion.toLowerCase()
    )
    
    if (matchingTransaction && matchingTransaction.category) {
      // Check if the category exists for the current type
      const categoryExists = categories.find(c => 
        c.name === matchingTransaction.category && c.type === formData.type
      )
      
      if (categoryExists) {
        setFormData(prev => ({ ...prev, category: matchingTransaction.category }))
      }
    }
  }

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (activeSuggestionIndex >= 0) {
          selectSuggestion(suggestions[activeSuggestionIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setActiveSuggestionIndex(-1)
        break
    }
  }

  const filteredCategories = categories.filter(cat => cat.type === formData.type)

  return (
    <div className="page-content">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-message" role="alert" aria-live="polite">
          <Check size={20} aria-hidden="true" />
          <span>Transaction added successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {showErrorMessage && (
        <div className="error-message" role="alert" aria-live="assertive">
          <span>⚠️</span>
          <span>{showErrorMessage}</span>
        </div>
      )}

      {/* Mode Toggle Header */}
      <div className="mode-toggle-header">
        <button
          type="button"
          className={`mode-toggle-btn ${viewMode === 'manual' ? 'active' : ''}`}
          onClick={() => setViewMode('manual')}
        >
          <Plus size={16} />
          Manual Entry
        </button>
        <button
          type="button"
          className={`mode-toggle-btn ${viewMode === 'import' ? 'active' : ''}`}
          onClick={() => setViewMode('import')}
        >
          <Upload size={16} />
          Import CSV
        </button>
      </div>
      
      {viewMode === 'import' ? (
        <ImportWizard
          onComplete={() => {
            setViewMode('manual')
            onSuccess()
          }}
          onCancel={() => setViewMode('manual')}
        />
      ) : (
        <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Transaction Type */}
          <fieldset className="form-group">
            <legend className="form-label">Transaction Type</legend>
            <div 
              className="type-toggle" 
              role="radiogroup" 
              aria-labelledby="transaction-type-legend"
              onKeyDown={(e) => {
                const types = ['expense', 'income'] as const
                const currentIndex = types.indexOf(formData.type)
                
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  const newIndex = currentIndex > 0 ? currentIndex - 1 : types.length - 1
                  handleInputChange('type', types[newIndex])
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault()
                  const newIndex = currentIndex < types.length - 1 ? currentIndex + 1 : 0
                  handleInputChange('type', types[newIndex])
                }
              }}
            >
              <button
                type="button"
                className={`type-button ${formData.type === 'expense' ? 'active expense' : ''}`}
                onClick={() => handleInputChange('type', 'expense')}
                role="radio"
                aria-checked={formData.type === 'expense'}
                aria-label="Expense - Money spent"
                tabIndex={formData.type === 'expense' ? 0 : -1}
              >
                Expense
              </button>
              <button
                type="button"
                className={`type-button ${formData.type === 'income' ? 'active income' : ''}`}
                onClick={() => handleInputChange('type', 'income')}
                role="radio"
                aria-checked={formData.type === 'income'}
                aria-label="Income - Money received"
                tabIndex={formData.type === 'income' ? 0 : -1}
              >
                Income
              </button>

            </div>
          </fieldset>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount" className="form-label">Amount ({currency.name})</label>
            <div className="amount-input-container">
              {currency.position === 'before' && (
                <span className="currency-symbol">{currency.symbol}</span>
              )}
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                className={`form-input amount-input ${fieldErrors.amount ? 'error' : ''}`}
                value={formData.amount}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                placeholder="0.00"
                required
                autoComplete="off"
                aria-invalid={fieldErrors.amount ? 'true' : 'false'}
                aria-describedby={fieldErrors.amount ? 'amount-error' : undefined}
              />
              {currency.position === 'after' && (
                <span className="currency-symbol">{currency.symbol}</span>
              )}
            </div>
          </div>

          {/* Description with Autocomplete */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <div className="autocomplete-container">
              <input
                ref={descriptionInputRef}
                id="description"
                type="text"
                className={`form-input ${fieldErrors.description ? 'error' : ''}`}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                onKeyDown={handleDescriptionKeyDown}
                onBlur={() => {
                  // Delay hiding to allow clicks on suggestions
                  setTimeout(() => setShowSuggestions(false), 150)
                }}
                onFocus={() => {
                  if (formData.description.length >= 2) {
                    handleDescriptionChange(formData.description)
                  }
                }}
                placeholder="What was this for?"
                required
                autoComplete="off"
                aria-invalid={fieldErrors.description ? 'true' : 'false'}
                aria-describedby={fieldErrors.description ? 'description-error' : undefined}
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="autocomplete-suggestions">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={`suggestion-item ${index === activeSuggestionIndex ? 'active' : ''}`}
                      onClick={() => selectSuggestion(suggestion)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="category" className="form-label">Category</label>
            
            {!showNewCategoryInput ? (
              <div className="category-input-container">
                <select
                  id="category"
                  className={`form-select ${fieldErrors.category ? 'error' : ''}`}
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === 'ADD_NEW') {
                      setShowNewCategoryInput(true)
                    } else {
                      handleInputChange('category', e.target.value)
                    }
                  }}
                  required
                  aria-invalid={fieldErrors.category ? 'true' : 'false'}
                  aria-describedby={fieldErrors.category ? 'category-error' : undefined}
                >
                  <option value="">Select a category</option>
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                  <option value="ADD_NEW">+ Add New Category</option>
                </select>
              </div>
            ) : (
              <div className="new-category-input">
                <div className="category-input-row">
                  <input
                    type="text"
                    className="form-input"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter new category name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddNewCategory()
                      } else if (e.key === 'Escape') {
                        setShowNewCategoryInput(false)
                        setNewCategoryName('')
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary add-category-btn"
                    onClick={handleAddNewCategory}
                    disabled={!newCategoryName.trim()}
                  >
                    <PlusCircle size={16} />
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary cancel-category-btn"
                    onClick={() => {
                      setShowNewCategoryInput(false)
                      setNewCategoryName('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <p className="new-category-hint">
                  Press Enter to add, Escape to cancel
                </p>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date" className="form-label">Date</label>
            <input
              id="date"
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary submit-button-full"
            disabled={isSubmitting || !formData.amount || !formData.description || !formData.category}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" />
                Adding...
              </>
            ) : (
              <>
                <Plus size={20} />
                Add Transaction
              </>
            )}
          </button>
        </form>
      </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="card-title">Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions yet. Add your first transaction above!</p>
          </div>
        ) : (
          <div className="transactions-list">
            {recentTransactions.map((transaction) => (
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
                      
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.description}
                          onChange={(e) => handleEditFormChange('description', e.target.value)}
                          placeholder="Enter description"
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
                          {allCategories.map(category => (
                            <option key={category.id} value={category.name}>
                              {category.name}
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
    </div>
  )
}

export default AddTransaction