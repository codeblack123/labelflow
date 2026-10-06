import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import { supabase } from '../supabaseClient';
import { FiUploadCloud, FiPlus, FiTrash2, FiDownload, FiPlay, FiCheckCircle, FiAlertCircle, FiClock, FiLoader, FiX, FiFileText } from 'react-icons/fi';
import { FaFilePdf, FaFileExcel } from 'react-icons/fa';
import { ProcessStatus } from '../types';

interface BatchItem {
    id: string;
    pdfFile: File;
    pickerName: string;
    status: 'idle' | 'validating' | 'processing' | 'done' | 'error' | 'skipped';
    resultUrl?: string;
    resultFilename?: string;
    error?: string;
    stats?: {
        matched_count: number;
        unmatched_excel_count: number;
        unmatched_pdf_count: number;
    };
}

interface BulkUploadQueueProps {
    showToast: (msg: string) => void;
    activeWarehouseId?: string | null;
    user?: any;
}

const BulkUploadQueue: React.FC<BulkUploadQueueProps> = ({ showToast, activeWarehouseId, user }) => {
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [currentBatchIdx, setCurrentBatchIdx] = useState<number | null>(null);
    const [overallProgress, setOverallProgress] = useState(0);
    const [includeGlobalMsku, setIncludeGlobalMsku] = useState(false);
    const [includeSummary, setIncludeSummary] = useState(false);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);

    const genId = () => `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // ─── Drop / Upload Excel ───────────────────────────────────────────────────
    const handleExcelDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            setExcelFile(file);
        } else {
            showToast('⚠️ Hanya file Excel (.xlsx/.xls) yang diterima');
        }
    }, [showToast]);

    const handleExcelInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setExcelFile(file);
        e.target.value = '';
    };

    // ─── Tambah PDF Batch ──────────────────────────────────────────────────────
    const handleAddPdfBatches = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newBatches: BatchItem[] = files.map((f, i) => ({
            id: genId() + '-' + i,
            pdfFile: f,
            pickerName: '',
            status: 'idle',
        }));
        setBatches(prev => [...prev, ...newBatches]);
        e.target.value = '';
    };

    const removeBatch = (id: string) => {
        setBatches(prev => prev.filter(b => b.id !== id));
    };

    const updatePickerName = (id: string, name: string) => {
        setBatches(prev => prev.map(b => b.id === id ? { ...b, pickerName: name } : b));
    };

    const resetAll = () => {
        setBatches([]);
        setExcelFile(null);
        setCurrentBatchIdx(null);
        setOverallProgress(0);
    };

    // ─── Proses Antrian ───────────────────────────────────────────────────────
    const startQueue = async () => {
        if (!excelFile) { showToast('⚠️ Pilih file Excel Ginee terlebih dahulu'); return; }
        if (batches.length === 0) { showToast('⚠️ Tambahkan minimal 1 file PDF batch'); return; }

        const unnamedBatches = batches.filter(b => !b.pickerName.trim());
        if (unnamedBatches.length > 0) {
            showToast(`⚠️ Isi nama picker untuk semua batch terlebih dahulu (${unnamedBatches.length} batch belum diisi)`);
            return;
        }

        setIsRunning(true);
        abortRef.current = false;

        // Reset semua status ke idle
        setBatches(prev => prev.map(b => ({ ...b, status: 'idle', error: undefined, resultUrl: undefined })));

        let completed = 0;
        const total = batches.length;

        for (let i = 0; i < batches.length; i++) {
            if (abortRef.current) break;

            const batch = batches[i];
            setCurrentBatchIdx(i);

            // ── Step 1: Validasi duplikat ────────────────────────────────────────
            setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, status: 'validating' } : b));
            showToast(`⏳ Validasi Batch ${i + 1}/${total}: ${batch.pickerName}...`);

            try {
                const matchFormData = new FormData();
                matchFormData.append('excel_file', excelFile);
                matchFormData.append('pdf_files', batch.pdfFile);

                const extractRes = await axios.post(
                    `${API_CONFIG.BASE_URL}/extract-matched-order-ids`,
                    matchFormData,
                    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
                );

                const matchedIds: string[] = extractRes.data?.ids || [];

                if (matchedIds.length > 0) {
                    const BATCH_SIZE = 50;
                    const allDuplicates: any[] = [];
                    const chunks: string[][] = [];
                    for (let j = 0; j < matchedIds.length; j += BATCH_SIZE) {
                        chunks.push(matchedIds.slice(j, j + BATCH_SIZE));
                    }

                    await Promise.all(chunks.map(async (chunk) => {
                        try {
                            const { data: orderData } = await supabase
                                .from('processed_items')
                                .select('order_id, date_processed')
                                .in('order_id', chunk);
                            if (orderData) allDuplicates.push(...orderData);
                        } catch (_) {}
                    }));

                    const uniqueDuplicates = Array.from(new Set(allDuplicates.map(d => d.order_id)));

                    if (uniqueDuplicates.length > 0) {
                        setBatches(prev => prev.map(b => b.id === batch.id ? {
                            ...b,
                            status: 'error',
                            error: `⚠️ ${uniqueDuplicates.length} order sudah pernah diproses sebelumnya. Batch dilewati (skipped).`
                        } : b));
                        showToast(`⚠️ Batch ${i + 1} (${batch.pickerName}): ${uniqueDuplicates.length} duplikat ditemukan — dilewati`);
                        completed++;
                        setOverallProgress(Math.round((completed / total) * 100));
                        continue;
                    }
                }
            } catch (validationErr) {
                console.warn(`[QUEUE] Validation failed for batch ${i + 1}, continuing...`, validationErr);
                // Jika validasi gagal, lanjutkan proses (fail-open)
            }

            // ── Step 2: Proses label ─────────────────────────────────────────────
            setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, status: 'processing' } : b));
            showToast(`⚙️ Memproses Batch ${i + 1}/${total}: ${batch.pickerName}...`);

            try {
                const formData = new FormData();
                formData.append('excel_file', excelFile);
                formData.append('pdf_files', batch.pdfFile);
                formData.append('picker_name', batch.pickerName.trim());
                formData.append('sort_by_sku_count', 'true');
                if (includeGlobalMsku) formData.append('include_global_msku', 'true');
                if (includeSummary) formData.append('include_summary', 'true');
                if (activeWarehouseId) formData.append('gudang_id', activeWarehouseId);

                const response = await axios.post(
                    `${API_CONFIG.BASE_URL}/process-labels-with-stats`,
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }
                );

                const data = response.data;

                if (data?.success && data?.pdf_base64) {
                    const stats = data.stats;

                    // Cek unmatched PDF (abort batch ini jika ada PDF asing)
                    if (stats?.unmatched_pdf_count > 0) {
                        setBatches(prev => prev.map(b => b.id === batch.id ? {
                            ...b,
                            status: 'error',
                            error: `❌ Ada ${stats.unmatched_pdf_count} halaman PDF tidak dikenali. Batch dibatalkan.`
                        } : b));
                        showToast(`❌ Batch ${i + 1} (${batch.pickerName}): PDF tidak dikenali — dibatalkan`);
                        completed++;
                        setOverallProgress(Math.round((completed / total) * 100));
                        continue;
                    }

                    // Buat blob URL untuk download manual
                    const byteChars = atob(data.pdf_base64);
                    const byteArr = new Uint8Array(byteChars.length);
                    for (let k = 0; k < byteChars.length; k++) byteArr[k] = byteChars.charCodeAt(k);
                    const blob = new Blob([byteArr], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    const safePickerName = batch.pickerName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
                    const filename = `QUEUE_Batch${i + 1}_${safePickerName}_hasil.pdf`;

                    setBatches(prev => prev.map(b => b.id === batch.id ? {
                        ...b,
                        status: 'done',
                        resultUrl: url,
                        resultFilename: filename,
                        stats: {
                            matched_count: stats?.matched_count || 0,
                            unmatched_excel_count: stats?.unmatched_excel_count || 0,
                            unmatched_pdf_count: stats?.unmatched_pdf_count || 0,
                        }
                    } : b));

                    // Simpan ke history Supabase
                    try {
                        await supabase.from('label_process_history').insert([{
                            excel_filename: excelFile.name,
                            pdf_filenames: [batch.pdfFile.name],
                            picker_name: batch.pickerName.trim(),
                            matched_count: stats?.matched_count || 0,
                            unmatched_excel_count: stats?.unmatched_excel_count || 0,
                            unmatched_pdf_count: stats?.unmatched_pdf_count || 0,
                            date_processed: new Date().toISOString(),
                            tenant_id: user?.tenant_id || user?.username || 'unknown',
                            warehouse_id: activeWarehouseId || null,
                        }]);
                    } catch (histErr) {
                        console.warn('[QUEUE] History save failed:', histErr);
                    }

                    // Simpan processed items
                    if (data.stats?.processed_order_ids?.length > 0) {
                        try {
                            const items = data.stats.processed_order_ids.map((id: string) => ({
                                order_id: id,
                                excel_filename: excelFile.name,
                                date_processed: new Date().toISOString(),
                                tenant_id: user?.tenant_id || user?.username || 'unknown',
                            }));
                            await supabase.from('processed_items').insert(items);
                        } catch (piErr) {
                            console.warn('[QUEUE] processed_items save failed:', piErr);
                        }
                    }

                    showToast(`✓ Batch ${i + 1}/${total} (${batch.pickerName}): ${stats?.matched_count || 0} label selesai`);
                } else {
                    throw new Error(data?.detail || 'Respons tidak valid dari server');
                }
            } catch (err: any) {
                const errMsg = err?.response?.data?.detail || err?.message || 'Terjadi kesalahan saat memproses';
                setBatches(prev => prev.map(b => b.id === batch.id ? {
                    ...b,
                    status: 'error',
                    error: `❌ ${errMsg}`
                } : b));
                showToast(`❌ Batch ${i + 1} (${batch.pickerName}) gagal: ${errMsg}`);
            }

            completed++;
            setOverallProgress(Math.round((completed / total) * 100));
        }

        setCurrentBatchIdx(null);
        setIsRunning(false);

        if (abortRef.current) {
            showToast('⏹ Antrian dihentikan oleh pengguna');
        } else {
            const doneCount = batches.filter(b => b.status === 'done').length;
            showToast(`✅ Antrian selesai! ${completed}/${total} batch diproses`);
        }
    };

    const stopQueue = () => {
        abortRef.current = true;
        showToast('⏹ Menghentikan antrian setelah batch saat ini selesai...');
    };

    const downloadBatch = (batch: BatchItem) => {
        if (!batch.resultUrl || !batch.resultFilename) return;
        const a = document.createElement('a');
        a.href = batch.resultUrl;
        a.download = batch.resultFilename;
        a.click();
    };

    const downloadAllDone = () => {
        const doneBatches = batches.filter(b => b.status === 'done' && b.resultUrl);
        if (doneBatches.length === 0) { showToast('Belum ada hasil yang siap diunduh'); return; }
        doneBatches.forEach((b, i) => {
            setTimeout(() => downloadBatch(b), i * 300);
        });
        showToast(`⬇️ Mengunduh ${doneBatches.length} file hasil...`);
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const doneCount = batches.filter(b => b.status === 'done').length;
    const errorCount = batches.filter(b => b.status === 'error').length;
    const idleCount = batches.filter(b => b.status === 'idle').length;

    const getStatusIcon = (status: BatchItem['status'], isCurrent: boolean) => {
        if (isCurrent && (status === 'validating' || status === 'processing')) {
            return <FiLoader className="w-4 h-4 text-blue-600 animate-spin" />;
        }
        switch (status) {
            case 'done': return <FiCheckCircle className="w-4 h-4 text-emerald-600" />;
            case 'error': return <FiAlertCircle className="w-4 h-4 text-red-500" />;
            case 'validating': return <FiLoader className="w-4 h-4 text-amber-500 animate-spin" />;
            case 'processing': return <FiLoader className="w-4 h-4 text-blue-600 animate-spin" />;
            default: return <FiClock className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusLabel = (status: BatchItem['status'], isCurrent: boolean) => {
        if (isCurrent) {
            if (status === 'validating') return 'Validasi duplikat...';
            if (status === 'processing') return 'Memproses label...';
        }
        switch (status) {
            case 'done': return 'Selesai';
            case 'error': return 'Gagal';
            case 'validating': return 'Validasi...';
            case 'processing': return 'Memproses...';
            default: return 'Menunggu';
        }
    };

    const getRowBg = (status: BatchItem['status'], isCurrent: boolean) => {
        if (isCurrent) return 'bg-blue-50 border-blue-200';
        switch (status) {
            case 'done': return 'bg-emerald-50/60 border-emerald-200';
            case 'error': return 'bg-red-50/60 border-red-200';
            default: return 'bg-white border-slate-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-violet-200 shadow-inner">
                    <svg className="w-7 h-7 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upload Queue Batch</h2>
                    <p className="text-violet-600 text-sm font-medium mt-0.5">Upload banyak PDF batch sekaligus dengan 1 file Excel — proses otomatis berurutan</p>
                </div>
            </div>

            {/* ── Panduan ─────────────────────────────────────────────────────── */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800 space-y-1">
                <p className="font-semibold mb-2">📋 Cara Pakai:</p>
                <ol className="list-decimal list-inside space-y-1 text-violet-700">
                    <li>Gabungkan resi per batch menggunakan <strong>Toolkit → Gabung Label PDF Asli</strong></li>
                    <li>Upload <strong>1 file Excel Ginee</strong> yang berisi semua data pesanan</li>
                    <li>Upload <strong>semua file PDF batch</strong> (bisa pilih sekaligus / multi-select)</li>
                    <li>Isi <strong>nama picker</strong> untuk setiap batch</li>
                    <li>Klik <strong>Mulai Proses Antrian</strong> — sistem proses otomatis berurutan</li>
                    <li>Setelah semua selesai, unduh hasil per batch atau sekaligus</li>
                </ol>
            </div>

            {/* ── Upload Excel ─────────────────────────────────────────────────── */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    1. File Excel Ginee (Data Pesanan)
                </label>
                <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleExcelDrop}
                    onClick={() => excelInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all duration-200 ${excelFile
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/40'
                        }`}
                >
                    <input
                        ref={excelInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleExcelInputChange}
                        disabled={isRunning}
                    />
                    {excelFile ? (
                        <div className="flex items-center gap-3">
                            <FaFileExcel className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="font-semibold text-emerald-800 text-sm truncate">{excelFile.name}</p>
                                <p className="text-xs text-emerald-600">{(excelFile.size / 1024).toFixed(1)} KB — klik untuk ganti</p>
                            </div>
                            {!isRunning && (
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); setExcelFile(null); }}
                                    className="ml-auto p-1.5 rounded-full hover:bg-emerald-200 text-emerald-600 transition-colors"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-2">
                            <FaFileExcel className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-medium text-slate-500">Klik atau drag file Excel Ginee di sini</p>
                            <p className="text-xs text-slate-400 mt-1">.xlsx / .xls</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Upload PDF Batches ────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">
                        2. File PDF Batch ({batches.length} batch)
                    </label>
                    <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        <FiPlus className="w-3.5 h-3.5" />
                        Tambah PDF Batch
                    </button>
                    <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        onChange={handleAddPdfBatches}
                        disabled={isRunning}
                    />
                </div>

                {batches.length === 0 ? (
                    <div
                        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all"
                        onClick={() => pdfInputRef.current?.click()}
                    >
                        <FaFilePdf className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-medium">Klik untuk tambah file PDF batch</p>
                        <p className="text-xs text-slate-400 mt-1">Bisa pilih banyak file sekaligus (multi-select)</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {batches.map((batch, idx) => {
                            const isCurrent = currentBatchIdx === idx && isRunning;
                            return (
                                <div
                                    key={batch.id}
                                    className={`border rounded-xl p-4 transition-all duration-200 ${getRowBg(batch.status, isCurrent)}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* No. batch */}
                                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">
                                            {idx + 1}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <FaFilePdf className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                <span className="text-sm font-medium text-slate-700 truncate">{batch.pdfFile.name}</span>
                                                <span className="text-xs text-slate-400 flex-shrink-0">({(batch.pdfFile.size / 1024).toFixed(0)} KB)</span>
                                            </div>

                                            {/* Nama picker input */}
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-slate-500 flex-shrink-0 w-20">Nama Picker:</label>
                                                <input
                                                    type="text"
                                                    value={batch.pickerName}
                                                    onChange={e => updatePickerName(batch.id, e.target.value)}
                                                    disabled={isRunning}
                                                    placeholder="Masukkan nama picker..."
                                                    className={`flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none transition-all ${batch.pickerName.trim()
                                                        ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                                        : 'border-slate-300 bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                                                        } disabled:opacity-60 disabled:cursor-not-allowed font-medium`}
                                                />
                                            </div>

                                            {/* Keterangan error atau stats */}
                                            {batch.status === 'error' && batch.error && (
                                                <p className="text-xs text-red-600 font-medium">{batch.error}</p>
                                            )}
                                            {batch.status === 'done' && batch.stats && (
                                                <p className="text-xs text-emerald-700">
                                                    ✓ {batch.stats.matched_count} label berhasil
                                                    {batch.stats.unmatched_excel_count > 0 && ` · ⚠️ ${batch.stats.unmatched_excel_count} order Excel tidak ada PDF`}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status + aksi */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                                {getStatusIcon(batch.status, isCurrent)}
                                                <span className={`${batch.status === 'done' ? 'text-emerald-700' : batch.status === 'error' ? 'text-red-600' : ''}`}>
                                                    {getStatusLabel(batch.status, isCurrent)}
                                                </span>
                                            </div>

                                            {batch.status === 'done' && batch.resultUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => downloadBatch(batch)}
                                                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                                    title="Download hasil batch ini"
                                                >
                                                    <FiDownload className="w-4 h-4" />
                                                </button>
                                            )}

                                            {!isRunning && batch.status !== 'done' && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBatch(batch.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Hapus batch ini"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Opsi Tambahan ───────────────────────────────────────────────── */}
            {batches.length > 0 && (
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={includeGlobalMsku}
                            onChange={e => setIncludeGlobalMsku(e.target.checked)}
                            disabled={isRunning}
                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                        />
                        <span>Sertakan Rekap Global MSKU</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={includeSummary}
                            onChange={e => setIncludeSummary(e.target.checked)}
                            disabled={isRunning}
                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                        />
                        <span>Sertakan Halaman Ringkasan</span>
                    </label>
                </div>
            )}

            {/* ── Overall Progress Bar ────────────────────────────────────────── */}
            {isRunning && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>Progress Keseluruhan</span>
                        <span>{overallProgress}% ({doneCount + errorCount}/{batches.length} selesai)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-500"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ── Ringkasan Hasil ─────────────────────────────────────────────── */}
            {!isRunning && (doneCount > 0 || errorCount > 0) && overallProgress > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-700">{doneCount} Selesai</span>
                    </div>
                    {errorCount > 0 && (
                        <div className="flex items-center gap-2">
                            <FiAlertCircle className="w-4 h-4 text-red-500" />
                            <span className="font-semibold text-red-600">{errorCount} Gagal/Dilewati</span>
                        </div>
                    )}
                    {idleCount > 0 && (
                        <div className="flex items-center gap-2">
                            <FiClock className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">{idleCount} Belum diproses</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tombol Aksi ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-3 pt-2">
                {!isRunning ? (
                    <>
                        <button
                            type="button"
                            onClick={startQueue}
                            disabled={!excelFile || batches.length === 0}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 text-sm"
                        >
                            <FiPlay className="w-4 h-4" />
                            Mulai Proses Antrian ({batches.length} batch)
                        </button>

                        {doneCount > 0 && (
                            <button
                                type="button"
                                onClick={downloadAllDone}
                                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all duration-200 shadow-md text-sm"
                            >
                                <FiDownload className="w-4 h-4" />
                                Download Semua ({doneCount})
                            </button>
                        )}

                        {batches.length > 0 && (
                            <button
                                type="button"
                                onClick={resetAll}
                                className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl border border-slate-200 transition-all duration-200 text-sm"
                            >
                                <FiTrash2 className="w-4 h-4" />
                                Reset Semua
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={stopQueue}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all text-sm shadow-md"
                    >
                        <FiX className="w-4 h-4" />
                        Hentikan Antrian
                    </button>
                )}
            </div>

            {/* ── Footer Note ────────────────────────────────────────────────── */}
            <p className="text-xs text-slate-400 text-center pt-2">
                Validasi duplikat aktif per batch · Rak & sorting SKU sesuai gudang aktif · History tersimpan otomatis
            </p>
        </div>
    );
};

export default BulkUploadQueue;
