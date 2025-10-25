import type { Transaction } from '../types'
import { loadTransactions } from './storage'

export interface ImportedRow {
  [key: string]: string | number
}

export interface ParsedTransaction {
  id: string
  date: string
  description: string
  amount: number
  category?: string
  type?: 'income' | 'expense'
  isDuplicate?: boolean
  duplicateReason?: string
  confidence: number
  originalRow: ImportedRow
}

export interface ImportResult {
  success: boolean
  message: string
  parsedTransactions: ParsedTransaction[]
  duplicates: ParsedTransaction[]
  columnMappings: ColumnMapping
}

export interface ColumnMapping {
  dateColumn: string
  descriptionColumn: string
  amountColumn: string
  debitColumn?: string
  creditColumn?: string
  categoryColumn?: string
  typeColumn?: string
}

export interface TransactionGroup {
  description: string
  transactions: ParsedTransaction[]
  suggestedCategory?: string
  suggestedType?: 'income' | 'expense'
  includeInImport?: boolean
}

// Common date formats that banks use
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // 2023-12-31
  /^\d{2}\/\d{2}\/\d{4}$/, // 12/31/2023
  /^\d{2}\/\d{2}\/\d{2}$/, // 12/31/23
  /^\d{2}-\d{2}-\d{4}$/, // 12-31-2023
  /^\d{1,2}\/\d{1,2}\/\d{4}$/, // 1/1/2023
  /^\d{1,2}-\d{1,2}-\d{4}$/, // 1-1-2023
]

// Common amount patterns
const AMOUNT_PATTERNS = [
  /^-?\$?\d+\.?\d*$/, // $123.45 or -123.45
  /^-?\d{1,3}(,\d{3})*\.?\d*$/, // 1,234.56
  /^\(\d+\.?\d*\)$/, // (123.45) for negative
]

// Common column names banks use
const COLUMN_MAPPINGS = {
  date: ['date', 'transaction date', 'trans date', 'posted date', 'effective date', 'value date'],
  description: ['description', 'memo', 'reference', 'details', 'transaction details', 'payee', 'merchant'],
  amount: ['amount', 'transaction amount', 'value', 'sum', 'total'],
  debit: ['debit', 'debit amount', 'withdrawal', 'outgoing'],
  credit: ['credit', 'credit amount', 'deposit', 'incoming'],
  category: ['category', 'type', 'transaction type', 'merchant category', 'category code'],
  type: ['transaction type', 'dr/cr', 'debit/credit', 'type']
}

export function parseCSV(csvText: string): ImportedRow[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  
  const headers = parseCSVLine(lines[0])
  const rows: ImportedRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === headers.length) {
      const row: ImportedRow = {}
      headers.forEach((header, index) => {
        row[header.toLowerCase().trim()] = values[index]?.trim() || ''
      })
      rows.push(row)
    }
  }
  
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.replace(/^"|"$/g, ''))
  return result
}

