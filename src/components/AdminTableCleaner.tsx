import React, { useState, useEffect } from 'react';
import { FiDatabase, FiTrash2, FiRefreshCcw, FiCalendar, FiChevronDown, FiChevronUp, FiAlertTriangle, FiX, FiHardDrive, FiSearch, FiArrowDown, FiArrowUp } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';

interface TableInfo {
    table_name: string;
    estimated_rows: number;
    total_size_bytes: number;
    total_size_pretty: string;
}

interface AdminTableCleanerProps {
    showToast?: (message: string) => void;
}

const AdminTableCleaner: React.FC<AdminTableCleanerProps> = ({ showToast }) => {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortBy, setSortBy] = useState<'size' | 'name' | 'rows'>('size');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [searchFilter, setSearchFilter] = useState('');

    // Cleanup panel state
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [dateColumns, setDateColumns] = useState<string[]>([]);
    const [selectedDateCol, setSelectedDateCol] = useState('');
    const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingColumns, setLoadingColumns] = useState(false);

    // Delete confirmation
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchTableSizes();
    }, []);

    const fetchTableSizes = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/admin/table-sizes`);
            setTables(res.data || []);
        } catch (err: any) {
            console.error('Failed to fetch table sizes:', err);
            showToast?.(`❌ Gagal memuat data tabel: ${err.response?.data?.detail || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTable = async (tableName: string) => {
        if (selectedTable === tableName) {
            setSelectedTable(null);
            return;
        }
        setSelectedTable(tableName);
        setDateColumns([]);
        setSelectedDateCol('');
        setDateFrom('');
        setDateTo('');
        setPreviewCount(null);
        setLoadingColumns(true);

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/admin/table-columns`, { table_name: tableName });
            const dateCols = res.data.date_columns || [];
            setDateColumns(dateCols);
            if (dateCols.length > 0) {
                // Auto-select best date column
                const priority = ['created_at', 'processed_at', 'date_processed', 'updated_at'];
                const best = priority.find(p => dateCols.includes(p)) || dateCols[0];
                setSelectedDateCol(best);
            }
        } catch (err: any) {
            console.error('Failed to get columns:', err);
            showToast?.(`❌ Gagal membaca kolom tabel`);
        } finally {
            setLoadingColumns(false);
        }
    };

    const handlePreviewCount = async () => {
        if (!selectedTable || !selectedDateCol || !dateFrom) return;
        setLoadingPreview(true);
        setPreviewCount(null);
        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/admin/table-count`, {
                table_name: selectedTable,
                date_column: selectedDateCol,
                date_from: dateFrom,
                date_to: dateMode === 'range' ? dateTo : dateFrom,
            });
            setPreviewCount(res.data.count);
        } catch (err: any) {
            console.error('Preview count error:', err);
            showToast?.(`❌ Gagal menghitung data`);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedTable || !selectedDateCol || !dateFrom) return;
        setDeleting(true);
        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/admin/table-cleanup`, {
                table_name: selectedTable,
                date_column: selectedDateCol,
                date_from: dateFrom,
                date_to: dateMode === 'range' ? dateTo : dateFrom,
            });
            showToast?.(`✓ Berhasil menghapus ${res.data.deleted_count} data dari ${selectedTable}`);
            setShowConfirmModal(false);
            setConfirmText('');
            setPreviewCount(null);
            setSelectedTable(null);
            fetchTableSizes(); // Refresh sizes
        } catch (err: any) {
            console.error('Delete error:', err);
            showToast?.(`❌ Gagal menghapus: ${err.response?.data?.detail || err.message}`);
        } finally {
            setDeleting(false);
        }
    };

    // Sort logic
    const safeTables = Array.isArray(tables) ? tables : [];
    const sortedTables = [...safeTables]
        .filter(t => !searchFilter || t.table_name.toLowerCase().includes(searchFilter.toLowerCase()))
        .sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'size') cmp = a.total_size_bytes - b.total_size_bytes;
            else if (sortBy === 'rows') cmp = a.estimated_rows - b.estimated_rows;
            else cmp = a.table_name.localeCompare(b.table_name);
            return sortDir === 'desc' ? -cmp : cmp;
        });

    const totalSize = safeTables.reduce((sum, t) => sum + (t.total_size_bytes || 0), 0);
    const totalRows = safeTables.reduce((sum, t) => sum + (t.estimated_rows || 0), 0);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const getSizeColor = (bytes: number) => {
        if (bytes > 100 * 1024 * 1024) return 'text-red-600 bg-red-50';   // >100MB
        if (bytes > 10 * 1024 * 1024) return 'text-orange-600 bg-orange-50'; // >10MB
        if (bytes > 1 * 1024 * 1024) return 'text-yellow-600 bg-yellow-50';  // >1MB
        return 'text-green-600 bg-green-50';
    };

    const getSizeBarWidth = (bytes: number) => {
        const maxBytes = Math.max(...tables.map(t => t.total_size_bytes), 1);
        return Math.max(2, (bytes / maxBytes) * 100);
    };

    const toggleSort = (field: 'size' | 'name' | 'rows') => {
        if (sortBy === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDir(field === 'name' ? 'asc' : 'desc');
        }
    };

    const SortIcon = ({ field }: { field: 'size' | 'name' | 'rows' }) => {
        if (sortBy !== field) return <FiArrowDown className="w-3 h-3 opacity-30" />;
        return sortDir === 'desc' ? <FiArrowDown className="w-3 h-3 text-blue-600" /> : <FiArrowUp className="w-3 h-3 text-blue-600" />;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FiHardDrive className="w-5 h-5 text-red-500" /> Table Cleaner
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Lihat ukuran tabel Supabase dan hapus data berdasarkan tanggal.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Stats badges */}
                        <div className="flex gap-2 text-xs">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                                {tables.length} Tabel
                            </span>
                            <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-medium">
                                ~{totalRows.toLocaleString()} Rows
                            </span>
                            <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-medium">
                                {formatSize(totalSize)}
                            </span>
                        </div>
                        <button
                            onClick={fetchTableSizes}
                            disabled={loading}
                            className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <FiRefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="mt-4 relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        placeholder="Filter nama tabel..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                </div>
            </div>

            {/* Table List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th
                                className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                                onClick={() => toggleSort('name')}
                            >
                                <span className="flex items-center gap-1">
                                    Nama Tabel <SortIcon field="name" />
                                </span>
                            </th>
                            <th
                                className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none text-right"
                                onClick={() => toggleSort('rows')}
                            >
                                <span className="flex items-center gap-1 justify-end">
                                    Est. Rows <SortIcon field="rows" />
                                </span>
                            </th>
                            <th
                                className="px-6 py-4 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 select-none"
                                onClick={() => toggleSort('size')}
                            >
                                <span className="flex items-center gap-1">
                                    Ukuran <SortIcon field="size" />
                                </span>
                            </th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <FiRefreshCcw className="w-6 h-6 animate-spin" />
                                    <span>Memuat data tabel...</span>
                                </div>
                            </td></tr>
                        ) : sortedTables.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                <FiDatabase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p>Tidak ada tabel ditemukan</p>
                                <p className="text-xs mt-1">Pastikan RPC <code>get_table_sizes()</code> sudah dibuat di Supabase.</p>
                            </td></tr>
                        ) : sortedTables.map(table => (
                            <React.Fragment key={table.table_name}>
                                <tr
                                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedTable === table.table_name ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => handleSelectTable(table.table_name)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <FiDatabase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="font-mono font-medium text-gray-900">{table.table_name}</span>
                                            {selectedTable === table.table_name ?
                                                <FiChevronUp className="w-4 h-4 text-blue-500" /> :
                                                <FiChevronDown className="w-4 h-4 text-gray-400" />
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono text-gray-700">{table.estimated_rows.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                                                    style={{ width: `${getSizeBarWidth(table.total_size_bytes)}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getSizeColor(table.total_size_bytes)}`}>
                                                {table.total_size_pretty}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleSelectTable(table.table_name)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                selectedTable === table.table_name
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1">
                                                <FiTrash2 className="w-3 h-3" />
                                                {selectedTable === table.table_name ? 'Tutup' : 'Bersihkan'}
                                            </span>
                                        </button>
                                    </td>
                                </tr>

                                {/* Cleanup Panel */}
                                {selectedTable === table.table_name && (
                                    <tr>
                                        <td colSpan={4} className="px-0 py-0">
                                            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border-t border-b border-blue-100 px-8 py-6 animate-in slide-in-from-top-2 duration-200">
                                                <div className="max-w-2xl">
                                                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <FiTrash2 className="w-4 h-4 text-red-500" />
                                                        Hapus Data dari <span className="font-mono text-blue-600">{table.table_name}</span>
                                                    </h4>

                                                    {loadingColumns ? (
                                                        <p className="text-sm text-gray-400">Memuat kolom...</p>
                                                    ) : dateColumns.length === 0 ? (
                                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                                                            <FiAlertTriangle className="inline w-4 h-4 mr-1" />
                                                            Tabel ini tidak memiliki kolom tanggal. Penghapusan berdasarkan tanggal tidak tersedia.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {/* Date Column Selector */}
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kolom Tanggal</label>
                                                                <select
                                                                    value={selectedDateCol}
                                                                    onChange={e => { setSelectedDateCol(e.target.value); setPreviewCount(null); }}
                                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                                                >
                                                                    {dateColumns.map(col => (
                                                                        <option key={col} value={col}>{col}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            {/* Date Mode Toggle */}
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mode Filter</label>
                                                                <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
                                                                    <button
                                                                        onClick={() => { setDateMode('single'); setDateTo(''); setPreviewCount(null); }}
                                                                        className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all ${dateMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                    >
                                                                        Tanggal Tunggal
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setDateMode('range'); setPreviewCount(null); }}
                                                                        className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all ${dateMode === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                    >
                                                                        Rentang Tanggal
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Date Pickers */}
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1">
                                                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                                        {dateMode === 'single' ? 'Tanggal' : 'Dari Tanggal'}
                                                                    </label>
                                                                    <div className="relative">
                                                                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                                        <input
                                                                            type="date"
                                                                            value={dateFrom}
                                                                            onChange={e => { setDateFrom(e.target.value); setPreviewCount(null); }}
                                                                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {dateMode === 'range' && (
                                                                    <div className="flex-1">
                                                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sampai Tanggal</label>
                                                                        <div className="relative">
                                                                            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                                            <input
                                                                                type="date"
                                                                                value={dateTo}
                                                                                onChange={e => { setDateTo(e.target.value); setPreviewCount(null); }}
                                                                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex items-center gap-3 pt-2">
                                                                <button
                                                                    onClick={handlePreviewCount}
                                                                    disabled={!dateFrom || loadingPreview}
                                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                                >
                                                                    {loadingPreview ? (
                                                                        <><FiRefreshCcw className="w-3.5 h-3.5 animate-spin" /> Menghitung...</>
                                                                    ) : (
                                                                        <><FiSearch className="w-3.5 h-3.5" /> Hitung Data</>
                                                                    )}
                                                                </button>

                                                                {previewCount !== null && (
                                                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${previewCount > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                                                        <span>{previewCount.toLocaleString()} data ditemukan</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Delete Button - only show when preview count > 0 */}
                                                            {previewCount !== null && previewCount > 0 && (
                                                                <div className="pt-2 border-t border-gray-200">
                                                                    <button
                                                                        onClick={() => setShowConfirmModal(true)}
                                                                        className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg text-sm font-bold hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2"
                                                                    >
                                                                        <FiTrash2 className="w-4 h-4" />
                                                                        Hapus {previewCount.toLocaleString()} Data
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
                    onClick={() => setShowConfirmModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden transform transition-all animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-red-500 to-rose-600 p-8 text-center">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
                                <FiAlertTriangle className="w-10 h-10 text-white animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Konfirmasi Penghapusan</h3>
                            <p className="text-sm text-red-100">Tindakan ini tidak dapat dibatalkan!</p>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-4">
                                <p className="text-sm text-gray-600 mb-1">Data yang akan dihapus:</p>
                                <p className="font-bold text-gray-900">
                                    {previewCount?.toLocaleString()} data dari <span className="font-mono text-red-600">{selectedTable}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Periode: {dateFrom} {dateMode === 'range' && dateTo ? `s/d ${dateTo}` : '(satu hari)'}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Ketik <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{selectedTable}</span> untuk mengkonfirmasi:
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    placeholder={selectedTable || ''}
                                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="grid grid-cols-2 gap-3 p-6 pt-0">
                            <button
                                onClick={() => { setShowConfirmModal(false); setConfirmText(''); }}
                                className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={confirmText !== selectedTable || deleting}
                                className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <><FiRefreshCcw className="w-4 h-4 animate-spin" /> Menghapus...</>
                                ) : (
                                    <><FiTrash2 className="w-4 h-4" /> Ya, Hapus</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTableCleaner;
