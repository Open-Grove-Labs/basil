import type { Transaction } from '../types';
import { saveTransactions } from './storage';

// Mock data flag
const MOCK_DATA_FLAG = 'basil.addMockData';

// Realistic transaction templates
const EXPENSE_TEMPLATES = [
  // Food & Dining
  { description: 'Starbucks Coffee', category: 'Food & Dining', minAmount: 4, maxAmount: 15 },
  { description: 'Lunch at Chipotle', category: 'Food & Dining', minAmount: 8, maxAmount: 18 },
  { description: 'Grocery Store', category: 'Food & Dining', minAmount: 45, maxAmount: 180 },
  { description: 'Pizza Delivery', category: 'Food & Dining', minAmount: 20, maxAmount: 35 },
  { description: 'Restaurant Dinner', category: 'Food & Dining', minAmount: 25, maxAmount: 85 },
  { description: 'Morning Bagel', category: 'Food & Dining', minAmount: 3, maxAmount: 8 },
  
  // Transportation
  { description: 'Gas Station', category: 'Transportation', minAmount: 35, maxAmount: 75 },
  { description: 'Uber Ride', category: 'Transportation', minAmount: 8, maxAmount: 25 },
  { description: 'Parking Fee', category: 'Transportation', minAmount: 2, maxAmount: 15 },
  { description: 'Public Transit', category: 'Transportation', minAmount: 2, maxAmount: 5 },
  { description: 'Car Maintenance', category: 'Transportation', minAmount: 50, maxAmount: 300 },
  
  // Shopping
  { description: 'Amazon Purchase', category: 'Shopping', minAmount: 15, maxAmount: 120 },
  { description: 'Target Run', category: 'Shopping', minAmount: 25, maxAmount: 85 },
  { description: 'Clothing Store', category: 'Shopping', minAmount: 30, maxAmount: 150 },
  { description: 'Electronics Store', category: 'Shopping', minAmount: 50, maxAmount: 400 },
  { description: 'Pharmacy', category: 'Shopping', minAmount: 8, maxAmount: 45 },
  
  // Entertainment
  { description: 'Movie Theater', category: 'Entertainment', minAmount: 12, maxAmount: 25 },
  { description: 'Streaming Service', category: 'Entertainment', minAmount: 8, maxAmount: 18 },
  { description: 'Concert Tickets', category: 'Entertainment', minAmount: 45, maxAmount: 150 },
  { description: 'Video Games', category: 'Entertainment', minAmount: 20, maxAmount: 70 },
  { description: 'Bowling Night', category: 'Entertainment', minAmount: 15, maxAmount: 40 },
  
  // Bills & Utilities
  { description: 'Electric Bill', category: 'Bills & Utilities', minAmount: 80, maxAmount: 180 },
  { description: 'Internet Bill', category: 'Bills & Utilities', minAmount: 50, maxAmount: 120 },
  { description: 'Phone Bill', category: 'Bills & Utilities', minAmount: 45, maxAmount: 85 },
  { description: 'Water Bill', category: 'Bills & Utilities', minAmount: 35, maxAmount: 75 },
  { description: 'Rent Payment', category: 'Bills & Utilities', minAmount: 800, maxAmount: 2500 },
  
  // Healthcare
  { description: 'Doctor Visit', category: 'Healthcare', minAmount: 120, maxAmount: 300 },
  { description: 'Prescription Medication', category: 'Healthcare', minAmount: 15, maxAmount: 85 },
  { description: 'Dental Cleaning', category: 'Healthcare', minAmount: 80, maxAmount: 200 },
  { description: 'Gym Membership', category: 'Fitness', minAmount: 25, maxAmount: 80 },
  
  // Travel
  { description: 'Hotel Stay', category: 'Travel', minAmount: 120, maxAmount: 350 },
  { description: 'Flight Ticket', category: 'Travel', minAmount: 200, maxAmount: 800 },
  { description: 'Travel Food', category: 'Travel', minAmount: 25, maxAmount: 75 },
  
  // Home & Garden
  { description: 'Home Depot', category: 'Home & Garden', minAmount: 35, maxAmount: 200 },
  { description: 'Furniture Store', category: 'Home & Garden', minAmount: 150, maxAmount: 800 },
  { description: 'Garden Supplies', category: 'Home & Garden', minAmount: 20, maxAmount: 85 },
];