export function detectColumnMappings(rows: ImportedRow[]): ColumnMapping {
  if (rows.length === 0) {
    return {
      dateColumn: '',
      descriptionColumn: '',
      amountColumn: ''
    }
  }
  
  const headers = Object.keys(rows[0])
  const mapping: ColumnMapping = {
    dateColumn: '',
    descriptionColumn: '',
    amountColumn: ''
  }
  
  // Detect date column
  for (const header of headers) {
    if (COLUMN_MAPPINGS.date.some(pattern => header.includes(pattern))) {
      mapping.dateColumn = header
      break
    }
  }
  
  // If no match by name, try by content pattern
  if (!mapping.dateColumn) {
    for (const header of headers) {
      const sampleValues = rows.slice(0, 5).map(row => String(row[header]))
      const dateMatches = sampleValues.filter(val => 
        DATE_PATTERNS.some(pattern => pattern.test(val))
      )
      if (dateMatches.length >= Math.min(3, sampleValues.length)) {
        mapping.dateColumn = header
        break
      }
    }
  }
  
  // Detect amount column
  for (const header of headers) {
    if (COLUMN_MAPPINGS.amount.some(pattern => header.toLowerCase().includes(pattern.toLowerCase()))) {
      mapping.amountColumn = header
      break
    }
  }
  
  // Detect debit column
  for (const header of headers) {
    if (COLUMN_MAPPINGS.debit.some(pattern => header.toLowerCase().includes(pattern.toLowerCase()))) {
      mapping.debitColumn = header
      break
    }
  }
  
  // Detect credit column
  for (const header of headers) {
    if (COLUMN_MAPPINGS.credit.some(pattern => header.toLowerCase().includes(pattern.toLowerCase()))) {
      mapping.creditColumn = header
      break
    }
  }
  
  // If no single amount column but we have debit/credit, don't try to find amount by pattern
  if (!mapping.amountColumn && !(mapping.debitColumn && mapping.creditColumn)) {
    // If no match by name, try by content pattern
    for (const header of headers) {
      const sampleValues = rows.slice(0, 5).map(row => String(row[header]))
      const amountMatches = sampleValues.filter(val => 
        AMOUNT_PATTERNS.some(pattern => pattern.test(val))
      )
      if (amountMatches.length >= Math.min(3, sampleValues.length)) {
        mapping.amountColumn = header
        break
      }
    }
  }
  
  // Detect description column
  for (const header of headers) {
    if (COLUMN_MAPPINGS.description.some(pattern => header.includes(pattern))) {
      mapping.descriptionColumn = header
      break
    }
  }
  
  // If no description found, use the longest text column
  if (!mapping.descriptionColumn) {
    let longestTextColumn = ''
    let maxAvgLength = 0
    
    for (const header of headers) {
      if (header !== mapping.dateColumn && header !== mapping.amountColumn) {
        const avgLength = rows.slice(0, 10).reduce((sum, row) => {
          return sum + String(row[header]).length
        }, 0) / Math.min(10, rows.length)
        
        if (avgLength > maxAvgLength) {
          maxAvgLength = avgLength
          longestTextColumn = header
        }
      }
    }
    mapping.descriptionColumn = longestTextColumn
  }
  
  // Try to detect category and type columns
  for (const header of headers) {
    if (!mapping.categoryColumn && COLUMN_MAPPINGS.category.some(pattern => header.includes(pattern))) {
      mapping.categoryColumn = header
    }
    if (!mapping.typeColumn && COLUMN_MAPPINGS.type.some(pattern => header.includes(pattern))) {
      mapping.typeColumn = header
    }
  }
  
  return mapping
}

