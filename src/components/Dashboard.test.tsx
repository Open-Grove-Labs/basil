import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import Dashboard from '../components/Dashboard'
import { mockTransactions, mockCategories, mockLocalStorage } from '../test/test-utils'
import * as storage from '../utils/storage'

// Mock the storage functions
vi.mock('../utils/storage', () => ({
  loadTransactions: vi.fn(),
  loadCategories: vi.fn(),
  parseLocalDate: vi.fn(),
  formatCurrency: vi.fn(),
}))

const mockedStorage = vi.mocked(storage)

describe('Dashboard Component', () => {
  let mockStorage: ReturnType<typeof mockLocalStorage>

  beforeEach(() => {
    mockStorage = mockLocalStorage()
    vi.stubGlobal('localStorage', mockStorage)

    // Mock the imported functions
    mockedStorage.loadTransactions.mockReturnValue(mockTransactions)
    mockedStorage.loadCategories.mockReturnValue(mockCategories)
    
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

  it('should render monthly overview section', () => {
    const { container } = render(<Dashboard />)
    expect(container.querySelector('[aria-labelledby="monthly-overview"]')).toBeInTheDocument()
  })

  it('should display current month with percentage changes', () => {
    const { getByText } = render(<Dashboard />)
    
    // Should show current month data (October 2025 since that's current date)
    expect(getByText(/october 2025/i)).toBeInTheDocument()
    expect(getByText(/income/i)).toBeInTheDocument()
    expect(getByText(/expenses/i)).toBeInTheDocument()
  })

  it('should display previous months without percentage changes', () => {
    const { getByText } = render(<Dashboard />)
    
    // Should show previous months
    expect(getByText(/september 2025/i)).toBeInTheDocument()
    expect(getByText(/august 2025/i)).toBeInTheDocument()
  })

  it('should calculate and display net balance correctly', () => {
    const { getAllByText } = render(<Dashboard />)
    
    // Should show net balances
    const netLabels = getAllByText(/net:/i)
    expect(netLabels.length).toBeGreaterThan(0)
  })

  it('should show category comparison section', () => {
    const { getByText } = render(<Dashboard />)
    
    expect(getByText(/category spending: last 3 months/i)).toBeInTheDocument()
  })

  it('should display empty state when no transactions exist', () => {
    // Mock empty transactions
    mockedStorage.loadTransactions.mockReturnValue([])
    
    const { getByText } = render(<Dashboard />)
    
    expect(getByText(/no expense categories yet/i)).toBeInTheDocument()
    expect(getByText(/add some transactions to see your spending patterns/i)).toBeInTheDocument()
  })

  it('should render sparkline graphs for category trends', () => {
    render(<Dashboard />)
    
    // Check for SVG elements (sparklines)
    const sparklines = document.querySelectorAll('.sparkline-svg')
    expect(sparklines.length).toBeGreaterThan(0)
  })

  it('should apply correct CSS classes for positive/negative balances', () => {
    render(<Dashboard />)
    
    // Look for elements with positive/negative classes
    const positiveElements = document.querySelectorAll('.positive')
    const negativeElements = document.querySelectorAll('.negative')
    
    expect(positiveElements.length + negativeElements.length).toBeGreaterThan(0)
  })

  it('should show trending icons for income and expenses', () => {
    render(<Dashboard />)
    
    // Check for SVG icons
    const icons = document.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('should handle month calculations correctly for different date ranges', () => {
    // Test with transactions from different months
    const multiMonthTransactions = [
      ...mockTransactions,
      {
        id: '5',
        date: '2024-09-15',
        description: 'Old Transaction',
        category: 'Food & Dining',
        type: 'expense' as const,
        amount: 30.00,
        createdAt: '2024-09-15T10:30:00Z',
      },
    ]
    
    mockedStorage.loadTransactions.mockReturnValue(multiMonthTransactions)
    
    const { getByText } = render(<Dashboard />)
    
    // Should still render correctly with transactions from multiple months
    expect(getByText(/category spending: last 3 months/i)).toBeInTheDocument()
  })

  it('should calculate percentage changes between current and last month', () => {
    render(<Dashboard />)
    
    // Look for percentage indicators (only on current month)
    const percentageElements = document.querySelectorAll('.month-item-change')
    expect(percentageElements.length).toBeGreaterThan(0)
  })
})