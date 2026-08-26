import React, { useState, useRef } from 'react';
import { FiFile, FiUpload, FiX, FiCheckCircle, FiTrash2, FiDownload, FiAlertCircle, FiList } from 'react-icons/fi';
import JSZip from 'jszip';
import axios from 'axios';
import { API_CONFIG } from '../constants';

interface MatchStatus {
    matched: number;
    unmatched: number;
    unmatchedOrders: string[];
    unmatchedFiles: string[];
}

const ToolkitPdfSelector: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [orderNumbers, setOrderNumbers] = useState<string>('');
    const [sortedFiles, setSortedFiles] = useState<File[]>([]);
    const [isSorted, setIsSorted] = useState(false);
    const [isSorting, setIsSorting] = useState(false);
    const [matchStatus, setMatchStatus] = useState<MatchStatus>({
        matched: 0,
        unmatched: 0,
        unmatchedOrders: [],
        unmatchedFiles: []
    });
    const [isExporting, setIsExporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');

            if (pdfFiles.length !== files.length) {
                alert('Hanya file PDF yang diperbolehkan!');
            }

            // Add new files to existing selection
            setSelectedFiles(prev => [...prev, ...pdfFiles]);
            // Reset sorted state when new files are added
            setIsSorted(false);
            setSortedFiles([]);
        }

        // Reset input to allow selecting the same file again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setIsSorted(false);
        setSortedFiles([]);
    };

    const handleClearAll = () => {
        setSelectedFiles([]);
        setOrderNumbers('');
        setSortedFiles([]);
        setIsSorted(false);
        setMatchStatus({ matched: 0, unmatched: 0, unmatchedOrders: [], unmatchedFiles: [] });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleBrowseFiles = () => {
        fileInputRef.current?.click();
    };

    const handleSortFiles = async () => {
        if (!orderNumbers.trim()) {
            alert('Silakan paste nomor pesanan terlebih dahulu!');
            return;
        }

        if (selectedFiles.length === 0) {
            alert('Silakan pilih file PDF terlebih dahulu!');
            return;
        }

        try {
            setIsSorted(false); // Reset state
            setSortedFiles([]);
            setIsSorting(true); // Start loading

            // Parse order numbers - split by newline and filter empty lines
            const orders = orderNumbers
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (orders.length === 0) {
                alert('Format nomor pesanan tidak valid!');
                return;
            }

            // Call backend API to extract order IDs from PDF content
            const formData = new FormData();
            selectedFiles.forEach(file => formData.append('pdf_files', file));

            const extractResponse = await axios.post(
                `${API_CONFIG.BASE_URL}/extract-pdf-order-ids`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 120000
                }
            );

            const pdfOrderIds: string[] = extractResponse.data?.ids || [];

            if (pdfOrderIds.length === 0) {
                alert('Tidak ada nomor pesanan yang ditemukan di PDF!');
                return;
            }

            // Create map: File -> Array of Order IDs found in that file
            const fileToOrderIds = new Map<File, string[]>();

            // We need to extract IDs per file individually
            // Call API for each file to get its specific IDs
            for (const file of selectedFiles) {
                const singleFileFormData = new FormData();
                singleFileFormData.append('pdf_files', file);

                try {
                    const response = await axios.post(
                        `${API_CONFIG.BASE_URL}/extract-pdf-order-ids`,
                        singleFileFormData,
                        {
                            headers: { 'Content-Type': 'multipart/form-data' },
                            timeout: 60000
                        }
                    );

                    const ids: string[] = response.data?.ids || [];
                    fileToOrderIds.set(file, ids);
                } catch (err) {
                    console.error(`Error extracting from ${file.name}:`, err);
                    fileToOrderIds.set(file, []);
                }
            }

            // Sort files based on order numbers list
            const sorted: File[] = [];
            const unmatchedOrdersList: string[] = [];
            const unmatchedFilesList: string[] = [];

            // For each order number, find matching file
            orders.forEach(orderNum => {
                let matched = false;

                for (const [file, ids] of fileToOrderIds.entries()) {
                    // Check if this file contains this order number
                    if (ids.includes(orderNum)) {
                        // Only add if not already added
                        if (!sorted.includes(file)) {
                            sorted.push(file);
                            matched = true;
                            break;
                        }
                    }
                }

                if (!matched) {
                    unmatchedOrdersList.push(orderNum);
                }
            });

            // Files that were not matched
            for (const [file, ids] of fileToOrderIds.entries()) {
                if (!sorted.includes(file)) {
                    unmatchedFilesList.push(file.name);
                }
            }

            // Set match status
            setMatchStatus({
                matched: sorted.length,
                unmatched: unmatchedOrdersList.length + unmatchedFilesList.length,
                unmatchedOrders: unmatchedOrdersList,
                unmatchedFiles: unmatchedFilesList
            });

            setSortedFiles(sorted);
            setIsSorted(true);

        } catch (error: any) {
            console.error('Error sorting files:', error);
            if (error.response?.status === 400) {
                alert('Error: ' + (error.response.data?.detail?.message || error.response.data?.detail || 'Invalid PDF files'));
            } else {
                alert('Gagal mengurutkan PDF. Pastikan backend berjalan dan file PDF valid.');
            }
        } finally {
            setIsSorting(false); // Stop loading
        }
    };

    const handleExportZip = async () => {
        if (sortedFiles.length === 0) {
            alert('Tidak ada file untuk di-export!');
            return;
        }

        setIsExporting(true);

        try {
            const zip = new JSZip();

            // Add files to zip with numbered prefix
            for (let i = 0; i < sortedFiles.length; i++) {
                const file = sortedFiles[i];
                const prefix = String(i + 1).padStart(3, '0'); // 001, 002, 003, etc
                const newName = `${prefix}_${file.name}`;

                // Read file as ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                zip.file(newName, arrayBuffer);
            }

            // Generate zip file
            const blob = await zip.generateAsync({ type: 'blob' });

            // Download zip
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `PDF_Sorted_${new Date().getTime()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert(`✅ Export berhasil! ${sortedFiles.length} file PDF telah didownload.`);
        } catch (error) {
            console.error('Error creating zip:', error);
            alert('❌ Terjadi kesalahan saat membuat ZIP file.');
        } finally {
            setIsExporting(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const displayFiles = isSorted ? sortedFiles : selectedFiles;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiFile className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">PDF Batch Selector</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Pilih & urutkan PDF berdasarkan nomor pesanan</p>
                    </div>
                </div>
                {selectedFiles.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-semibold bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center gap-2"
                    >
                        <FiTrash2 className="w-4 h-4" />
                        Clear All
                    </button>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cara Penggunaan:
                </h3>
                <ol className="text-sm text-blue-800 space-y-1 ml-6 list-decimal">
                    <li>Pilih beberapa file PDF (nama file harus mengandung nomor pesanan)</li>
                    <li>Paste list nomor pesanan sesuai urutan yang diinginkan</li>
                    <li>Klik "Urutkan PDF" untuk mengurutkan file</li>
                    <li>Review hasil urutan, lalu klik "Download ZIP" untuk export</li>
                </ol>
            </div>

            {/* Upload Area */}
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors">
                <div
                    className="p-8 text-center cursor-pointer"
                    onClick={handleBrowseFiles}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                            <FiUpload className="w-8 h-8 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900">Pilih File PDF</p>
                            <p className="text-sm text-gray-500 mt-1">Klik di sini untuk memilih file atau drag & drop</p>
                            <p className="text-xs text-gray-400 mt-2">Hanya file PDF yang diperbolehkan</p>
                        </div>
                        <button
                            type="button"
                            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <FiFile className="w-4 h-4" />
                            Browse Files
                        </button>
                    </div>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* File List */}
            {selectedFiles.length > 0 && (
                <>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className={`px-4 py-3 border-b ${isSorted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`font-semibold text-sm ${isSorted ? 'text-green-900' : 'text-gray-900'}`}>
                                        {isSorted ? '✓ File Terurut' : 'File Terpilih'}
                                    </h3>
                                    <p className={`text-xs mt-0.5 ${isSorted ? 'text-green-700' : 'text-gray-500'}`}>
                                        {displayFiles.length} file • Total: {formatFileSize(displayFiles.reduce((sum, f) => sum + f.size, 0))}
                                    </p>
                                </div>
                                {isSorted && (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <FiCheckCircle className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {displayFiles.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {isSorted && (
                                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-green-700">{index + 1}</span>
                                            </div>
                                        )}
                                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FiFile className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    {!isSorted && (
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                            title="Hapus file"
                                        >
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Numbers Input */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                            <h3 className="font-semibold text-purple-900 text-sm flex items-center gap-2">
                                <FiList className="w-4 h-4" />
                                List Nomor Pesanan (Urutan yang Diinginkan)
                            </h3>
                        </div>
                        <div className="p-4">
                            <textarea
                                value={orderNumbers}
                                onChange={(e) => setOrderNumbers(e.target.value)}
                                placeholder="Paste nomor pesanan di sini, satu nomor per baris:&#10;582450615865541664&#10;582450574586709843&#10;582450486947776018&#10;..."
                                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                disabled={isSorted}
                            />
                            <div className="mt-3 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    {orderNumbers.split('\n').filter(l => l.trim()).length} nomor pesanan
                                </p>
                                {!isSorted && (
                                    <button
                                        onClick={handleSortFiles}
                                        disabled={isSorting}
                                        className={`px-5 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2 ${isSorting
                                                ? 'bg-purple-400 text-white cursor-wait'
                                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                                            }`}
                                    >
                                        {isSorting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <FiList className="w-4 h-4" />
                                                Urutkan PDF
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Match Status */}
                    {isSorted && (
                        <div className="space-y-4">
                            <div className={`rounded-lg border p-4 ${matchStatus.unmatched === 0
                                ? 'bg-green-50 border-green-200'
                                : 'bg-yellow-50 border-yellow-200'
                                }`}>
                                <div className="flex items-start gap-3">
                                    {matchStatus.unmatched === 0 ? (
                                        <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <h3 className={`font-semibold text-sm ${matchStatus.unmatched === 0 ? 'text-green-900' : 'text-yellow-900'
                                            }`}>
                                            Status Matching
                                        </h3>
                                        <p className={`text-sm mt-1 ${matchStatus.unmatched === 0 ? 'text-green-800' : 'text-yellow-800'
                                            }`}>
                                            ✓ {matchStatus.matched} file berhasil diurutkan
                                            {matchStatus.unmatched > 0 && (
                                                <> • ⚠ {matchStatus.unmatched} item tidak match</>
                                            )}
                                        </p>

                                        {matchStatus.unmatchedOrders.length > 0 && (
                                            <div className="mt-3 text-xs">
                                                <p className="font-semibold text-yellow-900">Nomor pesanan tidak ditemukan di PDF:</p>
                                                <div className="mt-1 bg-white/50 rounded p-2 max-h-32 overflow-y-auto">
                                                    {matchStatus.unmatchedOrders.map((order, idx) => (
                                                        <div key={idx} className="text-yellow-800 font-mono">{order}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {matchStatus.unmatchedFiles.length > 0 && (
                                            <div className="mt-3 text-xs">
                                                <p className="font-semibold text-yellow-900">File PDF yang tidak ada di list nomor pesanan:</p>
                                                <div className="mt-1 bg-white/50 rounded p-2 max-h-32 overflow-y-auto">
                                                    {matchStatus.unmatchedFiles.map((file, idx) => (
                                                        <div key={idx} className="text-yellow-800">{file}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Export Button */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleExportZip}
                                    disabled={isExporting || sortedFiles.length === 0}
                                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                >
                                    {isExporting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Membuat ZIP...
                                        </>
                                    ) : (
                                        <>
                                            <FiDownload className="w-5 h-5" />
                                            Download ZIP ({sortedFiles.length} file)
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsSorted(false);
                                        setSortedFiles([]);
                                        setMatchStatus({ matched: 0, unmatched: 0, unmatchedOrders: [], unmatchedFiles: [] });
                                    }}
                                    className="px-6 py-3.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold transition-colors"
                                >
                                    Urutkan Ulang
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Empty State */}
            {selectedFiles.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiFile className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">Belum ada file yang dipilih</p>
                    <p className="text-gray-400 text-xs mt-1">Pilih file PDF untuk memulai</p>
                </div>
            )}
        </div>
    );
};

export default ToolkitPdfSelector;
