export interface ImportedRow {
  [key: string]: string | number;
}

export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  type?: "income" | "expense";
  createdAt?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  confidence: number;
  originalRow: ImportedRow;
}

export interface ImportResult {
  success: boolean;
  message: string;
  parsedTransactions: ParsedTransaction[];
  duplicates: ParsedTransaction[];
  columnMappings: ColumnMapping;
}

export interface ColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  debitColumn?: string;
  creditColumn?: string;
  categoryColumn?: string;
  typeColumn?: string;
  createdAtColumn?: string;
  isBasilCSV?: boolean;
}

export interface TransactionGroup {
  description: string;
  transactions: ParsedTransaction[];
  suggestedCategory?: string;
  suggestedType?: "income" | "expense";
  includeInImport?: boolean;
}

// Common date formats that banks use
export const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // 2023-12-31
  /^\d{2}\/\d{2}\/\d{4}$/, // 12/31/2023
  /^\d{2}\/\d{2}\/\d{2}$/, // 12/31/23
  /^\d{2}-\d{2}-\d{4}$/, // 12-31-2023
  /^\d{1,2}\/\d{1,2}\/\d{4}$/, // 1/1/2023
  /^\d{1,2}-\d{1,2}-\d{4}$/, // 1-1-2023
];

// Common amount patterns
export const AMOUNT_PATTERNS = [
  /^-?\$?\d+\.?\d*$/, // $123.45 or -123.45
  /^-?\d{1,3}(,\d{3})*\.?\d*$/, // 1,234.56
  /^\(\d+\.?\d*\)$/, // (123.45) for negative
];

// Common column names banks use
export const COLUMN_MAPPINGS = {
  date: [
    "date",
    "transaction date",
    "trans date",
    "posted date",
    "effective date",
    "value date",
  ],
  description: [
    "description",
    "memo",
    "reference",
    "details",
    "transaction details",
    "payee",
    "merchant",
  ],
  amount: ["amount", "transaction amount", "value", "sum", "total"],
  debit: ["debit", "debit amount", "withdrawal", "outgoing"],
  credit: ["credit", "credit amount", "deposit", "incoming"],
  category: ["category", "merchant category", "category code"],
  type: ["type", "transaction type", "dr/cr", "debit/credit"],
};