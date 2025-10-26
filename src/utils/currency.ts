import type { CurrencyConfig } from "../types";
import { loadSettings, saveSettings } from "./storage";

// Utility function to format currency amount
export function formatCurrency(
  amount: number,
  currency?: CurrencyConfig,
): string {
  const currencyConfig = currency || loadSettings().currency;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyConfig.code,
  }).format(amount);

  return formattedAmount;
}

export function updateCurrency(currency: CurrencyConfig): void {
  const settings = loadSettings();
  settings.currency = currency;
  saveSettings(settings);
}
