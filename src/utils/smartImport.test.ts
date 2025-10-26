import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  parseCSV,
  detectColumnMappings,
  parseDate,
  parseAmount,
  determineTransactionType,
  checkForDuplicates,
  processImportedTransactions,
  groupTransactionsByDescription,
} from '../utils/smartImport'
import { mockLocalStorage } from '../test/test-utils'

// Mock the storage functions
vi.mock('../utils/storage', () => ({
  loadTransactions: vi.fn(),
}))

describe('SmartImport Utilities', () => {
  let mockStorage: ReturnType<typeof mockLocalStorage>

  beforeEach(() => {
    mockStorage = mockLocalStorage()
    vi.stubGlobal('localStorage', mockStorage)
  })

  describe('parseCSV', () => {
    it('should parse simple CSV data', () => {
      const csvData = `Date,Description,Amount
2024-01-15,Grocery Store,45.67
2024-01-16,Gas Station,32.10`
      
      const result = parseCSV(csvData)
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('Date')
      expect(result[0]).toHaveProperty('Description')
      expect(result[0]).toHaveProperty('Amount')
    })

    it('should handle quoted fields with commas', () => {
      const csvData = `Date,Description,Amount
2024-01-15,"Store, Inc",45.67`
      
      const result = parseCSV(csvData)
      expect(result[0]['Description']).toBe('Store, Inc')
    })

    it('should return empty array for invalid CSV', () => {
      const result = parseCSV('')
      expect(result).toEqual([])
    })
  })

  describe('detectColumnMappings', () => {
    it('should detect standard bank CSV columns', () => {
      const rows = [
        { 'Date': '2024-01-15', 'Description': 'Store', 'Amount': '45.67' }
      ]
      
      const result = detectColumnMappings(rows)
      
      expect(result.dateColumn).toBe('Date')
      expect(result.descriptionColumn).toBe('Description')
      expect(result.amountColumn).toBe('Amount')
    })

    it('should detect debit/credit columns', () => {
      const rows = [
        { 'Date': '2024-01-15', 'Description': 'Store', 'Debit': '45.67', 'Credit': '' }
      ]
      
      const result = detectColumnMappings(rows)
      
      expect(result.dateColumn).toBe('Date')
      expect(result.descriptionColumn).toBe('Description')
      expect(result.debitColumn).toBe('Debit')
      expect(result.creditColumn).toBe('Credit')
    })

    it('should detect Basil CSV format', () => {
      const rows = [
        { 
          'Date': '2024-01-15', 
          'Description': 'Store', 
          'Category': 'Food', 
          'Type': 'expense',
          'Amount': '45.67',
          'Created At': '2024-01-15T10:30:00Z'
        }
      ]
      
      const result = detectColumnMappings(rows)
      
      expect(result.isBasilCSV).toBe(true)
      expect(result.categoryColumn).toBe('Category')
      expect(result.typeColumn).toBe('Type')
    })
  })

  describe('parseDate', () => {
    it('should parse various date formats', () => {
      expect(parseDate('2024-01-15')).toBe('2024-01-15')
      expect(parseDate('01/15/2024')).toBe('2024-01-15')
      expect(parseDate('15/01/2024')).toBe('2024-01-15')
      expect(parseDate('Jan 15, 2024')).toBe('2024-01-15')
    })

    it('should handle invalid dates', () => {
      expect(parseDate('invalid')).toBe('')
      expect(parseDate('')).toBe('')
    })
  })

  describe('parseAmount', () => {
    it('should parse various amount formats', () => {
      expect(parseAmount('45.67')).toBe(45.67)
      expect(parseAmount('$45.67')).toBe(45.67)
      expect(parseAmount('1,234.56')).toBe(1234.56)
      expect(parseAmount('(45.67)')).toBe(-45.67) // Parentheses indicate negative
    })

    it('should handle invalid amounts', () => {
      expect(parseAmount('invalid')).toBe(0)
      expect(parseAmount('')).toBe(0)
    })
  })

  describe('determineTransactionType', () => {
    it('should detect income transactions', () => {
      expect(determineTransactionType('Salary deposit')).toBe('income')
      expect(determineTransactionType('Payroll')).toBe('income')
      expect(determineTransactionType('Transfer in')).toBe('income')
    })

    it('should detect expense transactions', () => {
      expect(determineTransactionType('Grocery store')).toBe('expense')
      expect(determineTransactionType('Gas station')).toBe('expense')
      expect(determineTransactionType('ATM withdrawal')).toBe('expense')
    })

    it('should use type column when provided', () => {
      expect(determineTransactionType('Any description', 'income')).toBe('income')
      expect(determineTransactionType('Any description', 'expense')).toBe('expense')
    })

    it('should use debit flag when provided', () => {
      expect(determineTransactionType('Any description', undefined, true)).toBe('expense')
      expect(determineTransactionType('Any description', undefined, false)).toBe('income')
    })
  })

  describe('checkForDuplicates', () => {
    it('should detect exact duplicates', () => {
      const existingTransactions = [
        {
          id: '1',
          date: '2024-01-15',
          description: 'Grocery Store',
          amount: 45.67,
          category: 'Food & Dining',
          type: 'expense' as const,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ]
      
      const newTransaction = {
        id: 'new1',
        date: '2024-01-15',
        description: 'Grocery Store',
        amount: 45.67,
        category: '',
        type: undefined,
        createdAt: '',
        confidence: 0.9,
        originalRow: {},
      }
      
      const result = checkForDuplicates(newTransaction, existingTransactions)
      expect(result).toBe(true)
    })

    it('should not flag different transactions as duplicates', () => {
      const existingTransactions = [
        {
          id: '1',
          date: '2024-01-15',
          description: 'Grocery Store',
          amount: 45.67,
          category: 'Food & Dining',
          type: 'expense' as const,
          createdAt: '2024-01-15T10:30:00Z',
        },
      ]
      
      const newTransaction = {
        id: 'new1',
        date: '2024-01-16',
        description: 'Gas Station',
        amount: 32.10,
        category: '',
        type: undefined,
        createdAt: '',
        confidence: 0.9,
        originalRow: {},
      }
      
      const result = checkForDuplicates(newTransaction, existingTransactions)
      expect(result).toBe(false)
    })
  })

  describe('groupTransactionsByDescription', () => {
    it('should group similar transactions', () => {
      const transactions = [
        {
          id: '1',
          date: '2024-01-15',
          description: 'Starbucks #123',
          amount: 4.50,
          category: '',
          type: undefined,
          createdAt: '',
          confidence: 0.9,
          originalRow: {},
        },
        {
          id: '2',
          date: '2024-01-16',
          description: 'Starbucks #456',
          amount: 5.25,
          category: '',
          type: undefined,
          createdAt: '',
          confidence: 0.9,
          originalRow: {},
        },
        {
          id: '3',
          date: '2024-01-17',
          description: 'Gas Station',
          amount: 35.00,
          category: '',
          type: undefined,
          createdAt: '',
          confidence: 0.9,
          originalRow: {},
        },
      ]
      
      const result = groupTransactionsByDescription(transactions)
      
      expect(result.length).toBeGreaterThan(0)
      expect(result.some(group => group.transactions.length > 1)).toBe(true)
    })

    it('should suggest categories for groups', () => {
      const transactions = [
        {
          id: '1',
          date: '2024-01-15',
          description: 'McDonald\'s Restaurant',
          amount: 8.50,
          category: '',
          type: undefined,
          createdAt: '',
          confidence: 0.9,
          originalRow: {},
        },
      ]
      
      const result = groupTransactionsByDescription(transactions)
      
      expect(result[0].suggestedCategory).toBeDefined()
      expect(result[0].suggestedType).toBeDefined()
    })
  })

  describe('processImportedTransactions', () => {
    it('should process imported data correctly', () => {
      const rows = [
        { 'Date': '2024-01-15', 'Description': 'Grocery Store', 'Amount': '45.67' }
      ]
      
      const columnMappings = {
        dateColumn: 'Date',
        descriptionColumn: 'Description',
        amountColumn: 'Amount',
      }
      
      const result = processImportedTransactions(rows, columnMappings)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].description).toBe('Grocery Store')
      expect(result[0].amount).toBe(45.67)
    })

    it('should handle empty data gracefully', () => {
      const result = processImportedTransactions([], {
        dateColumn: 'Date',
        descriptionColumn: 'Description', 
        amountColumn: 'Amount',
      })
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })
})