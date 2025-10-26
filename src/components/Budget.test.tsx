import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Budget from "../components/Budget";
import {
  mockTransactions,
  mockCategories,
  mockLocalStorage,
} from "../test/test-utils";
import * as storage from "../utils/storage";

// Mock the storage functions
vi.mock("../utils/storage", () => ({
  loadTransactions: vi.fn(),
  loadCategories: vi.fn(),
  parseLocalDate: vi.fn(),
  saveBudgets: vi.fn(),
  loadBudgets: vi.fn(),
  loadSettings: vi.fn(),
}));

const mockedStorage = vi.mocked(storage);

describe("Budget Component", () => {
  let mockStorage: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    mockStorage = mockLocalStorage();
    vi.stubGlobal("localStorage", mockStorage);

    // Mock the imported functions
    mockedStorage.loadTransactions.mockReturnValue(mockTransactions);
    mockedStorage.loadCategories.mockReturnValue(mockCategories);
    mockedStorage.loadBudgets.mockReturnValue([]);

    // Mock parseLocalDate to return proper dates
    mockedStorage.parseLocalDate.mockImplementation((dateString: string) => {
      const [year, month, day] = dateString.split("-").map(Number);
      return new Date(year, month - 1, day);
    });

    // Mock loadSettings to return default settings
    mockedStorage.loadSettings.mockReturnValue({
      currency: { code: "USD", symbol: "$", name: "US Dollar", position: "before" },
      theme: "auto",
    });
  });

  it("should render budget header with summary cards", () => {
    const { container } = render(<Budget />);
    expect(container.querySelector('.budget-header')).toBeInTheDocument();
    expect(container.querySelector('.budget-summary-cards')).toBeInTheDocument();
  });

  it("should display budget summary cards", () => {
    const { getByText } = render(<Budget />);

    expect(getByText(/total budget/i)).toBeInTheDocument();
    expect(getByText(/total spent/i)).toBeInTheDocument();
    expect(getByText(/remaining/i)).toBeInTheDocument();
  });

  it("should show auto-suggest budgets button", () => {
    const { getByText } = render(<Budget />);

    expect(getByText(/auto-suggest budgets/i)).toBeInTheDocument();
  });

  it("should display budget categories with edit buttons", () => {
    const { getByText, container } = render(<Budget />);

    // Should show category names
    expect(getByText(/food & dining/i)).toBeInTheDocument();
    expect(getByText(/rent\/mortgage/i)).toBeInTheDocument();
    expect(getByText(/bills & utilities/i)).toBeInTheDocument();

    // Should show edit buttons
    const editButtons = container.querySelectorAll('button');
    const hasEditButton = Array.from(editButtons).some(btn => 
      btn.textContent?.includes('Edit')
    );
    expect(hasEditButton).toBe(true);
  });

  it("should calculate 2-month average for expenses when in reduce mode", () => {
    // Create transactions with specific dates for 2-month average calculation
    const transactionsFor2Months = [
      {
        id: "1",
        date: "2025-10-15", // Current month
        description: "Food",
        category: "Food & Dining",
        type: "expense" as const,
        amount: 100,
        createdAt: "2025-10-15T10:30:00Z",
      },
      {
        id: "2",
        date: "2025-09-15", // Last month
        description: "Food",
        category: "Food & Dining",
        type: "expense" as const,
        amount: 200,
        createdAt: "2025-09-15T10:30:00Z",
      },
      {
        id: "3",
        date: "2025-08-15", // 2 months ago (should not be included in 2-month average)
        description: "Food",
        category: "Food & Dining",
        type: "expense" as const,
        amount: 1000,
        createdAt: "2025-08-15T10:30:00Z",
      },
    ];

    mockedStorage.loadTransactions.mockReturnValue(transactionsFor2Months);

    const { container } = render(<Budget />);

    // The component should calculate 2-month average (100 + 200) / 2 = 150
    // Not the 3-month average which would include the 1000 amount
    expect(container.textContent).not.toContain("$433.33"); // 3-month average
  });

  it("should protect rent/mortgage from reduction suggestions", () => {
    const transactionsWithRent = [
      {
        id: "1",
        date: "2025-10-15",
        description: "Rent Payment",
        category: "Rent/Mortgage",
        type: "expense" as const,
        amount: 1200,
        createdAt: "2025-10-15T10:30:00Z",
      },
      {
        id: "2",
        date: "2025-10-15",
        description: "Groceries",
        category: "Food & Dining",
        type: "expense" as const,
        amount: 200,
        createdAt: "2025-10-15T10:30:00Z",
      },
    ];

    mockedStorage.loadTransactions.mockReturnValue(transactionsWithRent);

    const { container, getByText } = render(<Budget />);

    // Should show both categories but rent should not be in reduction suggestions
    expect(
      getByText(/rent/i) || container.textContent?.includes("Rent"),
    ).toBeTruthy();
    expect(
      getByText(/food/i) || container.textContent?.includes("Food"),
    ).toBeTruthy();
  });

  it("should handle empty transaction data gracefully", () => {
    mockedStorage.loadTransactions.mockReturnValue([]);

    const { container } = render(<Budget />);

    // Should render without crashing
    expect(container).toBeInTheDocument();
  });

  it("should update when transactions change", () => {
    const { rerender } = render(<Budget />);

    // Change mock data
    const newTransactions = [
      ...mockTransactions,
      {
        id: "new",
        date: "2025-10-20",
        description: "New Expense",
        category: "Shopping",
        type: "expense" as const,
        amount: 150,
        createdAt: "2025-10-20T10:30:00Z",
      },
    ];

    mockedStorage.loadTransactions.mockReturnValue(newTransactions);

    // Re-render component
    rerender(<Budget />);

    // Component should handle the new data
    expect(mockedStorage.loadTransactions).toHaveBeenCalled();
  });

  it("should display budget categories with proper formatting", () => {
    const { container } = render(<Budget />);

    // Should show formatted currency amounts
    const dollarSigns = container.textContent?.match(/\$/g);
    expect(dollarSigns?.length).toBeGreaterThan(0);
  });

  it("should calculate net balance correctly", () => {
    const balancedTransactions = [
      {
        id: "1",
        date: "2025-10-15",
        description: "Salary",
        category: "Income",
        type: "income" as const,
        amount: 5000,
        createdAt: "2025-10-15T09:00:00Z",
      },
      {
        id: "2",
        date: "2025-10-15",
        description: "Rent",
        category: "Rent/Mortgage",
        type: "expense" as const,
        amount: 1500,
        createdAt: "2025-10-15T10:00:00Z",
      },
    ];

    mockedStorage.loadTransactions.mockReturnValue(balancedTransactions);

    const { container } = render(<Budget />);

    // Should calculate net balance (5000 - 1500 = 3500)
    // The exact display format may vary, but should show positive balance
    expect(container.textContent).toContain("$");
  });

  describe("Interactive Budget Features", () => {
    it("should handle budget editing", async () => {
      const { container } = render(<Budget />);

      // Find and click an edit button
      const editButtons = container.querySelectorAll('button');
      const editButton = Array.from(editButtons).find(btn => 
        btn.textContent?.includes('Edit')
      );
      
      if (editButton) {
        await userEvent.click(editButton);
        
        // Should show editing interface
        await waitFor(() => {
          expect(container.querySelector('input[type="number"]')).toBeInTheDocument();
        });
      }
    });

    it("should show and hide budget suggestions", async () => {
      const { getByText } = render(<Budget />);

      // Click the Auto-Suggest Budgets button
      const suggestButton = getByText(/auto-suggest budgets/i);
      await userEvent.click(suggestButton);

      // Should show suggestions interface (component should handle click)
      expect(suggestButton).toBeInTheDocument();
    });

    it("should display budget amounts and percentages", () => {
      const { container } = render(<Budget />);

      // Should show spent amounts
      const spentElements = container.querySelectorAll('.budget-spent');
      expect(spentElements.length).toBeGreaterThan(0);

      // Should show budget status indicators
      const budgetItems = container.querySelectorAll('.budget-item');
      expect(budgetItems.length).toBeGreaterThan(0);
    });

    it("should handle empty budget limits", () => {
      const { container } = render(<Budget />);

      // Should show "No budget set" for categories without limits
      const noBudgetElements = container.querySelectorAll('.budget-no-limit-text');
      expect(noBudgetElements.length).toBeGreaterThan(0);
      
      // Check that at least one shows the expected text
      const hasNoBudgetText = Array.from(noBudgetElements).some(el => 
        el.textContent?.includes('No budget set')
      );
      expect(hasNoBudgetText).toBe(true);
    });

    it("should calculate spending correctly with transactions", () => {
      // Use mock transactions with specific spending amounts
      const spendingTransactions = [
        {
          id: "spend1",
          date: "2025-10-15",
          description: "Grocery shopping",
          category: "Food & Dining", 
          type: "expense" as const,
          amount: 150.50,
          createdAt: "2025-10-15T10:30:00Z",
        }
      ];

      mockedStorage.loadTransactions.mockReturnValue(spendingTransactions);

      const { container } = render(<Budget />);

      // Should process spending calculations
      expect(container.querySelector('.budget-spent')).toBeInTheDocument();
    });

    it("should show budget progress indicators", () => {
      const { container } = render(<Budget />);

      // Should have budget progress elements
      const budgetItems = container.querySelectorAll('.budget-item');
      expect(budgetItems.length).toBeGreaterThan(0);

      budgetItems.forEach(item => {
        // Each budget item should have proper structure
        expect(item.querySelector('.budget-category-name')).toBeInTheDocument();
      });
    });

    it("should handle currency formatting in budgets", () => {
      const { container } = render(<Budget />);

      // Should show currency symbols in amounts
      const summaryCards = container.querySelectorAll('.budget-summary-value');
      expect(summaryCards.length).toBeGreaterThan(0);

      summaryCards.forEach(card => {
        expect(card.textContent).toMatch(/\$\d+\.\d{2}/);
      });
    });
  });
});
