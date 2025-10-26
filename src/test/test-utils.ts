import { vi } from 'vitest'
import type { Transaction, Category } from '../types'

// Test data generators
export const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: Math.random().toString(36).substr(2, 9),
  date: '2024-01-15',
  description: 'Test transaction',
  category: 'Food & Dining',
  type: 'expense',
  amount: 50.00,
  createdAt: '2024-01-15T10:30:00Z',
  ...overrides,
})

export const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: Math.random().toString(36).substr(2, 9),
  name: 'Test Category',
  color: '#667eea',
  type: 'expense',
  ...overrides,
})

// Mock storage data
export const mockTransactions: Transaction[] = [
  createMockTransaction({
    id: '1',
    date: '2024-12-01',
    description: 'Groceries',
    category: 'Food & Dining',
    type: 'expense',
    amount: 75.50,
  }),
  createMockTransaction({
    id: '2',
    date: '2024-12-02',
    description: 'Salary',
    category: 'Income',
    type: 'income',
    amount: 3000.00,
  }),
  createMockTransaction({
    id: '3',
    date: '2024-11-15',
    description: 'Rent',
    category: 'Rent/Mortgage',
    type: 'expense',
    amount: 1200.00,
  }),
  createMockTransaction({
    id: '4',
    date: '2024-10-20',
    description: 'Gas Bill',
    category: 'Bills & Utilities',
    type: 'expense',
    amount: 85.00,
  }),
]

export const mockCategories: Category[] = [
  createMockCategory({
    id: '1',
    name: 'Food & Dining',
    color: '#ef4444',
    type: 'expense',
  }),
  createMockCategory({
    id: '2',
    name: 'Rent/Mortgage',
    color: '#8b5cf6',
    type: 'expense',
  }),
  createMockCategory({
    id: '3',
    name: 'Bills & Utilities',
    color: '#f59e0b',
    type: 'expense',
  }),
  createMockCategory({
    id: '4',
    name: 'Income',
    color: '#10b981',
    type: 'income',
  }),
]

// Mock localStorage functions
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
    storage,
  }
}

// Helper to render components with providers
export const renderWithProviders = (ui: React.ReactElement) => {
  // For now, just return the standard render
  // Can be extended later if we add context providers
  return ui
}