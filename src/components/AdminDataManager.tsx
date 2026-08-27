import React, { useState, useEffect } from 'react';
import { FiTrash2, FiDatabase, FiRefreshCcw, FiCheckSquare, FiSquare, FiChevronLeft, FiChevronRight, FiCalendar, FiSearch } from 'react-icons/fi';
import { supabase } from '../supabaseClient';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import CustomTimePicker from './CustomTimePicker';
import axios from 'axios';
import { API_CONFIG } from '../constants';
interface DataItem {
    id: string;
    [key: string]: any;
}

interface AdminDataManagerProps {
    showToast?: (message: string) => void;
}

const ITEMS_PER_PAGE = 50;

const AdminDataManager: React.FC<AdminDataManagerProps> = ({ showToast }) => {
    const [activeTable, setActiveTable] = useState<'label_process_history' | 'processed_items'>('processed_items');
    const [data, setData] = useState<DataItem[]>([]);
    const [allData, setAllData] = useState<DataItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [showDeleteButton, setShowDeleteButton] = useState(false);
    const [secretBuffer, setSecretBuffer] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Date Filter
    const [filterDate, setFilterDate] = useState('');

    // Time Filter (for processed_at)
    const [filterTimeFrom, setFilterTimeFrom] = useState('');
    const [filterTimeTo, setFilterTimeTo] = useState('');
    const [timeMatchMode, setTimeMatchMode] = useState<'range' | 'exact'>('range');

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [isMultiSearch, setIsMultiSearch] = useState(false);

    // Keyboard listener for secret phrase "showdelete"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const newBuffer = (secretBuffer + e.key).slice(-10); // Keep last 10 chars
            setSecretBuffer(newBuffer);
            if (newBuffer.toLowerCase() === 'showdelete') {
                setShowDeleteButton(true);
                showToast?.('🔓 Mode hapus diaktifkan');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [secretBuffer]);

    useEffect(() => {
        // Reset filters when switching tables
        setFilterDate('');
        setFilterTimeFrom('');
        setFilterTimeTo('');
        setSearchQuery('');
        setTimeMatchMode('range');

        fetchData();
    }, [activeTable]);

    // Filter and paginate data when filter or page changes
    useEffect(() => {
        let filtered = [...allData];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (isMultiSearch) {
                // Multi-search logic: split by newline or comma
                const queries = query.split(/[\n,]+/).map(q => q.trim()).filter(q => q.length > 0);
                if (queries.length > 0) {
                    filtered = filtered.filter(item => {
                        return queries.some(q =>
                            Object.values(item).some(val =>
                                val && String(val).toLowerCase().includes(q)
                            )
                        );
                    });
                }
            } else {
                // Single search logic
                filtered = filtered.filter(item => {
                    return Object.values(item).some(val =>
                        val && String(val).toLowerCase().includes(query)
                    );
                });
            }
        }

        // Apply date filter if set
        if (filterDate) {
            filtered = filtered.filter(item => {
                const dateColumn = activeTable === 'processed_items' ? 'date_processed' : 'created_at';
                const itemDate = item[dateColumn];
                if (!itemDate) return false;
                return itemDate.startsWith(filterDate);
            });
        }

        // Apply time filter if set (only for processed_items)
        if (activeTable === 'processed_items' && filterTimeFrom) {
            filtered = filtered.filter(item => {
                const processedAt = item['processed_at'];
                if (!processedAt) return false;

                const itemTime = new Date(processedAt).toTimeString().slice(0, 8); // HH:MM:SS

                if (timeMatchMode === 'exact') {
                    // Exact match - time must start with the filter value
                    return itemTime.startsWith(filterTimeFrom);
                } else {
                    // Range mode
                    if (filterTimeFrom && itemTime < filterTimeFrom) return false;
                    if (filterTimeTo && itemTime > filterTimeTo) return false;
                    return true;
                }
            });
        }

        setData(filtered);
        setCurrentPage(1); // Reset to page 1 when filter changes
    }, [filterDate, filterTimeFrom, filterTimeTo, timeMatchMode, searchQuery, allData, activeTable]);

    const fetchDataFromServer = async () => {
        setLoading(true);
        setSelectedIds(new Set());
        try {
            const orderColumn = activeTable === 'processed_items' ? 'processed_at' : 'created_at';

            let query = supabase
                .from(activeTable)
                .select('*');

            // Apply Server-Side Date Filter
            if (filterDate) {
                const dateColumn = activeTable === 'processed_items' ? 'date_processed' : 'created_at';
                
                // For local timezone safety, we just use string matching or greater than
                const startOfDay = new Date(filterDate + 'T00:00:00');
                const endOfDay = new Date(filterDate + 'T23:59:59');
                
                query = query.gte(dateColumn, startOfDay.toISOString());
                query = query.lte(dateColumn, endOfDay.toISOString());
            }

            // Apply Server-Side Search
            if (searchQuery.trim()) {
                const term = searchQuery.trim();
                if (isMultiSearch) {
                    const queries = term.split(/[\n,]+/).map(q => q.trim()).filter(q => q.length > 0);
                    if (queries.length > 0) {
                        if (activeTable === 'processed_items') {
                            const formatted = `(${queries.join(',')})`;
                            query = query.or(`order_id.in.${formatted},awb.in.${formatted}`);
                        } else {
                            query = query.or(`excel_name.ilike.%${queries[0]}%`);
                        }
                    }
                } else {
                    if (activeTable === 'processed_items') {
                        if (term.includes('.')) {
                            query = query.or(`excel_filename.ilike.%${term}%`);
                        } else {
                            query = query.or(`order_id.eq.${term},awb.eq.${term},order_id.ilike.${term}%,awb.ilike.${term}%`);
                        }
                    } else {
                        query = query.or(`excel_name.ilike.%${term}%`);
                    }
                }
            }

            const { data: items, error } = await query
                .order(orderColumn, { ascending: false })
                .limit(5000);

            if (error) {
                throw error;
            }

            setAllData(items || []);
            setData(items || []); // Local filter will run, but that's fine since they match
            setCurrentPage(1);
            showToast?.(`✓ Ditemukan ${items?.length || 0} data dari server`);
        } catch (err: any) {
            console.error('Server search error:', err);
            showToast?.(`❌ Gagal cari di server: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setSelectedIds(new Set());
        try {
            // Use correct order column for each table
            const orderColumn = activeTable === 'processed_items' ? 'processed_at' : 'created_at';

            // Fetch data with limit to avoid timeouts (descending order)
            const { data: items, error } = await supabase
                .from(activeTable)
                .select('*')
                .order(orderColumn, { ascending: false })
                .limit(5000);

            if (error) {
                console.error('[AdminDataManager] Supabase Fetch Error:', error);
                showToast?.(`❌ Gagal ambil data: ${error.message}`);
                throw error;
            }
            setAllData(items || []);
            setData(items || []);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const paginatedData = data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        // Toggle behavior:
        // 1. If everything in CURRENT filtered set (data) is already selected -> Clear selection
        // 2. Otherwise -> Select everything in CURRENT filtered set
        const filteredIds = data.map(d => d.id);
        const allFilteredSelected = filteredIds.every(id => selectedIds.has(id));

        if (allFilteredSelected && filteredIds.length > 0) {
            // Deselect all in filtered set
            const newSet = new Set(selectedIds);
            filteredIds.forEach(id => newSet.delete(id));
            setSelectedIds(newSet);
        } else {
            // Select all in filtered set
            const newSet = new Set(selectedIds);
            filteredIds.forEach(id => newSet.add(id));
            setSelectedIds(newSet);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        const idsToDelete = Array.from(selectedIds);
        console.log('[DELETE] Attempting to delete', idsToDelete.length, 'items from', activeTable);
        console.log('[DELETE] IDs:', idsToDelete);

        try {
            // Bypass RLS silently failing by using backend Service Key endpoint
            const response = await axios.post(`${API_CONFIG.BASE_URL}/admin/delete`, {
                table: activeTable,
                ids: idsToDelete
            });

            console.log('[DELETE] Response:', response.data);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Unknown server error');
            }

            // Verify deletion was successful
            const deletedCount = response.data.deleted || idsToDelete.length;
            showToast?.(`✓ ${deletedCount} data berhasil dihapus`);
            setDeleteModalOpen(false);
            setSelectedIds(new Set());

            // Refresh data from server to confirm deletion
            await fetchData();
        } catch (err: any) {
            console.error('[DELETE] Error:', err);
            showToast?.(`❌ Gagal menghapus: ${err.message || 'Unknown error'}`);
            alert('Gagal menghapus: ' + (err.message || JSON.stringify(err)));
        }
    };

    const getDisplayColumns = () => {
        if (activeTable === 'processed_items') {
            return ['order_id', 'awb', 'excel_filename', 'date_processed', 'processed_at'];
        }
        return ['id', 'excel_name', 'created_at'];
    };

    // Format time only from date string
    const formatTimeOnly = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID');
    };

    const handleTimeClick = (fullTimestamp: string) => {
        if (!fullTimestamp) return;
        try {
            const dateObj = new Date(fullTimestamp);
            // Get YYYY-MM-DD for date input
            // Use local date string to avoid timezone shifts affecting the day
            const offset = dateObj.getTimezoneOffset() * 60000;
            const localDate = new Date(dateObj.getTime() - offset);
            const dateStr = localDate.toISOString().split('T')[0];

            setFilterDate(dateStr);

            // Get HH:MM:SS for time input
            const timeStr = dateObj.toTimeString().slice(0, 8);
            setFilterTimeFrom(timeStr);
            setFilterTimeTo('');
            setTimeMatchMode('exact');

            showToast && showToast(`🔍 Filter set ke: ${dateStr} ${timeStr}`);
        } catch (e) {
            console.error("Invalid date click:", e);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Kelola Data Supabase</h2>
                    <p className="text-sm text-gray-500">Total: {data.length.toLocaleString()} data (dari {allData.length.toLocaleString()})</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTable('processed_items')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTable === 'processed_items' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <FiDatabase className="w-4 h-4" /> processed_items
                    </button>
                    <button
                        onClick={() => setActiveTable('label_process_history')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTable === 'label_process_history' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <FiDatabase className="w-4 h-4" /> label_process_history
                    </button>
                </div>
            </div>

            {/* Filter & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
                        title={data.length > 0 && data.every(d => selectedIds.has(d.id)) ? "Batalkan Semua" : "Pilih Semua Hasil Filter"}
                    >
                        {data.length > 0 && data.every(d => selectedIds.has(d.id)) ? <FiCheckSquare className="w-5 h-5 text-blue-600" /> : <FiSquare className="w-5 h-5" />}
                        {selectedIds.size > 0 ? (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px]">
                                {selectedIds.size} terpilih
                            </span>
                        ) : 'Pilih Semua'}
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                            Reset Seleksi
                        </button>
                    )}
                    <button onClick={fetchData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
                        <FiRefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Date Filter - Clickable calendar */}
                <div className="flex items-center gap-2">
                    <div
                        className="relative cursor-pointer flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100"
                        onClick={(e) => {
                            const input = e.currentTarget.querySelector('input');
                            if (input) input.showPicker();
                        }}
                    >
                        <FiCalendar className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600">
                            {filterDate ? new Date(filterDate + 'T00:00:00').toLocaleDateString('id-ID') : 'Pilih Tanggal'}
                        </span>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    {filterDate && (
                        <button
                            onClick={() => setFilterDate('')}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Search Input */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            {isMultiSearch ? (
                                <textarea
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Input banyak ID/AWB (pisah baris/koma)..."
                                    className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari satu data..."
                                    className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            )}
                        </div>
                        <button
                            onClick={() => setIsMultiSearch(!isMultiSearch)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isMultiSearch ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            title={isMultiSearch ? "Pindah ke cari satuan" : "Pindah ke cari banyak sekaligus"}
                        >
                            {isMultiSearch ? 'Mode: Banyak' : 'Mode: Satuan'}
                        </button>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1 rounded"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={fetchDataFromServer}
                            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-all"
                            title="Cari langsung ke database untuk mencari data lama (> 5000 data)"
                        >
                            Cari Server (Data Lama)
                        </button>
                    </div>
                </div>

                {/* Time Filter (only for processed_items) */}
                {activeTable === 'processed_items' && (
                    <div className="flex items-center gap-2 z-20">
                        <span className="text-sm text-gray-500 font-medium w-12">Waktu:</span>

                        {/* Mode Toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-0.5 h-8 items-center">
                            <button
                                onClick={() => setTimeMatchMode('range')}
                                className={`px-3 h-full flex items-center text-xs rounded-md font-medium transition-all ${timeMatchMode === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Range
                            </button>
                            <button
                                onClick={() => setTimeMatchMode('exact')}
                                className={`px-3 h-full flex items-center text-xs rounded-md font-medium transition-all ${timeMatchMode === 'exact' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Sama
                            </button>
                        </div>

                        {/* Custom Time Pickers */}
                        <CustomTimePicker
                            value={filterTimeFrom}
                            onChange={setFilterTimeFrom}
                            placeholder={timeMatchMode === 'exact' ? 'Waktu Tepat' : 'Mulai'}
                        />

                        {timeMatchMode === 'range' && (
                            <>
                                <span className="text-gray-400 text-sm mx-1">-</span>
                                <CustomTimePicker
                                    value={filterTimeTo}
                                    onChange={setFilterTimeTo}
                                    placeholder="Selesai"
                                />
                            </>
                        )}

                        {(filterTimeFrom || filterTimeTo) && (
                            <button
                                onClick={() => { setFilterTimeFrom(''); setFilterTimeTo(''); }}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {showDeleteButton && (
                        <button
                            onClick={() => setDeleteModalOpen(true)}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-all hover:scale-[1.02]"
                        >
                            <FiTrash2 className="w-4 h-4" /> Hapus Permanen ({selectedIds.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 w-12">
                                <button
                                    onClick={toggleSelectAll}
                                    title={data.length > 0 && data.every(d => selectedIds.has(d.id)) ? "Deselect All Results" : "Select All Results"}
                                >
                                    {data.length > 0 && data.every(d => selectedIds.has(d.id)) ? <FiCheckSquare className="w-5 h-5 text-blue-600" /> : <FiSquare className="w-5 h-5 text-gray-400" />}
                                </button>
                            </th>
                            {getDisplayColumns().map(col => (
                                <th key={col} className="px-4 py-3 font-medium text-gray-700 capitalize">{col.replace(/_/g, ' ')}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                        ) : paginatedData.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada data</td></tr>
                        ) : paginatedData.map(item => (
                            <tr key={item.id} className={`hover:bg-gray-50 ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}>
                                <td className="px-4 py-3">
                                    <button onClick={() => toggleSelect(item.id)}>
                                        {selectedIds.has(item.id) ? <FiCheckSquare className="w-5 h-5 text-blue-600" /> : <FiSquare className="w-5 h-5 text-gray-400" />}
                                    </button>
                                </td>
                                {getDisplayColumns().map(col => (
                                    <td key={col} className="px-4 py-3 truncate max-w-[200px]" title={String(item[col] ?? '')}>
                                        {col === 'processed_at' ? (
                                            // Show time only for processed_at - CLICKABLE
                                            <span
                                                onClick={() => handleTimeClick(item[col])}
                                                className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                                title="Klik untuk filter waktu persis ini"
                                            >
                                                {formatTimeOnly(item[col])}
                                            </span>
                                        ) : col.includes('_at') || col === 'date_processed' ? (
                                            // Show full date for other date columns - CLICKABLE
                                            <span
                                                onClick={() => handleTimeClick(item[col])}
                                                className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                                title="Klik untuk filter waktu persis ini"
                                            >
                                                {item[col] ? new Date(item[col]).toLocaleString('id-ID') : '-'}
                                            </span>
                                        ) : String(item[col] ?? '-')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-600">
                        Halaman {currentPage} dari {totalPages} ({data.length.toLocaleString()} data)
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                itemName={`${selectedIds.size} data dari ${activeTable}`}
                title="Konfirmasi Penghapusan Data"
            />
        </div>
    );
};

export default AdminDataManager;
