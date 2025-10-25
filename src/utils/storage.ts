import type { Transaction, Category, Budget, CurrencyConfig, UserSettings } from '../types';

// Utility function to parse YYYY-MM-DD date strings without timezone issues
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
};

const STORAGE_KEYS = {
  TRANSACTIONS: 'basil_transactions',
  CATEGORIES: 'basil_categories',
  BUDGETS: 'basil_budgets',
  SETTINGS: 'basil_settings',
} as const;

// Currency configuration
export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' },
  { code: 'EUR', symbol: '€', name: 'Euro', position: 'after' },
  { code: 'GBP', symbol: '£', name: 'British Pound', position: 'before' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar', position: 'before' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', position: 'before' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', position: 'before' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', position: 'before' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', position: 'before' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', position: 'before' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', position: 'before' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', position: 'before' },
];

// Default categories for new users
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Food & Dining', color: '#FF6B6B', type: 'expense' },
  { id: '2', name: 'Transportation', color: '#4ECDC4', type: 'expense' },
  { id: '3', name: 'Shopping', color: '#45B7D1', type: 'expense' },
  { id: '4', name: 'Entertainment', color: '#96CEB4', type: 'expense' },
  { id: '5', name: 'Bills & Utilities', color: '#FECA57', type: 'expense' },
  { id: '6', name: 'Healthcare', color: '#FF9FF3', type: 'expense' },
  { id: '7', name: 'Education', color: '#54A0FF', type: 'expense' },
  { id: '8', name: 'Groceries', color: '#54F0AF', type: 'expense' },
  { id: '9', name: 'Insurance', color: '#D4A0FF', type: 'expense' },
  { id: '10', name: 'Housing', color: '#F4505F', type: 'expense' },
  { id: '11', name: 'Debt', color: '#D4A0DF', type: 'expense' },
  { id: '12', name: 'Personal Care', color: '#84F0EF', type: 'expense' },
  { id: '13', name: 'Hobbies', color: '#84808F', type: 'expense' },
  { id: '14', name: 'Salary', color: '#5F27CD', type: 'income' },
  { id: '15', name: 'Freelance', color: '#00D2D3', type: 'income' },
  { id: '16', name: 'Investments', color: '#FF9F43', type: 'income' },
];

// Generic storage functions
function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

function loadFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
}

// Transaction functions
export function saveTransactions(transactions: Transaction[]): void {
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
}

export function loadTransactions(): Transaction[] {
  return loadFromStorage<Transaction>(STORAGE_KEYS.TRANSACTIONS);
}

export function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const transactions = loadTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  
  transactions.push(newTransaction);
  saveTransactions(transactions);
  return newTransaction;
}

export function updateTransaction(id: string, updates: Partial<Transaction>): boolean {
  const transactions = loadTransactions();
  const index = transactions.findIndex(t => t.id === id);
  
  if (index === -1) return false;
  
  transactions[index] = { ...transactions[index], ...updates };
  saveTransactions(transactions);
  return true;
}

export function deleteTransaction(id: string): boolean {
  const transactions = loadTransactions();
  const filteredTransactions = transactions.filter(t => t.id !== id);
  
  if (filteredTransactions.length === transactions.length) return false;
  
  saveTransactions(filteredTransactions);
  return true;
}

// Category functions
export function saveCategories(categories: Category[]): void {
  saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
}

export function loadCategories(): Category[] {
  const categories = loadFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
  
  // Initialize with default categories if none exist
  if (categories.length === 0) {
    saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  
  return categories;
}

export function addCategory(category: Omit<Category, 'id'>): Category {
  const categories = loadCategories();
  const newCategory: Category = {
    ...category,
    id: crypto.randomUUID(),
  };
  
  categories.push(newCategory);
  saveCategories(categories);
  return newCategory;
}

export function getCategoriesByUsage(type?: 'income' | 'expense'): Category[] {
  const categories = loadCategories();
  const transactions = loadTransactions();
  
  // Filter categories by type if specified
  const filteredCategories = type 
    ? categories.filter(cat => cat.type === type)
    : categories;
  
  // Count usage frequency for each category
  const categoryUsage = new Map<string, number>();
  
  transactions.forEach(transaction => {
    const count = categoryUsage.get(transaction.category) || 0;
    categoryUsage.set(transaction.category, count + 1);
  });
  
  // Sort categories by usage frequency (most used first), then alphabetically
  return filteredCategories.sort((a, b) => {
    const usageA = categoryUsage.get(a.name) || 0;
    const usageB = categoryUsage.get(b.name) || 0;
    
    if (usageA !== usageB) {
      return usageB - usageA; // Higher usage first
    }
    
    return a.name.localeCompare(b.name); // Alphabetical fallback
  });
}

// Budget functions
export function saveBudgets(budgets: Budget[]): void {
  saveToStorage(STORAGE_KEYS.BUDGETS, budgets);
}

export function loadBudgets(): Budget[] {
  return loadFromStorage<Budget>(STORAGE_KEYS.BUDGETS);
}

// Clear all data (for testing/reset)
export function clearAllData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

// Settings functions
export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
}

export function loadSettings(): UserSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const settings = JSON.parse(data);
      // Ensure currency is valid, fallback to USD if not found
      if (!settings.currency || !SUPPORTED_CURRENCIES.find(c => c.code === settings.currency.code)) {
        settings.currency = SUPPORTED_CURRENCIES[0]; // USD
      }
      return settings;
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
  }
  
  // Return default settings
  return {
    currency: SUPPORTED_CURRENCIES[0], // USD as default
    theme: 'auto'
  };
}

export function updateCurrency(currency: CurrencyConfig): void {
  const settings = loadSettings();
  settings.currency = currency;
  saveSettings(settings);
}

// Utility function to format currency amount
export function formatCurrency(amount: number, currency?: CurrencyConfig): string {
  const currencyConfig = currency || loadSettings().currency;
  const formattedAmount = amount.toFixed(2);
  
  return currencyConfig.position === 'before' 
    ? `${currencyConfig.symbol}${formattedAmount}`
    : `${formattedAmount} ${currencyConfig.symbol}`;
}