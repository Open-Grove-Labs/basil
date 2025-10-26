export function parseDate(dateStr: string): string {
  // Clean the date string
  const cleaned = dateStr.trim().replace(/['"]/g, "");

  // Try different date formats
  const formats = [
    // ISO format
    (d: string) => {
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
        return d.split(" ")[0]; // Remove time if present
      }
      return null;
    },
    // US formats MM/DD/YYYY - only if first number could be a month
    (d: string) => {
      const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, first, second, year] = match;
        // Use MM/DD if first number is <= 12 and second could be a day
        if (parseInt(first) <= 12 && parseInt(second) <= 31) {
          return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
        }
      }
      return null;
    },
    // US formats MM/DD/YY
    (d: string) => {
      const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
      if (match) {
        const [, month, day, year] = match;
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
      return null;
    },
    // DD/MM/YYYY format - only if day > 12 (unambiguous)
    (d: string) => {
      const match = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, first, second, year] = match;
        // Only use DD/MM if first number is clearly a day (> 12)
        if (parseInt(first) > 12) {
          return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
        }
        // For ambiguous cases like 15/01, also check if it makes sense as DD/MM
        if (parseInt(first) <= 31 && parseInt(second) <= 12) {
          return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
        }
      }
      return null;
    },
  ];

  for (const format of formats) {
    const result = format(cleaned);
    if (result) return result;
  }

  // Fallback: try to parse with Date constructor and format
  try {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch {
    // Ignore parsing errors
  }

  // Return empty string for invalid dates
  return "";
}

export function parseAmount(amountStr: string): number {
  // Clean the amount string
  let cleaned = String(amountStr).trim();

  // Handle parentheses (negative amounts)
  const isNegativeParens = /^\(.*\)$/.test(cleaned);
  if (isNegativeParens) {
    cleaned = cleaned.slice(1, -1); // Remove parentheses
  }

  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[$€£¥₹₩¥￥]/g, "");
  cleaned = cleaned.replace(/[,\s]/g, ""); // Remove commas and spaces

  // Parse the number
  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    return 0;
  }

  // Apply negative if in parentheses or if it starts with minus
  return isNegativeParens || String(amountStr).trim().startsWith("-")
    ? -Math.abs(amount)
    : amount;
}

export function determineTransactionType(
  description: string,
  typeColumn?: string,
  isDebit?: boolean,
): "income" | "expense" {
  // If we have explicit type column data
  if (typeColumn) {
    const type = typeColumn.toLowerCase().trim();

    // Handle Basil's exact exported values first
    if (type === "income") {
      return "income";
    }
    if (type === "expense") {
      return "expense";
    }

    // Handle other common type column formats
    if (
      type.includes("credit") ||
      type.includes("deposit") ||
      type.includes("income")
    ) {
      return "income";
    }
    if (
      type.includes("debit") ||
      type.includes("withdrawal") ||
      type.includes("expense")
    ) {
      return "expense";
    }
  }

  // Check description for income indicators
  const desc = description.toLowerCase();
  const incomeKeywords = [
    "salary",
    "paycheck",
    "payroll",
    "wage",
    "bonus",
    "refund",
    "deposit",
    "interest",
    "dividend",
    "freelance",
    "transfer in",
  ];
  if (incomeKeywords.some((keyword) => desc.includes(keyword))) {
    return "income";
  }

  // Use debit/credit information if available
  if (isDebit !== undefined) {
    // Credits are typically income (money coming in)
    // Debits are typically expenses (money going out)
    return isDebit ? "expense" : "income";
  }

  // Default to expense (most bank transactions are expenses)
  return "expense";
}