import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Download, Edit3, Check, X, PlusCircle } from 'lucide-react'
import { 
  parseCSV, 
  detectColumnMappings, 
  processImportedTransactions, 
  groupTransactionsByDescription,
  type ImportedRow, 
  type ColumnMapping, 
  type ParsedTransaction, 
  type TransactionGroup 
} from '../utils/smartImport'
import { addTransaction, loadCategories, addCategory } from '../utils/storage'
import type { Category } from '../types'

type ImportStep = 'upload' | 'mapping' | 'duplicates' | 'bulk-edit' | 'confirm' | 'complete'

interface ImportWizardProps {
  onComplete: () => void
  onCancel: () => void
}

function ImportWizard({ onComplete, onCancel }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
  const [csvData, setCsvData] = useState<ImportedRow[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    dateColumn: '',
    descriptionColumn: '',
    amountColumn: ''
  })
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [transactionGroups, setTransactionGroups] = useState<TransactionGroup[]>([])
  const [ungroupedTransactions, setUngroupedTransactions] = useState<ParsedTransaction[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<Category[]>(loadCategories())
  const [showNewCategoryInputs, setShowNewCategoryInputs] = useState<Map<number, boolean>>(new Map())
  const [newCategoryNames, setNewCategoryNames] = useState<Map<number, string>>(new Map())

  // Step 1: File Upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      if (csvText) {
        const parsed = parseCSV(csvText)
        setCsvData(parsed)
        
        // Auto-detect column mappings
        const detectedMapping = detectColumnMappings(parsed)
        setColumnMapping(detectedMapping)
        
        setCurrentStep('mapping')
      }
    }
    reader.readAsText(file)
  }, [])

  // Step 2: Column Mapping
  const handleMappingConfirm = () => {
    // Validate required columns
    const hasAmountData = columnMapping.amountColumn || (columnMapping.debitColumn && columnMapping.creditColumn)
    if (!columnMapping.dateColumn || !columnMapping.descriptionColumn || !hasAmountData) {
      alert('Please map all required columns (Date, Description, and either Amount OR both Debit/Credit)')
      return
    }

    setIsProcessing(true)
    
    setTimeout(() => {
      const processed = processImportedTransactions(csvData, columnMapping)
      setParsedTransactions(processed)
      
      // Group ALL transactions for bulk editing (including duplicates)
      const groups = groupTransactionsByDescription(processed)
      
      // Set duplicate groups as excluded by default
      groups.forEach(group => {
        const allAreDuplicates = group.transactions.every(t => t.isDuplicate)
        if (allAreDuplicates) {
          group.includeInImport = false
        }
      })
      
      // Get transactions that weren't grouped (single transactions)
      const groupedTransactionIds = new Set(
        groups.flatMap(group => group.transactions.map(t => t.id))
      )
      const ungrouped = processed.filter(t => !groupedTransactionIds.has(t.id))
      
      setTransactionGroups(groups)
      setUngroupedTransactions(ungrouped)
      
      // Initialize selectedTransactions to include all non-duplicates by default
      // Duplicates are unchecked by default but still visible
      const nonDuplicateIds = processed.filter(t => !t.isDuplicate).map(t => t.id)
      setSelectedTransactions(new Set(nonDuplicateIds))
      
      // Check if there are any duplicates
      const hasDuplicates = processed.some(t => t.isDuplicate)
      
      // Go to duplicates review step only if there are duplicates, otherwise go directly to bulk edit
      setCurrentStep(hasDuplicates ? 'duplicates' : 'bulk-edit')
      
      setIsProcessing(false)
    }, 1000)
  }

  // Step 3: Handle Duplicates
  const handleDuplicateReview = () => {
    const nonDuplicates = parsedTransactions.filter(t => !t.isDuplicate || selectedTransactions.has(t.id))
    const groups = groupTransactionsByDescription(nonDuplicates)
    
    // Get transactions that weren't grouped (single transactions)
    const groupedTransactionIds = new Set(
      groups.flatMap(group => group.transactions.map(t => t.id))
    )
    const ungrouped = nonDuplicates.filter(t => !groupedTransactionIds.has(t.id))
    
    setTransactionGroups(groups)
    setUngroupedTransactions(ungrouped)
    
    // Initialize selectedTransactions to include all ungrouped transactions by default
    setSelectedTransactions(new Set(ungrouped.map(t => t.id)))
    
    setCurrentStep('bulk-edit')
  }

  // Step 4: Bulk Edit
  const updateTransactionGroup = (groupIndex: number, updates: { category?: string, type?: 'income' | 'expense', includeInImport?: boolean }) => {
    const updatedGroups = [...transactionGroups]
    const group = updatedGroups[groupIndex]
    
    if (updates.category !== undefined) {
      group.suggestedCategory = updates.category
      group.transactions.forEach(t => {
        t.category = updates.category
      })
    }
    
    if (updates.type) {
      group.suggestedType = updates.type
      group.transactions.forEach(t => {
        t.type = updates.type
      })
    }

    if (updates.includeInImport !== undefined) {
      group.includeInImport = updates.includeInImport
      
      // Update selectedTransactions to reflect group inclusion
      const newSelected = new Set(selectedTransactions)
      group.transactions.forEach(t => {
        if (updates.includeInImport) {
          // Only auto-select non-duplicates when including the group
          if (!t.isDuplicate) {
            newSelected.add(t.id)
          }
        } else {
          // Remove all transactions from the group when excluding
          newSelected.delete(t.id)
        }
      })
      setSelectedTransactions(newSelected)
    }
    
    setTransactionGroups(updatedGroups)
  }

  // Helper functions for new category management
  const handleAddNewCategory = (groupIndex: number, type: 'income' | 'expense') => {
    const categoryName = newCategoryNames.get(groupIndex)?.trim()
    if (!categoryName) return

    // Generate a color for the new category
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newCategory = addCategory({
      name: categoryName,
      color: randomColor,
      type: type
    })

    // Update available categories
    setAvailableCategories(prev => [newCategory, ...prev])
    
    // Apply the new category to this group
    updateTransactionGroup(groupIndex, { category: newCategory.name })
    
    // Reset new category input for this group
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

  // Helper function to update individual ungrouped transactions
  const updateUngroupedTransaction = (transactionId: string, updates: { category?: string, type?: 'income' | 'expense' }) => {
    setUngroupedTransactions(prev => 
      prev.map(t => 
        t.id === transactionId 
          ? { ...t, ...updates }
          : t
      )
    )
    
    // Also update in parsedTransactions to ensure consistency
    setParsedTransactions(prev => 
      prev.map(t => 
        t.id === transactionId 
          ? { ...t, ...updates }
          : t
      )
    )
  }

  // Final Import
  const handleFinalImport = async () => {
    setIsProcessing(true)
    
    try {
      // Get all transactions to import (from included groups + selected ungrouped)
      const allTransactionsToImport = [
        ...transactionGroups
          .filter(group => group.includeInImport !== false)
          .flatMap(group => group.transactions),
        ...ungroupedTransactions.filter(t => selectedTransactions.has(t.id))
      ] // Duplicates are already filtered out

      // Import each transaction
      let imported = 0
      for (const transaction of allTransactionsToImport) {
        await addTransaction({
          amount: transaction.amount,
          description: transaction.description,
          category: transaction.category || 'Uncategorized',
          type: transaction.type || 'expense',
          date: transaction.date
        })
        imported++
      }

      setCurrentStep('complete')
      
      // Auto-complete after showing success
      setTimeout(() => {
        onComplete()
      }, 2000)
      
    } catch (error) {
      alert('Error importing transactions. Please try again.')
      console.error('Import error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const renderUploadStep = () => (
    <div className="import-step">
      <div className="step-header">
        <FileText size={32} className="step-icon" />
        <h3>Upload CSV File</h3>
        <p>Select a CSV file exported from your bank</p>
      </div>
      
      <div className="upload-area">
        <label className="upload-dropzone">
          <Upload size={48} />
          <p><strong>Click to select</strong> your bank CSV file</p>
          <p className="upload-hint">Supports various bank formats with automatic column detection</p>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden-file-input"
          />
        </label>
      </div>
      
      <div className="format-hints">
        <h4>Supported Formats:</h4>
        <ul>
          <li>✅ Date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</li>
          <li>✅ Amount formats: $123.45, (123.45), -123.45</li>
          <li>✅ Various column names automatically detected</li>
          <li>✅ Both positive and negative amounts</li>
        </ul>
      </div>
    </div>
  )

  const renderMappingStep = () => (
    <div className="import-step">
      <div className="step-header">
        <Edit3 size={32} className="step-icon" />
        <h3>Map CSV Columns</h3>
        <p>Confirm how your CSV columns match our transaction fields</p>
      </div>
      
      {csvData.length > 0 && (
        <>
          <div className="column-mapping">
            <div className="mapping-row">
              <label className="mapping-label">Date Column *</label>
              <select 
                className="form-select"
                value={columnMapping.dateColumn}
                onChange={(e) => setColumnMapping({...columnMapping, dateColumn: e.target.value})}
              >
                <option value="">Select date column...</option>
                {Object.keys(csvData[0]).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            
            <div className="mapping-row">
              <label className="mapping-label">Description Column *</label>
              <select 
                className="form-select"
                value={columnMapping.descriptionColumn}
                onChange={(e) => setColumnMapping({...columnMapping, descriptionColumn: e.target.value})}
              >
                <option value="">Select description column...</option>
                {Object.keys(csvData[0]).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            
            {/* Show either single amount column OR debit/credit columns */}
            {columnMapping.debitColumn || columnMapping.creditColumn ? (
              <>
                <div className="mapping-row">
                  <label className="mapping-label">Debit Column *</label>
                  <select 
                    className="form-select"
                    value={columnMapping.debitColumn || ''}
                    onChange={(e) => setColumnMapping({...columnMapping, debitColumn: e.target.value || undefined})}
                  >
                    <option value="">Select debit column...</option>
                    {Object.keys(csvData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mapping-row">
                  <label className="mapping-label">Credit Column *</label>
                  <select 
                    className="form-select"
                    value={columnMapping.creditColumn || ''}
                    onChange={(e) => setColumnMapping({...columnMapping, creditColumn: e.target.value || undefined})}
                  >
                    <option value="">Select credit column...</option>
                    {Object.keys(csvData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mapping-note">
                  <small>💡 Bank format detected: Debit = money out (expenses), Credit = money in (income)</small>
                </div>
              </>
            ) : columnMapping.isBasilCSV ? (
              <>
                <div className="mapping-row">
                  <label className="mapping-label">Amount Column *</label>
                  <select 
                    className="form-select"
                    value={columnMapping.amountColumn}
                    onChange={(e) => setColumnMapping({...columnMapping, amountColumn: e.target.value})}
                  >
                    <option value="">Select amount column...</option>
                    {Object.keys(csvData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mapping-note">
                  <small>🌿 Basil CSV detected: Your exported data with Type and Category columns</small>
                </div>
              </>
            ) : (
              <div className="mapping-row">
                <label className="mapping-label">Amount Column *</label>
                <select 
                  className="form-select"
                  value={columnMapping.amountColumn}
                  onChange={(e) => setColumnMapping({...columnMapping, amountColumn: e.target.value})}
                >
                  <option value="">Select amount column...</option>
                  {Object.keys(csvData[0]).map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="mapping-row">
              <label className="mapping-label">Category Column (Optional)</label>
              <select 
                className="form-select"
                value={columnMapping.categoryColumn || ''}
                onChange={(e) => setColumnMapping({...columnMapping, categoryColumn: e.target.value || undefined})}
              >
                <option value="">No category column</option>
                {Object.keys(csvData[0]).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Type column for Basil or other CSV formats */}
            {(columnMapping.isBasilCSV || columnMapping.typeColumn) && (
              <div className="mapping-row">
                <label className="mapping-label">Type Column (Optional)</label>
                <select 
                  className="form-select"
                  value={columnMapping.typeColumn || ''}
                  onChange={(e) => setColumnMapping({...columnMapping, typeColumn: e.target.value || undefined})}
                >
                  <option value="">No type column</option>
                  {Object.keys(csvData[0]).map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                {columnMapping.isBasilCSV && (
                  <small className="mapping-hint">Maps to Income/Expense from your Basil export</small>
                )}
              </div>
            )}

            {/* Created At column for Basil CSV */}
            {columnMapping.isBasilCSV && (
              <div className="mapping-row">
                <label className="mapping-label">Created At Column (Optional)</label>
                <select 
                  className="form-select"
                  value={columnMapping.createdAtColumn || ''}
                  onChange={(e) => setColumnMapping({...columnMapping, createdAtColumn: e.target.value || undefined})}
                >
                  <option value="">No created at column</option>
                  {Object.keys(csvData[0]).map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <small className="mapping-hint">Preserves original transaction creation timestamps</small>
              </div>
            )}
          </div>
          
          <div className="preview-section">
            <h4>Preview (first 3 rows):</h4>
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    {columnMapping.debitColumn || columnMapping.creditColumn ? (
                      <>
                        <th>Debit</th>
                        <th>Credit</th>
                      </>
                    ) : (
                      <th>Amount</th>
                    )}
                    {columnMapping.categoryColumn && <th>Category</th>}
                    {columnMapping.typeColumn && <th>Type</th>}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 3).map((row, index) => (
                    <tr key={index}>
                      <td>{columnMapping.dateColumn ? String(row[columnMapping.dateColumn]) : '—'}</td>
                      <td>{columnMapping.descriptionColumn ? String(row[columnMapping.descriptionColumn]) : '—'}</td>
                      {columnMapping.debitColumn || columnMapping.creditColumn ? (
                        <>
                          <td>{columnMapping.debitColumn ? String(row[columnMapping.debitColumn] || '') : '—'}</td>
                          <td>{columnMapping.creditColumn ? String(row[columnMapping.creditColumn] || '') : '—'}</td>
                        </>
                      ) : (
                        <td>{columnMapping.amountColumn ? String(row[columnMapping.amountColumn]) : '—'}</td>
                      )}
                      {columnMapping.categoryColumn && (
                        <td>{String(row[columnMapping.categoryColumn] || '—')}</td>
                      )}
                      {columnMapping.typeColumn && (
                        <td>{String(row[columnMapping.typeColumn] || '—')}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )

  const renderDuplicatesStep = () => {
    const duplicates = parsedTransactions.filter(t => t.isDuplicate)
    
    if (duplicates.length === 0) {
      return (
        <div className="import-step">
          <div className="step-header">
            <CheckCircle size={32} className="step-icon success" />
            <h3>No Duplicates Found</h3>
            <p>All {parsedTransactions.length} transactions appear to be unique</p>
          </div>
          
          <div className="no-duplicates-message">
            <p>✅ Ready to proceed with categorization</p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="import-step">
        <div className="step-header">
          <AlertCircle size={32} className="step-icon warning" />
          <h3>Potential Duplicates Found</h3>
          <p>We found {duplicates.length} transactions that might already exist</p>
        </div>
        
        <div className="duplicates-list">
          <div className="duplicates-header">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={duplicates.every(d => selectedTransactions.has(d.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTransactions(prev => {
                      const newSet = new Set(prev)
                      duplicates.forEach(d => newSet.add(d.id))
                      return newSet
                    })
                  } else {
                    setSelectedTransactions(prev => {
                      const newSet = new Set(prev)
                      duplicates.forEach(d => newSet.delete(d.id))
                      return newSet
                    })
                  }
                }}
              />
              <span>Import duplicates anyway</span>
            </label>
          </div>
          
          {duplicates.map((transaction) => (
            <div key={transaction.id} className="duplicate-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedTransactions.has(transaction.id)}
                  onChange={(e) => {
                    setSelectedTransactions(prev => {
                      const newSet = new Set(prev)
                      if (e.target.checked) {
                        newSet.add(transaction.id)
                      } else {
                        newSet.delete(transaction.id)
                      }
                      return newSet
                    })
                  }}
                />
                <div className="transaction-info">
                  <div className="transaction-main-info">
                    <span className="description">{transaction.description}</span>
                    <span className="amount">${transaction.amount.toFixed(2)}</span>
                    <span className="date">{transaction.date}</span>
                  </div>
                  <div className="duplicate-reason">
                    <AlertCircle size={14} />
                    {transaction.duplicateReason}
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderBulkEditStep = () => (
    <div className="import-step">
      <div className="step-header">
        <Edit3 size={32} className="step-icon" />
        <h3>Bulk Edit Transactions</h3>
        <p>Group similar transactions and assign categories in bulk. Duplicate transactions are unchecked by default.</p>
      </div>
      
      <div className="bulk-edit-content">
        {transactionGroups.length > 0 && (
          <>
            <div className="groups-summary">
              <p>Found {transactionGroups.length} groups of similar transactions</p>
            </div>
            
            {transactionGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={`transaction-group ${group.includeInImport === false ? 'excluded' : ''}`}>
                <div className="group-header">
                  <div className="group-info">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={group.includeInImport !== false}
                        onChange={(e) => updateTransactionGroup(groupIndex, { includeInImport: e.target.checked })}
                      />
                      <div className="group-title-section">
                        <h4>{group.description}</h4>
                        <span className="group-count">{group.transactions.length} transactions</span>
                      </div>
                    </label>
                  </div>
                  
                  {group.includeInImport !== false && (
                    <div className="group-controls">
                      <select
                        className="form-select"
                        value={group.suggestedType || 'expense'}
                        onChange={(e) => updateTransactionGroup(groupIndex, { 
                          type: e.target.value as 'income' | 'expense' 
                        })}
                        aria-label="Transaction type"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
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
                  )}
                </div>
                
                <div className="group-transactions">
                  {group.transactions.slice(0, 3).map((transaction) => (
                    <div key={transaction.id} className="group-transaction">
                      <span className="description">{transaction.description}</span>
                      <span className="amount">${transaction.amount.toFixed(2)}</span>
                      <span className="date">{transaction.date}</span>
                      {transaction.isDuplicate && (
                        <span className="duplicate-badge">Duplicate</span>
                      )}
                    </div>
                  ))}
                  {group.transactions.length > 3 && (
                    <div className="more-transactions">
                      +{group.transactions.length - 3} more transactions
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
              <p>Individual transactions ({ungroupedTransactions.length})</p>
            </div>
            
            {ungroupedTransactions.map((transaction) => (
              <div key={transaction.id} className={`transaction-group individual-transaction ${selectedTransactions.has(transaction.id) ? '' : 'excluded'}`}>
                <div className="group-header">
                  <div className="group-info">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedTransactions)
                          if (e.target.checked) {
                            newSelected.add(transaction.id)
                          } else {
                            newSelected.delete(transaction.id)
                          }
                          setSelectedTransactions(newSelected)
                        }}
                      />
                      <div className="group-title-section">
                        <h4>{transaction.description}</h4>
                        <span className="group-count">${transaction.amount.toFixed(2)} on {transaction.date}</span>
                        {transaction.isDuplicate && (
                          <span className="duplicate-badge">Duplicate</span>
                        )}
                      </div>
                    </label>
                  </div>
                  
                  {selectedTransactions.has(transaction.id) && (
                    <div className="group-controls">
                    <select
                      className="form-select"
                      value={transaction.type || 'expense'}
                      onChange={(e) => updateUngroupedTransaction(transaction.id, { 
                        type: e.target.value as 'income' | 'expense' 
                      })}
                      aria-label="Transaction type"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    
                    <select
                      className="form-select"
                      value={transaction.category || ''}
                      onChange={(e) => updateUngroupedTransaction(transaction.id, { category: e.target.value })}
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
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        
        {transactionGroups.length === 0 && ungroupedTransactions.length === 0 && (
          <div className="no-groups">
            <p>No transactions to categorize.</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderConfirmStep = () => {
    // Calculate accurate totals based on included groups and selections
    const includedGroupTransactions = transactionGroups
      .filter(group => group.includeInImport !== false)
      .flatMap(group => group.transactions)
    
    // Only include selected individual transactions
    const selectedUngroupedTransactions = ungroupedTransactions.filter(t => selectedTransactions.has(t.id))
    
    const totalDuplicates = parsedTransactions.filter(t => t.isDuplicate).length
    
    const totalToImport = [...includedGroupTransactions, ...selectedUngroupedTransactions].length
    const includedGroups = transactionGroups.filter(group => group.includeInImport !== false).length
    const excludedGroups = transactionGroups.filter(group => group.includeInImport === false).length

    return (
      <div className="import-step">
        <div className="step-header">
          <CheckCircle size={32} className="step-icon success" />
          <h3>Ready to Import</h3>
          <p>Review your import settings before finalizing</p>
        </div>
        
        <div className="import-summary">
          <div className="summary-item">
            <strong>Total Transactions:</strong> {totalToImport}
          </div>
          {totalDuplicates > 0 && (
            <div className="summary-item">
              <strong>Duplicates Excluded:</strong> {totalDuplicates}
            </div>
          )}
          <div className="summary-item">
            <strong>Groups to Import:</strong> {includedGroups}
          </div>
          <div className="summary-item">
            <strong>Individual Transactions:</strong> {selectedUngroupedTransactions.length}
          </div>
          {ungroupedTransactions.length > selectedUngroupedTransactions.length && (
            <div className="summary-item">
              <strong>Individual Transactions Excluded:</strong> {ungroupedTransactions.length - selectedUngroupedTransactions.length}
            </div>
          )}
          {excludedGroups > 0 && (
            <div className="summary-item">
              <strong>Groups Excluded:</strong> {excludedGroups}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderCompleteStep = () => (
    <div className="import-step">
      <div className="step-header">
        <CheckCircle size={48} className="step-icon success" />
        <h3>Import Complete!</h3>
        <p>Your transactions have been successfully imported</p>
      </div>
      
      <div className="success-actions">
        <button className="btn btn-primary" onClick={onComplete}>
          <Check size={16} />
          View Dashboard
        </button>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload': return renderUploadStep()
      case 'mapping': return renderMappingStep()
      case 'duplicates': return renderDuplicatesStep()
      case 'bulk-edit': return renderBulkEditStep()
      case 'confirm': return renderConfirmStep()
      case 'complete': return renderCompleteStep()
      default: return renderUploadStep()
    }
  }

  const canGoNext = () => {
    switch (currentStep) {
      case 'mapping': {
        const hasAmountData = columnMapping.amountColumn || (columnMapping.debitColumn && columnMapping.creditColumn)
        return columnMapping.dateColumn && columnMapping.descriptionColumn && hasAmountData
      }
      case 'duplicates':
      case 'bulk-edit':
      case 'confirm':
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    switch (currentStep) {
      case 'mapping':
        handleMappingConfirm()
        break
      case 'duplicates':
        handleDuplicateReview()
        break
      case 'bulk-edit':
        setCurrentStep('confirm')
        break
      case 'confirm':
        handleFinalImport()
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'mapping':
        setCurrentStep('upload')
        break
      case 'duplicates':
        setCurrentStep('mapping')
        break
      case 'bulk-edit': {
        // Go back to duplicates if there were any, otherwise mapping
        const hasDuplicates = parsedTransactions.some(t => t.isDuplicate)
        setCurrentStep(hasDuplicates ? 'duplicates' : 'mapping')
        break
      }
      case 'confirm':
        setCurrentStep('bulk-edit')
        break
    }
  }

  return (
    <div className="import-wizard">
      <div className="wizard-header">
        <h2>Smart CSV Import</h2>
        <button className="btn btn-secondary" onClick={onCancel}>
          <X size={16} />
          Cancel
        </button>
      </div>
      
      <div className="wizard-progress">
        <div className={`step ${['upload', 'mapping', 'duplicates', 'bulk-edit', 'confirm'].includes(currentStep) ? 'active' : ''}`}>
          1. Upload
        </div>
        <div className={`step ${['mapping', 'duplicates', 'bulk-edit', 'confirm'].includes(currentStep) ? 'active' : ''}`}>
          2. Map
        </div>
        <div className={`step ${['duplicates', 'bulk-edit', 'confirm'].includes(currentStep) ? 'active' : ''}`}>
          3. Review
        </div>
        <div className={`step ${['bulk-edit', 'confirm'].includes(currentStep) ? 'active' : ''}`}>
          4. Edit
        </div>
        <div className={`step ${currentStep === 'confirm' ? 'active' : ''}`}>
          5. Import
        </div>
      </div>
      
      <div className="wizard-content">
        {renderStepContent()}
      </div>
      
      {currentStep !== 'upload' && currentStep !== 'complete' && (
        <div className="wizard-actions">
          <button 
            className="btn btn-secondary" 
            onClick={handleBack}
            disabled={isProcessing}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleNext}
            disabled={!canGoNext() || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="spinner" />
                Processing...
              </>
            ) : currentStep === 'confirm' ? (
              <>
                <Download size={16} />
                Import Transactions
              </>
            ) : (
              <>
                Next
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default ImportWizard