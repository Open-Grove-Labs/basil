import { Upload, FileText } from "lucide-react";

interface UploadStepProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadStep({ onFileUpload }: UploadStepProps) {
  return (
    <div className="import-step">
      <div className="step-header">
        <FileText size={32} className="step-icon" />
        <h3>Upload CSV File</h3>
        <p>Select a CSV file exported from your bank</p>
      </div>

      <div className="upload-area">
        <label className="upload-dropzone">
          <Upload size={48} />
          <p>
            <strong>Click to select</strong> your bank CSV file
          </p>
          <p className="upload-hint">
            Supports various bank formats with automatic column detection
          </p>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={onFileUpload}
            className="hidden-file-input"
          />
        </label>
      </div>

      <div className="format-hints">
        <h4>Supported Formats:</h4>
        <ul>
          <li>✅ Date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</li>
          <li>✅ Amount formats: $123.45, (123.45), -123.45</li>
          <li>✅ Various column names automatically detected</li>
          <li>✅ Both positive and negative amounts</li>
        </ul>
      </div>
    </div>
  );
}