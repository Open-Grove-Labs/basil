import { useState, useEffect } from 'react'
import { Home, Plus, TrendingUp, History, Settings, X } from 'lucide-react'
import Dashboard from './components/Dashboard'
import AddTransaction from './components/AddTransaction.tsx'
import Analytics from './components/Analytics.tsx'
import TransactionHistory from './components/TransactionHistory.tsx'
import SettingsComponent from './components/Settings'
import { initializeMockData } from './utils/mockData'
import './App.css'

type TabType = 'dashboard' | 'add' | 'analytics' | 'history' | 'settings'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showHelpModal, setShowHelpModal] = useState(false)

  // Initialize mock data if flag is set
  useEffect(() => {
    initializeMockData()
  }, [])

  // Function to refresh data across components
  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('basil.theme') as 'light' | 'dark' | 'auto' || 'auto'
    const root = document.documentElement
    
    if (savedTheme === 'light') {
      root.style.colorScheme = 'light'
      root.classList.remove('dark-theme')
      root.classList.add('light-theme')
    } else if (savedTheme === 'dark') {
      root.style.colorScheme = 'dark'  
      root.classList.remove('light-theme')
      root.classList.add('dark-theme')
    } else {
      // Auto mode - use system preference
      root.style.colorScheme = 'light dark'
      root.classList.remove('light-theme', 'dark-theme')
    }
  }, [])

  // Add keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return
      }
      
      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            setActiveTab('dashboard')
            break
          case '2':
            e.preventDefault()
            setActiveTab('add')
            break
          case '3':
            e.preventDefault()
            setActiveTab('analytics')
            break
          case '4':
            e.preventDefault()
            setActiveTab('history')
            break
          case '5':
            e.preventDefault()
            setActiveTab('settings')
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyboardShortcuts)
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key={refreshKey} />
      case 'add':
        return <AddTransaction onSuccess={() => {
          refreshData()
          // No automatic navigation - let user stay on add page
        }} />
      case 'analytics':
        return <Analytics key={refreshKey} />
      case 'history':
        return <TransactionHistory key={refreshKey} />
      case 'settings':
        return <SettingsComponent />
      default:
        return <Dashboard key={refreshKey} />
    }
  }

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard'
      case 'add':
        return 'Add Transaction'
      case 'analytics':
        return 'Analytics'
      case 'history':
        return 'Transaction History'
      case 'settings':
        return 'Settings'
      default:
        return 'Dashboard'
    }
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="app-header">
        <div className="app-header-container">
          <div className="app-header-content">
            <div className="app-title-section">
              <h1 className="app-title">
                <span className="app-icon">🌿</span>
                Basil
              </h1>
              <button 
                className="help-button"
                onClick={() => setShowHelpModal(true)}
                aria-label="Help"
                title="Help & About"
              >
                ?
              </button>
            </div>
            <h2 className="page-title-header">{getPageTitle()}</h2>
          </div>
        </div>
      </header>

      <main id="main-content" className="app-main">
        <div className="app-main-container">
          <div className="app-content-wrapper">
            {renderContent()}
          </div>
        </div>
      </main>

      <nav className="app-nav" role="navigation" aria-label="Main navigation">
        <div className="app-nav-container">
        <button
          className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          aria-label="Dashboard - View your financial overview"
        >
          <Home size={20} aria-hidden="true" />
          <span>Home</span>
        </button>
        <button
          className={`nav-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
          aria-current={activeTab === 'add' ? 'page' : undefined}
          aria-label="Add Transaction - Record a new income, expense, or savings"
        >
          <Plus size={20} aria-hidden="true" />
          <span>Add</span>
        </button>
        <button
          className={`nav-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          aria-current={activeTab === 'analytics' ? 'page' : undefined}
          aria-label="Analytics - View spending trends and financial projections"
        >
          <TrendingUp size={20} aria-hidden="true" />
          <span>Trends</span>
        </button>
        <button
          className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          aria-current={activeTab === 'history' ? 'page' : undefined}
          aria-label="Transaction History - Browse and search all transactions"
        >
          <History size={20} aria-hidden="true" />
          <span>History</span>
        </button>
        <button
          className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
          aria-label="Settings - Configure app preferences and manage data"
        >
          <Settings size={20} aria-hidden="true" />
          <span>Settings</span>
        </button>
        </div>
      </nav>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="app-icon">🌿</span>
                About Basil
              </h2>
              <button 
                className="modal-close-button"
                onClick={() => setShowHelpModal(false)}
                aria-label="Close help"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="help-section">
                <p className="help-intro">
                  <strong>🌿 Basil - Your personal, private, finance companion</strong>
                </p>
                <p className="privacy-note">
                  Basil keeps your financial data completely private. Everything is stored locally on your device - 
                  no data is shared with servers or third parties. Your financial information stays with you.
                </p>
              </div>

              <div className="help-section">
                <h3>Getting Started</h3>
                
                <div className="help-step">
                  <h4>📊 Smart CSV Import (Recommended)</h4>
                  <p>
                    Go to your online bank account and export your transaction history as a CSV file. 
                    Then use Basil's Smart Import feature to easily add transactions in bulk.
                  </p>
                  <p>
                    The Smart Import will automatically group similar transactions together, making it 
                    easy to categorize them or exclude duplicates. You can assign categories to entire 
                    groups at once, saving you time.
                  </p>
                </div>

                <div className="help-step">
                  <h4>➕ Manual Entry</h4>
                  <p>
                    When CSV import isn't available, you can add individual transactions manually 
                    using the "Add Transaction" tab. This is perfect for cash transactions or 
                    one-off entries.
                  </p>
                </div>

                <div className="help-step">
                  <h4>📈 Dashboard & Analytics</h4>
                  <p>
                    Once you have transaction data, use the Dashboard to see how you're doing this 
                    month compared to previous months. The Analytics section provides detailed 
                    breakdowns of your spending habits, category trends, and financial projections.
                  </p>
                </div>

                <div className="help-step">
                  <h4>🔍 Transaction History</h4>
                  <p>
                    Browse, search, and manage all your transactions in the History tab. You can 
                    filter by category, type, or search for specific transactions. Bulk editing 
                    tools help you update multiple transactions at once.
                  </p>
                </div>
              </div>

              <div className="help-section">
                <h3>Need More Help?</h3>
                <p>
                  Each section of the app includes contextual help and intuitive interfaces. 
                  Take your time exploring the features - everything is designed to be 
                  straightforward and user-friendly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
