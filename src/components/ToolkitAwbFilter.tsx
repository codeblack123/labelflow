import React, { useState } from 'react';
import axios from 'axios';
import { FiUpload, FiClipboard, FiTrash2, FiDownload, FiArrowRight, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { API_CONFIG } from '../constants';

import { supabase } from '../supabaseClient';
import { supabaseCancelledOrders } from '../supabaseCancelledOrdersClient';

interface ToolkitAwbFilterProps {
    showToast?: (message: string) => void;
}

const ToolkitAwbFilter: React.FC<ToolkitAwbFilterProps> = ({ showToast }) => {
    // Left Column: Source Data (NOW RIGHT)
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [sourceAwbs, setSourceAwbs] = useState<string[]>([]);
    const [sourceAwbsOriginal, setSourceAwbsOriginal] = useState<string[]>([]); // Backup
    const [loadingSource, setLoadingSource] = useState(false);

    // Right Column: Reference Data (NOW LEFT)
    const [pasteText, setPasteText] = useState('');
    const [excludeAwbs, setExcludeAwbs] = useState<string[]>([]);

    // Process State
    const [filteredCount, setFilteredCount] = useState<number | null>(null);

    // Auto-load cancelled orders on mount
    React.useEffect(() => {
        const fetchCancelledOrders = async () => {
            try {
                // Filter for TODAY (Local Time)
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

                const startIso = startOfDay.toISOString();
                const endIso = endOfDay.toISOString();

                console.log('[TOOLKIT] Fetching cancelled_orders via cancelled_at:', startIso, '-', endIso);

                const { data, error } = await supabaseCancelledOrders
                    .from('cancelled_orders')
                    .select('barcode')
                    .gte('cancelled_at', startIso)
                    .lte('cancelled_at', endIso);

                if (error) {
                    console.error('[TOOLKIT] Supabase Error:', error.message);
                    showToast && showToast(`Error Database: ${error.message}`);
                    throw error;
                }

                if (data && data.length > 0) {
                    const barcodes = data.map(item => item.barcode).filter(Boolean);
                    setExcludeAwbs(barcodes);
                    showToast && showToast(`✓ ${barcodes.length} Data Cancel Hari Ini dimuat`);
                    console.log('[TOOLKIT] Loaded', barcodes.length, 'barcodes');
                } else {
                    console.log('[TOOLKIT] No cancelled orders found for today.');
                }
            } catch (err) {
                console.error('[TOOLKIT] Failed to load cancelled orders:', err);
            }
        };

        fetchCancelledOrders();
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSourceFile(file);
            setLoadingSource(true);
            setFilteredCount(null); // Reset result

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await axios.post(`${API_CONFIG.BASE_URL}/toolkit/extract-awb`, formData);
                if (response.data.success) {
                    setSourceAwbs(response.data.awbs);
                    setSourceAwbsOriginal(response.data.awbs);
                    showToast && showToast(`✓ Berhasil import ${response.data.count} AWB`);
                }
            } catch (err: any) {
                console.error("Upload error:", err);
                const msg = err.response?.data?.detail || "Gagal membaca file Excel";
                showToast && showToast(`❌ ${msg}`);
                setSourceFile(null);
            } finally {
                setLoadingSource(false);
            }
        }
    };

    const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setPasteText(text);

        // Parse lines from manual input
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

        // Add manual lines to existing list (from DB) using Set to avoid duplicates
        // We use Set to combine previous (DB) + new (Manual)
        setExcludeAwbs(prev => {
            const combined = new Set([...prev, ...lines]);
            return Array.from(combined);
        });
    };

    const handleClearPaste = () => {
        setPasteText('');
        setExcludeAwbs([]); // This clears everything including DB data
    };

    const handleProcessFilter = () => {
        if (sourceAwbsOriginal.length === 0) {
            showToast && showToast("⚠️ Data Sumber (Excel) kosong");
            return;
        }
        if (excludeAwbs.length === 0) {
            showToast && showToast("⚠️ Data Patokan (Paste) kosong");
            return;
        }

        // Processing
        const excludeSet = new Set(excludeAwbs);

        const newSource = sourceAwbsOriginal.filter(awb => !excludeSet.has(awb));
        const removedCount = sourceAwbsOriginal.length - newSource.length;

        setSourceAwbs(newSource);
        setFilteredCount(removedCount);

        showToast && showToast(`✓ Selesai! ${removedCount} duplikat dihapus.`);
    };

    const handleResetAll = () => {
        if (window.confirm("Apakah Anda yakin ingin mereset semua data? Data yang belum disimpan akan hilang.")) {
            setSourceFile(null);
            setSourceAwbs([]);
            setSourceAwbsOriginal([]);
            setPasteText('');
            setExcludeAwbs([]);
            setFilteredCount(null);
            showToast && showToast("Semua data telah direset.");
        }
    };

    const handleDownloadResult = () => {
        if (sourceAwbs.length === 0) return;

        const text = sourceAwbs.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            showToast && showToast("✓ Hasil disalin ke clipboard");
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start h-[calc(100vh-140px)]">
            {/* LEFT COLUMN: Data Patokan (Fixed Width like Admin Sidebar) */}
            <div className="w-full lg:w-80 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-yellow-50 flex justify-between items-center">
                    <div>
                        <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide">1. Data Patokan (Hapus)</span>
                        <p className="text-[10px] text-yellow-600 mt-0.5">Paste list resi duplikat / cancel di sini</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-600">{excludeAwbs.length}</span>
                        {excludeAwbs.length > 0 && (
                            <button onClick={handleClearPaste} className="text-red-400 hover:text-red-600" title="Clear">
                                <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 p-0 bg-yellow-50/30 overflow-hidden flex flex-col">
                    {/* Auto-loaded Data Table */}
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-yellow-800 uppercase bg-yellow-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 font-medium w-12">No</th>
                                    <th className="px-4 py-2 font-medium">Barcode / AWB</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-yellow-100 bg-white font-mono text-xs">
                                {excludeAwbs.map((awb, i) => (
                                    <tr key={i} className="hover:bg-yellow-50">
                                        <td className="px-4 py-1.5 text-gray-400">{i + 1}</td>
                                        <td className="px-4 py-1.5 text-gray-900 border-l border-yellow-50">{awb}</td>
                                    </tr>
                                ))}
                                {excludeAwbs.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                                            Belum ada data cancel hari ini<br />
                                            <span className="text-[10px] opacity-70">(Mengambil dari tabel cancelled_orders)</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Manual Paste Area (Optional / Fallback) */}
                    <div className="border-t border-yellow-200 p-2 bg-yellow-50">
                        <p className="text-[10px] text-yellow-700 font-bold mb-1">Tambah Manual (Paste di sini):</p>
                        <textarea
                            className="w-full h-20 p-2 text-xs font-mono border border-yellow-300 rounded focus:ring-1 focus:ring-yellow-500 outline-none resize-none bg-white"
                            placeholder="Paste tambahan..."
                            value={pasteText}
                            onChange={handlePasteChange}
                        ></textarea>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Sumber Data (Flexible) */}
            <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                {/* Header Right */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                    <div>
                        <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">2. Sumber Data (Excel)</span>
                        <p className="text-[10px] text-blue-600 mt-0.5">Data Excel yang akan dibersihkan (Duplikat/Cancel)</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleResetAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors shadow-sm"
                        >
                            <FiRefreshCw className="w-3 h-3" /> Reset
                        </button>
                    </div>
                </div>

                {/* Content Right */}
                <div className="flex-1 overflow-hidden flex flex-col p-4">
                    {/* Upload Area (if empty) */}
                    {!sourceFile ? (
                        <div className="flex-1 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group bg-gray-50/50">
                            <input
                                type="file"
                                onChange={handleFileSelect}
                                accept=".xlsx,.xls"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <FiUpload className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">Upload File Excel</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-xs">Sistem akan otomatis mendeteksi kolom<br />"AWB" atau "No. Tracking"</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            {/* File Info Bar */}
                            <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                                        <span className="text-xs font-bold text-green-700">XLS</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{sourceFile.name}</p>
                                        <p className="text-xs text-gray-500">
                                            Original: <span className="font-mono font-bold">{sourceAwbsOriginal.length}</span> baris
                                            {filteredCount !== null && (
                                                <span className="text-red-600 ml-1 font-bold">(-{filteredCount} Duplikat)</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDownloadResult}
                                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors flex items-center gap-1"
                                >
                                    <FiClipboard /> Copy Hasil
                                </button>
                            </div>

                            {/* The Table */}
                            <div className="flex-1 border border-gray-200 rounded-lg overflow-y-auto bg-gray-50">
                                {loadingSource ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                        <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                                        <span className="text-xs">Memproses data...</span>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">No</th>
                                                <th className="px-4 py-2 font-medium">AWB / No. Tracking</th>
                                                <th className="px-4 py-2 font-medium text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white font-mono text-xs">
                                            {sourceAwbs.map((awb, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-4 py-1.5 text-gray-400 w-12">{i + 1}</td>
                                                    <td className="px-4 py-1.5 text-gray-900">{awb}</td>
                                                    <td className="px-4 py-1.5 text-right w-24">
                                                        <span className="text-green-600 flex items-center justify-end gap-1">
                                                            <FiCheck className="w-3 h-3" /> OK
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {sourceAwbs.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">
                                                        Data kosong
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Action Button Area */}
                            <div className="pt-2 border-t border-gray-100">
                                <button
                                    onClick={handleProcessFilter}
                                    disabled={sourceAwbsOriginal.length === 0 || excludeAwbs.length === 0}
                                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${sourceAwbsOriginal.length === 0 || excludeAwbs.length === 0
                                        ? 'bg-gray-300 shadow-none cursor-not-allowed text-gray-500'
                                        : 'bg-red-600 hover:bg-red-700 hover:scale-[1.01] shadow-red-200 mb-2'
                                        }`}
                                >
                                    {filteredCount === null ? (
                                        <>
                                            <FiTrash2 className="w-4 h-4" /> Hapus {excludeAwbs.length} Duplikat
                                        </>
                                    ) : (
                                        <>
                                            <FiCheck className="w-4 h-4" /> Sukses! {filteredCount} Duplikat Dihapus
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-center text-gray-400">
                                    Tombol ini akan menghapus semua AWB di tabel Excel yang juga muncul di daftar Paste sebelah kiri.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToolkitAwbFilter;
