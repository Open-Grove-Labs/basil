// Test file to verify Smart Import works with Basil's exported CSV format
import {
  parseCSV,
  detectColumnMapping,
  processImportedTransactions,
} from "../src/utils/smartImport.ts";

const basilExportedCSV = `Date,Description,Category,Type,Amount,Created At
2024-01-15,Coffee Shop,Food & Dining,expense,4.50,2024-01-15T10:30:00Z
2024-01-16,Salary Deposit,Income,income,3000.00,2024-01-16T09:00:00Z
2024-01-17,Gas Station,Transportation,expense,45.00,2024-01-17T18:45:00Z
2024-01-18,Freelance Payment,Income,income,500.00,2024-01-18T14:20:00Z`;

console.log("Testing Basil CSV Import...");

// Parse the CSV
const rows = parseCSV(basilExportedCSV);
console.log("Parsed rows:", rows.length);

// Detect column mapping
const mapping = detectColumnMapping(rows);
console.log("Detected mapping:", mapping);

// Process transactions
const existingTransactions = []; // Empty array for test
const processed = processImportedTransactions(
  rows,
  mapping,
  existingTransactions,
);
console.log("Processed transactions:");
processed.forEach((t) => {
  console.log(`${t.date} - ${t.description} - ${t.type} - $${t.amount}`);
});

// Verify type detection works correctly
console.log("\nType verification:");
console.log(
  "Coffee Shop should be expense:",
  processed[0].type === "expense" ? "✅" : "❌",
);
console.log(
  "Salary should be income:",
  processed[1].type === "income" ? "✅" : "❌",
);
console.log(
  "Gas should be expense:",
  processed[2].type === "expense" ? "✅" : "❌",
);
console.log(
  "Freelance should be income:",
  processed[3].type === "income" ? "✅" : "❌",
);
