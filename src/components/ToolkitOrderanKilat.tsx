import React, { useState } from 'react';
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiFileText } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';

interface ToolkitOrderanKilatProps {
    showToast?: (message: string) => void;
}

const ToolkitOrderanKilat: React.FC<ToolkitOrderanKilatProps> = ({ showToast }) => {
    const [file, setFile] = useState<File | null>(null);
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

        try {
            console.log('[Toolkit] Mengirim ke orderan-kilat...');

            const response = await axios.post(`${API_CONFIG.BASE_URL}/toolkit/orderan-kilat`, formData, {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            setDownloadUrl(url);
            if (showToast) showToast('Data Orderan Kilat berhasil diproses!');

        } catch (err: any) {
            console.error('API Error:', err);
            if (err.response && err.response.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    setError(json.detail || 'Terjadi kesalahan saat memproses file.');
                } catch {
                    setError('Terjadi kesalahan server saat memproses file.');
                }
            } else {
                setError(err.response?.data?.detail || err.message || 'Terjadi kesalahan');
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Orderan Kilat (Filter SKU VIP)</h3>
                    <p className="text-sm text-gray-500 mt-1">Upload Excel Ginee, lalu sistem akan memfilter dan menyisakan data resi yang mengandung MSKU dari daftar SKU VIP (&gt;10K).</p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Upload Zone */}
                <div 
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-indigo-400 bg-indigo-50/30' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
                >
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                        id="excel-upload-kilat"
                    />
                    <label 
                        htmlFor="excel-upload-kilat"
                        className="cursor-pointer flex flex-col items-center justify-center"
                    >
                        {file ? (
                            <>
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                    <FiFileText className="w-8 h-8 text-indigo-600" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900">{file.name}</h4>
                                <p className="text-sm text-gray-500 mt-1">Klik untuk mengganti file</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <FiUpload className="w-8 h-8 text-gray-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900">Upload File Excel Ginee</h4>
                                <p className="text-sm text-gray-500 mt-1">Pilih file berformat .xlsx atau .xls</p>
                            </>
                        )}
                    </label>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                        <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <span className="font-bold block mb-1">Gagal Memproses File</span>
                            {error}
                        </div>
                    </div>
                )}

                {downloadUrl && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FiCheckCircle className="w-5 h-5" />
                            <div>
                                <h4 className="font-bold text-sm">Berhasil Difilter!</h4>
                                <p className="text-xs text-green-600 mt-0.5">File Excel Orderan Kilat sudah siap diunduh.</p>
                            </div>
                        </div>
                        <a 
                            href={downloadUrl}
                            download="Hasil_Orderan_Kilat.xlsx"
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                            <FiDownload className="w-4 h-4" />
                            Download Excel
                        </a>
                    </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                    <button
                        onClick={handleProcess}
                        disabled={!file || processing}
                        className={`w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            !file 
                                ? 'bg-gray-300 cursor-not-allowed' 
                                : processing
                                    ? 'bg-indigo-400 cursor-wait'
                                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200'
                        }`}
                    >
                        {processing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sedang Memproses...
                            </>
                        ) : (
                            <>
                                Mulai Filter Data
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ToolkitOrderanKilat;