const INCOME_TEMPLATES = [
  { description: 'Monthly Salary', category: 'Salary', minAmount: 3000, maxAmount: 6000 },
  { description: 'Freelance Project', category: 'Freelance', minAmount: 500, maxAmount: 2500 },
  { description: 'Investment Dividend', category: 'Investments', minAmount: 50, maxAmount: 500 },
  { description: 'Side Business Revenue', category: 'Side Business', minAmount: 200, maxAmount: 1200 },
  { description: 'Birthday Gift', category: 'Gifts', minAmount: 25, maxAmount: 200 },
  { description: 'Tax Refund', category: 'Investments', minAmount: 500, maxAmount: 2000 },
  { description: 'Bonus Payment', category: 'Salary', minAmount: 800, maxAmount: 3000 },
];

const SAVINGS_TEMPLATES = [
  { description: 'Emergency Fund Contribution', category: 'Emergency Fund', minAmount: 300, maxAmount: 1000 },
  { description: 'Retirement 401k Contribution', category: 'Retirement', minAmount: 500, maxAmount: 1500 },
  { description: 'Vacation Fund Deposit', category: 'Vacation Fund', minAmount: 150, maxAmount: 600 },
  { description: 'House Down Payment Savings', category: 'House Deposit', minAmount: 400, maxAmount: 1200 },
  { description: 'Investment Account Transfer', category: 'Retirement', minAmount: 300, maxAmount: 900 },
  { description: 'College Fund Contribution', category: 'Education', minAmount: 200, maxAmount: 700 },
  { description: 'High-Yield Savings Account', category: 'Emergency Fund', minAmount: 250, maxAmount: 800 },
  { description: 'Stock Portfolio Contribution', category: 'Investments', minAmount: 400, maxAmount: 1100 },
  { description: 'Roth IRA Contribution', category: 'Retirement', minAmount: 350, maxAmount: 1000 },
  { description: 'Car Replacement Fund', category: 'Transportation', minAmount: 200, maxAmount: 600 },
];

// Helper function to get local date string (YYYY-MM-DD)
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to generate random amount within range
function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Generate mock transactions
function generateMockTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  // Generate transactions for the last 6 months
  for (let month = 0; month < 6; month++) {
    const currentMonth = new Date(now.getFullYear(), now.getMonth() - month, 1);
    
    // Generate 1-2 salary transactions per month (usually on the 1st and 15th)
    const salaryCount = Math.random() > 0.3 ? 2 : 1;
    for (let i = 0; i < salaryCount; i++) {
      const template = INCOME_TEMPLATES[0]; // Salary
      const dayOfMonth = i === 0 ? 1 : 15; // 1st and 15th
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayOfMonth);
      
      transactions.push({
        id: crypto.randomUUID(),
        amount: randomAmount(template.minAmount, template.maxAmount),
        description: template.description,
        category: template.category,
        type: 'income',
        date: getLocalDateString(date),
        createdAt: date.toISOString(),
      });
    }
    
    // Generate random freelance/side income (30% chance)
    if (Math.random() > 0.7) {
      const template = INCOME_TEMPLATES[Math.floor(Math.random() * (INCOME_TEMPLATES.length - 1)) + 1];
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.floor(Math.random() * 28) + 1);
      
      transactions.push({
        id: crypto.randomUUID(),
        amount: randomAmount(template.minAmount, template.maxAmount),
        description: template.description,
        category: template.category,
        type: 'income',
        date: getLocalDateString(date),
        createdAt: date.toISOString(),
      });
    }
    
    // Generate savings transactions (90% chance, 2-4 per month for better baseline)
    if (Math.random() > 0.1) {
      const savingsCount = Math.floor(Math.random() * 3) + 2; // 2-4 savings per month
      for (let i = 0; i < savingsCount; i++) {
        const template = SAVINGS_TEMPLATES[Math.floor(Math.random() * SAVINGS_TEMPLATES.length)];
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.floor(Math.random() * 28) + 1);
        
        transactions.push({
          id: crypto.randomUUID(),
          amount: randomAmount(template.minAmount, template.maxAmount),
          description: template.description,
          category: template.category,
          type: 'savings',
          date: getLocalDateString(date),
          createdAt: date.toISOString(),
        });
      }
    }
    
    // Generate 25-45 expenses per month
    const expenseCount = Math.floor(Math.random() * 21) + 25;
    for (let i = 0; i < expenseCount; i++) {
      const template = EXPENSE_TEMPLATES[Math.floor(Math.random() * EXPENSE_TEMPLATES.length)];
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.floor(Math.random() * 28) + 1);
      
      transactions.push({
        id: crypto.randomUUID(),
        amount: randomAmount(template.minAmount, template.maxAmount),
        description: template.description,
        category: template.category,
        type: 'expense',
        date: getLocalDateString(date),
        createdAt: date.toISOString(),
      });
    }
  }
  
  // Sort by date (newest first)
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Check if mock data should be loaded
export function shouldLoadMockData(): boolean {
  return localStorage.getItem(MOCK_DATA_FLAG) === 'true';
}

