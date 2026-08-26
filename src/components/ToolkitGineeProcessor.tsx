import React, { useState } from 'react';
import { FiTable, FiFileText, FiUpload, FiTrash2, FiCopy, FiCheck, FiArrowDown, FiLayers } from 'react-icons/fi';
import * as XLSX from 'xlsx';

const ToolkitGineeProcessor: React.FC = () => {
    const [pretelanFile, setPretelanFile] = useState<File | null>(null);
    const [satuanFile, setSatuanFile] = useState<File | null>(null);

    const [pretelanData, setPretelanData] = useState<string[]>([]);
    const [satuanData, setSatuanData] = useState<string[]>([]);
    const [satuanLimit, setSatuanLimit] = useState<number | 'all'>('all');

    const [compareData, setCompareData] = useState<string[]>([]);

    const [copiedType, setCopiedType] = useState<'pretelan' | 'satuan' | 'compare' | null>(null);
    const [loading, setLoading] = useState<'pretelan' | 'satuan' | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pretelan' | 'satuan') => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === 'pretelan') setPretelanFile(file);
            else setSatuanFile(file);

            // Auto process
            processExcel(file, type);
        }
    };

    const processExcel = async (file: File, type: 'pretelan' | 'satuan') => {
        if (!file) return;
        setLoading(type);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

            if (jsonData.length === 0) {
                alert('File Excel kosong atau tidak terbaca!');
                setLoading(null);
                return;
            }

            // Find ID Pesanan column (case insensitive)
            const firstRow = jsonData[0];
            const keys = Object.keys(firstRow);
            const idPesananKey = keys.find(k => k.toLowerCase().includes('id pesanan'));

            if (!idPesananKey) {
                alert('Kolom "ID Pesanan" tidak ditemukan dalam file Excel!');
                setLoading(null);
                return;
            }

            // Extract unique IDs
            const ids = jsonData
                .map(row => String(row[idPesananKey] || '').trim())
                .filter(id => id && id.length >= 8);

            // Remove duplicates
            const uniqueIds = Array.from(new Set(ids));

            if (type === 'pretelan') setPretelanData(uniqueIds);
            else setSatuanData(uniqueIds);

        } catch (error) {
            console.error('Error processing excel:', error);
            alert('Gagal memproses file Excel. Pastikan format file benar.');
        } finally {
            setLoading(null);
        }
    };

    // Filtered Satuan Data
    const filteredSatuanData = satuanLimit === 'all'
        ? satuanData
        : satuanData.slice(0, Number(satuanLimit));

    const handleCopy = (data: string[], type: 'pretelan' | 'satuan' | 'compare') => {
        if (data.length === 0) return;
        const text = data.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            setCopiedType(type);
            setTimeout(() => setCopiedType(null), 2000);
        });
    };

    const handleClear = (type: 'pretelan' | 'satuan' | 'compare') => {
        if (type === 'pretelan') {
            setPretelanFile(null);
            setPretelanData([]);
        } else if (type === 'satuan') {
            setSatuanFile(null);
            setSatuanData([]);
            setSatuanLimit('all');
        } else {
            setCompareData([]);
        }
    };

    const handleCompare = () => {
        if (satuanLimit === 'all') {
            alert('⚠️ Anda harus memilih filter jumlah data Satuan terlebih dahulu sebelum proses Compare!');
            return;
        }

        if (pretelanData.length === 0 && filteredSatuanData.length === 0) {
            alert('Tidak ada data untuk dibandingkan!');
            return;
        }

        // Merge and remove duplicates again just in case
        const merged = Array.from(new Set([...pretelanData, ...filteredSatuanData]));
        setCompareData(merged);

        // Push view to results if needed (scrolling or toast)
        setTimeout(() => {
            document.getElementById('compare-results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const limitOptions = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <FiTable className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Ginee Data Processor Pro</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Automasi ekstraksi ID Pesanan & Compare Data Pretelan vs Satuan</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. GINEE PRETELAN SECTION */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-tight">
                            <FiFileText className="text-blue-600" />
                            Panel Pretelan Ginee
                        </h3>
                        {pretelanData.length > 0 && (
                            <button
                                onClick={() => handleClear('pretelan')}
                                className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
                            >
                                <FiTrash2 /> Reset
                            </button>
                        )}
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                        <div className="relative">
                            <input
                                type="file"
                                id="pretelan-input"
                                accept=".xlsx, .xls"
                                onChange={(e) => handleFileChange(e, 'pretelan')}
                                className="hidden"
                            />
                            <label
                                htmlFor="pretelan-input"
                                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${pretelanFile ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-400'
                                    }`}
                            >
                                <FiUpload className="w-8 h-8 mb-2" />
                                <span className="text-sm font-semibold text-center">
                                    {pretelanFile ? pretelanFile.name : 'Drop atau Klik untuk Upload Pretelan'}
                                </span>
                                {loading === 'pretelan' && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 font-medium">
                                        <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                                        Memproses...
                                    </div>
                                )}
                            </label>
                        </div>

                        {/* Result Table Pretelan */}
                        {pretelanData.length > 0 && !loading && (
                            <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden flex flex-col max-h-[400px] animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                        Hasil ({pretelanData.length} unik)
                                    </span>
                                    <button
                                        onClick={() => handleCopy(pretelanData, 'pretelan')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copiedType === 'pretelan' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {copiedType === 'pretelan' ? <><FiCheck /> Copied</> : <><FiCopy /> Copy</>}
                                    </button>
                                </div>
                                <div className="overflow-y-auto p-2 bg-white font-mono text-[11px]">
                                    <table className="w-full">
                                        <tbody className="divide-y divide-gray-50">
                                            {pretelanData.map((id, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="py-1.5 px-2 text-gray-400 w-10 text-right select-none">{idx + 1}.</td>
                                                    <td className="py-1.5 px-3 text-gray-800">{id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. GINEE SATUAN SECTION */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-tight">
                            <FiFileText className="text-emerald-600" />
                            Panel Satuan Ginee
                        </h3>
                        {satuanData.length > 0 && (
                            <button
                                onClick={() => handleClear('satuan')}
                                className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase flex items-center gap-1 bg-red-50 px-2 py-1 rounded"
                            >
                                <FiTrash2 /> Reset
                            </button>
                        )}
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                        <div className="relative">
                            <input
                                type="file"
                                id="satuan-input"
                                accept=".xlsx, .xls"
                                onChange={(e) => handleFileChange(e, 'satuan')}
                                className="hidden"
                            />
                            <label
                                htmlFor="satuan-input"
                                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${satuanFile ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50 text-gray-400'
                                    }`}
                            >
                                <FiUpload className="w-8 h-8 mb-2" />
                                <span className="text-sm font-semibold text-center">
                                    {satuanFile ? satuanFile.name : 'Drop atau Klik untuk Upload Satuan'}
                                </span>
                                {loading === 'satuan' && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                                        <div className="w-3 h-3 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
                                        Memproses...
                                    </div>
                                )}
                            </label>
                        </div>

                        {/* Filter Selection for Satuan */}
                        {satuanData.length > 0 && !loading && (
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 animate-in zoom-in-95 duration-200">
                                <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2">Pilih Filter Jumlah Data:</label>
                                <select
                                    value={satuanLimit}
                                    onChange={(e) => setSatuanLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                    className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="all">Tampilkan Semua ({satuanData.length})</option>
                                    {limitOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt} Data</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Result Table Satuan */}
                        {satuanData.length > 0 && !loading && (
                            <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden flex flex-col max-h-[350px] animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                        Hasil ({filteredSatuanData.length} unik)
                                    </span>
                                    <button
                                        onClick={() => handleCopy(filteredSatuanData, 'satuan')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copiedType === 'satuan' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {copiedType === 'satuan' ? <><FiCheck /> Copied</> : <><FiCopy /> Copy</>}
                                    </button>
                                </div>
                                <div className="overflow-y-auto p-2 bg-white font-mono text-[11px]">
                                    <table className="w-full">
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredSatuanData.map((id, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="py-1.5 px-2 text-gray-400 w-10 text-right select-none">{idx + 1}.</td>
                                                    <td className="py-1.5 px-3 text-gray-800">{id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* COMPARE BUTTON */}
            {(pretelanData.length > 0 || filteredSatuanData.length > 0) && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleCompare}
                        className="group relative flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 group-hover:bg-white/0 transition-colors"></div>
                        <FiLayers className="w-6 h-6 animate-bounce" />
                        PROSES COMPARE DATA
                    </button>
                </div>
            )}

            {/* COMPARE RESULTS */}
            {compareData.length > 0 && (
                <div id="compare-results" className="bg-white rounded-3xl border-4 border-gray-900 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-gray-900 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                                <FiCheck className="text-emerald-400 w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-white font-black text-xl tracking-tight uppercase">Hasil Compare Berhasil!</h3>
                                <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-0.5">Gabungan Pretelan & Satuan (Terfilter)</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleCopy(compareData, 'compare')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${copiedType === 'compare' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {copiedType === 'compare' ? <><FiCheck /> DATA COPIED</> : <><FiCopy /> COPY {compareData.length} ID</>}
                            </button>
                            <button
                                onClick={() => handleClear('compare')}
                                className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl flex items-center justify-center transition-colors"
                            >
                                <FiTrash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="max-h-[500px] overflow-y-auto p-4 bg-white font-mono text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                                    {compareData.map((id, idx) => (
                                        <div key={idx} className="flex items-center gap-3 py-1 border-b border-gray-50">
                                            <span className="text-gray-300 font-bold w-10 text-right text-[10px]">{idx + 1}</span>
                                            <span className="text-gray-900 font-medium tracking-tight">{id}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Note */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="mt-0.5"><FiFileText className="text-blue-500 w-4 h-4" /></div>
                <p className="text-xs text-blue-700 leading-relaxed italic">
                    * Tips: Gunakan filter pada data Satuan untuk membatasi jumlah data yang akan di-compare atau di-copy. Fitur Compare akan menggabungkan kedua list ID dan memastikan tidak ada duplikasi.
                </p>
            </div>
        </div>
    );
};

export default ToolkitGineeProcessor;

