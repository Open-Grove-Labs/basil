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
});
