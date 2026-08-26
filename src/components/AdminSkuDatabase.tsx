import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiSearch, FiEdit2, FiSave, FiX, FiCheck, FiUpload, FiDownload, FiInfo, FiFileText, FiAlertCircle, FiArrowUp, FiArrowDown, FiChevronLeft, FiChevronRight, FiFilter, FiDatabase, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { API_CONFIG } from '../constants';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { supabase } from '../supabaseClient';

interface SkuMapping {
    id: string;
    sku: string;
    rak?: string;
    gudang_id?: string;
}

interface Warehouse {
    id: string;
    name: string;
}

interface AdminSkuDatabaseProps {
    showToast?: (message: string) => void;
    user?: any;
}

const AdminSkuDatabase: React.FC<AdminSkuDatabaseProps> = ({ showToast, user }) => {
    // SKU Manager State
    const [mappings, setMappings] = useState<SkuMapping[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Add Form State
    const [newId, setNewId] = useState('');
    const [newSku, setNewSku] = useState('');
    const [newRak, setNewRak] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Import State
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // New states
    const [editingMapping, setEditingMapping] = useState<string | null>(null);
    const [editId, setEditId] = useState('');
    const [editSku, setEditSku] = useState('');
    const [editRak, setEditRak] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isMultiSearch, setIsMultiSearch] = useState(false);

    // Delete Modal State
    const [deleteConfig, setDeleteConfig] = useState<{
        isOpen: boolean;
        type: 'single' | 'bulk' | 'all';
        id?: string;
        name?: string;
    }>({
        isOpen: false,
        type: 'single'
    });

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [hasMore, setHasMore] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'custom_id',
        direction: 'asc'
    });

    // Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Warehouse State
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(null);

    // Fetch Warehouses
    useEffect(() => {
        const fetchWarehouses = async () => {
            const { data, error } = await supabase.from('warehouses').select('*').order('name');
            if (!error && data) {
                // Filter based on user access
                let accessibleWarehouses = data;
                if (user?.role !== 'developer' && user?.assigned_warehouses) {
                    accessibleWarehouses = data.filter(w => user.assigned_warehouses.includes(w.id));
                }
                
                setWarehouses(accessibleWarehouses);
                if (accessibleWarehouses.length > 0 && !activeWarehouseId) {
                    setActiveWarehouseId(accessibleWarehouses[0].id);
                }
            }
        };
        fetchWarehouses();

        const channel = supabase.channel('admin-sku-warehouses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, () => {
                fetchWarehouses();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Initial Load
    useEffect(() => {
        if (activeWarehouseId) {
            fetchMappings();
        }
    }, [page, limit, sortConfig, activeWarehouseId]); // Re-fetch on any change

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) fetchMappings();
            else setPage(1); // will trigger fetch via page dependency
        }, 600);
        return () => clearTimeout(timer);
    }, [searchTerm, isMultiSearch]);

    const fetchMappings = async () => {
        setIsLoading(true);
        try {
            // Using Paginated Endpoint with Sort support
            const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/sku-mappings-paginated`, {
                params: {
                    page: page,
                    limit: limit,
                    search: searchTerm,
                    order_by: sortConfig.key,
                    order_dir: sortConfig.direction,
                    is_multi_search: isMultiSearch,
                    gudang_id: activeWarehouseId || undefined
                }
            });
            setMappings(res.data.data || []);
            setHasMore((res.data.data || []).length === limit);
            setSelectedIds([]); // Clear selection on fetch
        } catch (err) {
            console.error('Failed to fetch mappings', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newId || !newSku || !activeWarehouseId) return;
        setIsSaving(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/sku-mappings`, { 
                id: newId, 
                sku: newSku, 
                rak: newRak,
                gudang_id: activeWarehouseId
            });
            setNewId('');
            setNewSku('');
            setNewRak('');
            if (showToast) showToast('✓ Data berhasil disimpan');
            fetchMappings();
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Gagal menambah data';
            alert(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        setIsLoading(true);
        try {
            if (deleteConfig.type === 'single' && deleteConfig.id) {
                await axios.delete(`${API_CONFIG.BASE_URL}/settings/sku-mappings/${encodeURIComponent(deleteConfig.id)}`);
                if (showToast) showToast('✓ Data berhasil dihapus');
            } else if (deleteConfig.type === 'bulk') {
                await axios.post(`${API_CONFIG.BASE_URL}/settings/sku-mappings/bulk-delete`, { ids: selectedIds });
                if (showToast) showToast(`✓ ${selectedIds.length} data berhasil dihapus`);
                setSelectedIds([]);
            } else if (deleteConfig.type === 'all') {
                await axios.delete(`${API_CONFIG.BASE_URL}/settings/sku-mappings/all`, {
                    params: { gudang_id: activeWarehouseId }
                });
                if (showToast) showToast('✓ Seluruh data gudang ini dikosongkan');
                setPage(1);
            }
            fetchMappings();
        } catch (err: any) {
            console.error('Delete error:', err);
            alert(err.response?.data?.detail || 'Gagal menghapus data');
        } finally {
            setIsLoading(false);
            setDeleteConfig(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleEdit = (item: SkuMapping) => {
        setEditingMapping(item.id);
        setEditId(item.id);
        setEditSku(item.sku);
        setEditRak(item.rak || '');
    };

    const handleSaveEdit = async () => {
        if (!editingMapping) return;
        setIsLoading(true);
        try {
            await axios.put(`${API_CONFIG.BASE_URL}/settings/sku-mappings/${encodeURIComponent(editingMapping)}`, {
                id: editId,
                sku: editSku,
                rak: editRak,
                gudang_id: activeWarehouseId
            });
            if (showToast) showToast('✓ Data berhasil diubah');
            setEditingMapping(null);
            fetchMappings();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Gagal mengubah data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/sku-mappings/bulk-delete`, { ids: selectedIds });
            if (showToast) showToast(`✓ ${selectedIds.length} data berhasil dihapus`);
            setSelectedIds([]);
            fetchMappings();
        } catch (err) {
            console.error('Failed to bulk delete:', err);
            alert('Gagal menghapus data terpilih');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleBulkExport = () => {
        if (selectedIds.length === 0) return;

        // Filter mappings to get full data for selected IDs
        const selectedData = mappings.filter(m => selectedIds.includes(m.id));

        // Prepare Excel data
        const dataToExcel = selectedData.map(item => ({
            'ID Custom': item.id,
            'Kode SKU': item.sku,
            'Lokasi Rak': item.rak || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Selected_SKU");
        XLSX.writeFile(wb, `Export_Selected_SKU_${new Date().getTime()}.xlsx`);
    };

    const handleToggleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
        setPage(1); // Reset to first page
    };

    const handleSelectAll = () => {
        if (selectedIds.length === mappings.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(mappings.map(m => m.id));
        }
    };

    const handleToggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleImport = async () => {
        if (!importFile) return;
        if (!activeWarehouseId) {
            setImportStatus({ type: 'error', message: 'Pilih gudang terlebih dahulu sebelum import.' });
            return;
        }
        setIsImporting(true);
        setImportStatus(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('gudang_id', activeWarehouseId);

        const timer = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 95) return prev;
                return prev + (prev < 80 ? 10 : 2);
            });
        }, 500);

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/settings/import-sku`, formData, {
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    const percent = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(percent > 95 ? 95 : percent);
                }
            });

            clearInterval(timer);
            setUploadProgress(100);
            await new Promise(r => setTimeout(r, 600));

            setImportStatus({ type: 'success', message: `Berhasil import ${res.data.count} data baru!` });
            if (showToast) showToast(`✓ Import Sukses: ${res.data.count} data`);
            setImportFile(null);
            fetchMappings();
        } catch (e: any) {
            clearInterval(timer);
            setUploadProgress(0);
            const detail = e.response?.data?.detail || 'Gagal mengimport file.';
            setImportStatus({ type: 'error', message: detail });
        } finally {
            setIsImporting(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const handleExport = () => {
        // window.open(`${API_CONFIG.BASE_URL}/settings/export-sku`, '_blank');
        // If there's search term, we might want to export only filtered?
        // But requested: "export semua data di pagination" usually means all records.
        // The backend /settings/export-sku already exports ALL.
        window.open(`${API_CONFIG.BASE_URL}/settings/export-sku`, '_blank');
    };

    const handleDownloadTemplate = () => {
        // Create a simple template excel with professional headers
        const template = [
            { 
                'ID Custom': '0001', 
                'Kode SKU': 'SKU-CONTOH-001', 
                'Lokasi Rak': 'A-01-01',
                'Lorong': 'ZONA-1'
            },
            { 
                'ID Custom': '0002', 
                'Kode SKU': 'SKU-CONTOH-002', 
                'Lokasi Rak': 'A-01-02',
                'Lorong': 'ZONA-1'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template_SKU");
        XLSX.writeFile(wb, "Template_Import_SKU_Database.xlsx");
    };

    const handleCreateWarehouse = async () => {
        const name = prompt("Masukkan nama gudang baru:");
        if (name && name.trim()) {
            try {
                const { error } = await supabase.from('warehouses').insert([{ name: name.trim() }]);
                if (error) {
                    if (error.code === '23505') alert('Nama gudang sudah ada!');
                    else throw error;
                } else {
                    if (showToast) showToast('✓ Gudang berhasil ditambahkan');
                }
            } catch (err: any) {
                alert(`Gagal menambah gudang: ${err.message}`);
            }
        }
    };

    return (
        <div className="animate-in fade-in duration-300">
            {/* Warehouse Tabs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center mb-6">
                <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 scrollbar-hide">
                    {warehouses.map(w => (
                        <button
                            key={w.id}
                            onClick={() => { setActiveWarehouseId(w.id); setPage(1); }}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap shadow-sm border ${
                                activeWarehouseId === w.id 
                                ? 'bg-blue-600 text-white border-blue-700' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {w.name}
                        </button>
                    ))}
                    {(user?.role === 'developer' || user?.role === 'admin') && (
                        <button
                            onClick={handleCreateWarehouse}
                            className="px-4 py-2.5 bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap ml-2 shadow-sm"
                        >
                            <FiPlus className="w-4 h-4" /> Gudang
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column forms */}
                <div className="lg:col-span-4 space-y-6">
                {/* Add New Card */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-gray-100 pb-2">
                        <FiPlus className="w-4 h-4" /> Tambah Manual
                    </h3>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">ID Custom</label>
                            <div className="relative">
                                <input
                                    value={newId}
                                    onChange={e => setNewId(e.target.value)}
                                    className="w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm text-gray-900 placeholder-gray-400"
                                    placeholder="0001"
                                />
                                <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-mono">#</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Kode SKU</label>
                            <input
                                value={newSku}
                                onChange={e => setNewSku(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 placeholder-gray-400"
                                placeholder="CONTOH-SKU-001"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Lokasi Rak / ID Rak</label>
                            <input
                                value={newRak}
                                onChange={e => setNewRak(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 placeholder-gray-400"
                                placeholder="A-01-02"
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={!newId || !newSku || !activeWarehouseId || isSaving}
                            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-100 disabled:text-blue-300 transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
                        >
                            {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                        </button>
                    </div>
                </div>

                {/* Import/Export Card */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-gray-100 pb-2">
                        <FiUpload className="w-4 h-4" /> Import / Export
                    </h3>
                    <div className="space-y-4">
                        {!importFile ? (
                            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={e => {
                                        if (e.target.files?.[0]) {
                                            setImportFile(e.target.files[0]);
                                            setImportStatus(null);
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="space-y-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-white border border-transparent group-hover:border-gray-200 transition-all">
                                        <FiUpload className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Klik utk upload Excel (.xlsx)
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 relative">
                                <button
                                    onClick={() => setImportFile(null)}
                                    className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-all"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FiFileText className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-semibold text-gray-900 truncate" title={importFile.name}>
                                            {importFile.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {(importFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {importFile && (
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="relative w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-all text-sm shadow-sm flex items-center justify-center gap-2 overflow-hidden"
                            >
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-green-500/30 transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}% ` }}
                                />
                                <span className="relative z-10 flex items-center gap-2">
                                    {isImporting ? (
                                        <>Memproses... {uploadProgress}%</>
                                    ) : (
                                        <>Proses Upload</>
                                    )}
                                </span>
                            </button>
                        )}

                        {importStatus && (
                            <div className={`p - 3 rounded - lg text - xs leading - relaxed ${importStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                } `}>
                                <div className="flex gap-2">
                                    <div className="mt-0.5 flex-shrink-0">
                                        {importStatus.type === 'success' ? <FiCheck className="w-3.5 h-3.5" /> : <FiAlertCircle className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="whitespace-pre-wrap font-medium">{importStatus.message}</div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                            <button
                                onClick={handleExport}
                                className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-95"
                            >
                                <FiDownload className="w-4 h-4" />
                                Export Semua Data SKU
                            </button>

                            <button
                                onClick={handleDownloadTemplate}
                                className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2 text-sm transition-all"
                            >
                                <FiFileText className="w-4 h-4" />
                                Download Template Import
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Table */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                                <FiDatabase className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Database SKU</h3>
                                <p className="text-[10px] text-gray-500 font-medium">KELOLA MAPPING ID & LOKASI RAK</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:flex-initial flex items-stretch gap-2">
                                <div className="relative flex-1">
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    {isMultiSearch ? (
                                        <textarea
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Cari banyak SKU (pisah baris/koma)..."
                                            className="w-full md:w-64 pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm resize-none h-24"
                                        />
                                    ) : (
                                        <input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Cari ID atau SKU..."
                                            className="w-full md:w-64 pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                        />
                                    )}
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                        >
                                            <FiX className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsMultiSearch(!isMultiSearch)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm active:scale-95 touch-manipulation ${
                                        isMultiSearch 
                                        ? 'bg-blue-600 text-white border-blue-700 shadow-blue-100' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title={isMultiSearch ? "Pindah ke cari satuan" : "Pindah ke cari banyak sekaligus"}
                                >
                                    {isMultiSearch ? 'Multi' : 'Single'}
                                </button>
                            </div>
                            <button
                                onClick={() => fetchMappings()}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-200 bg-white"
                                title="Refresh"
                            >
                                <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions & View Settings */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                            {selectedIds.length > 0 ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-2">
                                        {selectedIds.length} Baris Terpilih
                                        <button onClick={() => setSelectedIds([])} className="hover:text-red-500"><FiX className="w-3 h-3" /></button>
                                    </span>
                                    <button
                                        onClick={handleBulkExport}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <FiDownload className="w-3.5 h-3.5" />
                                        Export Terpilih
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfig({ isOpen: true, type: 'bulk', name: `${selectedIds.length} baris terpilih` })}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                        Hapus Terpilih
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setDeleteConfig({ isOpen: true, type: 'all', name: 'SELURUH DATABASE SKU' })}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all shadow-sm group"
                                >
                                    <FiTrash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                    Nuclear Delete All
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm">
                                <FiFilter className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs font-medium text-gray-500">Tampilan:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                                >
                                    <option value={50}>50 / hal</option>
                                    <option value={100}>100 / hal</option>
                                    <option value={200}>200 / hal</option>
                                    <option value={500}>500 / hal</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm text-gray-500 text-[10px] uppercase font-bold">
                            <tr>
                                <th className="px-6 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={mappings.length > 0 && selectedIds.length === mappings.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                <th
                                    className="px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors group w-32"
                                    onClick={() => handleToggleSort('custom_id')}
                                >
                                    <div className="flex items-center gap-2">
                                        ID Custom
                                        {sortConfig.key === 'custom_id' ? (
                                            sortConfig.direction === 'asc' ? <FiArrowUp className="w-3 h-3 text-blue-600" /> : <FiArrowDown className="w-3 h-3 text-blue-600" />
                                        ) : (
                                            <FiArrowUp className="w-3 h-3 opacity-0 group-hover:opacity-30" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors group w-32"
                                    onClick={() => handleToggleSort('rak')}
                                >
                                    <div className="flex items-center gap-2">
                                        Lokasi Rak
                                        {sortConfig.key === 'rak' ? (
                                            sortConfig.direction === 'asc' ? <FiArrowUp className="w-3 h-3 text-blue-600" /> : <FiArrowDown className="w-3 h-3 text-blue-600" />
                                        ) : (
                                            <FiArrowUp className="w-3 h-3 opacity-0 group-hover:opacity-30" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                                    onClick={() => handleToggleSort('sku')}
                                >
                                    <div className="flex items-center gap-2">
                                        Kode SKU
                                        {sortConfig.key === 'sku' ? (
                                            sortConfig.direction === 'asc' ? <FiArrowUp className="w-3 h-3 text-blue-600" /> : <FiArrowDown className="w-3 h-3 text-blue-600" />
                                        ) : (
                                            <FiArrowUp className="w-3 h-3 opacity-0 group-hover:opacity-30" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-12"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                ))
                            ) : mappings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                <FiDatabase className="w-8 h-8" />
                                            </div>
                                            <p className="text-gray-400 font-medium">Belum ada data di database</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                mappings.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        className={`hover:bg-blue-50/30 transition-all group ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <td className="px-6 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => handleToggleSelection(item.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        {editingMapping === item.id ? (
                                            <>
                                                <td className="px-6 py-3">
                                                    <input 
                                                        value={editId} 
                                                        onChange={e => setEditId(e.target.value)} 
                                                        className="w-full px-2 py-1 font-mono text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="ID"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input 
                                                        value={editRak} 
                                                        onChange={e => setEditRak(e.target.value)} 
                                                        className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Rak"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input 
                                                        value={editSku} 
                                                        onChange={e => setEditSku(e.target.value)} 
                                                        className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                            title="Simpan"
                                                        >
                                                            <FiCheck className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingMapping(null)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Batal"
                                                        >
                                                            <FiX className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-3 text-gray-900 font-mono text-sm font-medium">
                                                    {item.id}
                                                </td>
                                                <td className="px-6 py-3 text-gray-600 font-mono text-xs">
                                                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">
                                                        {item.rak || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-700 font-medium">
                                                    {item.sku}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Edit"
                                                        >
                                                            <FiEdit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfig({ isOpen: true, type: 'single', id: item.id, name: item.sku })}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Hapus"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-gray-500 font-medium">
                            Halaman <span className="text-blue-600 font-bold">{page}</span>
                        </p>
                        <div className="h-4 w-px bg-gray-200"></div>
                        <p className="text-xs text-gray-400">
                            Menampilkan {mappings.length} data
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="flex items-center gap-1 px-4 py-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                            Sebelumnya
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={!hasMore || isLoading}
                            className="flex items-center gap-1 px-4 py-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            Selanjutnya
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            </div>
            
            <DeleteConfirmationModal
                isOpen={deleteConfig.isOpen}
                onClose={() => setDeleteConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmDelete}
                title={deleteConfig.type === 'all' ? 'Nuclear Delete All' : 'Konfirmasi Hapus'}
                message={
                    deleteConfig.type === 'all'
                        ? 'Apakah Anda benar-benar yakin ingin mengosongkan SELURUH database SKU?'
                        : deleteConfig.type === 'bulk'
                            ? `Apakah Anda yakin ingin menghapus ${selectedIds.length} data terpilih?`
                            : undefined
                }
                itemName={deleteConfig.name}
            />
        </div>
    );
};

export default AdminSkuDatabase;
