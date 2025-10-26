import type {
  ImportedRow,
  ColumnMapping,
  ParsedTransaction,
  TransactionGroup,
} from "../../utils/smart-import";

export type ImportStep = "upload" | "mapping" | "duplicates" | "bulk-edit" | "confirm" | "complete";

export interface ImportWizardState {
  currentStep: ImportStep;
  csvData: ImportedRow[];
  columnMapping: ColumnMapping;
  parsedTransactions: ParsedTransaction[];
  transactionGroups: TransactionGroup[];
  ungroupedTransactions: ParsedTransaction[];
  selectedTransactions: Set<string>;
  isProcessing: boolean;
}

// Re-export types from smartImport for convenience
export type {
  ImportedRow,
  ColumnMapping,
  ParsedTransaction,
  TransactionGroup,
};