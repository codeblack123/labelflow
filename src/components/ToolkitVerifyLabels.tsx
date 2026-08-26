import React, { useState } from 'react';
import axios from 'axios';
import { FiAlertTriangle } from 'react-icons/fi';
import { API_CONFIG, ICONS } from '../constants';
import FileDropzone from './FileDropzone';

interface ToolkitVerifyLabelsProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface VerificationResult {
  stats: {
    original_total: number;
    custom_total: number;
    match_count: number;
    missing_count: number;
    mismatch_count: number;
  };
  matches: string[];
  missing_in_custom: string[];
  mismatches: Array<{
    awb: string;
    reason: string;
  }>;
}

const ToolkitVerifyLabels: React.FC<ToolkitVerifyLabelsProps> = ({ showToast }) => {
  const [originalPdfFiles, setOriginalPdfFiles] = useState<FileList | null>(null);
  const [customPdfFiles, setCustomPdfFiles] = useState<FileList | null>(null);
  const [excelFiles, setExcelFiles] = useState<FileList | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    if (!originalPdfFiles || originalPdfFiles.length === 0) {
      showToast('Mohon upload PDF Asli terlebih dahulu', 'error');
      return;
    }
    if (!customPdfFiles || customPdfFiles.length === 0) {
      showToast('Mohon upload PDF Custom terlebih dahulu', 'error');
      return;
    }
    if (!excelFiles || excelFiles.length === 0) {
      showToast('Mohon upload file Excel (Data Mentah) terlebih dahulu', 'error');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    const formData = new FormData();
    formData.append('original_pdf', originalPdfFiles[0]);
    formData.append('custom_pdf', customPdfFiles[0]);
    formData.append('excel_file', excelFiles[0]);

    try {
      const response = await axios.post(`${API_CONFIG.BASE_URL}/toolkit/verify-labels`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      showToast('Verifikasi selesai!', 'success');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Terjadi kesalahan saat memverifikasi label';
      showToast(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-800">Verify Labels (Double Check)</h2>
          <p className="text-sm text-slate-500">Cocokkan data antara PDF Asli dari marketplace, File Excel, dan PDF Custom hasil editan.</p>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
          <FileDropzone
            label="1. Upload PDF Asli"
            accept=".pdf"
            onFilesSelected={setOriginalPdfFiles}
            selectedFileCount={originalPdfFiles?.length || 0}
            icon={<svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          />
          <FileDropzone
            label="2. Upload File Excel"
            accept=".xlsx,.xls"
            onFilesSelected={setExcelFiles}
            selectedFileCount={excelFiles?.length || 0}
            icon={<svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <FileDropzone
            label="3. Upload PDF Custom"
            accept=".pdf"
            onFilesSelected={setCustomPdfFiles}
            selectedFileCount={customPdfFiles?.length || 0}
            icon={<svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        <button
          onClick={handleVerify}
          disabled={isProcessing}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sedang Memverifikasi...
            </>
          ) : (
            'Cocokkan & Verifikasi Sekarang'
          )}
        </button>

        {result && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Hasil Verifikasi</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Total Resi (PDF Asli)</p>
                <p className="text-2xl font-bold text-slate-800">{result.stats.original_total}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Total Resi (PDF Custom)</p>
                <p className="text-2xl font-bold text-slate-800">{result.stats.custom_total}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                <p className="text-sm text-teal-600 mb-1">Cocok (Match)</p>
                <p className="text-2xl font-bold text-teal-700">{result.stats.match_count}</p>
              </div>
              <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                <p className="text-sm text-rose-600 mb-1">Bermasalah</p>
                <p className="text-2xl font-bold text-rose-700">{result.stats.missing_count + result.stats.mismatch_count}</p>
              </div>
            </div>

            {/* Warning Cards for Errors */}
            {(result.stats.missing_count > 0 || result.stats.mismatch_count > 0) && (
              <div className="space-y-4 mb-6">
                {result.missing_in_custom.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-rose-500 mt-0.5"><FiAlertTriangle className="w-5 h-5" /></div>
                      <div>
                        <h4 className="font-bold text-rose-800">Resi Hilang (Tidak Ada di Custom Label)</h4>
                        <p className="text-sm text-rose-600 mb-2">Terdapat {result.missing_in_custom.length} resi yang ada di PDF Asli tapi hilang di PDF Custom.</p>
                        <ul className="list-disc pl-5 text-sm text-rose-700 space-y-1">
                          {result.missing_in_custom.map(awb => (
                            <li key={awb}>{awb}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {result.mismatches.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-orange-500 mt-0.5"><FiAlertTriangle className="w-5 h-5" /></div>
                      <div>
                        <h4 className="font-bold text-orange-800">Data Tidak Sesuai (SKU / QTY / Duplikat)</h4>
                        <p className="text-sm text-orange-600 mb-2">Terdapat {result.mismatches.length} resi yang isinya tidak sesuai dengan referensi Excel.</p>
                        <div className="space-y-2">
                          {result.mismatches.map((m, idx) => (
                            <div key={idx} className="bg-white rounded border border-orange-100 p-2 text-sm text-orange-800">
                              <span className="font-bold block mb-1">{m.awb}</span>
                              <span className="opacity-90">{m.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success State */}
            {result.stats.missing_count === 0 && result.stats.mismatch_count === 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-3">
                  {ICONS.CHECK}
                </div>
                <h4 className="text-lg font-bold text-teal-800 mb-1">Semua Label Sesuai!</h4>
                <p className="text-teal-600 text-sm">Tidak ada resi yang hilang dan semua SKU/QTY cocok dengan data Excel.</p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default ToolkitVerifyLabels;
