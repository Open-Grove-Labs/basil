// Quick test for currency system
const {
  formatCurrency,
  SUPPORTED_CURRENCIES,
} = require("./src/utils/storage.js");

console.log("Testing currency formatting:");

// Test USD
const usd = SUPPORTED_CURRENCIES.find((c) => c.code === "USD");
console.log("USD:", formatCurrency(1234.56, usd));

// Test EUR
const eur = SUPPORTED_CURRENCIES.find((c) => c.code === "EUR");
console.log("EUR:", formatCurrency(1234.56, eur));

// Test GBP
const gbp = SUPPORTED_CURRENCIES.find((c) => c.code === "GBP");
console.log("GBP:", formatCurrency(1234.56, gbp));

console.log("\nSupported currencies:");
SUPPORTED_CURRENCIES.forEach((currency) => {
  console.log(
    `${currency.code}: ${currency.symbol} ${currency.name} (${currency.position})`,
  );
});
