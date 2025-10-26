import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatCurrency, updateCurrency } from "./currency";
import * as storage from "./storage";
import type { CurrencyConfig } from "../types";

// Mock the storage functions
vi.mock("./storage", () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

const mockedStorage = vi.mocked(storage);

const mockUsdCurrency: CurrencyConfig = {
  code: "USD",
  symbol: "$",
  name: "US Dollar",
  position: "before",
};

const mockEurCurrency: CurrencyConfig = {
  code: "EUR",
  symbol: "€",
  name: "Euro",
  position: "after",
};

describe("Currency Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for loadSettings
    mockedStorage.loadSettings.mockReturnValue({
      currency: mockUsdCurrency,
      theme: "auto",
    });
  });

  describe("formatCurrency", () => {
    it("should format currency with provided currency config", () => {
      const result = formatCurrency(123.45, mockUsdCurrency);
      expect(result).toMatch(/123\.45/);
      expect(result).toMatch(/\$/);
    });

    it("should format currency without provided config (use default from settings)", () => {
      const result = formatCurrency(67.89);
      
      // Should call loadSettings to get default currency
      expect(mockedStorage.loadSettings).toHaveBeenCalled();
      expect(result).toMatch(/67\.89/);
      expect(result).toMatch(/\$/);
    });

    it("should format currency with different currency codes", () => {
      const result = formatCurrency(100, mockEurCurrency);
      expect(result).toMatch(/100/);
      // Note: EUR formatting depends on system locale
    });

    it("should format negative amounts", () => {
      const result = formatCurrency(-50.25, mockUsdCurrency);
      expect(result).toMatch(/50\.25/);
      expect(result).toMatch(/-|\(/); // Could be -$50.25 or ($50.25)
    });

    it("should format zero amounts", () => {
      const result = formatCurrency(0, mockUsdCurrency);
      expect(result).toMatch(/0\.00/);
      expect(result).toMatch(/\$/);
    });

    it("should format large amounts", () => {
      const result = formatCurrency(1234567.89, mockUsdCurrency);
      expect(result).toMatch(/1,234,567\.89/);
      expect(result).toMatch(/\$/);
    });
  });

  describe("updateCurrency", () => {
    it("should update currency in settings", () => {
      const currentSettings = {
        currency: mockUsdCurrency,
        theme: "auto" as const,
      };
      
      mockedStorage.loadSettings.mockReturnValue(currentSettings);

      updateCurrency(mockEurCurrency);

      expect(mockedStorage.loadSettings).toHaveBeenCalled();
      expect(mockedStorage.saveSettings).toHaveBeenCalledWith({
        currency: mockEurCurrency,
        theme: "auto",
      });
    });

    it("should preserve other settings when updating currency", () => {
      const currentSettings = {
        currency: mockUsdCurrency,
        theme: "dark" as const,
      };
      
      mockedStorage.loadSettings.mockReturnValue(currentSettings);

      updateCurrency(mockEurCurrency);

      expect(mockedStorage.saveSettings).toHaveBeenCalledWith({
        currency: mockEurCurrency,
        theme: "dark",
      });
    });
  });
});