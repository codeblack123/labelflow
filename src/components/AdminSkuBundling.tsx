import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiTrash2, FiSearch, FiEdit2, FiCheck, FiX, FiAlertTriangle, FiPackage, FiInfo, FiRefreshCw, FiUpload, FiDownload, FiFileText } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

interface AdminSkuBundlingProps {
    showToast?: (message: string) => void;
}

interface SkuBundle {
    id?: number;
    sku_bundle: string;
    sku_satuan: string;
}

const AdminSkuBundling: React.FC<AdminSkuBundlingProps> = ({ showToast }) => {
    const [data, setData] = useState<SkuBundle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const EMPTY_ROW: SkuBundle = { sku_bundle: '', sku_satuan: '' };
    const [newRow, setNewRow] = useState<SkuBundle>({ ...EMPTY_ROW });
    const [editRow, setEditRow] = useState<SkuBundle | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: rows, error } = await supabase
                .from('sku_bundling')
                .select('id, sku_bundle, sku_satuan')
                .order('sku_bundle', { ascending: true });
            if (error) throw error;
            setData(rows || []);
        } catch (err: any) {
            showToast?.('Gagal memuat data SKU Bundling');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAdd = async () => {
        if (!newRow.sku_bundle.trim() || !newRow.sku_satuan.trim()) {
            showToast?.('SKU Bundle dan SKU Satuan wajib diisi');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.from('sku_bundling').insert([{
                sku_bundle: newRow.sku_bundle.trim(),
                sku_satuan: newRow.sku_satuan.trim(),
            }]);
            if (error) throw error;
            showToast?.('Data SKU Bundling berhasil ditambahkan');
            setNewRow({ ...EMPTY_ROW });
            setShowAdd(false);
            fetchData();
        } catch (err: any) {
            if (err.code === '23505') showToast?.('SKU Bundle sudah ada');
            else showToast?.('Gagal menyimpan data');
        } finally {
            setIsSaving(false);
        }
    };

    const startEdit = (row: SkuBundle) => { setEditingId(row.id!); setEditRow({ ...row }); };
    const cancelEdit = () => { setEditingId(null); setEditRow(null); };

    const handleSaveEdit = async () => {
        if (!editRow || !editRow.sku_bundle.trim() || !editRow.sku_satuan.trim()) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.from('sku_bundling').update({
                sku_bundle: editRow.sku_bundle.trim(),
                sku_satuan: editRow.sku_satuan.trim(),
            }).eq('id', editRow.id!);
            if (error) throw error;
            showToast?.('Data berhasil diperbarui');
            cancelEdit();
            fetchData();
        } catch { showToast?.('Gagal memperbarui data'); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id: number, sku: string) => {
        if (!window.confirm(`Hapus SKU "${sku}"?`)) return;
        try {
            const { error } = await supabase.from('sku_bundling').delete().eq('id', id);
            if (error) throw error;
            showToast?.(`SKU "${sku}" dihapus`);
            fetchData();
        } catch { showToast?.('Gagal menghapus data'); }
    };

    // Download Template Excel (CUKUP 2 KOLOM: SKU BUNDLE & SKU SATUAN)
    const handleDownloadTemplate = () => {
        const templateRows = [
            {
                "SKU BUNDLE": "BOOK-1PACK/CLBK-3501",
                "SKU SATUAN": "BOOK-CLBK-3501/1PC"
            },
            {
                "SKU BUNDLE": "PULPEN-1BOX/GP-262/BLUE",
                "SKU SATUAN": "PULPEN-GP-262/1PCS/BLUE"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateRows);
        ws['!cols'] = [
            { wch: 35 }, // SKU BUNDLE
            { wch: 35 }, // SKU SATUAN
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SKU Bundling");
        XLSX.writeFile(wb, "Template_Import_SKU_Bundling.xlsx");
        showToast?.('✓ Template Excel SKU Bundling berhasil diunduh (2 Kolom)');
    };

    // Export Data Excel (2 KOLOM)
    const handleExportExcel = () => {
        if (data.length === 0) {
            showToast?.('Tidak ada data untuk diexport');
            return;
        }
        const exportRows = data.map(r => ({
            "SKU BUNDLE": r.sku_bundle,
            "SKU SATUAN": r.sku_satuan
        }));
        const ws = XLSX.utils.json_to_sheet(exportRows);
        ws['!cols'] = [{ wch: 35 }, { wch: 35 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SKU Bundling");
        XLSX.writeFile(wb, `Export_SKU_Bundling_${new Date().getTime()}.xlsx`);
        showToast?.('✓ Data SKU Bundling berhasil diexport');
    };

    // Import Excel (HANYA MEMBACA 2 KOLOM: SKU BUNDLE & SKU SATUAN)
    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

                if (rawData.length === 0) {
                    showToast?.('File Excel kosong atau format tidak valid');
                    setIsImporting(false);
                    return;
                }

                const parsedRows: { sku_bundle: string; sku_satuan: string }[] = [];
                const invalidRows: number[] = [];

                rawData.forEach((row, index) => {
                    let skuBundle = '';
                    let skuSatuan = '';

                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                        const val = String(row[key] || '').trim();

                        if (cleanKey.includes('skubundle') || cleanKey === 'skubundle' || cleanKey === 'bundle' || cleanKey === 'kolom1') {
                            skuBundle = val;
                        } else if (cleanKey.includes('skusatuan') || cleanKey === 'skusatuan' || cleanKey === 'satuan' || cleanKey === 'kolom2') {
                            skuSatuan = val;
                        }
                    });

                    if (skuBundle && skuSatuan) {
                        parsedRows.push({
                            sku_bundle: skuBundle,
                            sku_satuan: skuSatuan
                        });
                    } else {
                        invalidRows.push(index + 2);
                    }
                });

                if (parsedRows.length === 0) {
                    showToast?.('Gagal membaca data: Kolom "SKU BUNDLE" dan "SKU SATUAN" tidak ditemukan');
                    setIsImporting(false);
                    return;
                }

                // Deduplicate parsedRows by sku_bundle to prevent Postgres Error 21000 (ON CONFLICT DO UPDATE cannot affect row a second time)
                const uniqueMap = new Map<string, { sku_bundle: string; sku_satuan: string }>();
                parsedRows.forEach(r => {
                    uniqueMap.set(r.sku_bundle.trim().toUpperCase(), {
                        sku_bundle: r.sku_bundle.trim(),
                        sku_satuan: r.sku_satuan.trim()
                    });
                });
                const deduplicatedRows = Array.from(uniqueMap.values());
                const duplicateCount = parsedRows.length - deduplicatedRows.length;

                const { error } = await supabase
                    .from('sku_bundling')
                    .upsert(deduplicatedRows, { onConflict: 'sku_bundle' });

                if (error) throw error;

                let msg = `✓ Berhasil mengimpor ${deduplicatedRows.length} data SKU Bundling`;
                if (duplicateCount > 0) {
                    msg += ` (${duplicateCount} duplikat digabungkan)`;
                }
                if (invalidRows.length > 0) {
                    msg += ` (${invalidRows.length} baris kosong dilewati)`;
                }
                showToast?.(msg);
                fetchData();
            } catch (err: any) {
                console.error('Import error:', err);
                showToast?.(`Gagal mengimpor file Excel: ${err.message || 'Error parsing'}`);
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsBinaryString(file);
    };

    const filtered = data.filter(r =>
        !search ||
        r.sku_bundle.toLowerCase().includes(search.toLowerCase()) ||
        r.sku_satuan.toLowerCase().includes(search.toLowerCase())
    );

    const FormRow = ({ row, onChange, onSave, onCancel, saveLabel }: {
        row: SkuBundle; onChange: (f: keyof SkuBundle, v: any) => void;
        onSave: () => void; onCancel: () => void; saveLabel: string;
    }) => (
        <tr className="bg-blue-50/40 border-l-4 border-blue-500">
            <td className="px-4 py-3" colSpan={3}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">SKU Bundle (Kolom 1)</label>
                        <input type="text" value={row.sku_bundle} onChange={e => onChange('sku_bundle', e.target.value)}
                            placeholder="BOOK-1PACK/CLBK-3501"
                            className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-green-700 uppercase tracking-wider block mb-1">SKU Satuan (Kolom 2)</label>
                        <input type="text" value={row.sku_satuan} onChange={e => onChange('sku_satuan', e.target.value)}
                            placeholder="BOOK-CLBK-3501/1PC"
                            className="w-full bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                    <button onClick={onSave} disabled={isSaving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 transition-all shadow">
                        <FiCheck className="w-3.5 h-3.5" />{saveLabel}
                    </button>
                    <button onClick={onCancel}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-all">
                        <FiX className="w-3.5 h-3.5" />Batal
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-8 rounded-2xl text-white shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                        <FiPackage className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Database SKU Bundling</h2>
                        <p className="text-emerald-100 text-sm mt-1">Kelola pemetaan SKU bundle ke SKU satuan (Hanya 2 Kolom)</p>
                    </div>
                    <div className="ml-auto bg-white/10 rounded-xl px-4 py-2 text-center">
                        <div className="text-2xl font-bold">{data.length}</div>
                        <div className="text-emerald-200 text-xs">Total Data</div>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex gap-3 items-start">
                <FiInfo className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 leading-relaxed space-y-1">
                    <p><b>Format Sederhana:</b> Cukup 2 Kolom (<b>SKU BUNDLE</b> &amp; <b>SKU SATUAN</b>).</p>
                    <p><b>Contoh:</b> <code className="bg-blue-100 px-1 rounded font-mono">BOOK-1PACK/CLBK-3501</code> → <code className="bg-blue-100 px-1 rounded font-mono">BOOK-CLBK-3501/1PC</code></p>
                    <p><b>Contoh 2:</b> <code className="bg-blue-100 px-1 rounded font-mono">PULPEN-1BOX/GP-262/BLUE</code> → <code className="bg-blue-100 px-1 rounded font-mono">PULPEN-GP-262/1PCS/BLUE</code></p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari SKU bundle / satuan..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                </div>
                
                {/* Tambah Baru */}
                <button onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-md">
                    <FiPlus className="w-4 h-4" />Tambah Baru
                </button>

                {/* Import Excel */}
                <label className={`flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                    <FiUpload className="w-4 h-4" />
                    {isImporting ? 'Mengimpor...' : 'Import Excel'}
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".xlsx, .xls" 
                        onChange={handleImportExcel} 
                        className="hidden" 
                        disabled={isImporting} 
                    />
                </label>

                {/* Template Excel */}
                <button onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-300 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-50 transition-all shadow-sm">
                    <FiFileText className="w-4 h-4 text-emerald-600" />Template Excel (2 Kolom)
                </button>

                {/* Export Excel */}
                <button onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all shadow-sm">
                    <FiDownload className="w-4 h-4 text-gray-500" />Export Excel
                </button>

                {/* Refresh */}
                <button onClick={fetchData}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
                    title="Refresh Data">
                    <FiRefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-1/2">SKU Bundle (Kolom 1)</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-1/2">SKU Satuan (Kolom 2)</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {showAdd && (
                                    <FormRow row={newRow} onChange={(f, v) => setNewRow(prev => ({ ...prev, [f]: v }))} onSave={handleAdd} onCancel={() => setShowAdd(false)} saveLabel="Tambah" />
                                )}
                                {filtered.length === 0 && !showAdd ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-16 text-gray-400">
                                            <FiPackage className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                            <p className="text-sm font-medium">Belum ada data SKU Bundling</p>
                                            <p className="text-xs mt-1">Klik "Tambah Baru" atau "Import Excel" untuk menambahkan pasangan SKU (2 Kolom)</p>
                                        </td>
                                    </tr>
                                ) : filtered.map(row => (
                                    editingId === row.id && editRow ? (
                                        <FormRow key={row.id} row={editRow}
                                            onChange={(f, v) => setEditRow(prev => prev ? { ...prev, [f]: v } : null)}
                                            onSave={handleSaveEdit} onCancel={cancelEdit} saveLabel="Simpan" />
                                    ) : (
                                        <tr key={row.id} className="hover:bg-gray-50/70 transition-colors group">
                                            <td className="px-6 py-3.5">
                                                <code className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md font-semibold border border-blue-100">{row.sku_bundle}</code>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <code className="text-xs font-mono text-green-700 bg-green-50 px-2.5 py-1 rounded-md font-semibold border border-green-100">{row.sku_satuan}</code>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
                                                        <FiEdit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(row.id!, row.sku_bundle)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Hapus">
                                                        <FiTrash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {data.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FiAlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Menampilkan {filtered.length} dari {data.length} data.{search && ` Filter: "${search}".`}</span>
                </div>
            )}
        </div>
    );
};

export default AdminSkuBundling;