// Load mock data into the app
export function loadMockData(): void {
  if (!shouldLoadMockData()) {
    return;
  }
  
  console.log('🌿 Loading Basil mock data...');
  
  // Generate and save mock transactions
  const mockTransactions = generateMockTransactions();
  saveTransactions(mockTransactions);
  
  console.log(`✅ Generated ${mockTransactions.length} mock transactions across 6 months`);
  console.log('📊 Mock data includes:');
  console.log('   • Monthly salary payments');
  console.log('   • Varied expense categories');
  console.log('   • Random freelance income');
  console.log('   • Savings contributions');
  console.log('   • Realistic spending patterns');
  console.log('');
  console.log('💡 To remove mock data, run: localStorage.removeItem("basil.addMockData")');
}

// Clear mock data flag and reload
export function clearMockData(): void {
  localStorage.removeItem(MOCK_DATA_FLAG);
  localStorage.removeItem('basil_transactions');
  console.log('🧹 Mock data cleared! Refresh the page to see clean state.');
}

// Initialize mock data on app load if flag is set
export function initializeMockData(): void {
  if (shouldLoadMockData()) {
    // Only load if we don't already have transactions
    const existingTransactions = JSON.parse(localStorage.getItem('basil_transactions') || '[]');
    if (existingTransactions.length === 0) {
      loadMockData();
    }
  }
}

// Expose helpful functions to window for console access
declare global {
  interface Window {
    basilBudget: {
      addMockData: () => void;
      clearMockData: () => void;
      reloadMockData: () => void;
    };
  }
}

// Setup console helpers
if (typeof window !== 'undefined') {
  window.basilBudget = {
    addMockData: () => {
      localStorage.setItem(MOCK_DATA_FLAG, 'true');
      loadMockData();
      console.log('🌿 Mock data added! Refresh the page to see it in the UI.');
    },
    clearMockData: () => {
      clearMockData();
      console.log('🧹 Run window.location.reload() to see the clean state.');
    },
    reloadMockData: () => {
      localStorage.removeItem('basil_transactions');
      if (shouldLoadMockData()) {
        loadMockData();
        console.log('🔄 Mock data reloaded! Refresh the page to see updated data.');
      } else {
        console.log('❌ Mock data flag not set. Run basilBudget.addMockData() first.');
      }
    }
  };

  // Log helpful instructions
  if (shouldLoadMockData()) {
    console.log('🌿 Basil - Mock Data Mode Active');
    console.log('💡 Available commands:');
    console.log('   • basilBudget.clearMockData() - Remove all mock data');
    console.log('   • basilBudget.reloadMockData() - Generate fresh mock data');
  } else {
    console.log('🌿 Basil - Clean Data Mode');
    console.log('💡 To add mock data: basilBudget.addMockData()');
  }
}