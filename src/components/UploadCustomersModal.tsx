import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X, Upload, Download, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface UploadCustomersModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface CSVRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  birthday?: string;
}

interface ValidationError {
  row: number;
  errors: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  failedRows: Array<{ row: number; data: CSVRow; error: string }>;
}

type UploadStep = 'upload' | 'preview' | 'validating' | 'importing' | 'results';

export default function UploadCustomersModal({ onClose, onSuccess }: UploadCustomersModalProps) {
  const { business } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [validRows, setValidRows] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const downloadTemplate = () => {
    const template = 'first_name,last_name,email,phone,birthday\nJohn,Doe,john@example.com,+1234567890,1990-01-15';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setError('');

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setError('CSV file is empty or has no data rows');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows: CSVRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: CSVRow = {};

        headers.forEach((header, index) => {
          if (values[index]) {
            row[header as keyof CSVRow] = values[index];
          }
        });

        if (Object.keys(row).length > 0) {
          rows.push(row);
        }
      }

      setCSVData(rows);
      setStep('preview');
    };

    reader.onerror = () => {
      setError('Failed to read CSV file');
    };

    reader.readAsText(file);
  };

  const validateAndCheckLimits = async () => {
    if (!business) return;

    setStep('validating');
    setError('');

    const errors: ValidationError[] = [];
    const valid: CSVRow[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    csvData.forEach((row, index) => {
      const rowErrors: string[] = [];

      if (!row.email && !row.phone) {
        rowErrors.push('Either email or phone is required');
      }

      if (row.email && !emailRegex.test(row.email)) {
        rowErrors.push('Invalid email format');
      }

      if (row.birthday) {
        const date = new Date(row.birthday);
        if (isNaN(date.getTime())) {
          rowErrors.push('Invalid birthday format (use YYYY-MM-DD)');
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors });
      } else {
        valid.push(row);
      }
    });

    const { data: tierData } = await supabase
      .from('subscription_tiers')
      .select('max_customers')
      .eq('id', business.tier_id)
      .single();

    if (tierData && tierData.max_customers !== -1) {
      const potentialTotal = business.usage_customers + valid.length;
      if (potentialTotal > tierData.max_customers) {
        setError(
          `Import would exceed your plan limit. Current: ${business.usage_customers}, Attempting to import: ${valid.length}, Plan limit: ${tierData.max_customers}. Please upgrade your subscription to import more customers.`
        );
        setStep('upload');
        return;
      }
    }

    setValidRows(valid);
    setValidationErrors(errors);

    if (valid.length > 0) {
      await importCustomers(valid);
    } else {
      setError('No valid rows to import');
      setStep('upload');
    }
  };

  const importCustomers = async (rows: CSVRow[]) => {
    if (!business) return;

    setStep('importing');
    const batchSize = 50;
    const results: ImportResult = {
      success: 0,
      failed: 0,
      failedRows: []
    };

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const customersToInsert = [];

      for (const row of batch) {
        const { data: uniqueIdData } = await supabase.rpc('generate_unique_customer_id', {
          business_prefix: 'CUS',
        });

        if (uniqueIdData) {
          customersToInsert.push({
            business_id: business.id,
            unique_customer_id: uniqueIdData,
            first_name: row.first_name || null,
            last_name: row.last_name || null,
            email: row.email || null,
            phone: row.phone || null,
            birthday: row.birthday || null,
            total_points: 0,
            lifetime_points_earned: 0,
            total_visits: 0,
            opted_in_sms: true,
            opted_in_email: true,
          });
        }
      }

      const { data, error: insertError } = await supabase
        .from('customers')
        .insert(customersToInsert)
        .select();

      if (insertError) {
        batch.forEach((row, idx) => {
          results.failed++;
          results.failedRows.push({
            row: i + idx + 2,
            data: row,
            error: insertError.message
          });
        });
      } else if (data) {
        results.success += data.length;

        const headers = {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        };

        data.forEach((customer: any) => {
          if (customer.phone) {
            const syncUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-customer-to-brevo`;
            fetch(syncUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                customerId: customer.id,
                businessId: business.id,
              }),
            }).catch(() => {});
          }
        });
      }

      setImportProgress(Math.round(((i + batch.length) / rows.length) * 100));
    }

    if (results.success > 0) {
      await supabase
        .from('businesses')
        .update({ usage_customers: business.usage_customers + results.success })
        .eq('id', business.id);
    }

    setImportResult(results);
    setStep('results');
  };

  const downloadFailedRows = () => {
    if (!importResult || importResult.failedRows.length === 0) return;

    const headers = 'row_number,first_name,last_name,email,phone,birthday,error\n';
    const rows = importResult.failedRows.map(item =>
      `${item.row},"${item.data.first_name || ''}","${item.data.last_name || ''}","${item.data.email || ''}","${item.data.phone || ''}","${item.data.birthday || ''}","${item.error}"`
    ).join('\n');

    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed_imports.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Upload Customers</h2>
              <p className="text-sm text-gray-400">Import multiple customers from a CSV file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Download CSV Template</p>
                    <p className="text-sm text-gray-400">Get the correct format for your customer data</p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition ${
                  isDragging
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Drag and drop your CSV file here
                </h3>
                <p className="text-gray-400 mb-4">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <p className="text-sm text-gray-500 mt-4">Maximum file size: 5MB</p>
              </div>

              {file && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-sm text-gray-400">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setCSVData([]);
                      }}
                      className="text-gray-400 hover:text-white transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">CSV Preview</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Found {csvData.length} rows. Showing first {Math.min(10, csvData.length)} rows:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black border-b border-zinc-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-400 font-medium">First Name</th>
                        <th className="px-4 py-2 text-left text-gray-400 font-medium">Last Name</th>
                        <th className="px-4 py-2 text-left text-gray-400 font-medium">Email</th>
                        <th className="px-4 py-2 text-left text-gray-400 font-medium">Phone</th>
                        <th className="px-4 py-2 text-left text-gray-400 font-medium">Birthday</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {csvData.slice(0, 10).map((row, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-white">{row.first_name || '-'}</td>
                          <td className="px-4 py-2 text-white">{row.last_name || '-'}</td>
                          <td className="px-4 py-2 text-white">{row.email || '-'}</td>
                          <td className="px-4 py-2 text-white">{row.phone || '-'}</td>
                          <td className="px-4 py-2 text-white">{row.birthday || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={validateAndCheckLimits}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
                >
                  Continue to Import
                </button>
              </div>
            </div>
          )}

          {step === 'validating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white font-medium">Validating customer data...</p>
              <p className="text-gray-400 text-sm">Please wait</p>
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-white font-medium mb-2">Importing customers...</p>
                <p className="text-gray-400 text-sm mb-4">Please do not close this window</p>
                <div className="w-full max-w-md">
                  <div className="bg-zinc-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-center text-white font-medium mt-2">{importProgress}%</p>
                </div>
              </div>
            </div>
          )}

          {step === 'results' && importResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{importResult.success}</p>
                      <p className="text-sm text-gray-400">Successfully Imported</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-8 h-8 text-red-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{importResult.failed}</p>
                      <p className="text-sm text-gray-400">Failed Imports</p>
                    </div>
                  </div>
                </div>
              </div>

              {importResult.failed > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <p className="text-white font-medium">Failed Rows</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-black border-b border-zinc-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-400 font-medium">Row</th>
                          <th className="px-4 py-2 text-left text-gray-400 font-medium">Email</th>
                          <th className="px-4 py-2 text-left text-gray-400 font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-700">
                        {importResult.failedRows.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-white">{item.row}</td>
                            <td className="px-4 py-2 text-white">{item.data.email || item.data.phone || '-'}</td>
                            <td className="px-4 py-2 text-red-400">{item.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={downloadFailedRows}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Download Failed Rows
                  </button>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <p className="text-white font-medium">Validation Errors (Skipped)</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {validationErrors.map((error, index) => (
                      <div key={index} className="text-sm">
                        <span className="text-white font-medium">Row {error.row}:</span>
                        <span className="text-yellow-400 ml-2">{error.errors.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleComplete}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
