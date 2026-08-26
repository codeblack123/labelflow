import React, { useState } from 'react';
import { FiUpload, FiScissors, FiDownload, FiCheckCircle, FiAlertCircle, FiFileText, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';

interface ToolkitLabelSplitterProps {
    showToast?: (message: string) => void;
}

const ToolkitLabelSplitter: React.FC<ToolkitLabelSplitterProps> = ({ showToast }) => {
    const [file, setFile] = useState<File | null>(null);
    const [batchLimit, setBatchLimit] = useState<number>(50);
    const [processing, setProcessing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            // Validate excel extension
            if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
                setError('Mohon upload file Excel (.xlsx atau .xls)');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setDownloadUrl(null);
            setError(null);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setProcessing(true);
        setError(null);
        setDownloadUrl(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('batch_limit', batchLimit.toString());

        try {
            const response = await axios.post(`${API_CONFIG.BASE_URL}/toolkit/split-excel`, formData, {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            setDownloadUrl(url);

            showToast?.('Berhasil membagi file Excel!');
        } catch (err: any) {
            console.error('Error splitting excel:', err);
            const msg = err.response?.data?.detail || 'Gagal memproses file. Pastikan format Excel valid (ada kolom ID Pesanan, MSKU, Jumlah).';
            setError(msg);
            showToast?.('Gagal memproses file');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <FiScissors className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Bagi Rata Excel Pesanan</h2>
                            <p className="text-gray-500 text-sm">Pecah Excel per Batch (Limit 50) dengan menjaga integritas ID Pesanan.</p>
                        </div>
                    </div>
                    {file && (
                        <button
                            onClick={() => {
                                setFile(null);
                                setDownloadUrl(null);
                                setError(null);
                                setBatchLimit(50);
                                // Reset HTML Input value to allow re-uploading same file
                                const input = document.getElementById('excel-upload') as HTMLInputElement;
                                if (input) input.value = '';
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors shadow-sm"
                        >
                            <FiRefreshCw className="w-3 h-3" /> Reset
                        </button>
                    )}
                </div>

                <div className="space-y-6">
                    {/* File Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors text-center">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="excel-upload"
                        />
                        <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center gap-3">
                            {file ? <FiFileText className="w-10 h-10 text-emerald-500" /> : <FiUpload className="w-8 h-8 text-gray-400" />}
                            <div>
                                <span className="font-semibold text-indigo-600 hover:text-indigo-700">Upload File Excel</span>
                                <p className="text-xs text-gray-500 mt-1">Format: .xlsx atau .xls</p>
                                <p className="text-[10px] text-gray-400 mt-1">Wajib ada kolom: ID Pesanan, MSKU, Jumlah</p>
                            </div>
                        </label>
                        {file && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 py-2 px-4 rounded-full inline-flex">
                                <FiCheckCircle /> {file.name}
                            </div>
                        )}
                    </div>



                    {/* Settings */}
                    {file && (
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                            <h3 className="font-semibold text-gray-900">Pengaturan Batch</h3>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-600">Maksimal Resi/Pesanan per Sheet</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="10"
                                        max="500"
                                        value={batchLimit}
                                        onChange={(e) => setBatchLimit(parseInt(e.target.value))}
                                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg text-center font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <span className="text-sm text-gray-500">Resi/Order</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Total ID Pesanan unik per sheet akan mendekati angka ini.
                                    ID Pesanan yang sama <strong>TIDAK AKAN</strong> dipisah.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="flex justify-end">
                        {!downloadUrl ? (
                            <button
                                onClick={handleProcess}
                                disabled={!file || processing}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all w-full md:w-auto justify-center"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Memproses Excel...
                                    </>
                                ) : (
                                    <>
                                        <FiScissors className="w-5 h-5" />
                                        Proses Split Batch
                                    </>
                                )}
                            </button>
                        ) : (
                            <a
                                href={downloadUrl}
                                download={`splitted_batches_${new Date().getTime()}.xlsx`}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium shadow-sm hover:bg-emerald-600 flex items-center gap-2 transition-all w-full md:w-auto justify-center animate-bounce-short"
                            >
                                <FiDownload className="w-5 h-5" />
                                Download Hasil Split
                            </a>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 text-sm">
                            <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToolkitLabelSplitter;
