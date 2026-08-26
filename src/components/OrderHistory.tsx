import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiCopy, FiArrowLeft, FiDownload, FiFileText, FiFile, FiClipboard, FiTrash2, FiSearch, FiCalendar, FiChevronLeft, FiChevronRight, FiX, FiRefreshCcw, FiAlertCircle, FiDatabase, FiChevronDown } from 'react-icons/fi';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import { deleteHistoryFromLocal, deleteProcessedItemsByExcelFile } from '../utils/db';
import { supabase } from '../supabaseClient';

interface HistoryRecord {
    id: string;
    created_at: string;
    excel_filename: string;
    pdf_filenames: string[];
    total_excel_awb: number;
    matched_count: number;
    unmatched_excel_count: number;
    unmatched_pdf_count: number;
    matched_awbs: any[];
    unmatched_excel_awbs: any[];
    unmatched_pdf_awbs: any[];
    username?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface OrderHistoryProps {
    user: { username: string; role: string } | null;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ user }) => {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(false); // false on init; effect sets true immediately
    const [refreshing, setRefreshing] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
    const [activeTab, setActiveTab] = useState<'matched' | 'unmatched_excel' | 'unmatched_pdf'>('matched');
    const [showMatchedModal, setShowMatchedModal] = useState(false);
    const [isCopiedModalData, setIsCopiedModalData] = useState(false);

    // Filter & Pagination States
    const [searchQuery, setSearchQuery] = useState('');
    const [searchCategory, setSearchCategory] = useState<'all' | 'excel' | 'pdf' | 'awb'>('all');
    const [exactMatch, setExactMatch] = useState(false);
    const [hasUnmatched, setHasUnmatched] = useState(false); // Filter: Ada Unmatched (excel/pdf only > 0)
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }); // Default to Today
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10); // 10 / 20 / 50 / 100
    const [refreshTrigger, setRefreshTrigger] = useState(0); // increment to force refetch
    const [isMultiSearch, setIsMultiSearch] = useState(false);

    // Debounce searchQuery
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // DevMode for permanent delete (Standardized global check)
    const [headerClickCount, setHeaderClickCount] = useState(0);
    const [devMode, setDevMode] = useState(() => localStorage.getItem('global_devmode') === 'true');
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const devBufferRef = useRef('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            devBufferRef.current = (devBufferRef.current + e.key).slice(-20);
            if (devBufferRef.current.toLowerCase().endsWith('devmode')) {
                setDevMode(prev => {
                    const newState = !prev;
                    localStorage.setItem('global_devmode', newState.toString());
                    alert(newState ? '🔓 DevMode Aktif! Tombol hapus permanen sekarang tersedia.' : '🔒 DevMode Nonaktif.');
                    return newState;
                });
                devBufferRef.current = '';
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleHeaderClick = () => {
        // Clear any existing timeout
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
        }

        const newCount = headerClickCount + 1;
        setHeaderClickCount(newCount);

        console.log(`DevMode Click: ${newCount}/10`);

        if (newCount === 10) {
            setDevMode(true);
            localStorage.setItem('global_devmode', 'true');
            alert('🔓 DevMode Aktif! Tombol hapus permanen sekarang tersedia.');
            console.log('✅ DevMode Activated!');
            // Don't reset counter after activation
            return;
        }

        // Reset counter after 5 seconds of inactivity
        clickTimeoutRef.current = setTimeout(() => {
            setHeaderClickCount(0);
            console.log('⏰ Click counter reset (timeout)');
        }, 5000);
    };

    const handlePermanentDelete = async (record: HistoryRecord) => {
        if (!devMode) return;

        const confirmDelete = window.confirm(
            `⚠️ HAPUS PERMANEN\n\nApakah Anda yakin ingin menghapus record ini?\n\nFile: ${record.excel_filename}\nTanggal: ${new Date(record.created_at).toLocaleString('id-ID')}\n\n⚠️ PERINGATAN:\n- Data history akan dihapus permanen dari Supabase & Local DB\n- Hasil backup (Excel/PDF) akan dihapus dari server\n- Data duplikat (processed_items) akan ikut dihapus\n\nLanjutkan?`
        );

        if (!confirmDelete) return;

        setDeleteLoading(true);
        try {
            // 1. Delete via Backend API (Full Cleanup: DB + Files + Cascading)
            await axios.delete(`${API_CONFIG.BASE_URL}/history/${record.id}`);

            // 2. Delete from Local DB (Always)
            try {
                await deleteHistoryFromLocal(record.id);
                if (record.excel_filename) {
                    await deleteProcessedItemsByExcelFile(record.excel_filename);
                }
            } catch (localErr) {
                console.warn('[LOCAL] Deletion from IndexedDB failed:', localErr);
            }

            alert('✅ Record + data processed_items + file backup berhasil dihapus permanen.');
            console.log('✅ Deleted record successfully:', record.id);

            setSelectedRecord(null);
            setRefreshTrigger(t => t + 1); // trigger refetch
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('❌ Gagal menghapus record. Silakan coba lagi.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleUserDelete = async (record: HistoryRecord) => {
        const confirmDelete = window.confirm(
            `Hapus riwayat "${record.excel_filename}"?\n\nData dan file terkait akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
        );

        if (!confirmDelete) return;

        setDeleteLoading(true);
        try {
            const dbMode = localStorage.getItem('db_mode') || 'cloud';

            if (dbMode === 'cloud') {
                try {
                    // Import Firebase modules dynamically
                    const { doc, deleteDoc, getDoc } = await import('firebase/firestore');
                    const { ref, deleteObject } = await import('firebase/storage');
                    const { db, storage } = await import('../firebaseClient');
                    
                    // Fetch the document first to get the URLs
                    const docRef = doc(db, 'upload_tes_history', record.id);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        
                        // Helper to safely delete a file from Storage
                        const deleteFileSafely = async (url: string) => {
                            if (!url) return;
                            try {
                                const fileRef = ref(storage, url);
                                await deleteObject(fileRef);
                            } catch (err) {
                                console.warn('Failed to delete file from Storage:', err);
                            }
                        };

                        // Delete associated files
                        if (data.excel_url) await deleteFileSafely(data.excel_url);
                        if (data.result_pdf_url) await deleteFileSafely(data.result_pdf_url);
                        if (data.packing_list_url) await deleteFileSafely(data.packing_list_url);
                        if (data.original_pdf_urls && Array.isArray(data.original_pdf_urls)) {
                            for (const url of data.original_pdf_urls) {
                                await deleteFileSafely(url);
                            }
                        }
                    }
                    
                    // Delete the Firestore document
                    await deleteDoc(docRef);
                    
                    // Cleanup local IndexedDB just in case
                    try {
                        await deleteHistoryFromLocal(record.id);
                        if (record.excel_filename) {
                            await deleteProcessedItemsByExcelFile(record.excel_filename);
                        }
                    } catch (localErr) {
                        console.warn('[LOCAL] Deletion from IndexedDB failed:', localErr);
                    }

                    alert('✅ Riwayat berhasil dihapus (Cloud).');
                    setSelectedRecord(null);
                    setRefreshTrigger(t => t + 1);
                    return; // Exit early since we handled cloud deletion
                } catch (cloudErr: any) {
                    console.error('Error deleting cloud record:', cloudErr);
                    alert(`❌ Gagal menghapus record cloud: ${cloudErr.message || 'Unknown error'}`);
                    return;
                }
            }

            await axios.delete(`${API_CONFIG.BASE_URL}/history/${record.id}?username=${encodeURIComponent(user?.username || '')}`);

            try {
                await deleteHistoryFromLocal(record.id);
                if (record.excel_filename) {
                    await deleteProcessedItemsByExcelFile(record.excel_filename);
                }
            } catch (localErr) {
                console.warn('[LOCAL] Deletion from IndexedDB failed:', localErr);
            }

            alert('✅ Riwayat berhasil dihapus.');
            setSelectedRecord(null);
            setRefreshTrigger(t => t + 1);
        } catch (error: any) {
            console.error('Error deleting record:', error);
            const msg = error.response?.data?.detail || 'Gagal menghapus record.';
            alert(`❌ ${msg}`);
        } finally {
            setDeleteLoading(false);
        }
    };

    // ─── Fetch + Effects (all-in-one) ─────────────────────────────────────────
    // Main trigger: re-fetch when page, date, search filters, or refreshTrigger changes
    // 'cancelled' flag prevents React 18 Strict Mode double-mount from leaving loading=true forever
    useEffect(() => {
        let cancelled = false;

        const doFetch = async () => {
            setLoading(true);
            try {
                // ═══ FIRESTORE PATH (Cloud Mode) ═══
                const dbMode = localStorage.getItem('db_mode') || 'cloud';
                if (dbMode === 'cloud') {
                    try {
                        const { collection, query: fsQuery, orderBy, getDocs, where, Timestamp } = await import('firebase/firestore');
                        const { db } = await import('../firebaseClient');

                        let constraints: any[] = [orderBy('created_at', 'desc')];

                        // Date filter (WIB UTC+7)
                        if (selectedDate) {
                            const [yyyy, mm, dd] = selectedDate.split('-').map(Number);
                            const startLocal = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
                            const endLocal = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
                            constraints.push(where('created_at', '>=', Timestamp.fromDate(startLocal)));
                            constraints.push(where('created_at', '<=', Timestamp.fromDate(endLocal)));
                        }

                        const q = fsQuery(collection(db, 'upload_tes_history'), ...constraints);
                        const snapshot = await getDocs(q);

                        if (cancelled) return;

                        let records: HistoryRecord[] = snapshot.docs.map(doc => {
                            const d = doc.data();
                            const createdAt = d.created_at?.toDate ? d.created_at.toDate().toISOString() : (d.created_at || new Date().toISOString());
                            return {
                                id: doc.id,
                                created_at: createdAt,
                                excel_filename: d.excel_filename || '',
                                pdf_filenames: d.pdf_filenames || [],
                                total_excel_awb: d.stats?.total_excel_awb || 0,
                                matched_count: d.stats?.matched_count || 0,
                                unmatched_excel_count: d.stats?.unmatched_excel_count || 0,
                                unmatched_pdf_count: d.stats?.unmatched_pdf_count || 0,
                                matched_awbs: d.stats?.matched_awbs || [],
                                unmatched_excel_awbs: d.stats?.unmatched_excel_awbs || [],
                                unmatched_pdf_awbs: d.stats?.unmatched_pdf_awbs || [],
                                username: d.picker_name || '',
                            };
                        });

                        // Client-side search filter
                        if (debouncedQuery && debouncedQuery.trim()) {
                            const term = debouncedQuery.trim().toLowerCase();
                            records = records.filter(r => {
                                const matchText = (text: string) =>
                                    exactMatch ? text.toLowerCase() === term : text.toLowerCase().includes(term);
                                if ((searchCategory === 'all' || searchCategory === 'excel') && r.excel_filename && matchText(r.excel_filename)) return true;
                                if ((searchCategory === 'all' || searchCategory === 'pdf') && r.pdf_filenames?.some(p => matchText(p))) return true;
                                if ((searchCategory === 'all' || searchCategory === 'awb') && r.matched_awbs?.some(a => matchText(a))) return true;
                                return false;
                            });
                        }

                        // Unmatched filter
                        if (hasUnmatched) {
                            records = records.filter(r => r.unmatched_excel_count > 0 || r.unmatched_pdf_count > 0);
                        }

                        const totalCount = records.length;
                        const from = (currentPage - 1) * rowsPerPage;
                        const paged = records.slice(from, from + rowsPerPage);

                        setHistory(paged);
                        setTotalRecords(totalCount);
                        setLoading(false);
                        return; // Done — skip Supabase path
                    } catch (fbErr) {
                        console.error('[FIRESTORE] Fetch failed, falling back to Supabase:', fbErr);
                        // Fall through to Supabase
                    }
                }

                // ═══ SUPABASE PATH (Local/Fallback) ═══
                // STRATEGY 1: Fast RPC search (skip when date/unmatched filter active or multi-search)
                if (debouncedQuery && debouncedQuery.length > 2
                    && !selectedDate
                    && !hasUnmatched
                    && !isMultiSearch
                    && (searchCategory === 'all' || searchCategory === 'pdf' || searchCategory === 'awb')) {
                    try {
                        const { data, error } = await supabase.rpc('search_label_history', { keyword: debouncedQuery });
                        if (!error && data) {
                            if (!cancelled) { setHistory(data); setTotalRecords(data.length); }
                            return;
                        }
                        if (error) console.warn('⚠️ RPC failed:', error.message);
                    } catch (err) {
                        console.error('RPC error:', err);
                    }
                }

                // STRATEGY 2: Standard Supabase query
                let query = supabase
                    .from('label_process_history')
                    .select('*', { count: 'exact' });

                // Date filter — WIB (UTC+7)
                if (selectedDate) {
                    const [yyyy, mm, dd] = selectedDate.split('-').map(Number);
                    const startUTC = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
                    startUTC.setUTCHours(startUTC.getUTCHours() - 7);
                    const endUTC = new Date(Date.UTC(yyyy, mm - 1, dd, 23, 59, 59, 999));
                    endUTC.setUTCHours(endUTC.getUTCHours() - 7);
                    query = query
                        .gte('created_at', startUTC.toISOString())
                        .lte('created_at', endUTC.toISOString());
                }

                // Optimasi Search logic (Single or Multi)
                let useExactArraySearch = false;

                if (debouncedQuery) {
                    if (isMultiSearch) {
                        const queries = debouncedQuery.split(/[\n,]+/).map(q => q.trim()).filter(q => q.length > 0);
                        if (queries.length > 0) {
                            if (searchCategory === 'awb' || searchCategory === 'all') {
                                query = query.or(`matched_awbs.ov.{${queries.join(',')}},unmatched_excel_awbs.ov.{${queries.join(',')}},unmatched_pdf_awbs.ov.{${queries.join(',')}}`);
                            } else if (searchCategory === 'pdf') {
                                query = query.overlaps('pdf_filenames', queries);
                            } else if (searchCategory === 'excel') {
                                query = query.filter('excel_filename', 'in', `(${queries.map(q => `"${q}"`).join(',')})`);
                            }
                        }
                    } else {
                        // Single Search
                        const term = debouncedQuery.trim();
                        if (searchCategory === 'excel') {
                            query = query.ilike('excel_filename', exactMatch ? term : `%${term}%`);
                        } else {
                            // Cek apakah term mirip full AWB / PDF name (panjang >= 7 dan ga ada spasi)
                            useExactArraySearch = exactMatch || (term.length >= 7 && !term.includes(' '));
                            
                            if (useExactArraySearch) {
                                if (searchCategory === 'pdf') {
                                    query = query.contains('pdf_filenames', [term]);
                                } else if (searchCategory === 'awb') {
                                    query = query.or(`matched_awbs.cs.{${term}},unmatched_excel_awbs.cs.{${term}},unmatched_pdf_awbs.cs.{${term}}`);
                                } else if (searchCategory === 'all') {
                                    query = query.or(`excel_filename.ilike.%${term}%,matched_awbs.cs.{${term}},unmatched_excel_awbs.cs.{${term}},unmatched_pdf_awbs.cs.{${term}}`);
                                }
                            }
                        }
                    }
                }

                // Unmatched filter
                if (hasUnmatched) {
                    query = query.or('unmatched_excel_count.gt.0,unmatched_pdf_count.gt.0');
                }

                query = query.order('created_at', { ascending: false });

                // Needs client-side array filter (jika pencarian parsial di array)
                const needsClientFilter = !isMultiSearch && !!(debouncedQuery && (searchCategory === 'all' || searchCategory === 'pdf' || searchCategory === 'awb')) && !useExactArraySearch;

                if (!needsClientFilter) {
                    const from = (currentPage - 1) * rowsPerPage;
                    query = query.range(from, from + rowsPerPage - 1);
                } else {
                    // Batasi 2000 untuk mencegah error 500 dari Supabase jika client-filter berjalan
                    query = query.limit(2000);
                }

                const { data, count, error } = await query;
                if (error) throw error;

                if (cancelled) return;

                let filteredData = data || [];
                let filteredCount = count ?? 0;

                if (needsClientFilter) {
                    const searchLower = debouncedQuery!.toLowerCase();
                    filteredData = filteredData.filter((record: any) => {
                        const matchText = (text: string) =>
                            exactMatch ? text.toLowerCase() === searchLower : text.toLowerCase().includes(searchLower);
                        if ((searchCategory === 'all' || searchCategory === 'pdf') && record.pdf_filenames?.some((p: string) => matchText(p))) return true;
                        if ((searchCategory === 'all' || searchCategory === 'awb') && record.matched_awbs?.some((a: string) => matchText(a))) return true;
                        if (searchCategory === 'all' && record.excel_filename && matchText(record.excel_filename)) return true;
                        return false;
                    });
                    filteredCount = filteredData.length;
                    const from = (currentPage - 1) * rowsPerPage;
                    filteredData = filteredData.slice(from, from + rowsPerPage);
                }

                setHistory(filteredData);
                setTotalRecords(filteredCount);
            } catch (err) {
                if (!cancelled) {
                    console.error('Error fetching history:', err);
                    setHistory([]);
                    setTotalRecords(0);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        doFetch();
        return () => { cancelled = true; }; // cleanup: cancel on unmount or dep change
    }, [currentPage, selectedDate, debouncedQuery, searchCategory, exactMatch, hasUnmatched, refreshTrigger, rowsPerPage, isMultiSearch]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleDelete = async (record: HistoryRecord) => {
        if (!confirm(`Yakin ingin MENGHAPUS PERMANEN riwayat "${record.excel_filename}"?\n\nData di database (history & items) serta file backup di server akan dihapus.\nTindakan ini tidak bisa dibatalkan.`)) {
            return;
        }

        setDeleteLoading(true);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/history/${record.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Gagal menghapus');

            alert('Riwayat berhasil dihapus.');
            setSelectedRecord(null);
            setRefreshTrigger(t => t + 1); // trigger refetch
        } catch (error) {
            console.error('Delete error:', error);
            alert('Gagal menghapus data. Pastikan backend berjalan.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDownload = async (type: 'excel' | 'pdf-original' | 'pdf-result' | 'packing-list', record: HistoryRecord) => {
        try {
            // FIREBASE OVERRIDE FOR CLOUD MODE
            const dbMode = localStorage.getItem('db_mode') || 'cloud';
            if (dbMode === 'cloud') {
                try {
                    const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
                    const { db } = await import('../firebaseClient');
                    const q = query(
                        collection(db, 'upload_tes_history'),
                        where('excel_filename', '==', record.excel_filename),
                        orderBy('created_at', 'desc'),
                        limit(1)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const data = snap.docs[0].data();
                        let fileUrl = null;
                        if (type === 'excel') fileUrl = data.excel_url;
                        if (type === 'pdf-original') {
                            if (data.original_pdf_urls && data.original_pdf_urls.length > 0) {
                                fileUrl = data.original_pdf_urls[0];
                                if (data.original_pdf_urls.length > 1) {
                                    data.original_pdf_urls.slice(1).forEach((u: string) => window.open(u, '_blank'));
                                }
                            }
                        }
                        if (type === 'pdf-result') fileUrl = data.result_pdf_url;
                        if (type === 'packing-list') fileUrl = data.packing_list_url;

                        if (fileUrl) {
                            window.open(fileUrl, '_blank');
                            return; // Download handled via Firebase URL
                        }
                    }
                } catch (fbErr) {
                    console.error('Error fetching download link from Firestore:', fbErr);
                }
            }

            // FALLBACK TO BACKEND
            let url = `${API_CONFIG.BASE_URL}/download-backup?type=${type}&date=${record.created_at}&excel=${encodeURIComponent(record.excel_filename)}`;

            if (type === 'packing-list') {
                const pdfName = record.pdf_filenames && record.pdf_filenames.length > 0
                    ? record.pdf_filenames[0].replace(/\.pdf$/i, '')
                    : record.excel_filename.replace(/\.xlsx?$/i, '');
                url = `${API_CONFIG.BASE_URL}/generate-packing-list?date=${record.created_at}&excel=${encodeURIComponent(record.excel_filename)}&pdf_name=${encodeURIComponent(pdfName)}`;
            }

            window.open(url, '_blank');
        } catch (error) {
            console.error('Download error:', error);
            alert('Gagal mendownload file. Kemungkinan file backup sudah dihapus (lebih dari 7 hari).');
        }
    };

    const [copyMessage, setCopyMessage] = useState<string | null>(null);

    const copyToClipboard = (awbs: any[], label: string) => {
        if (!awbs || awbs.length === 0) {
            setCopyMessage('Tidak ada data');
            setTimeout(() => setCopyMessage(null), 2000);
            return;
        }
        
        const text = awbs.map(item => {
            if (typeof item === 'object' && item !== null) {
                return item.id_pesanan ? `${item.awb}\t${item.id_pesanan}` : item.awb;
            }
            return `'${item}`;
        }).join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            setCopyMessage(`✓ ${awbs.length} ${label} disalin`);
            setTimeout(() => setCopyMessage(null), 2000);
        });
    };

    if (selectedRecord) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-5">
                <button
                    onClick={() => setSelectedRecord(null)}
                    className="flex items-center text-slate-500 hover:text-slate-700 text-sm mb-4"
                >
                    <FiArrowLeft className="w-4 h-4 mr-1" />
                    Kembali
                </button>

                <div className="mb-6">
                    <h3
                        className="text-base font-semibold text-slate-800 select-none cursor-pointer"
                        onClick={handleHeaderClick}
                        title={devMode ? '🔓 DevMode Active' : `Click ${10 - headerClickCount} more times for DevMode`}
                    >
                        Detail Proses {devMode && '🔓'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(selectedRecord.created_at)}</p>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-md p-3">
                            <p className="text-xs text-slate-400 mb-1">Excel</p>
                            <p className="text-xs font-medium text-slate-700 truncate">{selectedRecord.excel_filename}</p>
                        </div>
                        {selectedRecord.pdf_filenames && selectedRecord.pdf_filenames.length > 0 && (
                            <div className="bg-slate-50 rounded-md p-3">
                                <p className="text-xs text-slate-400 mb-1">PDF ({selectedRecord.pdf_filenames.length})</p>
                                <div className="max-h-16 overflow-y-auto">
                                    {selectedRecord.pdf_filenames.map((filename, idx) => (
                                        <p key={idx} className="text-xs font-medium text-slate-700 truncate">{filename}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Download Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2 w-full">
                        <button
                            onClick={() => handleDownload('excel', selectedRecord)}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors border border-emerald-100"
                        >
                            <FiFileText className="w-4 h-4" />
                            Excel Original
                        </button>
                        <button
                            onClick={() => handleDownload('pdf-original', selectedRecord)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors border border-red-100"
                        >
                            <FiFile className="w-4 h-4" />
                            PDF Original
                        </button>
                        <button
                            onClick={() => handleDownload('pdf-result', selectedRecord)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-100"
                        >
                            <FiDownload className="w-4 h-4" />
                            PDF Hasil
                        </button>
                        <button
                            onClick={() => handleDownload('packing-list', selectedRecord)}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors border border-purple-100"
                        >
                            <FiClipboard className="w-4 h-4" />
                            Packing List
                        </button>
                        {selectedRecord.matched_awbs && selectedRecord.matched_awbs.length > 0 && (
                            <button
                                onClick={() => setShowMatchedModal(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors border border-orange-100"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                Lihat Data Resi & Pesanan ({selectedRecord.matched_awbs.length})
                            </button>
                        )}
                    </div>

                    {/* Modal implementation */}
                    {showMatchedModal && selectedRecord.matched_awbs && createPortal(
                        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setShowMatchedModal(false)}>
                            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-xl font-black text-gray-900">Data Berhasil Diproses</h3>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                const text = selectedRecord.matched_awbs?.map((item: any) => {
                                                    if (typeof item === 'object') return `${item.awb}\t${item.id_pesanan}`;
                                                    return item;
                                                }).join('\n') || '';
                                                navigator.clipboard.writeText(text);
                                                setIsCopiedModalData(true);
                                                setTimeout(() => setIsCopiedModalData(false), 2000);
                                            }}
                                            className={`px-4 py-2 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${isCopiedModalData ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                        >
                                            {isCopiedModalData ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                    </svg>
                                                    Copy Data
                                                </>
                                            )}
                                        </button>
                                        <button onClick={() => setShowMatchedModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 overflow-y-auto bg-gray-50/30">
                                    <div className="grid grid-cols-2 gap-4 mb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <div>AWB / Resi</div>
                                        <div>ID Pesanan</div>
                                    </div>
                                    <div className="space-y-2">
                                        {selectedRecord.matched_awbs.map((item: any, idx: number) => {
                                            const isObj = typeof item === 'object' && item !== null;
                                            const awbStr = isObj ? item.awb : item;
                                            const idPesanan = isObj ? item.id_pesanan : '-';
                                            return (
                                                <div key={idx} className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors">
                                                    <div className="font-mono text-sm text-gray-700 font-semibold">{awbStr}</div>
                                                    <div className="font-mono text-sm text-gray-500">{idPesanan}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {(() => {
                        const isOwner = selectedRecord.username === user?.username;
                        const timeElapsed = Date.now() - new Date(selectedRecord.created_at).getTime();
                        const timeRemainingMs = (60 * 60 * 1000) - timeElapsed;
                        const timeRemainingMins = Math.floor(timeRemainingMs / (60 * 1000));
                        const canUserDelete = isOwner && timeRemainingMins > 0;

                        if (canUserDelete && !devMode) {
                            return (
                                <div className="mt-4 pt-4 border-t border-rose-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-rose-50 p-3 rounded-lg border border-rose-200 gap-3">
                                        <div>
                                            <p className="text-xs font-bold text-rose-700 flex items-center gap-1">
                                                Hapus Data Ini
                                            </p>
                                            <p className="text-[10px] text-rose-600 mt-0.5">
                                                Tombol ini akan hilang dalam {timeRemainingMins} menit. Jika ditekan, data riwayat ini akan dihapus permanen.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleUserDelete(selectedRecord)}
                                            disabled={deleteLoading}
                                            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 touch-manipulation whitespace-nowrap w-full sm:w-auto justify-center"
                                        >
                                            {deleteLoading ? 'Menghapus...' : (
                                                <>
                                                    <FiTrash2 className="w-4 h-4" />
                                                    HAPUS PERMANEN
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}
                    
                    {devMode && (
                        <div className="mt-4 pt-4 border-t border-red-100 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg border border-red-200">
                                <div>
                                    <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                                        ⚠️ DEV MODE: DANGER ZONE
                                    </p>
                                    <p className="text-[10px] text-red-600 mt-0.5">
                                        Menghapus record ini HANYA dari Supabase database. File backup di localhost tidak terpengaruh.
                                    </p>
                                </div>
                                <button
                                    onClick={() => handlePermanentDelete(selectedRecord)}
                                    disabled={deleteLoading}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 touch-manipulation"
                                >
                                    {deleteLoading ? 'Menghapus...' : (
                                        <>
                                            <FiTrash2 className="w-4 h-4" />
                                            HAPUS PERMANEN
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Summary */}
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <p className="text-xs text-slate-500 mb-3">Hasil Perbandingan</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white rounded-md p-3 shadow-sm">
                            <div className="text-xl font-semibold text-emerald-600">{selectedRecord.matched_count}</div>
                            <div className="text-xs text-slate-500">Match</div>
                        </div>
                        <div className="bg-white rounded-md p-3 shadow-sm">
                            <div className="text-xl font-semibold text-amber-600">{selectedRecord.unmatched_excel_count}</div>
                            <div className="text-xs text-slate-500">Excel Only</div>
                        </div>
                        <div className="bg-white rounded-md p-3 shadow-sm">
                            <div className="text-xl font-semibold text-rose-600">{selectedRecord.unmatched_pdf_count}</div>
                            <div className="text-xs text-slate-500">PDF Only</div>
                        </div>
                    </div>
                </div>

                {/* Tabs & AWB Lists */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('matched')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'matched' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Match ({selectedRecord.matched_awbs?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('unmatched_excel')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'unmatched_excel' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Excel Only ({selectedRecord.unmatched_excel_awbs?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('unmatched_pdf')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'unmatched_pdf' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                PDF Only ({selectedRecord.unmatched_pdf_awbs?.length || 0})
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {copyMessage && (
                                <span className="text-xs text-emerald-600">{copyMessage}</span>
                            )}
                            <button
                                onClick={() => {
                                    const list = activeTab === 'matched' ? selectedRecord.matched_awbs :
                                        activeTab === 'unmatched_excel' ? selectedRecord.unmatched_excel_awbs :
                                            selectedRecord.unmatched_pdf_awbs;
                                    copyToClipboard(list || [], activeTab);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                title="Salin daftar"
                            >
                                <FiCopy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                        <div className="divide-y divide-slate-50">
                            {(() => {
                                const list = activeTab === 'matched' ? selectedRecord.matched_awbs :
                                    activeTab === 'unmatched_excel' ? selectedRecord.unmatched_excel_awbs :
                                        selectedRecord.unmatched_pdf_awbs;

                                if (!list || list.length === 0) {
                                    return <p className="text-slate-400 text-xs py-6 text-center">Tidak ada data</p>;
                                }
                                
                                return (
                                    <div className="space-y-1 py-2">
                                        {activeTab === 'matched' && list.length > 0 && typeof list[0] === 'object' && (
                                            <div className="grid grid-cols-2 gap-4 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                <div>AWB / Resi</div>
                                                <div>ID Pesanan</div>
                                            </div>
                                        )}
                                        {list.map((item: any, idx: number) => {
                                            const isObj = typeof item === 'object' && item !== null;
                                            const awbStr = isObj ? item.awb : item;
                                            const idPesanan = isObj ? item.id_pesanan : null;

                                            return (
                                                <div key={idx} className="grid grid-cols-2 gap-4 text-xs py-2 px-4 font-mono text-slate-600 hover:bg-slate-50 transition-colors">
                                                    <div>{awbStr || '-'}</div>
                                                    {idPesanan && <div className="text-slate-800 font-bold">{idPesanan}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    // LIST VIEW
    // FIX: Always calculate totalPages from totalRecords so pagination works under date+search
    const totalPages = Math.ceil(totalRecords / rowsPerPage);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Ultra Premium Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-900/15 border border-slate-800/80 relative overflow-hidden">
                {/* Decorative Glowing Orbs */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start md:items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-indigo-300 shadow-xl shadow-indigo-500/20 flex-shrink-0 mr-1">
                            <FiDatabase className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight" onClick={handleHeaderClick}>
                                    Riwayat Proses Label {devMode && '🔓'}
                                </h2>
                                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                    {totalRecords.toLocaleString()} Data
                                </span>
                            </div>
                            <p className="text-xs lg:text-sm font-medium text-slate-300 mt-1">
                                {selectedDate ? `Arsip riwayat pengolahan label pada ${new Date(selectedDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` : 'Semua arsip riwayat pencocokan & pemisahan label pengiriman'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Refresh */}
                        <button
                            onClick={() => {
                                setRefreshing(true);
                                setRefreshTrigger(t => t + 1);
                                setTimeout(() => setRefreshing(false), 1200);
                            }}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer group"
                            title="Refresh Data"
                        >
                            <FiRefreshCcw className={`w-4 h-4 text-indigo-300 group-hover:rotate-180 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>

                        {/* Unmatched Filter Toggle */}
                        <button
                            onClick={() => {
                                setHasUnmatched(prev => !prev);
                                setCurrentPage(1);
                            }}
                            className={`text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                                hasUnmatched 
                                ? 'bg-amber-500 text-white border border-amber-400 shadow-amber-500/30' 
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'
                            }`}
                        >
                            <FiAlertCircle className="w-4 h-4 text-amber-300" />
                            <span>{hasUnmatched ? 'Unmatched Filter: ON' : 'Ada Unmatched'}</span>
                        </button>
                    </div>
                </div>

                {/* Sub Description */}
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-normal">
                    <span>Filter dan cari data riwayat berdasarkan nama file Excel, PDF, AWB resi, atau tanggal.</span>
                    <span className="hidden sm:inline-block text-[11px] text-indigo-400 font-medium">⚡ Real-time sync & auto backup</span>
                </div>
            </div>

            {/* Filter & Search Controls Container */}
            <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-lg p-5 lg:p-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    {/* Search Input Bar */}
                    <div className="lg:col-span-7 flex flex-col gap-2">
                        <div className="relative flex items-stretch gap-2">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                {isMultiSearch ? (
                                    <textarea
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Input banyak ID/AWB (pisah baris/koma)..."
                                        className="w-full bg-slate-50/60 border-2 border-slate-300 rounded-2xl pl-12 pr-10 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 shadow-xs resize-none h-24 transition-all outline-none"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={`Cari ${searchCategory === 'all' ? 'nama file, PDF, atau AWB' : searchCategory === 'excel' ? 'nama Excel' : searchCategory === 'pdf' ? 'nama PDF' : 'AWB'}...`}
                                        className="w-full bg-slate-50/60 border-2 border-slate-300 rounded-2xl pl-12 pr-10 py-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 shadow-xs transition-all outline-none"
                                    />
                                )}
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 bg-slate-200/60 hover:bg-slate-300/80 rounded-full transition-colors"
                                    >
                                        <FiX className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setIsMultiSearch(!isMultiSearch)}
                                className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border shadow-xs active:scale-95 touch-manipulation cursor-pointer ${
                                    isMultiSearch 
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20' 
                                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                }`}
                                title={isMultiSearch ? "Pindah ke cari satuan" : "Pindah ke cari banyak sekaligus"}
                            >
                                {isMultiSearch ? 'Multi' : 'Single'}
                            </button>
                        </div>
                    </div>

                    {/* Category Dropdown & Date Picker */}
                    <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                        {/* Category Dropdown */}
                        <div className="relative">
                            <select
                                value={searchCategory}
                                onChange={(e) => {
                                    setSearchCategory(e.target.value as any);
                                    setCurrentPage(1);
                                }}
                                className="w-full h-full bg-slate-50/60 border-2 border-slate-300 rounded-2xl pl-4 pr-9 py-3 text-sm font-extrabold text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 shadow-xs appearance-none cursor-pointer outline-none"
                            >
                                <option value="all">Semua Kategori</option>
                                <option value="excel">Nama Excel</option>
                                <option value="pdf">Nama PDF</option>
                                <option value="awb">AWB / Order ID</option>
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <FiChevronDown className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div
                            className="relative bg-slate-50/60 border-2 border-slate-300 rounded-2xl px-4 py-3 shadow-xs hover:border-indigo-400 transition-colors cursor-pointer group flex items-center justify-between"
                            onClick={() => (document.getElementById('date-picker-history') as any)?.showPicker()}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <FiCalendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                                    {selectedDate ? new Date(selectedDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pilih Tanggal'}
                                </span>
                            </div>
                            <input
                                id="date-picker-history"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {selectedDate && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDate('');
                                    }}
                                    className="bg-slate-200/80 hover:bg-rose-500 hover:text-white rounded-full p-1 text-slate-500 transition-colors z-10"
                                >
                                    <FiX className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sub Option Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    {!isMultiSearch && (
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <div 
                                onClick={() => setExactMatch(!exactMatch)}
                                className={`w-10 h-5 rounded-full transition-all relative p-0.5 cursor-pointer ${exactMatch ? 'bg-indigo-600 shadow-xs shadow-indigo-500/30' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${exactMatch ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                                Pencocokan Persis (Exact Match)
                            </span>
                        </label>
                    )}

                    {loading && (
                        <div className="flex items-center gap-2 text-indigo-600 ml-auto">
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-bold">Memuat Data...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* List / Cards Container */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm font-extrabold text-slate-700">Mengambil data riwayat...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <FiDatabase className="w-8 h-8" />
                        </div>
                        <h4 className="text-base font-extrabold text-slate-800">Tidak Ada Data Riwayat</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                            {hasUnmatched
                                ? '✅ Semua proses pada periode ini 100% cocok (tidak ada data unmatched).'
                                : searchQuery
                                    ? 'Tidak ada arsip riwayat yang cocok dengan kata kunci pencarian Anda.'
                                    : 'Belum ada arsip riwayat pada tanggal yang dipilih.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((record) => (
                            <div
                                key={record.id}
                                onClick={() => setSelectedRecord(record)}
                                className="bg-slate-50/70 hover:bg-white border-2 border-slate-200/80 hover:border-indigo-300 rounded-2xl p-4.5 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                                        <FaFileExcel className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2.5 flex-wrap mb-1">
                                            <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors truncate">
                                                {record.excel_filename}
                                            </h4>
                                            <span className="bg-slate-200/80 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                                {new Date(record.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {record.pdf_filenames && record.pdf_filenames.slice(0, 2).map((pdf, idx) => (
                                            <p key={idx} className="text-xs font-semibold text-slate-500 truncate" title={pdf}>
                                                📄 {pdf}
                                            </p>
                                        ))}
                                        {record.pdf_filenames && record.pdf_filenames.length > 2 && (
                                            <p className="text-[11px] text-indigo-500 font-bold mt-0.5">+ {record.pdf_filenames.length - 2} file PDF lainnya</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-xs">
                                        {record.matched_count} Match
                                    </span>
                                    {record.unmatched_excel_count > 0 && (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-xs">
                                            {record.unmatched_excel_count} Excel Only
                                        </span>
                                    )}
                                    {record.unmatched_pdf_count > 0 && (
                                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-xs">
                                            {record.unmatched_pdf_count} PDF Only
                                        </span>
                                    )}

                                    <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                                        <FiChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Pagination Controls */}
                        {(totalPages > 1 || totalRecords > 0) && (
                            <div className="pt-4 flex items-center justify-between border-t border-slate-200/80 gap-3 flex-wrap">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-xs font-extrabold bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <FiChevronLeft className="w-4 h-4" /> Prev
                                </button>

                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-extrabold text-slate-700">
                                        Halaman {currentPage} dari {totalPages || 1}
                                    </span>
                                    <select
                                        value={rowsPerPage}
                                        onChange={(e) => {
                                            setRowsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="text-xs font-bold py-1.5 pl-3 pr-7 border-2 border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                                    >
                                        {PAGE_SIZE_OPTIONS.map(n => (
                                            <option key={n} value={n}>{n} / hal</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="px-4 py-2 text-xs font-extrabold bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    Next <FiChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderHistory;
