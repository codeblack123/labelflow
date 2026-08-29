import React, { useState, useEffect } from 'react';
import { FiTrash2, FiDatabase, FiRefreshCcw, FiCheckSquare, FiSquare, FiChevronLeft, FiChevronRight, FiCalendar, FiSearch, FiZap, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';
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
    user?: any;
}

const ITEMS_PER_PAGE = 50;

const AdminDataManager: React.FC<AdminDataManagerProps> = ({ showToast, user }) => {
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

    // Quick Purge & Orphan Cleanup States
    const [quickPurgeInput, setQuickPurgeInput] = useState('');
    const [isQuickPurging, setIsQuickPurging] = useState(false);
    const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
    const [orphanScanResult, setOrphanScanResult] = useState<{ totalOrphans: number; orphanFilenames: string[] } | null>(null);

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
        if (!user) return; // Wait until user is loaded

        // Reset filters when switching tables
        setFilterDate('');
        setFilterTimeFrom('');
        setFilterTimeTo('');
        setSearchQuery('');
        setTimeMatchMode('range');

        fetchData();
    }, [activeTable, user?.username, user?.tenant_id]);

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

            const activeTenantId = user?.tenant_id || user?.username;
            const isDevOrAdmin = user?.role === 'developer' || user?.role === 'admin' || user?.username === 'developer' || user?.username === 'admin' || !user?.tenant_id;

            if (activeTenantId && !isDevOrAdmin) {
                if (activeTable === 'label_process_history') {
                    query = query.eq('tenant_id', activeTenantId);
                }
            }

            // Apply Server-Side Date Filter
            if (filterDate) {
                const dateColumn = activeTable === 'processed_items' ? 'date_processed' : 'created_at';
                
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
            setData(items || []);
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
            const orderColumn = activeTable === 'processed_items' ? 'processed_at' : 'created_at';

            let query = supabase
                .from(activeTable)
                .select('*');

            const activeTenantId = user?.tenant_id || user?.username;
            const isDevOrAdmin = user?.role === 'developer' || user?.role === 'admin' || user?.username === 'developer' || user?.username === 'admin' || !user?.tenant_id;

            if (activeTenantId && !isDevOrAdmin) {
                if (activeTable === 'label_process_history') {
                    query = query.eq('tenant_id', activeTenantId);
                }
            }

            // Fetch data with limit to avoid timeouts (descending order)
            const { data: items, error } = await query
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
        const filteredIds = data.map(d => d.id);
        const allFilteredSelected = filteredIds.every(id => selectedIds.has(id));

        if (allFilteredSelected && filteredIds.length > 0) {
            const newSet = new Set(selectedIds);
            filteredIds.forEach(id => newSet.delete(id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            filteredIds.forEach(id => newSet.add(id));
            setSelectedIds(newSet);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        const idsToDelete = Array.from(selectedIds);

        try {
            const response = await axios.post(`${API_CONFIG.BASE_URL}/admin/delete`, {
                table: activeTable,
                ids: idsToDelete
            });

            if (!response.data.success) {
                throw new Error(response.data.message || 'Unknown server error');
            }

            const deletedCount = response.data.deleted || idsToDelete.length;
            showToast?.(`✓ ${deletedCount} data berhasil dihapus`);
            setDeleteModalOpen(false);
            setSelectedIds(new Set());

            await fetchData();
        } catch (err: any) {
            console.error('[DELETE] Error:', err);
            showToast?.(`❌ Gagal menghapus: ${err.message || 'Unknown error'}`);
            alert('Gagal menghapus: ' + (err.message || JSON.stringify(err)));
        }
    };

    // Quick Purge Handler
    const handleQuickPurge = async () => {
        if (!quickPurgeInput.trim()) return;
        const targets = quickPurgeInput.split(/[\n,;\s]+/).map(t => t.trim()).filter(Boolean);
        if (targets.length === 0) return;

        setIsQuickPurging(true);
        try {
            const files = targets.filter(t => t.toLowerCase().endsWith('.xlsx') || t.toLowerCase().endsWith('.xls'));
            const orderIds = targets.filter(t => !t.toLowerCase().endsWith('.xlsx') && !t.toLowerCase().endsWith('.xls'));

            if (orderIds.length > 0) {
                await axios.post(`${API_CONFIG.BASE_URL}/clean-duplicate-orders`, { order_ids: orderIds }).catch(() => {});
                for (let i = 0; i < orderIds.length; i += 50) {
                    const chunk = orderIds.slice(i, i + 50);
                    await supabase.from('processed_items').delete().in('order_id', chunk);
                    await supabase.from('processed_items').delete().in('awb', chunk);
                }
            }
            for (const file of files) {
                await axios.post(`${API_CONFIG.BASE_URL}/clean-duplicate-orders`, { excel_filename: file }).catch(() => {});
                await supabase.from('processed_items').delete().eq('excel_filename', file);
            }

            showToast?.(`✓ Berhasil menghapus catatan duplikat untuk ${targets.length} item.`);
            setQuickPurgeInput('');
            await fetchData();
        } catch (err: any) {
            console.error('Quick purge failed:', err);
            showToast?.(`❌ Gagal hapus: ${err.message}`);
        } finally {
            setIsQuickPurging(false);
        }
    };

    // Orphan Scanner Handler
    const handleScanOrphans = async () => {
        setIsCleaningOrphans(true);
        try {
            const { data: histories } = await supabase.from('label_process_history').select('excel_filename');
            const historyFilenames = new Set((histories || []).map((h: any) => h.excel_filename).filter(Boolean));

            const { data: processed } = await supabase.from('processed_items').select('excel_filename');
            const processedFilenames = Array.from(new Set((processed || []).map((p: any) => p.excel_filename).filter(Boolean)));

            const orphanFilenames = processedFilenames.filter(f => !historyFilenames.has(f));
            const orphanCount = (processed || []).filter((p: any) => !historyFilenames.has(p.excel_filename)).length;

            setOrphanScanResult({
                totalOrphans: orphanCount,
                orphanFilenames
            });

            if (orphanCount === 0) {
                showToast?.('✓ Tidak ada data yatim. Database processed_items sudah 100% sinkron!');
            } else {
                showToast?.(`⚠️ Ditemukan ${orphanCount} baris data yatim dari ${orphanFilenames.length} file.`);
            }
        } catch (err: any) {
            console.error('Error scanning orphans:', err);
            showToast?.(`❌ Gagal scan: ${err.message}`);
        } finally {
            setIsCleaningOrphans(false);
        }
    };

    const handlePurgeOrphans = async () => {
        if (!orphanScanResult || orphanScanResult.orphanFilenames.length === 0) return;
        if (!window.confirm(`Hapus ${orphanScanResult.totalOrphans} data yatim dari database?`)) return;

        setIsCleaningOrphans(true);
        try {
            for (const fname of orphanScanResult.orphanFilenames) {
                await axios.post(`${API_CONFIG.BASE_URL}/clean-duplicate-orders`, {
                    excel_filename: fname
                }).catch(() => {});
                await supabase.from('processed_items').delete().eq('excel_filename', fname);
            }
            showToast?.(`✓ Berhasil menghapus ${orphanScanResult.totalOrphans} data yatim!`);
            setOrphanScanResult(null);
            await fetchData();
        } catch (err: any) {
            console.error('Error purging orphans:', err);
            showToast?.(`❌ Gagal bersihkan: ${err.message}`);
        } finally {
            setIsCleaningOrphans(false);
        }
    };

    const getDisplayColumns = () => {
        if (activeTable === 'processed_items') {
            return ['order_id', 'awb', 'excel_filename', 'date_processed', 'processed_at'];
        }
        return ['id', 'excel_name', 'created_at'];
    };

    const handleTimeClick = (fullTimestamp: string) => {
        if (!fullTimestamp) return;

        try {
            const dateObj = new Date(fullTimestamp);
            const dateStr = fullTimestamp.slice(0, 10);
            setFilterDate(dateStr);

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
                    <h2 className="text-lg font-bold text-gray-900">Kelola Data Database</h2>
                    <p className="text-sm text-gray-500">Total: {data.length.toLocaleString()} data (dari {allData.length.toLocaleString()} termuat)</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTable('processed_items')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTable === 'processed_items' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <FiDatabase className="w-4 h-4" /> processed_items (Duplikat)
                    </button>
                    <button
                        onClick={() => setActiveTable('label_process_history')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTable === 'label_process_history' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <FiDatabase className="w-4 h-4" /> label_process_history (Riwayat)
                    </button>
                </div>
            </div>

            {/* Quick Purge & Orphan Cleaner Toolbar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Quick Purge Tool */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <FiZap className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hapus Cepat Catatan Duplikat (Order ID / AWB / Nama File)</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                        Masukkan Nomor Pesanan / No Resi / Nama File Excel yang ingin dibersihkan dari deteksi duplikat (pisahkan dengan koma/spasi/baris baru):
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={quickPurgeInput}
                            onChange={(e) => setQuickPurgeInput(e.target.value)}
                            placeholder="Contoh: 260828JBW8BM7C, SPXID062588561668, atau file.xlsx"
                            className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                        <button
                            type="button"
                            onClick={handleQuickPurge}
                            disabled={isQuickPurging || !quickPurgeInput.trim()}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                        >
                            {isQuickPurging ? 'Menghapus...' : 'Hapus Duplikat'}
                        </button>
                    </div>
                </div>

                {/* Orphan Sweeper Tool */}
                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-4 rounded-xl border border-amber-200/70 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                            <FiTrash2 className="w-4 h-4 text-orange-600" />
                            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Pembersih Data Yatim (Orphaned Duplicates)</h4>
                        </div>
                        {orphanScanResult && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                {orphanScanResult.totalOrphans} data yatim
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-amber-800/80 mb-2.5">
                        Bersihkan data duplikat yang riwayatnya sudah dihapus oleh user tetapi masih menyangkut di database:
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleScanOrphans}
                            disabled={isCleaningOrphans}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors"
                        >
                            {isCleaningOrphans ? 'Memeriksa...' : '🔍 Scan Data Yatim'}
                        </button>
                        {orphanScanResult && orphanScanResult.totalOrphans > 0 && (
                            <button
                                type="button"
                                onClick={handlePurgeOrphans}
                                disabled={isCleaningOrphans}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                            >
                                🧹 Hapus {orphanScanResult.totalOrphans} Data Yatim Sekarang
                            </button>
                        )}
                    </div>
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

                {/* Date Filter */}
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
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                        <FiSearch className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    fetchDataFromServer();
                                }
                            }}
                            placeholder={isMultiSearch ? "Cari banyak (pisahkan koma/enter)..." : (activeTable === 'processed_items' ? "Cari Order ID / AWB / File..." : "Cari nama file...")}
                            className="pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 md:w-64"
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMultiSearch(!isMultiSearch)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isMultiSearch ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            title={isMultiSearch ? "Pindah ke cari satuan" : "Pindah ke cari banyak sekaligus"}
                        >
                            {isMultiSearch ? 'Banyak' : 'Satuan'}
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
                            className="ml-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-all"
                            title="Cari langsung ke database untuk mencari data lama"
                        >
                            Cari Server
                        </button>
                    </div>
                </div>

                {/* Time Filter (only for processed_items) */}
                {activeTable === 'processed_items' && (
                    <div className="flex items-center gap-2 z-20">
                        <span className="text-sm text-gray-500 font-medium w-12">Waktu:</span>

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
                                            <span
                                                onClick={() => handleTimeClick(item[col])}
                                                className="cursor-pointer font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors inline-block"
                                                title="Klik untuk filter waktu sama"
                                            >
                                                {item[col] ? new Date(item[col]).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                            </span>
                                        ) : col.includes('date') || col.includes('created') ? (
                                            item[col] ? new Date(item[col]).toLocaleDateString('id-ID') : '-'
                                        ) : (
                                            String(item[col] ?? '-')
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-6 py-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-xs text-gray-500">
                    Menampilkan <span className="font-medium">{data.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> - <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, data.length)}</span> dari <span className="font-medium">{data.length.toLocaleString()}</span> data
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    >
                        <FiChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-gray-700 px-2">
                        Hal {currentPage} / {totalPages || 1}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage >= totalPages || totalPages === 0}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    >
                        <FiChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                count={selectedIds.size}
            />
        </div>
    );
};

export default AdminDataManager;
