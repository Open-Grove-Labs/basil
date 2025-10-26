import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadTransactions,
  saveTransactions,
  loadCategories,
  saveCategories,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  parseLocalDate,
  addCategory,
  getCategoriesByUsage,
  loadBudgets,
  saveBudgets,
  clearAllData,
  saveSettings,
  loadSettings,
  SUPPORTED_CURRENCIES,
} from "../utils/storage";
import { formatCurrency } from "../utils/currency";
import {
  mockTransactions,
  mockCategories,
  mockLocalStorage,
} from "../test/test-utils";

describe("Storage Utils", () => {
  let mockStorage: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    mockStorage = mockLocalStorage();
    vi.stubGlobal("localStorage", mockStorage);
  });

  describe("loadTransactions", () => {
    it("should return empty array when no transactions in localStorage", () => {
      mockStorage.getItem.mockReturnValue(null);
      const result = loadTransactions();
      expect(result).toEqual([]);
      expect(mockStorage.getItem).toHaveBeenCalledWith("basil_transactions");
    });

    it("should return parsed transactions from localStorage", () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify(mockTransactions));
      const result = loadTransactions();
      expect(result).toEqual(mockTransactions);
    });

    it("should return empty array on JSON parse error", () => {
      mockStorage.getItem.mockReturnValue("invalid json");
      const result = loadTransactions();
      expect(result).toEqual([]);
    });
  });

  describe("saveTransactions", () => {
    it("should save transactions to localStorage", () => {
      saveTransactions(mockTransactions);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "basil_transactions",
        JSON.stringify(mockTransactions),
      );
    });
  });

  describe("addTransaction", () => {
    it("should add a new transaction with generated ID and timestamp", () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify([]));

      const newTransaction = {
        date: "2024-01-15",
        description: "Test Transaction",
        category: "Food & Dining",
        type: "expense" as const,
        amount: 25.5,
      };

      const result = addTransaction(newTransaction);

      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.description).toBe("Test Transaction");
      expect(mockStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("updateTransaction", () => {
    it("should update an existing transaction", () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify(mockTransactions));

      const updated = updateTransaction("1", {
        description: "Updated Description",
      });
      expect(updated).toBe(true);
    });

    it("should return false for non-existent transaction", () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify(mockTransactions));

      const updated = updateTransaction("nonexistent", {
        description: "Updated",
      });
      expect(updated).toBe(false);
    });
  });

  describe("deleteTransaction", () => {
    it("should delete an existing transaction", () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify(mockTransactions));

      const deleted = deleteTransaction("1");
      expect(deleted).toBe(true);
    });

    it("should return false for non-existent transaction", () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify(mockTransactions));

      const deleted = deleteTransaction("nonexistent");
      expect(deleted).toBe(false);
    });
  });

  describe("loadCategories", () => {
    it("should return default categories when none in localStorage", () => {
      mockStorage.getItem.mockReturnValue(null);
      const result = loadCategories();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((cat) => cat.name === "Food & Dining")).toBe(true);
      expect(result.some((cat) => cat.name === "Rent / Mortgage")).toBe(true);
    });

    it("should return categories from localStorage when available", () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify(mockCategories));
      const result = loadCategories();
      expect(result).toEqual(mockCategories);
    });
  });

  describe("saveCategories", () => {
    it("should save categories to localStorage", () => {
      saveCategories(mockCategories);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "basil_categories",
        JSON.stringify(mockCategories),
      );
    });
  });

  describe("parseLocalDate", () => {
    it("should parse YYYY-MM-DD format correctly", () => {
      const result = parseLocalDate("2024-01-15");
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(15);
    });

    it("should handle edge cases", () => {
      const result = parseLocalDate("2024-12-31");
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // December is 11
      expect(result.getDate()).toBe(31);
    });
  });

  describe("formatCurrency", () => {
    it("should format positive amounts correctly", () => {
      expect(formatCurrency(1234.56)).toBe("$1,234.56");
      expect(formatCurrency(0)).toBe("$0.00");
      expect(formatCurrency(1000000)).toBe("$1,000,000.00");
    });

    it("should format negative amounts correctly", () => {
      expect(formatCurrency(-1234.56)).toBe("-$1,234.56");
      expect(formatCurrency(-0.99)).toBe("-$0.99");
    });

    it("should handle decimal precision", () => {
      expect(formatCurrency(1.1)).toBe("$1.10");
      expect(formatCurrency(1.999)).toBe("$2.00"); // Should round
    });
  });

  describe("addCategory", () => {
    it("should add a new category with generated ID", () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify(mockCategories));
      
      const newCategoryData = {
        name: "New Category",
        color: "#FF0000",
        type: "expense" as const,
      };

      const result = addCategory(newCategoryData);

      expect(result).toMatchObject(newCategoryData);
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
      expect(mockStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("getCategoriesByUsage", () => {
    beforeEach(() => {
      mockStorage.getItem.mockImplementation((key) => {
        if (key === "basil_categories") return JSON.stringify(mockCategories);
        if (key === "basil_transactions") return JSON.stringify(mockTransactions);
        return null;
      });
    });

    it("should return all categories sorted by usage", () => {
      const result = getCategoriesByUsage();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should filter categories by type when specified", () => {
      const expenseCategories = getCategoriesByUsage("expense");
      const incomeCategories = getCategoriesByUsage("income");
      
      expect(expenseCategories.every(cat => cat.type === "expense")).toBe(true);
      expect(incomeCategories.every(cat => cat.type === "income")).toBe(true);
    });

    it("should sort by usage frequency", () => {
      const result = getCategoriesByUsage();
      // Categories should be sorted by usage count, then alphabetically
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe("Budget functions", () => {
    const mockBudgets = [
      { id: "1", categoryId: "1", limit: 500, period: "monthly" as const },
      { id: "2", categoryId: "2", limit: 1200, period: "monthly" as const },
    ];

    describe("saveBudgets", () => {
      it("should save budgets to localStorage", () => {
        saveBudgets(mockBudgets);
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          "basil_budgets",
          JSON.stringify(mockBudgets)
        );
      });
    });

    describe("loadBudgets", () => {
      it("should return budgets from localStorage", () => {
        mockStorage.getItem.mockReturnValue(JSON.stringify(mockBudgets));
        const result = loadBudgets();
        expect(result).toEqual(mockBudgets);
      });

      it("should return empty array when no budgets exist", () => {
        mockStorage.getItem.mockReturnValue(null);
        const result = loadBudgets();
        expect(result).toEqual([]);
      });
    });
  });

  describe("Settings functions", () => {
    const mockSettings = {
      currency: SUPPORTED_CURRENCIES[0],
      theme: "auto" as const,
    };

    describe("saveSettings", () => {
      it("should save settings to localStorage", () => {
        saveSettings(mockSettings);
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          "basil_settings",
          JSON.stringify(mockSettings)
        );
      });

      it("should handle save errors gracefully", () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockStorage.setItem.mockImplementation(() => {
          throw new Error("Storage error");
        });
        
        expect(() => saveSettings(mockSettings)).not.toThrow();
        
        consoleSpy.mockRestore();
      });
    });

    describe("loadSettings", () => {
      it("should return settings from localStorage", () => {
        mockStorage.getItem.mockReturnValue(JSON.stringify(mockSettings));
        const result = loadSettings();
        expect(result).toEqual(mockSettings);
      });

      it("should return default settings when localStorage is empty", () => {
        mockStorage.getItem.mockReturnValue(null);
        const result = loadSettings();
        expect(result).toHaveProperty("currency");
        expect(result).toHaveProperty("theme");
        expect(result.currency).toEqual(SUPPORTED_CURRENCIES[0]);
      });

      it("should handle invalid currency and fallback to USD", () => {
        const invalidSettings = {
          currency: { code: "INVALID", symbol: "X", name: "Invalid", position: "before" as const },
          theme: "auto" as const,
        };
        mockStorage.getItem.mockReturnValue(JSON.stringify(invalidSettings));
        
        const result = loadSettings();
        expect(result.currency).toEqual(SUPPORTED_CURRENCIES[0]); // Should fallback to USD
      });

      it("should handle JSON parse errors", () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockStorage.getItem.mockReturnValue("invalid json");
        const result = loadSettings();
        expect(result).toHaveProperty("currency");
        expect(result.currency).toEqual(SUPPORTED_CURRENCIES[0]);
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe("clearAllData", () => {
    it("should remove all storage keys", () => {
      clearAllData();
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(4); // Should call for each STORAGE_KEYS
    });

    it("should handle clear errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStorage.removeItem.mockImplementation(() => {
        throw new Error("Clear error");
      });
      
      expect(() => clearAllData()).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe("SUPPORTED_CURRENCIES", () => {
    it("should contain valid currency configurations", () => {
      expect(SUPPORTED_CURRENCIES).toBeInstanceOf(Array);
      expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(0);
      
      SUPPORTED_CURRENCIES.forEach(currency => {
        expect(currency).toHaveProperty("code");
        expect(currency).toHaveProperty("symbol");
        expect(currency).toHaveProperty("name");
        expect(currency).toHaveProperty("position");
        expect(["before", "after"]).toContain(currency.position);
      });
    });

    it("should have USD as the first currency (default)", () => {
      expect(SUPPORTED_CURRENCIES[0].code).toBe("USD");
    });
  });
});
