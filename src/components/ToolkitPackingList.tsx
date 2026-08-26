import React, { useState } from 'react';
import axios from 'axios';
import FileDropzone from './FileDropzone';
import { FiDownload, FiFileText, FiCheckCircle, FiAlertCircle, FiClock, FiLoader } from 'react-icons/fi';
import { API_CONFIG } from '../constants';

interface ToolkitPackingListProps {
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

interface ProcessedFile {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  url?: string;
  filename?: string;
  errorMessage?: string;
}

const ToolkitPackingList: React.FC<ToolkitPackingListProps> = ({ showToast }) => {
  const [pdfFiles, setPdfFiles] = useState<FileList | null>(null);
  const [excelFiles, setExcelFiles] = useState<FileList | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleProcess = async () => {
    if (!pdfFiles || pdfFiles.length === 0) {
      if (showToast) showToast('Mohon upload PDF Resi Asli terlebih dahulu', 'error');
      setErrorMsg('PDF Resi Asli belum diupload');
      return;
    }
    if (!excelFiles || excelFiles.length === 0) {
      if (showToast) showToast('Mohon upload file Excel Packing List terlebih dahulu', 'error');
      setErrorMsg('File Excel belum diupload');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    // Initialize tracking state
    const filesToProcess: ProcessedFile[] = Array.from(pdfFiles).map(file => ({
      file,
      status: 'pending'
    }));
    setProcessedFiles(filesToProcess);

    const excelFile = excelFiles[0];
    let successCount = 0;

    for (let i = 0; i < filesToProcess.length; i++) {
      const currentFile = filesToProcess[i];
      
      // Update status to processing
      setProcessedFiles(prev => 
        prev.map((pf, idx) => idx === i ? { ...pf, status: 'processing' } : pf)
      );

      const formData = new FormData();
      formData.append('pdf_files', currentFile.file);
      formData.append('excel_file', excelFile);

      try {
        const response = await axios.post(`${API_CONFIG.BASE_URL}/toolkit/generate-packing-list`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Extract filename
        let filename = `Packing List - ${currentFile.file.name.replace('.pdf', '')}.xlsx`;
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(contentDisposition);
            if (matches != null && matches[1]) { 
              filename = matches[1].replace(/['"]/g, '');
            }
        }

        const url = window.URL.createObjectURL(blob);
        
        // Mark as success
        setProcessedFiles(prev => 
          prev.map((pf, idx) => idx === i ? { ...pf, status: 'success', url, filename } : pf)
        );
        successCount++;

      } catch (error: any) {
        console.error("Error generating packing list for", currentFile.file.name, error);
        let errorMessage = 'Gagal memproses';
        
        if (error.response && error.response.data instanceof Blob) {
            try {
                const text = await error.response.data.text();
                const json = JSON.parse(text);
                errorMessage = json.detail || errorMessage;
            } catch (e) {
                // Ignore parse error
            }
        } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail;
        }

        // Mark as error
        setProcessedFiles(prev => 
          prev.map((pf, idx) => idx === i ? { ...pf, status: 'error', errorMessage } : pf)
        );
      }

      // Add delay before next file
      if (i < filesToProcess.length - 1) {
        await sleep(500); // 500ms delay between requests
      }
    }

    setIsProcessing(false);
    if (showToast) {
        if (successCount === filesToProcess.length) {
            showToast('Semua Packing List berhasil dibuat!', 'success');
        } else if (successCount > 0) {
            showToast(`Selesai diproses. Berhasil: ${successCount}, Gagal: ${filesToProcess.length - successCount}`, 'success');
        } else {
            showToast('Semua proses gagal. Silakan periksa kembali file Anda.', 'error');
        }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
          <FiFileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-800">Packing List Excel Generator</h2>
          <p className="text-sm text-slate-500">Filter file Excel hanya untuk nomor pesanan yang ada di dalam PDF Resi Asli.</p>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{errorMsg}</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          <FileDropzone
            label="1. Upload PDF Resi Asli (Bisa Banyak)"
            accept=".pdf"
            multiple={true}
            onFilesSelected={setPdfFiles}
            selectedFileCount={pdfFiles?.length || 0}
            icon={<svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          />
          <FileDropzone
            label="2. Upload File Excel Ginee"
            accept=".xlsx,.xls"
            onFilesSelected={setExcelFiles}
            selectedFileCount={excelFiles?.length || 0}
            icon={<svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
        </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all
              ${isProcessing 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg active:scale-95'
              }
            `}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses File...
              </>
            ) : (
              <>
                <FiDownload className="w-5 h-5" />
                Mulai Proses Batch
              </>
            )}
          </button>
        </div>

        {/* PROCESSED FILES LIST */}
        {processedFiles.length > 0 && (
            <div className="mt-8 border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-800">Daftar Hasil Packing List</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {processedFiles.map((pf, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {pf.status === 'pending' && <FiClock className="w-5 h-5 text-slate-400 shrink-0" />}
                                {pf.status === 'processing' && <FiLoader className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
                                {pf.status === 'success' && <FiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                                {pf.status === 'error' && <FiAlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                                
                                <div className="truncate">
                                    <p className="text-sm font-medium text-slate-700 truncate">{pf.file.name}</p>
                                    {pf.status === 'error' && (
                                        <p className="text-xs text-red-500 truncate">{pf.errorMessage}</p>
                                    )}
                                    {pf.status === 'success' && pf.filename && (
                                        <p className="text-xs text-green-600 truncate">Selesai • {pf.filename}</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="ml-4 shrink-0">
                                {pf.status === 'success' && pf.url && (
                                    <a
                                        href={pf.url}
                                        download={pf.filename || `Packing List - ${pf.file.name}.xlsx`}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                                    >
                                        <FiDownload className="w-4 h-4" />
                                        Download
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <FiCheckCircle className="text-green-500" /> Cara Kerja Batch Processing
            </h3>
            <ul className="text-sm text-slate-600 space-y-1 ml-6 list-disc">
                <li>Anda bisa upload banyak PDF sekaligus (misal 10 PDF) dan 1 file Excel Ginee.</li>
                <li>Sistem akan memproses PDF satu per satu secara berurutan agar tidak ada data duplikat/tercampur.</li>
                <li>Setiap PDF akan dicocokkan dengan data Excel Ginee yang sama.</li>
                <li>Hasilnya akan tampil di tabel atas, dan Anda bisa mengunduh file Excel-nya masing-masing.</li>
                <li>Nama file Excel hasil otomatis menggunakan nama PDF aslinya.</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default ToolkitPackingList;
