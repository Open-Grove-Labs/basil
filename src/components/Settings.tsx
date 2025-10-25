import { useState, useEffect } from 'react'
import { Download, Upload, Trash2, Database, Palette, Shield, HelpCircle, Moon, Sun, DollarSign } from 'lucide-react'
import { loadTransactions, clearAllData, loadSettings, updateCurrency, SUPPORTED_CURRENCIES } from '../utils/storage'
import { clearMockData, shouldLoadMockData } from '../utils/mockData'
import ImportWizard from './ImportWizard'
import type { CurrencyConfig } from '../types'

function Settings() {
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'auto'>(() => {
    return (localStorage.getItem('basil.theme') as 'light' | 'dark' | 'auto') || 'auto'
  })
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(() => {
    return loadSettings().currency
  })

  // Apply theme preference
  useEffect(() => {
    const root = document.documentElement
    
    if (themePreference === 'light') {
      root.style.colorScheme = 'light'
      root.classList.remove('dark-theme')
      root.classList.add('light-theme')
    } else if (themePreference === 'dark') {
      root.style.colorScheme = 'dark'  
      root.classList.remove('light-theme')
      root.classList.add('dark-theme')
    } else {
      // Auto mode - use system preference
      root.style.colorScheme = 'light dark'
      root.classList.remove('light-theme', 'dark-theme')
    }
    
    localStorage.setItem('basil.theme', themePreference)
  }, [themePreference])

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    setThemePreference(theme)
  }

  const handleCurrencyChange = (currency: CurrencyConfig) => {
    setSelectedCurrency(currency)
    updateCurrency(currency)
  }

  // Export data as CSV
  const handleExportData = async () => {
    setIsExporting(true)
    
    try {
      const transactions = loadTransactions()
      
      if (transactions.length === 0) {
        alert('No transactions to export!')
        return
      }

      // Create CSV content
      const csvHeaders = [
        'Date',
        'Description', 
        'Category',
        'Type',
        'Amount',
        'Created At'
      ]
      
      const csvRows = transactions.map(transaction => [
        transaction.date,
        `"${transaction.description.replace(/"/g, '""')}"`, // Escape quotes
        `"${transaction.category.replace(/"/g, '""')}"`,
        transaction.type,
        transaction.amount,
        transaction.createdAt
      ])
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n')
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `basil-budget-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log(`✅ Exported ${transactions.length} transactions to CSV`)
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Import data from CSV
  // Delete all data with confirmation
  const handleDeleteAllData = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDeleteAllData = () => {
    try {
      clearAllData()
      clearMockData()
      alert('✅ All data has been deleted successfully!')
      console.log('🧹 All Basil data cleared')
      setShowDeleteConfirm(false)
      
      // Refresh page to show clean state
      window.location.reload()
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Delete failed. Please try again.')
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  const transactionCount = loadTransactions().length
  const dataSize = new Blob([JSON.stringify(loadTransactions())]).size
  const mockDataActive = shouldLoadMockData()

  return (
    <div className="page-content">
      {/* Export/Import Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Palette size={20} style={{ marginRight: '0.5rem' }} />
            Appearance
          </h3>
        </div>
        
        <div className="settings-section">
          <div className="theme-options">
            <p className="theme-description">
              Choose how Basil should appear, or let it follow your system settings.
            </p>
            
            <div className="theme-buttons">
              <button
                className={`btn theme-btn ${themePreference === 'light' ? 'active' : 'btn-secondary'}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={20} />
                Light Mode
              </button>
              
              <button
                className={`btn theme-btn ${themePreference === 'dark' ? 'active' : 'btn-secondary'}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={20} />
                Dark Mode
              </button>
              
              <button
                className={`btn theme-btn ${themePreference === 'auto' ? 'active' : 'btn-secondary'}`}
                onClick={() => handleThemeChange('auto')}
              >
                <Palette size={20} />
                Auto (System)
              </button>
            </div>
            
            <p className="theme-hint">
              {themePreference === 'auto' 
                ? 'Automatically switches between light and dark based on your device settings'
                : `Always use ${themePreference} mode regardless of system settings`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Currency Settings Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <DollarSign size={20} style={{ marginRight: '0.5rem' }} />
            Currency
          </h3>
        </div>
        
        <div className="settings-section">
          <div className="currency-options">
            <p className="currency-description">
              Select your preferred currency for all transactions and displays.
            </p>
            
            <div className="currency-selector">
              <label htmlFor="currency-select" className="form-label">
                Currency
              </label>
              <select
                id="currency-select"
                className="form-select"
                value={selectedCurrency.code}
                onChange={(e) => {
                  const currency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value)
                  if (currency) {
                    handleCurrencyChange(currency)
                  }
                }}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} - {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>
            
            <p className="currency-hint">
              Current selection: <strong>{selectedCurrency.symbol} {selectedCurrency.name}</strong>
              <br />
              Example: {selectedCurrency.position === 'before' 
                ? `${selectedCurrency.symbol}123.45`
                : `123.45 ${selectedCurrency.symbol}`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Database size={20} style={{ marginRight: '0.5rem' }} />
            Data Management
          </h3>
        </div>
        
        <div className="settings-section">
          <div className="data-stats">
            <div className="stat-row">
              <span className="stat-label">Total Transactions:</span>
              <span className="stat-value">{transactionCount.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Data Size:</span>
              <span className="stat-value">{(dataSize / 1024).toFixed(1)} KB</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Mock Data:</span>
              <span className={`stat-value ${mockDataActive ? 'active' : 'inactive'}`}>
                {mockDataActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <div className="settings-actions">
            {/* Export Button */}
            <button
              className="btn btn-primary settings-btn"
              onClick={handleExportData}
              disabled={isExporting || transactionCount === 0}
            >
              <Download size={20} />
              {isExporting ? 'Exporting...' : 'Export Data (CSV)'}
            </button>
            
            {/* Smart Import Button */}
            <button 
              className="btn btn-secondary settings-btn"
              onClick={() => setShowImportWizard(true)}
            >
              <Upload size={20} />
              Smart Import (CSV)
            </button>
            
            {/* Delete Button */}
            <button
              className="btn btn-danger settings-btn"
              onClick={handleDeleteAllData}
              disabled={transactionCount === 0}
            >
              <Trash2 size={20} />
              Delete All Data
            </button>
          </div>
        </div>
      </div>

      {/* App Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <HelpCircle size={20} style={{ marginRight: '0.5rem' }} />
            About Basil
          </h3>
        </div>
        
        <div className="settings-section">
          <div className="app-info">
            <p>🌿 <strong>Basil</strong> - Your personal, private, finance companion</p>
            <p>Version 1.0.0</p>
            <p>Built with React, TypeScript, and lots of care for your financial wellness.</p>
            
            <div className="info-links">
              <div className="info-item">
                <span className="info-label">Data Storage:</span>
                <span>Local Browser Storage (Private & Secure)</span>
              </div>
              <div className="info-item">
                <span className="info-label">Privacy:</span>
                <span>No data is sent to external servers</span>
              </div>
              <div className="info-item">
                <span className="info-label">Backup:</span>
                <span>Use Export/Import to backup or share your data</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Palette size={20} style={{ marginRight: '0.5rem' }} />
            Quick Actions
          </h3>
        </div>
        
        <div className="settings-section">
          <div className="quick-actions">
            <button
              className="btn btn-secondary settings-btn"
              onClick={() => {
                if (mockDataActive) {
                  window.basilBudget?.clearMockData()
                } else {
                  window.basilBudget?.addMockData()
                }
              }}
            >
              <Database size={20} />
              {mockDataActive ? 'Remove Mock Data' : 'Add Mock Data'}
            </button>
            
            <button
              className="btn btn-secondary settings-btn"
              onClick={() => {
                const confirmed = window.confirm('Clear browser cache and reload the app?')
                if (confirmed) {
                  localStorage.clear()
                  window.location.reload()
                }
              }}
            >
              <Shield size={20} />
              Clear Cache & Reload
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>⚠️ Confirm Delete All Data</h3>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete <strong>ALL</strong> your financial data?</p>
              <p>This action will permanently remove:</p>
              <ul>
                <li>All {transactionCount} transactions</li>
                <li>All categories and settings</li>
                <li>Mock data (if active)</li>
              </ul>
              <p><strong>This cannot be undone!</strong></p>
              <p>Consider exporting your data first as a backup.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteAllData}>
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Import Wizard */}
      {showImportWizard && (
        <div className="import-modal-overlay">
          <ImportWizard
            onComplete={() => {
              setShowImportWizard(false)
              // Refresh the page data
              window.location.reload()
            }}
            onCancel={() => setShowImportWizard(false)}
          />
        </div>
      )}
    </div>
  )
}

export default Settings