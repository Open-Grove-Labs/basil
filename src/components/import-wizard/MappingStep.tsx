import { Edit3, ArrowRight } from "lucide-react";
import type { ColumnMapping, ImportedRow } from "../../utils/smart-import";

interface MappingStepProps {
  csvData: ImportedRow[];
  columnMapping: ColumnMapping;
  onColumnMappingChange: (mapping: ColumnMapping) => void;
  onNext: () => void;
}

export function MappingStep({
  csvData,
  columnMapping,
  onColumnMappingChange,
  onNext,
}: MappingStepProps) {
  const handleMappingConfirm = () => {
    // Validate required columns
    const hasAmountData =
      columnMapping.amountColumn ||
      (columnMapping.debitColumn && columnMapping.creditColumn);

    if (!columnMapping.dateColumn || !columnMapping.descriptionColumn || !hasAmountData) {
      alert("Please select all required columns (Date, Description, and Amount/Debit+Credit)");
      return;
    }

    onNext();
  };

  if (csvData.length === 0) {
    return null;
  }

  const columns = Object.keys(csvData[0]);

  return (
    <div className="import-step">
      <div className="step-header">
        <Edit3 size={32} className="step-icon" />
        <h3>Map CSV Columns</h3>
        <p>Confirm how your CSV columns match our transaction fields</p>
      </div>

      <div className="column-mapping">
        <div className="mapping-row">
          <label className="mapping-label">Date Column *</label>
          <select
            title="select date column from csv"
            className="form-select"
            value={columnMapping.dateColumn}
            onChange={(e) =>
              onColumnMappingChange({
                ...columnMapping,
                dateColumn: e.target.value,
              })
            }
          >
            <option value="">Select date column...</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div className="mapping-row">
          <label className="mapping-label">Description Column *</label>
          <select
            title="select description column from csv"
            className="form-select"
            value={columnMapping.descriptionColumn}
            onChange={(e) =>
              onColumnMappingChange({
                ...columnMapping,
                descriptionColumn: e.target.value,
              })
            }
          >
            <option value="">Select description column...</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Column Mapping */}
        {columnMapping.debitColumn || columnMapping.creditColumn ? (
          <DebitCreditMapping
            columns={columns}
            columnMapping={columnMapping}
            onColumnMappingChange={onColumnMappingChange}
          />
        ) : columnMapping.isBasilCSV ? (
          <BasilAmountMapping
            columns={columns}
            columnMapping={columnMapping}
            onColumnMappingChange={onColumnMappingChange}
          />
        ) : (
          <StandardAmountMapping
            columns={columns}
            columnMapping={columnMapping}
            onColumnMappingChange={onColumnMappingChange}
          />
        )}

        <OptionalColumnMappings
          columns={columns}
          columnMapping={columnMapping}
          onColumnMappingChange={onColumnMappingChange}
        />
      </div>

      <PreviewTable csvData={csvData} columnMapping={columnMapping} />

      <div className="step-actions">
        <button className="btn btn-primary" onClick={handleMappingConfirm}>
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function DebitCreditMapping({
  columns,
  columnMapping,
  onColumnMappingChange,
}: {
  columns: string[];
  columnMapping: ColumnMapping;
  onColumnMappingChange: (mapping: ColumnMapping) => void;
}) {
  return (
    <>
      <div className="mapping-row">
        <label className="mapping-label">Debit Column *</label>
        <select
          title="select debit column from csv"
          className="form-select"
          value={columnMapping.debitColumn || ""}
          onChange={(e) =>
            onColumnMappingChange({
              ...columnMapping,
              debitColumn: e.target.value || undefined,
            })
          }
        >
          <option value="">Select debit column...</option>
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      <div className="mapping-row">
        <label className="mapping-label">Credit Column *</label>
        <select
          title="select credit column from csv"
          className="form-select"
          value={columnMapping.creditColumn || ""}
          onChange={(e) =>
            onColumnMappingChange({
              ...columnMapping,
              creditColumn: e.target.value || undefined,
            })
          }
        >
          <option value="">Select credit column...</option>
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      <div className="mapping-note">
        <small>
          💡 Bank format detected: Debit = money out (expenses), Credit = money in (income)
        </small>
      </div>
    </>
  );
}

function BasilAmountMapping({
  columns,
  columnMapping,
  onColumnMappingChange,
}: {
  columns: string[];
  columnMapping: ColumnMapping;
  onColumnMappingChange: (mapping: ColumnMapping) => void;
}) {
  return (
    <>
      <div className="mapping-row">
        <label className="mapping-label">Amount Column *</label>
        <select
          title="select amount column from csv"
          className="form-select"
          value={columnMapping.amountColumn}
          onChange={(e) =>
            onColumnMappingChange({
              ...columnMapping,
              amountColumn: e.target.value,
            })
          }
        >
          <option value="">Select amount column...</option>
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      <div className="mapping-note">
        <small>🌿 Basil CSV detected: Your exported data with Type and Category columns</small>
      </div>
    </>
  );
}

function StandardAmountMapping({
  columns,
  columnMapping,
  onColumnMappingChange,
}: {
  columns: string[];
  columnMapping: ColumnMapping;
  onColumnMappingChange: (mapping: ColumnMapping) => void;
}) {
  return (
    <div className="mapping-row">
      <label className="mapping-label">Amount Column *</label>
      <select
        title="select amount column from csv"
        className="form-select"
        value={columnMapping.amountColumn}
        onChange={(e) =>
          onColumnMappingChange({
            ...columnMapping,
            amountColumn: e.target.value,
          })
        }
      >
        <option value="">Select amount column...</option>
        {columns.map((col) => (
          <option key={col} value={col}>
            {col}
          </option>
        ))}
      </select>
    </div>
  );
}

function OptionalColumnMappings({
  columns,
  columnMapping,
  onColumnMappingChange,
}: {
  columns: string[];
  columnMapping: ColumnMapping;
  onColumnMappingChange: (mapping: ColumnMapping) => void;
}) {
  return (
    <>
      <div className="mapping-row">
        <label className="mapping-label">Category Column (Optional)</label>
        <select
          title="select category column from csv"
          className="form-select"
          value={columnMapping.categoryColumn || ""}
          onChange={(e) =>
            onColumnMappingChange({
              ...columnMapping,
              categoryColumn: e.target.value || undefined,
            })
          }
        >
          <option value="">No category column</option>
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      {(columnMapping.isBasilCSV || columnMapping.typeColumn) && (
        <div className="mapping-row">
          <label className="mapping-label">Type Column (Optional)</label>
          <select
            title="select type column from csv"
            className="form-select"
            value={columnMapping.typeColumn || ""}
            onChange={(e) =>
              onColumnMappingChange({
                ...columnMapping,
                typeColumn: e.target.value || undefined,
              })
            }
          >
            <option value="">No type column</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          {columnMapping.isBasilCSV && (
            <small className="mapping-hint">Maps to Income/Expense from your Basil export</small>
          )}
        </div>
      )}

      {columnMapping.isBasilCSV && (
        <div className="mapping-row">
          <label className="mapping-label">Created At Column (Optional)</label>
          <select
            title="select created at column from csv"
            className="form-select"
            value={columnMapping.createdAtColumn || ""}
            onChange={(e) =>
              onColumnMappingChange({
                ...columnMapping,
                createdAtColumn: e.target.value || undefined,
              })
            }
          >
            <option value="">No created at column</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <small className="mapping-hint">Preserves original transaction creation timestamps</small>
        </div>
      )}
    </>
  );
}

function PreviewTable({
  csvData,
  columnMapping,
}: {
  csvData: ImportedRow[];
  columnMapping: ColumnMapping;
}) {
  const previewRows = csvData.slice(0, 3);

  return (
    <div className="preview-section">
      <h4>Preview (first 3 rows):</h4>
      <div className="preview-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              {columnMapping.debitColumn || columnMapping.creditColumn ? (
                <>
                  <th>Debit</th>
                  <th>Credit</th>
                </>
              ) : (
                <th>Amount</th>
              )}
              {columnMapping.categoryColumn && <th>Category</th>}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i}>
                <td>{String(row[columnMapping.dateColumn] || "")}</td>
                <td>{String(row[columnMapping.descriptionColumn] || "")}</td>
                {columnMapping.debitColumn || columnMapping.creditColumn ? (
                  <>
                    <td>{String(row[columnMapping.debitColumn!] || "")}</td>
                    <td>{String(row[columnMapping.creditColumn!] || "")}</td>
                  </>
                ) : (
                  <td>{String(row[columnMapping.amountColumn] || "")}</td>
                )}
                {columnMapping.categoryColumn && (
                  <td>{String(row[columnMapping.categoryColumn] || "")}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}