import type { ImportedRow, ColumnMapping } from "./types";
import { DATE_PATTERNS, AMOUNT_PATTERNS, COLUMN_MAPPINGS } from "./types";
import { detectBasilCSV } from "./csv-parser";

export function detectColumnMappings(rows: ImportedRow[]): ColumnMapping {
  if (rows.length === 0) {
    return {
      dateColumn: "",
      descriptionColumn: "",
      amountColumn: "",
    };
  }

  const headers = Object.keys(rows[0]);
  const mapping: ColumnMapping = {
    dateColumn: "",
    descriptionColumn: "",
    amountColumn: "",
  };

  // Check if this is a Basil exported CSV
  const isBasilCSV = detectBasilCSV(headers);
  if (isBasilCSV) {
    return {
      dateColumn: "Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
      categoryColumn: "Category",
      typeColumn: "Type",
      createdAtColumn: "Created At",
      isBasilCSV: true,
    };
  }
  
  // Detect date column
  for (const header of headers) {
    if (COLUMN_MAPPINGS.date.some((pattern) => header.toLowerCase().includes(pattern))) {
      mapping.dateColumn = header;
      break;
    }
  }

  // If no match by name, try by content pattern
  if (!mapping.dateColumn) {
    for (const header of headers) {
      const sampleValues = rows.slice(0, 5).map((row) => String(row[header]));
      const dateMatches = sampleValues.filter((val) =>
        DATE_PATTERNS.some((pattern) => pattern.test(val)),
      );
      if (dateMatches.length >= Math.min(3, sampleValues.length)) {
        mapping.dateColumn = header;
        break;
      }
    }
  }

  // Detect amount column
  for (const header of headers) {
    if (
      COLUMN_MAPPINGS.amount.some((pattern) =>
        header.toLowerCase().includes(pattern.toLowerCase()),
      )
    ) {
      mapping.amountColumn = header;
      break;
    }
  }

  // Detect debit column
  for (const header of headers) {
    if (
      COLUMN_MAPPINGS.debit.some((pattern) =>
        header.toLowerCase().includes(pattern.toLowerCase()),
      )
    ) {
      mapping.debitColumn = header;
      break;
    }
  }

  // Detect credit column
  for (const header of headers) {
    if (
      COLUMN_MAPPINGS.credit.some((pattern) =>
        header.toLowerCase().includes(pattern.toLowerCase()),
      )
    ) {
      mapping.creditColumn = header;
      break;
    }
  }

  // If no single amount column but we have debit/credit, don't try to find amount by pattern
  if (!mapping.amountColumn && !(mapping.debitColumn && mapping.creditColumn)) {
    // If no match by name, try by content pattern
    for (const header of headers) {
      const sampleValues = rows.slice(0, 5).map((row) => String(row[header]));
      const amountMatches = sampleValues.filter((val) =>
        AMOUNT_PATTERNS.some((pattern) => pattern.test(val)),
      );
      if (amountMatches.length >= Math.min(3, sampleValues.length)) {
        mapping.amountColumn = header;
        break;
      }
    }
  }

  // Detect description column
  for (const header of headers) {
    if (
      COLUMN_MAPPINGS.description.some((pattern) => header.toLowerCase().includes(pattern))
    ) {
      mapping.descriptionColumn = header;
      break;
    }
  }

  // If no description found, use the longest text column
  if (!mapping.descriptionColumn) {
    let longestTextColumn = "";
    let maxAvgLength = 0;

    for (const header of headers) {
      if (header !== mapping.dateColumn && header !== mapping.amountColumn) {
        const avgLength =
          rows.slice(0, 10).reduce((sum, row) => {
            return sum + String(row[header]).length;
          }, 0) / Math.min(10, rows.length);

        if (avgLength > maxAvgLength) {
          maxAvgLength = avgLength;
          longestTextColumn = header;
        }
      }
    }
    mapping.descriptionColumn = longestTextColumn;
  }

  // Try to detect category and type columns
  for (const header of headers) {
    const headerLower = header.toLowerCase();

    if (
      !mapping.categoryColumn &&
      COLUMN_MAPPINGS.category.some((pattern) =>
        headerLower.includes(pattern.toLowerCase()),
      )
    ) {
      mapping.categoryColumn = header;
    }
    if (
      !mapping.typeColumn &&
      COLUMN_MAPPINGS.type.some((pattern) =>
        headerLower.includes(pattern.toLowerCase()),
      )
    ) {
      mapping.typeColumn = header;
    }
  }

  return mapping;
}