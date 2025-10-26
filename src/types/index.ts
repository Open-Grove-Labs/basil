export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: "income" | "expense";
  date: string; // ISO string format
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type: "income" | "expense";
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number; // Changed from 'amount' to 'limit' to match actual data
  period?: "monthly" | "weekly" | "yearly"; // Made optional since some budgets don't have this
}

export interface BudgetSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  topCategories: {
    category: string;
    amount: number;
    color: string;
  }[];
}

export interface SpendingTrend {
  date: string;
  income: number | null;
  expenses: number | null;
  balance: number | null;
  cumulativeBalance: number | null;
  isProjection?: boolean;
  projectedIncome?: number | null;
  projectedExpenses?: number | null;
  projectedBalance?: number | null;
  projectedCumulativeBalance?: number | null;
}

export interface CategorySpending {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  position: "before" | "after";
}

export interface UserSettings {
  currency: CurrencyConfig;
  theme?: "light" | "dark" | "auto";
}