export function parseDate(dateStr: string): string {
  // Clean the date string
  const cleaned = dateStr.trim().replace(/['"]/g, '')
  
  // Try different date formats
  const formats = [
    // ISO format
    (d: string) => {
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
        return d.split(' ')[0] // Remove time if present
      }
      return null
    },
    // US formats MM/DD/YYYY
    (d: string) => {
      const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (match) {
        const [, month, day, year] = match
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return null
    },
    // US formats MM/DD/YY
    (d: string) => {
      const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
      if (match) {
        const [, month, day, year] = match
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return null
    },
    // DD/MM/YYYY format
    (d: string) => {
      const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (match) {
        const [, first, second, year] = match
        // Assume DD/MM if first > 12
        if (parseInt(first) > 12) {
          return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`
        }
      }
      return null
    }
  ]
  
  for (const format of formats) {
    const result = format(cleaned)
    if (result) return result
  }
  
  // Fallback: try to parse with Date constructor and format
  try {
    const date = new Date(cleaned)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch {
    // Ignore parsing errors
  }
  
  return cleaned // Return as-is if all parsing fails
}

export function parseAmount(amountStr: string): number {
  // Clean the amount string
  let cleaned = String(amountStr).trim()
  
  // Handle parentheses (negative amounts)
  const isNegativeParens = /^\(.*\)$/.test(cleaned)
  if (isNegativeParens) {
    cleaned = cleaned.slice(1, -1) // Remove parentheses
  }
  
  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[$€£¥₹₩¥￥]/g, '')
  cleaned = cleaned.replace(/[,\s]/g, '') // Remove commas and spaces
  
  // Parse the number
  const amount = parseFloat(cleaned)
  
  if (isNaN(amount)) {
    return 0
  }
  
  // Apply negative if in parentheses or if it starts with minus
  return (isNegativeParens || String(amountStr).trim().startsWith('-')) ? -Math.abs(amount) : amount
}

export function determineTransactionType(description: string, typeColumn?: string, isDebit?: boolean): 'income' | 'expense' {
  // If we have explicit type column data
  if (typeColumn) {
    const type = typeColumn.toLowerCase()
    if (type.includes('credit') || type.includes('deposit') || type.includes('income')) {
      return 'income'
    }
    if (type.includes('debit') || type.includes('withdrawal') || type.includes('expense')) {
      return 'expense'
    }
  }
  
  // Check description for income indicators
  const desc = description.toLowerCase()
  const incomeKeywords = ['salary', 'paycheck', 'wage', 'bonus', 'refund', 'deposit', 'interest', 'dividend', 'freelance']
  if (incomeKeywords.some(keyword => desc.includes(keyword))) {
    return 'income'
  }
  
  // Use debit/credit information if available
  if (isDebit !== undefined) {
    // Credits are typically income (money coming in)
    // Debits are typically expenses (money going out)
    return isDebit ? 'expense' : 'income'
  }
  
  // Default to expense (most bank transactions are expenses)
  return 'expense'
}

export function checkForDuplicates(newTransaction: ParsedTransaction, existingTransactions: Transaction[]): boolean {
  const DUPLICATE_THRESHOLD_DAYS = 3 // Allow 3 days difference for date matching
  const DESCRIPTION_SIMILARITY_THRESHOLD = 0.8
  
  const newDate = new Date(newTransaction.date)
  
  for (const existing of existingTransactions) {
    const existingDate = new Date(existing.date)
    const daysDiff = Math.abs((newDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Check if dates are close (within threshold)
    if (daysDiff <= DUPLICATE_THRESHOLD_DAYS) {
      // Check if amounts match exactly
      if (Math.abs(existing.amount - Math.abs(newTransaction.amount)) < 0.01) {
        // Check description similarity
        const similarity = calculateStringSimilarity(
          newTransaction.description.toLowerCase(),
          existing.description.toLowerCase()
        )
        
        if (similarity > DESCRIPTION_SIMILARITY_THRESHOLD) {
          return true
        }
      }
    }
  }
  
  return false
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

export function processImportedTransactions(
  rows: ImportedRow[],
  columnMapping: ColumnMapping
): ParsedTransaction[] {
  const existingTransactions = loadTransactions()
  const parsedTransactions: ParsedTransaction[] = []
  
  for (const row of rows) {
    try {
      const dateStr = String(row[columnMapping.dateColumn] || '')
      const descriptionStr = String(row[columnMapping.descriptionColumn] || '')
      
      // Handle amount - either single column or debit/credit columns
      let amount = 0
      let isDebit = false
      
      if (columnMapping.debitColumn && columnMapping.creditColumn) {
        // Bank format with separate debit/credit columns
        const debitStr = String(row[columnMapping.debitColumn] || '').trim()
        const creditStr = String(row[columnMapping.creditColumn] || '').trim()
        
        if (debitStr && debitStr !== '' && debitStr !== '0' && debitStr !== '0.00') {
          amount = parseAmount(debitStr)
          isDebit = true
        } else if (creditStr && creditStr !== '' && creditStr !== '0' && creditStr !== '0.00') {
          amount = parseAmount(creditStr)
          isDebit = false
        } else {
          continue // Skip rows with no amount in either column
        }
      } else if (columnMapping.amountColumn) {
        // Traditional single amount column
        const amountStr = String(row[columnMapping.amountColumn] || '')
        if (!amountStr) {
          continue // Skip rows with missing amount
        }
        amount = parseAmount(amountStr)
        isDebit = amount < 0
      } else {
        continue // Skip rows with no amount data
      }
      
      if (!dateStr || !descriptionStr) {
        continue // Skip rows with missing required data
      }
      
      const parsedDate = parseDate(dateStr)
      const type = determineTransactionType(
        descriptionStr,
        columnMapping.typeColumn ? String(row[columnMapping.typeColumn]) : undefined,
        isDebit
      )
      
      const transaction: ParsedTransaction = {
        id: crypto.randomUUID(),
        date: parsedDate,
        description: descriptionStr,
        amount: Math.abs(amount), // Store as positive, type determines income/expense
        category: columnMapping.categoryColumn ? String(row[columnMapping.categoryColumn] || '') : '',
        type,
        confidence: calculateParsingConfidence(dateStr, descriptionStr, String(amount)),
        originalRow: row
      }
      
      // Check for duplicates
      const isDuplicate = checkForDuplicates(transaction, existingTransactions)
      if (isDuplicate) {
        transaction.isDuplicate = true
        transaction.duplicateReason = 'Similar transaction found (date, amount, description)'
      }
      
      parsedTransactions.push(transaction)
    } catch (error) {
      console.error('Error parsing transaction row:', row, error)
    }
  }
  
  return parsedTransactions
}

function calculateParsingConfidence(dateStr: string, descriptionStr: string, amountStr: string): number {
  let confidence = 0
  
  // Date confidence
  if (DATE_PATTERNS.some(pattern => pattern.test(dateStr))) {
    confidence += 0.4
  } else if (dateStr.length > 0) {
    confidence += 0.2
  }
  
  // Amount confidence
  if (AMOUNT_PATTERNS.some(pattern => pattern.test(amountStr))) {
    confidence += 0.4
  } else if (!isNaN(parseFloat(amountStr))) {
    confidence += 0.2
  }
  
  // Description confidence
  if (descriptionStr.length > 5) {
    confidence += 0.2
  } else if (descriptionStr.length > 0) {
    confidence += 0.1
  }
  
  return Math.min(confidence, 1.0)
}

export function groupTransactionsByDescription(transactions: ParsedTransaction[]): TransactionGroup[] {
  const groups = new Map<string, ParsedTransaction[]>()
  
  // Group by normalized description, but separate duplicates from non-duplicates
  for (const transaction of transactions) {
    const normalized = normalizeDescription(transaction.description)
    // Create separate group keys for duplicates vs non-duplicates
    const groupKey = transaction.isDuplicate ? `${normalized}__DUPLICATE` : normalized
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(transaction)
  }
  
  // Convert to array and add suggestions
  const result: TransactionGroup[] = []
  for (const [groupKey, transactions] of groups) {
    if (transactions.length > 1) { // Only group if multiple transactions
      // Clean the description by removing the duplicate suffix
      const description = groupKey.replace('__DUPLICATE', '')
      const isDuplicateGroup = groupKey.includes('__DUPLICATE')
      
      result.push({
        description: isDuplicateGroup ? `${description} (Duplicates)` : description,
        transactions,
        suggestedType: getMostCommonType(transactions),
        suggestedCategory: '',
        includeInImport: true
      })
    }
  }
  
  return result.sort((a, b) => b.transactions.length - a.transactions.length) // Sort by group size
}

function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d+/g, '') // Remove numbers
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

function getMostCommonType(transactions: ParsedTransaction[]): 'income' | 'expense' {
  const typeCounts = { income: 0, expense: 0 }
  transactions.forEach(t => typeCounts[t.type || 'expense']++)
  
  return Object.entries(typeCounts).reduce((a, b) => 
    typeCounts[a[0] as keyof typeof typeCounts] > typeCounts[b[0] as keyof typeof typeCounts] ? a : b
  )[0] as 'income' | 'expense'
}