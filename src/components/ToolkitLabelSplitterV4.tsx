import React, { useState } from 'react';
import { FiUpload, FiScissors, FiDownload, FiCheckCircle, FiAlertCircle, FiFileText, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';

interface ToolkitLabelSplitterV4Props {
    showToast?: (message: string) => void;
}

interface PreviewItem {
    id_pesanan: string;
    items: { msku: string; qty: number }[];
    is_pretelan: boolean;
    msku_count: number;
    total_items: number;
}

const ToolkitLabelSplitterV4: React.FC<ToolkitLabelSplitterV4Props> = ({ showToast }) => {
    const [file, setFile] = useState<File | null>(null);
    const [batchLimit, setBatchLimit] = useState<number>(50);
    const [processing, setProcessing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<PreviewItem[] | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [bulkyMultiplier, setBulkyMultiplier] = useState<number>(10);

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
            setPreviewData(null);
        }
    };

    const handlePreview = async () => {
        if (!file) return;
        setLoadingPreview(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_CONFIG.BASE_URL}/toolkit/preview-split-excel`, formData);
            setPreviewData(response.data.data);
            showToast?.('Preview berhasil dimuat!');
        } catch (err: any) {
            console.error('Error previewing:', err);
            const msg = err.response?.data?.detail || 'Gagal memuat preview.';
            setError(msg);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleProcess = async (prioritize = false) => {
        if (!file) return;
        setProcessing(true);
        setError(null);
        setDownloadUrl(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('batch_limit', batchLimit.toString());
        formData.append('dynamic_batching', 'true'); // Enable V2 Dynamic Logic
        formData.append('prioritize_satuan', prioritize ? 'true' : 'false');
        formData.append('bulky_multiplier', bulkyMultiplier.toString());

        try {
            const response = await axios.post(`${API_CONFIG.BASE_URL}/toolkit/split-excel`, formData, {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            setDownloadUrl(url);

            showToast?.(prioritize ? 'Berhasil membagi file (Prioritas Satuan)!' : 'Berhasil membagi file Excel!');
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
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <FiScissors className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                Bagi Rata Label V.4 <span className="text-red-600 font-bold ml-1 text-xl">(SATUAN)</span>
                            </h2>
                            <p className="text-gray-500 text-sm">Pecah Excel per Batch. V.4: Base dari V.2 dengan prioritasi satuan.</p>
                        </div>
                    </div>
                    {file && (
                        <button
                            onClick={() => {
                                setFile(null);
                                setDownloadUrl(null);
                                setError(null);
                                setPreviewData(null);
                                setBatchLimit(50);
                                // Reset HTML Input value to allow re-uploading same file
                                const input = document.getElementById('excel-upload-v4') as HTMLInputElement;
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
                            id="excel-upload-v4"
                        />
                        <label htmlFor="excel-upload-v4" className="cursor-pointer flex flex-col items-center gap-3">
                            {file ? <FiFileText className="w-10 h-10 text-emerald-500" /> : <FiUpload className="w-8 h-8 text-gray-400" />}
                            <div>
                                <span className="font-semibold text-indigo-600 hover:text-indigo-700">Upload File Excel</span>
                                <p className="text-xs text-gray-500 mt-1">Format: .xlsx atau .xls</p>
                                <p className="text-[10px] text-gray-400 mt-1">Wajib ada kolom: ID Pesanan, MSKU, Jumlah. (Opsional: AWB/No. Tracking)</p>
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

                            <div className="flex flex-col gap-2 pb-4 border-b border-gray-100">
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

                            <div className="flex flex-col gap-2 pt-2">
                                <label className="text-sm font-semibold text-blue-700">🏋️ Kapasitas Bulky Satuan (Maks QTY/Batch)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={bulkyMultiplier}
                                        onChange={(e) => setBulkyMultiplier(parseInt(e.target.value))}
                                        className="w-24 px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg text-center font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <span className="text-sm text-gray-500">pcs per batch</span>
                                </div>
                                <div className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1">
                                    <p>✅ <strong>Khusus SKU Besar (Bulky) — Satuan saja.</strong></p>
                                    <p>Sistem akan memotong batch ketika total QTY barang besar mencapai <strong>{bulkyMultiplier} pcs</strong>.</p>
                                    <p className="text-gray-500">Contoh: JIka ada SHD-04 (6pcs) + RAK-WCST (4pcs) → 1 batch (total 10 pcs). Jika ada SHD-01 (10pcs) → 1 batch sendiri.</p>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 flex-wrap">
                        {!downloadUrl && (
                            <button
                                onClick={handlePreview}
                                disabled={!file || processing || loadingPreview}
                                className="px-4 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-medium shadow-sm hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all min-w-[140px] justify-center"
                            >
                                {loadingPreview ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <FiFileText className="w-5 h-5" />
                                        Lihat Preview
                                    </>
                                )}
                            </button>
                        )}

                        {!downloadUrl ? (
                            <>
                                {/* Standard Split - HIDDEN by default, visible only in DevMode */}
                                {localStorage.getItem('global_devmode') === 'true' && (
                                    <button
                                        onClick={() => handleProcess(false)}
                                        disabled={!file || processing || loadingPreview}
                                        className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all min-w-[160px] justify-center"
                                    >
                                        {processing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <FiScissors className="w-5 h-5" />
                                                Proses Split (Urutan Asli) [DEV]
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Priority Split */}
                                <button
                                    onClick={() => handleProcess(true)}
                                    disabled={!file || processing || loadingPreview}
                                    className="px-4 py-3 bg-orange-600 text-white rounded-xl font-medium shadow-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all min-w-[160px] justify-center"
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <FiScissors className="w-5 h-5" />
                                            Proses V.4 (Prioritas Satuan)
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <a
                                href={downloadUrl}
                                download={`splitted_batches_V4_${new Date().getTime()}.xlsx`}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium shadow-sm hover:bg-emerald-600 flex items-center gap-2 transition-all w-full md:w-auto justify-center animate-bounce-short"
                            >
                                <FiDownload className="w-5 h-5" />
                                Download Hasil Split
                            </a>
                        )}
                    </div>

                </div>

                {/* Preview Table */}
                {previewData && (
                    <div className="mt-8 border-t pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900">Preview Data ({previewData.length} Pesanan)</h3>
                            <div className="flex gap-2 text-xs">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">Satuan: {previewData.filter(x => !x.is_pretelan).length}</span>
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md font-medium">Pretelan: {previewData.filter(x => x.is_pretelan).length}</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[500px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 border-b">No</th>
                                        <th className="px-4 py-3 border-b">ID Pesanan</th>
                                        <th className="px-4 py-3 border-b">Detail Items (MSKU x Qty)</th>
                                        <th className="px-4 py-3 border-b text-center">Tipe</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-500 w-16">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{item.id_pesanan}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {item.items.map((prod, pIdx) => (
                                                        <div key={pIdx} className="flex justify-between items-center text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                            <span className="font-mono text-gray-700">{prod.msku}</span>
                                                            <span className="font-bold text-gray-900">x{prod.qty}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.is_pretelan ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                        Pretelan
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Satuan
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 text-sm">
                        <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToolkitLabelSplitterV4;
