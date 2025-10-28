import type { ImportedRow } from "./types";

export function parseCSV(csvText: string): ImportedRow[] {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Auto-detect delimiter
  const delimiter = detectDelimiter(lines[0]);
  
  const headers = parseCSVLine(lines[0], delimiter);
  const rows: ImportedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);

    
    if (values.length === headers.length) {
      const row: ImportedRow = {};
      headers.forEach((header, index) => {
        // Keep original header case for compatibility with tests
        row[header.trim()] = values[index]?.trim() || "";
      });
      rows.push(row);
    }
  }

  return rows;
}

function detectDelimiter(line: string): string {
  const delimiters = [';', ',', '\t', '|']; // Put semicolon first to prioritize it
  let maxCount = 0;
  let bestDelimiter = ',';

  for (const delimiter of delimiters) {
    // Don't need to escape ; or , in regex, only special characters
    const escapeRegex = delimiter === '|' ? '\\|' : delimiter === '\t' ? '\t' : delimiter;
    const count = (line.match(new RegExp(escapeRegex, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function parseCSVLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.replace(/^"|"$/g, ""));
  return result;
}

export function detectBasilCSV(headers: string[]): boolean {
  const basilHeaders = [
    "Date",
    "Description",
    "Category",
    "Type",
    "Amount",
    "Created At",
  ];
  return basilHeaders.every((header) => headers.includes(header));
}