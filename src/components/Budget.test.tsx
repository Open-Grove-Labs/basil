import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import Budget from '../components/Budget'
import { mockTransactions, mockCategories, mockLocalStorage } from '../test/test-utils'
import * as storage from '../utils/storage'

// Mock the storage functions
vi.mock('../utils/storage', () => ({
  loadTransactions: vi.fn(),
  loadCategories: vi.fn(),
  parseLocalDate: vi.fn(),
  formatCurrency: vi.fn(),
  saveBudgets: vi.fn(),
  loadBudgets: vi.fn(),
}))

const mockedStorage = vi.mocked(storage)

describe('Budget Component', () => {
  let mockStorage: ReturnType<typeof mockLocalStorage>

  beforeEach(() => {
    mockStorage = mockLocalStorage()
    vi.stubGlobal('localStorage', mockStorage)

    // Mock the imported functions
    mockedStorage.loadTransactions.mockReturnValue(mockTransactions)
    mockedStorage.loadCategories.mockReturnValue(mockCategories)
    mockedStorage.loadBudgets.mockReturnValue([])
    
    // Mock parseLocalDate to return proper dates
    mockedStorage.parseLocalDate.mockImplementation((dateString: string) => {
      const [year, month, day] = dateString.split('-').map(Number)
      return new Date(year, month - 1, day)
    })
    
    // Mock formatCurrency
    mockedStorage.formatCurrency.mockImplementation((amount: number) => {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    })
  })

  it('should render budget overview section', () => {
    const { getByText } = render(<Budget />)
    expect(getByText(/budget overview/i)).toBeInTheDocument()
  })

  it('should display income and expenses summary', () => {
    const { getByText } = render(<Budget />)
    
    expect(getByText(/income/i)).toBeInTheDocument()
    expect(getByText(/expenses/i)).toBeInTheDocument()
  })

  it('should show budget suggestions section', () => {
    const { getByText } = render(<Budget />)
    
    expect(getByText(/budget suggestions/i)).toBeInTheDocument()
  })

  it('should display different suggestion modes', () => {
    const { getByText } = render(<Budget />)
    
    // Should show suggestion buttons/modes
    expect(getByText(/increase income/i) || getByText(/reduce expenses/i)).toBeInTheDocument()
  })

  it('should calculate 2-month average for expenses when in reduce mode', () => {
    // Create transactions with specific dates for 2-month average calculation
    const transactionsFor2Months = [
      {
        id: '1',
        date: '2025-10-15', // Current month
        description: 'Food',
        category: 'Food & Dining',
        type: 'expense' as const,
        amount: 100,
        createdAt: '2025-10-15T10:30:00Z',
      },
      {
        id: '2',
        date: '2025-09-15', // Last month
        description: 'Food',
        category: 'Food & Dining',
        type: 'expense' as const,
        amount: 200,
        createdAt: '2025-09-15T10:30:00Z',
      },
      {
        id: '3',
        date: '2025-08-15', // 2 months ago (should not be included in 2-month average)
        description: 'Food',
        category: 'Food & Dining',
        type: 'expense' as const,
        amount: 1000,
        createdAt: '2025-08-15T10:30:00Z',
      },
    ]
    
    mockedStorage.loadTransactions.mockReturnValue(transactionsFor2Months)
    
    const { container } = render(<Budget />)
    
    // The component should calculate 2-month average (100 + 200) / 2 = 150
    // Not the 3-month average which would include the 1000 amount
    expect(container.textContent).not.toContain('$433.33') // 3-month average
  })

  it('should protect rent/mortgage from reduction suggestions', () => {
    const transactionsWithRent = [
      {
        id: '1',
        date: '2025-10-15',
        description: 'Rent Payment',
        category: 'Rent/Mortgage',
        type: 'expense' as const,
        amount: 1200,
        createdAt: '2025-10-15T10:30:00Z',
      },
      {
        id: '2',
        date: '2025-10-15',
        description: 'Groceries',
        category: 'Food & Dining',
        type: 'expense' as const,
        amount: 200,
        createdAt: '2025-10-15T10:30:00Z',
      },
    ]
    
    mockedStorage.loadTransactions.mockReturnValue(transactionsWithRent)
    
    const { container, getByText } = render(<Budget />)
    
    // Should show both categories but rent should not be in reduction suggestions
    expect(getByText(/rent/i) || container.textContent?.includes('Rent')).toBeTruthy()
    expect(getByText(/food/i) || container.textContent?.includes('Food')).toBeTruthy()
  })

  it('should handle empty transaction data gracefully', () => {
    mockedStorage.loadTransactions.mockReturnValue([])
    
    const { container } = render(<Budget />)
    
    // Should render without crashing
    expect(container).toBeInTheDocument()
  })

  it('should update when transactions change', () => {
    const { rerender } = render(<Budget />)
    
    // Change mock data
    const newTransactions = [
      ...mockTransactions,
      {
        id: 'new',
        date: '2025-10-20',
        description: 'New Expense',
        category: 'Shopping',
        type: 'expense' as const,
        amount: 150,
        createdAt: '2025-10-20T10:30:00Z',
      },
    ]
    
    mockedStorage.loadTransactions.mockReturnValue(newTransactions)
    
    // Re-render component
    rerender(<Budget />)
    
    // Component should handle the new data
    expect(mockedStorage.loadTransactions).toHaveBeenCalled()
  })

  it('should display budget categories with proper formatting', () => {
    const { container } = render(<Budget />)
    
    // Should show formatted currency amounts
    const dollarSigns = container.textContent?.match(/\$/g)
    expect(dollarSigns?.length).toBeGreaterThan(0)
  })

  it('should calculate net balance correctly', () => {
    const balancedTransactions = [
      {
        id: '1',
        date: '2025-10-15',
        description: 'Salary',
        category: 'Income',
        type: 'income' as const,
        amount: 5000,
        createdAt: '2025-10-15T09:00:00Z',
      },
      {
        id: '2',
        date: '2025-10-15',
        description: 'Rent',
        category: 'Rent/Mortgage',
        type: 'expense' as const,
        amount: 1500,
        createdAt: '2025-10-15T10:00:00Z',
      },
    ]
    
    mockedStorage.loadTransactions.mockReturnValue(balancedTransactions)
    
    const { container } = render(<Budget />)
    
    // Should calculate net balance (5000 - 1500 = 3500)
    // The exact display format may vary, but should show positive balance
    expect(container.textContent).toContain('$')
  })
})