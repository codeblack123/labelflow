import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    FiCopy,
    FiFileText,
    FiCheckSquare,
    FiSquare,
    FiCheckCircle,
    FiCheck,
    FiX,
    FiSearch,
    FiCalendar,
    FiChevronDown,
    FiChevronRight,
    FiChevronLeft,
    FiRefreshCw,
    FiEye,
    FiClipboard,
    FiLayers,
    FiDatabase,
    FiSliders,
    FiArrowRight,
    FiDownload
} from 'react-icons/fi';
import { FaFilePdf, FaFileExcel, FaWarehouse } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import { getHistoryFromLocal } from '../utils/db';

interface Warehouse {
    id: string;
    name: string;
}

interface HistoryRecord {
    id: string;
    created_at: string;
    excel_filename: string;
    pdf_filenames: string[];
    total_excel_awb?: number;
    matched_count?: number;
    unmatched_excel_count?: number;
    unmatched_pdf_count?: number;
    matched_awbs?: any[];
    unmatched_excel_awbs?: any[];
    unmatched_pdf_awbs?: any[];
    username?: string;
    picker_name?: string;
    tenant_id?: string;
    gudang_id?: string;
}

interface AdminPdfHistoryExtractorProps {
    showToast?: (message: string) => void;
    user?: { role: string; username: string; tenant_id?: string; assigned_warehouses?: string[] } | null;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250];

export const AdminPdfHistoryExtractor: React.FC<AdminPdfHistoryExtractorProps> = ({ showToast, user }) => {
    // Data State
    const [allRecords, setAllRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Warehouse State & Isolation
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(() => {
        return localStorage.getItem('active_gudang_id') || 'ALL';
    });
    const [userList, setUserList] = useState<any[]>([]);

    // Fetch Warehouses & User Mappings for Strict Isolation
    useEffect(() => {
        let isCancelled = false;
        const loadWarehousesAndUsers = async () => {
            try {
                const [whRes, userRes] = await Promise.all([
                    supabase.from('warehouses').select('id, name').order('name'),
                    supabase.from('auth_users').select('username, role, parent_account, assigned_warehouses')
                ]);
                if (!isCancelled) {
                    if (whRes.data && whRes.data.length > 0) {
                        setWarehouses(whRes.data);
                    }
                    if (userRes.data && userRes.data.length > 0) {
                        setUserList(userRes.data);
                    }
                }
            } catch (err) {
                console.warn('[AdminPdfHistoryExtractor] Error loading warehouses/users:', err);
            }
        };
        loadWarehousesAndUsers();
        return () => { isCancelled = true; };
    }, []);

    // Build dynamic lookup: username / tenant -> warehouse ID
    const userToWarehouseMap = useMemo(() => {
        const map = new Map<string, string>(); // lowercase username/tenant -> warehouseId
        const adminToWh = new Map<string, string>();

        userList.forEach(u => {
            const uname = (u.username || '').toLowerCase();
            const assigned = u.assigned_warehouses || [];
            if (assigned.length > 0) {
                adminToWh.set(uname, assigned[0]);
                map.set(uname, assigned[0]);
            }
        });

        userList.forEach(u => {
            const uname = (u.username || '').toLowerCase();
            const parent = (u.parent_account || '').toLowerCase();
            if (parent && adminToWh.has(parent)) {
                const whId = adminToWh.get(parent)!;
                map.set(uname, whId);
                map.set(parent, whId);
            }
        });

        return map;
    }, [userList]);

    // Helper to determine warehouse for any history record
    const getRecordWarehouse = (rec: HistoryRecord): Warehouse | undefined => {
        // 1. Direct gudang_id if present
        if (rec.gudang_id) {
            const direct = warehouses.find(w => w.id === rec.gudang_id);
            if (direct) return direct;
        }

        // 2. Tenant ID match
        if (rec.tenant_id) {
            const tid = rec.tenant_id.toLowerCase();
            const whId = userToWarehouseMap.get(tid);
            if (whId) {
                const found = warehouses.find(w => w.id === whId);
                if (found) return found;
            }
            if (tid.includes('jkt') || tid.includes('jakarta')) {
                const found = warehouses.find(w => w.name.toLowerCase().includes('jakarta'));
                if (found) return found;
            }
            if (tid.includes('sby') || tid.includes('surabaya')) {
                const found = warehouses.find(w => w.name.toLowerCase().includes('surabaya'));
                if (found) return found;
            }
        }

        // 3. Username match
        if (rec.username) {
            const uname = rec.username.toLowerCase();
            const whId = userToWarehouseMap.get(uname);
            if (whId) {
                const found = warehouses.find(w => w.id === whId);
                if (found) return found;
            }
            if (uname.includes('jkt') || uname.includes('jakarta')) {
                const found = warehouses.find(w => w.name.toLowerCase().includes('jakarta'));
                if (found) return found;
            }
            if (uname.includes('sby') || uname.includes('surabaya')) {
                const found = warehouses.find(w => w.name.toLowerCase().includes('surabaya'));
                if (found) return found;
            }
        }

        return undefined;
    };

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        try {
            return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        } catch {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    });
    const [isAllDates, setIsAllDates] = useState(false);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(25);

    // Selection States
    const [selectedProcessIds, setSelectedProcessIds] = useState<Set<string>>(new Set());
    const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);

    // Individual PDF deselect within a process (recordId -> Set of selected PDF names)
    const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(new Set());
    const [pdfDeselectMap, setPdfDeselectMap] = useState<Map<string, Set<string>>>(new Map());

    // Copy Options
    const [stripPdfExtension, setStripPdfExtension] = useState(false);
    const [uniqueOnly, setUniqueOnly] = useState(true);
    const [separator, setSeparator] = useState<'newline' | 'comma'>('newline');
    const [showCopySettings, setShowCopySettings] = useState(false);

    // Modal States
    const [activeMatchedModal, setActiveMatchedModal] = useState<HistoryRecord | null>(null);
    const [matchedModalSearch, setMatchedModalSearch] = useState('');
    const [previewModalData, setPreviewModalData] = useState<{ title: string; content: string; count: number } | null>(null);

    // Feedback States
    const [copiedButtonId, setCopiedButtonId] = useState<string | null>(null);

    // ─── Fetch Data (Cloud / Supabase / Fallback) ───────────────────────────
    useEffect(() => {
        let isCancelled = false;

        const fetchData = async () => {
            setLoading(true);
            try {
                const activeTenantId = user?.tenant_id || user?.username;
                const isDevOrAdmin =
                    user?.role === 'developer' ||
                    user?.role === 'admin' ||
                    user?.username === 'developer' ||
                    user?.username === 'admin' ||
                    !user?.tenant_id;

                // 1. Supabase `label_process_history` (Direct & Optimized)
                // OPTIMISASI KRITIKAL: JANGAN ambil matched_awbs/all_excel_awbs di query daftar tabel utama!
                // matched_awbs berisi ribuan item per batch dan menyebabkan Supabase statement timeout (error 57014).
                // matched_awbs akan dimuat secara lazy (on-demand) hanya saat admin membuka modal atau menyalin data resi.
                let query = supabase
                    .from('label_process_history')
                    .select('id, created_at, excel_filename, pdf_filenames, total_excel_awb, matched_count, unmatched_excel_count, unmatched_pdf_count, username, tenant_id')
                    .order('created_at', { ascending: false });

                if (activeTenantId && !isDevOrAdmin) {
                    query = query.eq('tenant_id', activeTenantId);
                } else if (selectedWarehouseId !== 'ALL') {
                    // Filter berdasarkan tenant akun admin/staff gudang terpilih
                    const targetTenants: string[] = [];
                    userToWarehouseMap.forEach((whId, key) => {
                        if (whId === selectedWarehouseId) {
                            targetTenants.push(key);
                        }
                    });
                    if (targetTenants.length > 0) {
                        query = query.in('tenant_id', targetTenants);
                    }
                }

                // Server-side Date Filter (mencegah Supabase timeout 500)
                if (!isAllDates && selectedDate) {
                    // Hitung rentang UTC untuk tanggal lokal WIB (UTC+7)
                    const [yyyy, mm, dd] = selectedDate.split('-').map(Number);
                    // Awal hari WIB = 00:00 WIB = 17:00 UTC hari sebelumnya
                    const startUTC = new Date(Date.UTC(yyyy, mm - 1, dd - 1, 17, 0, 0, 0));
                    // Akhir hari WIB = 23:59:59 WIB = 16:59:59 UTC hari yang sama
                    const endUTC = new Date(Date.UTC(yyyy, mm - 1, dd, 16, 59, 59, 999));
                    query = query
                        .gte('created_at', startUTC.toISOString())
                        .lte('created_at', endUTC.toISOString())
                        .limit(1000);
                } else {
                    // Batasi jika semua tanggal agar query tetap super cepat (< 1 detik)
                    query = query.limit(300);
                }

                const { data: supaData, error: supaErr } = await query;
                if (supaErr) {
                    console.warn('[AdminPdfHistoryExtractor] Supabase Query Warning:', supaErr);
                    throw supaErr;
                }

                if (!isCancelled) {
                    const parsed: HistoryRecord[] = (supaData || []).map((row: any) => ({
                        id: String(row.id),
                        created_at: row.created_at,
                        excel_filename: row.excel_filename || row.excel_name || '',
                        pdf_filenames: Array.isArray(row.pdf_filenames)
                            ? row.pdf_filenames
                            : (typeof row.pdf_filenames === 'string' ? JSON.parse(row.pdf_filenames || '[]') : []),
                        total_excel_awb: row.total_excel_awb || 0,
                        matched_count: row.matched_count || 0,
                        unmatched_excel_count: row.unmatched_excel_count || 0,
                        unmatched_pdf_count: row.unmatched_pdf_count || 0,
                        matched_awbs: [], // Lazy-loaded on demand
                        unmatched_excel_awbs: [],
                        unmatched_pdf_awbs: [],
                        username: row.username || '',
                        tenant_id: row.tenant_id || ''
                    }));

                    setAllRecords(parsed);
                }
            } catch (err: any) {
                console.warn('[AdminPdfHistoryExtractor] Supabase fetch warning, trying local IndexedDB fallback:', err);
                try {
                    const localData = await getHistoryFromLocal();
                    if (!isCancelled && localData && localData.length > 0) {
                        const parsed: HistoryRecord[] = localData.map((row: any) => ({
                            id: String(row.id),
                            created_at: row.created_at || new Date().toISOString(),
                            excel_filename: row.excel_filename || row.excel_name || '',
                            pdf_filenames: Array.isArray(row.pdf_filenames)
                                ? row.pdf_filenames
                                : (typeof row.pdf_filenames === 'string' ? JSON.parse(row.pdf_filenames || '[]') : []),
                            total_excel_awb: row.total_excel_awb || 0,
                            matched_count: row.matched_count || (row.matched_awbs?.length || 0),
                            unmatched_excel_count: row.unmatched_excel_count || 0,
                            unmatched_pdf_count: row.unmatched_pdf_count || 0,
                            matched_awbs: Array.isArray(row.matched_awbs) ? row.matched_awbs : [],
                            unmatched_excel_awbs: row.unmatched_excel_awbs || [],
                            unmatched_pdf_awbs: row.unmatched_pdf_awbs || [],
                            username: row.username || '',
                            tenant_id: row.tenant_id || ''
                        }));
                        parsed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        setAllRecords(parsed);
                        showToast && showToast(`ℹ️ Memuat ${parsed.length} riwayat dari penyimpanan lokal`);
                        return;
                    }
                } catch (localErr) {
                    console.error('Local fallback failed:', localErr);
                }
                showToast && showToast(`❌ Gagal memuat data: ${err.message || 'Error koneksi'}`);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isCancelled = true;
        };
    }, [refreshTrigger, user?.tenant_id, user?.username, user?.role, selectedDate, isAllDates, selectedWarehouseId]);

    // ─── Filter Records by Warehouse, Date & Search ─────────────────────────
    const filteredRecords = useMemo(() => {
        let result = allRecords;

        // Warehouse Isolation Filter (Mencegah riwayat Jakarta & Surabaya tercampur)
        if (selectedWarehouseId !== 'ALL') {
            result = result.filter(rec => {
                const wh = getRecordWarehouse(rec);
                return wh?.id === selectedWarehouseId;
            });
        }

        // Date Filter (WIB Local Day)
        if (!isAllDates && selectedDate) {
            const [yyyy, mm, dd] = selectedDate.split('-').map(Number);
            const startOfDay = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
            const endOfDay = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999).getTime();

            result = result.filter(rec => {
                const recTime = new Date(rec.created_at).getTime();
                return recTime >= startOfDay && recTime <= endOfDay;
            });
        }

        // Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter(rec => {
                if (rec.excel_filename?.toLowerCase().includes(query)) return true;
                if (rec.username?.toLowerCase().includes(query)) return true;
                if (rec.pdf_filenames?.some(pdf => pdf.toLowerCase().includes(query))) return true;
                if (rec.matched_awbs?.some(item => {
                    const str = typeof item === 'object' && item !== null
                        ? `${item.awb || ''} ${item.id_pesanan || ''}`
                        : String(item);
                    return str.toLowerCase().includes(query);
                })) return true;
                return false;
            });
        }

        return result;
    }, [allRecords, isAllDates, selectedDate, searchQuery, selectedWarehouseId, warehouses, userToWarehouseMap]);

    // ─── Pagination ─────────────────────────────────────────────────────────
    const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRecords.slice(start, start + pageSize);
    }, [filteredRecords, currentPage, pageSize]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedDate, isAllDates, pageSize]);

    // ─── Selection Helpers ──────────────────────────────────────────────────
    const currentPageRecordIds = useMemo(() => {
        return paginatedRecords.map(r => r.id);
    }, [paginatedRecords]);

    const isCurrentPageFullySelected = useMemo(() => {
        if (currentPageRecordIds.length === 0) return false;
        return currentPageRecordIds.every(id => selectedProcessIds.has(id));
    }, [currentPageRecordIds, selectedProcessIds]);

    const effectiveSelectedRecords = useMemo(() => {
        if (selectAllAcrossPages) {
            return filteredRecords;
        }
        return filteredRecords.filter(r => selectedProcessIds.has(r.id));
    }, [selectAllAcrossPages, filteredRecords, selectedProcessIds]);

    // Calculation of Total PDF and Matched AWBs for Selected
    const statsSummary = useMemo(() => {
        let totalPdfs = 0;
        let totalMatched = 0;

        effectiveSelectedRecords.forEach(rec => {
            const deselected = pdfDeselectMap.get(rec.id);
            const validPdfs = deselected
                ? (rec.pdf_filenames || []).filter(p => !deselected.has(p))
                : (rec.pdf_filenames || []);
            totalPdfs += validPdfs.length;
            totalMatched += rec.matched_count || (rec.matched_awbs?.length || 0);
        });

        return {
            selectedCount: effectiveSelectedRecords.length,
            totalPdfs,
            totalMatched
        };
    }, [effectiveSelectedRecords, pdfDeselectMap]);

    // Switch Warehouse & Reset Selections to Prevent Mixing
    const handleSelectWarehouse = (whId: string) => {
        setSelectedWarehouseId(whId);
        setSelectedProcessIds(new Set());
        setSelectAllAcrossPages(false);
        setCurrentPage(1);
    };

    // Toggle 1 Process Selection
    const toggleSelectProcess = (id: string) => {
        if (selectAllAcrossPages) {
            setSelectAllAcrossPages(false);
            const allIds = new Set(filteredRecords.map(r => r.id));
            allIds.delete(id);
            setSelectedProcessIds(allIds);
            return;
        }

        const next = new Set(selectedProcessIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedProcessIds(next);
    };

    // Toggle Current Page Selection
    const toggleSelectCurrentPage = () => {
        if (selectAllAcrossPages) {
            setSelectAllAcrossPages(false);
            setSelectedProcessIds(new Set());
            return;
        }

        if (isCurrentPageFullySelected) {
            // Deselect all on current page
            const next = new Set(selectedProcessIds);
            currentPageRecordIds.forEach(id => next.delete(id));
            setSelectedProcessIds(next);
        } else {
            // Select all on current page
            const next = new Set(selectedProcessIds);
            currentPageRecordIds.forEach(id => next.add(id));
            setSelectedProcessIds(next);
        }
    };

    // Select All Across ALL Pagination
    const handleSelectAllAcrossPages = () => {
        setSelectAllAcrossPages(true);
        setSelectedProcessIds(new Set(filteredRecords.map(r => r.id)));
    };

    // Clear All Selection
    const handleClearSelection = () => {
        setSelectAllAcrossPages(false);
        setSelectedProcessIds(new Set());
        setPdfDeselectMap(new Map());
    };

    // Toggle Individual PDF inside an expanded process
    const togglePdfItem = (recordId: string, pdfName: string) => {
        const nextMap = new Map(pdfDeselectMap);
        const currentDeselected = new Set(nextMap.get(recordId) || []);

        if (currentDeselected.has(pdfName)) {
            currentDeselected.delete(pdfName);
        } else {
            currentDeselected.add(pdfName);
        }

        if (currentDeselected.size === 0) {
            nextMap.delete(recordId);
        } else {
            nextMap.set(recordId, currentDeselected);
        }

        setPdfDeselectMap(nextMap);
    };

    // Toggle expand row
    const toggleExpandRow = (id: string) => {
        const next = new Set(expandedRecordIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setExpandedRecordIds(next);
    };

    // ─── Extract PDF Names ──────────────────────────────────────────────────
    const extractPdfFilenames = (records: HistoryRecord[]): string[] => {
        const list: string[] = [];

        records.forEach(rec => {
            const deselected = pdfDeselectMap.get(rec.id);
            const pdfs = (rec.pdf_filenames || []).filter(name => {
                if (deselected && deselected.has(name)) return false;
                return Boolean(name && name.trim());
            });

            pdfs.forEach(name => {
                let formatted = name.trim();
                if (stripPdfExtension) {
                    formatted = formatted.replace(/\.pdf$/i, '');
                }
                list.push(formatted);
            });
        });

        if (uniqueOnly) {
            return Array.from(new Set(list));
        }
        return list;
    };

    // ─── Extract Matched AWBs (Data Berhasil Diproses) ──────────────────────
    const extractMatchedData = (records: HistoryRecord[], mode: 'both' | 'awb_only' = 'both'): string[] => {
        const list: string[] = [];

        records.forEach(rec => {
            const items = rec.matched_awbs || [];

            // Tentukan nama file PDF untuk proses ini
            const deselected = pdfDeselectMap.get(rec.id);
            const validPdfs = deselected
                ? (rec.pdf_filenames || []).filter(name => !deselected.has(name))
                : (rec.pdf_filenames || []);

            const formattedPdfs = (validPdfs.length > 0 ? validPdfs : (rec.pdf_filenames || [])).map(name => {
                let p = (name || '').trim();
                if (stripPdfExtension) {
                    p = p.replace(/\.pdf$/i, '');
                }
                return p;
            });
            const defaultPdfName = formattedPdfs.length > 0 ? formattedPdfs.join(', ') : '-';

            items.forEach((item: any) => {
                let parsed = item;
                if (typeof item === 'string' && item.startsWith('{')) {
                    try {
                        parsed = JSON.parse(item);
                    } catch (e) { }
                }

                const isObj = typeof parsed === 'object' && parsed !== null;
                const awb = isObj ? (parsed.awb || '-') : String(parsed);
                const idPesanan = isObj ? (parsed.id_pesanan || '-') : '-';

                let itemPdf = defaultPdfName;
                if (isObj && (parsed.pdf_name || parsed.pdf_filename)) {
                    let p = String(parsed.pdf_name || parsed.pdf_filename).trim();
                    if (stripPdfExtension) {
                        p = p.replace(/\.pdf$/i, '');
                    }
                    itemPdf = p;
                }

                if (mode === 'awb_only') {
                    if (awb && awb !== '-') list.push(awb);
                } else {
                    // Baris yang sama: Kolom 1: ID Pesanan, Kolom 2: AWB / Resi, Kolom 3: Nama File PDF
                    list.push(`${idPesanan}\t${awb}\t${itemPdf}`);
                }
            });
        });

        return list;
    };

    // ─── Lazy Loading Helpers for matched_awbs ─────────────────────────────
    const [loadingMatchedModalId, setLoadingMatchedModalId] = useState<string | null>(null);

    const handleOpenMatchedModal = async (record: HistoryRecord) => {
        setMatchedModalSearch('');
        if (record.matched_awbs && record.matched_awbs.length > 0) {
            setActiveMatchedModal(record);
            return;
        }

        setLoadingMatchedModalId(record.id);
        try {
            const { data } = await supabase
                .from('label_process_history')
                .select('matched_awbs')
                .eq('id', record.id)
                .single();

            const awbs = data?.matched_awbs
                ? (Array.isArray(data.matched_awbs) ? data.matched_awbs : (typeof data.matched_awbs === 'string' ? JSON.parse(data.matched_awbs || '[]') : []))
                : [];

            const updated = { ...record, matched_awbs: awbs };
            setAllRecords(prev => prev.map(r => r.id === record.id ? updated : r));
            setActiveMatchedModal(updated);
        } catch (err) {
            console.error('Error fetching matched_awbs for modal:', err);
            setActiveMatchedModal({ ...record, matched_awbs: [] });
        } finally {
            setLoadingMatchedModalId(null);
        }
    };

    const ensureRecordsMatchedAwbs = async (records: HistoryRecord[]): Promise<HistoryRecord[]> => {
        const missing = records.filter(r => !r.matched_awbs || r.matched_awbs.length === 0);
        if (missing.length === 0) return records;

        try {
            const missingIds = missing.map(m => m.id);
            const { data } = await supabase
                .from('label_process_history')
                .select('id, matched_awbs')
                .in('id', missingIds);

            if (data && data.length > 0) {
                const awbMap = new Map<string, any[]>();
                data.forEach((row: any) => {
                    const parsed = Array.isArray(row.matched_awbs)
                        ? row.matched_awbs
                        : (typeof row.matched_awbs === 'string' ? JSON.parse(row.matched_awbs || '[]') : []);
                    awbMap.set(String(row.id), parsed);
                });

                setAllRecords(prev => prev.map(r => awbMap.has(r.id) ? { ...r, matched_awbs: awbMap.get(r.id)! } : r));

                return records.map(r => {
                    if (awbMap.has(r.id)) {
                        return { ...r, matched_awbs: awbMap.get(r.id)! };
                    }
                    return r;
                });
            }
        } catch (err) {
            console.error('Failed to batch load matched_awbs:', err);
        }

        return records;
    };

    // ─── Copy Handlers ──────────────────────────────────────────────────────
    const handleCopyPdfs = (records: HistoryRecord[] = effectiveSelectedRecords, buttonId: string = 'batch_pdf') => {
        const filenames = extractPdfFilenames(records);
        if (filenames.length === 0) {
            alert('⚠️ Tidak ada nama file PDF yang dipilih untuk disalin.');
            return;
        }

        const joinChar = separator === 'comma' ? ', ' : '\n';
        const text = filenames.join(joinChar);

        navigator.clipboard.writeText(text);
        setCopiedButtonId(buttonId);
        setTimeout(() => setCopiedButtonId(null), 2500);

        if (showToast) {
            const whObj = selectedWarehouseId !== 'ALL' ? warehouses.find(w => w.id === selectedWarehouseId) : null;
            const whSuffix = whObj ? ` (${whObj.name})` : '';
            showToast(`✅ Berhasil menyalin ${filenames.length} nama file PDF${whSuffix} ke clipboard!`);
        }
    };

    const handleCopyMatched = async (records: HistoryRecord[] = effectiveSelectedRecords, mode: 'both' | 'awb_only' = 'both', buttonId: string = 'batch_matched') => {
        setCopiedButtonId(buttonId);
        showToast && showToast('⏳ Menyiapkan data resi & pesanan...');
        const loadedRecords = await ensureRecordsMatchedAwbs(records);
        const dataLines = extractMatchedData(loadedRecords, mode);
        if (dataLines.length === 0) {
            alert('⚠️ Tidak ada data resi / pesanan yang berhasil diproses pada proses yang dipilih.');
            setCopiedButtonId(null);
            return;
        }

        const text = dataLines.join('\n');
        navigator.clipboard.writeText(text);
        setCopiedButtonId(buttonId);
        setTimeout(() => setCopiedButtonId(null), 2500);

        if (showToast) {
            const whObj = selectedWarehouseId !== 'ALL' ? warehouses.find(w => w.id === selectedWarehouseId) : null;
            const whSuffix = whObj ? ` (${whObj.name})` : '';
            const label = mode === 'awb_only' ? 'nomor resi' : 'data resi, ID pesanan & nama file PDF';
            showToast(`✅ Berhasil menyalin ${dataLines.length} ${label}${whSuffix} ke clipboard!`);
        }
    };

    // Quick Preview
    const handleOpenPreview = async (type: 'pdf' | 'matched') => {
        const whObj = selectedWarehouseId !== 'ALL' ? warehouses.find(w => w.id === selectedWarehouseId) : null;
        const whSuffix = whObj ? ` [${whObj.name}]` : '';

        if (type === 'pdf') {
            const list = extractPdfFilenames(effectiveSelectedRecords);
            const joinChar = separator === 'comma' ? ', ' : '\n';
            setPreviewModalData({
                title: `Preview Nama File PDF${whSuffix} (${list.length} File)`,
                content: list.join(joinChar),
                count: list.length
            });
        } else {
            showToast && showToast('⏳ Menyiapkan preview data...');
            const loaded = await ensureRecordsMatchedAwbs(effectiveSelectedRecords);
            const list = extractMatchedData(loaded, 'both');
            setPreviewModalData({
                title: `Preview Data Berhasil Diproses${whSuffix} (${list.length} Baris: ID Pesanan [TAB] No Resi [TAB] Nama PDF)`,
                content: list.join('\n'),
                count: list.length
            });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-900/15 border border-slate-800/80 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start md:items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-indigo-300 shadow-xl shadow-indigo-500/20 flex-shrink-0 mr-1">
                            <FaFilePdf className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                                    Salin Data & PDF Riwayat
                                </h2>
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                    Admin Tool
                                </span>
                            </div>
                            <p className="text-xs lg:text-sm font-medium text-slate-300 mt-1">
                                Pilih data proses riwayat, salin massal hanya nama file PDF saja, atau salin data resi & pesanan langsung tanpa buka riwayat satu per satu.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                        <button
                            onClick={() => setRefreshTrigger(t => t + 1)}
                            disabled={loading}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh Data</span>
                        </button>
                    </div>
                </div>

                {/* Sub Bar Stats */}
                <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300 font-normal">
                    <div className="flex items-center gap-4">
                        <span>Total Tersedia: <strong className="text-white font-mono">{filteredRecords.length}</strong> Proses</span>
                        <span>•</span>
                        <span>Total PDF: <strong className="text-indigo-300 font-mono">
                            {filteredRecords.reduce((acc, r) => acc + (r.pdf_filenames?.length || 0), 0)}
                        </strong> File</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCopySettings(!showCopySettings)}
                            className="text-white/80 hover:text-white flex items-center gap-1.5 font-bold hover:underline"
                        >
                            <FiSliders className="w-3.5 h-3.5" />
                            <span>Opsi Format Salinan</span>
                        </button>
                    </div>
                </div>

                {/* Expandable Copy Options Drawer */}
                {showCopySettings && (
                    <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="font-extrabold text-indigo-200 uppercase tracking-wider text-[11px]">
                            Pengaturan Format Salinan Nama PDF
                        </div>
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={stripPdfExtension}
                                    onChange={(e) => setStripPdfExtension(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                                />
                                <span>Hilangkan ekstensi <code className="bg-black/30 px-1 py-0.5 rounded">.pdf</code></span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={uniqueOnly}
                                    onChange={(e) => setUniqueOnly(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                                />
                                <span>Hapus nama duplikat (Unique Only)</span>
                            </label>

                            <div className="flex items-center gap-2">
                                <span>Pemisah:</span>
                                <select
                                    value={separator}
                                    onChange={(e: any) => setSeparator(e.target.value)}
                                    className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1 text-xs outline-none"
                                >
                                    <option value="newline">Baris Baru (Enter / Newline)</option>
                                    <option value="comma">Koma (,) & Spasi</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter & Controls Toolbar */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
                {/* 🏢 Warehouse Selector Bar (Pilihan Gudang - Isolasi Ketat) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <FaWarehouse className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight">
                                Pilih Gudang (Isolasi Riwayat & Salinan)
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-black text-slate-900">
                                    {selectedWarehouseId === 'ALL'
                                        ? '🌐 Semua Gudang'
                                        : `🏢 ${warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Gudang Terpilih'}`}
                                </span>
                                {selectedWarehouseId !== 'ALL' && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        ✓ Data Terpisah & Tidak Tercampur
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Warehouse Tabs Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                        <button
                            onClick={() => handleSelectWarehouse('ALL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                                selectedWarehouseId === 'ALL'
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <span>🌐</span>
                            <span>Semua</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                selectedWarehouseId === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {allRecords.length}
                            </span>
                        </button>

                        {warehouses.map(wh => {
                            const isSelected = selectedWarehouseId === wh.id;
                            const isJakarta = wh.name.toLowerCase().includes('jakarta');
                            const isSurabaya = wh.name.toLowerCase().includes('surabaya');
                            const count = allRecords.filter(r => getRecordWarehouse(r)?.id === wh.id).length;

                            return (
                                <button
                                    key={wh.id}
                                    onClick={() => handleSelectWarehouse(wh.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                                        isSelected
                                            ? isJakarta
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : isSurabaya
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                                : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <FaWarehouse className="w-3.5 h-3.5" />
                                    <span>{wh.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Cari berdasarkan nama Excel, nama PDF, nomor AWB, atau picker..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-800 font-semibold focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1">
                            <button
                                onClick={() => setIsAllDates(false)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${!isAllDates ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                            >
                                Per Tanggal
                            </button>
                            <button
                                onClick={() => setIsAllDates(true)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isAllDates ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                            >
                                Semua Tanggal
                            </button>
                        </div>

                        {!isAllDates && (
                            <div className="flex items-center gap-2">
                                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                                    <FiCalendar className="w-4 h-4 text-indigo-600 mr-2" />
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        const y = now.getFullYear();
                                        const m = String(now.getMonth() + 1).padStart(2, '0');
                                        const d = String(now.getDate()).padStart(2, '0');
                                        setSelectedDate(`${y}-${m}-${d}`);
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Hari Ini
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Page Size Dropdown */}
                    <div className="flex items-center gap-2 self-end lg:self-center">
                        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Baris:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                        >
                            {PAGE_SIZE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ─── SELECT ALL ACROSS PAGINATION BANNER ─── */}
                {isCurrentPageFullySelected && filteredRecords.length > paginatedRecords.length && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                            <FiCheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            {selectAllAcrossPages ? (
                                <span>
                                    🌟 <strong>Semua {filteredRecords.length} proses</strong> di seluruh pagination saat ini dipilih.
                                </span>
                            ) : (
                                <span>
                                    Semua <strong>{paginatedRecords.length} proses</strong> di halaman ini dipilih.
                                </span>
                            )}
                        </div>

                        {!selectAllAcrossPages ? (
                            <button
                                onClick={handleSelectAllAcrossPages}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                                <span>Pilih Semua {filteredRecords.length} Data di Seluruh Halaman</span>
                                <FiArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleClearSelection}
                                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                            >
                                Batalkan Pilihan Semua
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ─── PROMINENT MASS ACTIONS BAR (ACTIVE WHEN SELECTED) ─── */}
            {statsSummary.selectedCount > 0 && (
                <div className="sticky top-20 z-30 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl text-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-black text-xs px-3 py-1.5 rounded-xl">
                            {statsSummary.selectedCount} Proses Terpilih
                        </span>
                        {selectedWarehouseId !== 'ALL' && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                <FaWarehouse className="w-3.5 h-3.5" />
                                <span>Gudang: {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Terpilih'}</span>
                            </span>
                        )}
                        <span className="text-xs font-semibold text-slate-300">
                            • Total <strong className="text-emerald-400 font-mono text-sm">{statsSummary.totalPdfs}</strong> File PDF
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                            • Total <strong className="text-indigo-300 font-mono text-sm">{statsSummary.totalMatched}</strong> Resi Match
                        </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Copy PDF Names Button */}
                        <button
                            onClick={() => handleCopyPdfs(effectiveSelectedRecords, 'sticky_pdf')}
                            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg transition-all flex items-center gap-2 cursor-pointer ${copiedButtonId === 'sticky_pdf'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02]'
                                }`}
                        >
                            <FaFilePdf className="w-4 h-4" />
                            <span>
                                {copiedButtonId === 'sticky_pdf'
                                    ? '✓ PDF Disalin!'
                                    : `Salin Nama PDF Saja (${statsSummary.totalPdfs})`}
                            </span>
                        </button>

                        {/* Copy Matched AWB & ID Pesanan Button */}
                        <button
                            onClick={() => handleCopyMatched(effectiveSelectedRecords, 'both', 'sticky_matched')}
                            className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg transition-all flex items-center gap-2 cursor-pointer ${copiedButtonId === 'sticky_matched'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-700 hover:bg-emerald-600 text-white hover:scale-[1.02]'
                                }`}
                        >
                            <FiClipboard className="w-4 h-4" />
                            <span>
                                {copiedButtonId === 'sticky_matched'
                                    ? '✓ Resi Disalin!'
                                    : `Salin Data Berhasil Diproses (${statsSummary.totalMatched})`}
                            </span>
                        </button>

                        {/* Preview Dropdown */}
                        <button
                            onClick={() => handleOpenPreview('pdf')}
                            title="Preview nama PDF yang akan disalin"
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-colors"
                        >
                            <FiEye className="w-4 h-4" />
                        </button>

                        {/* Reset Selection */}
                        <button
                            onClick={handleClearSelection}
                            title="Batal pilih"
                            className="p-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white rounded-2xl transition-colors"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ─── DATA TABLE ─── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                                <th className="p-4 w-12 text-center">
                                    <button
                                        onClick={toggleSelectCurrentPage}
                                        title={isCurrentPageFullySelected ? "Batalkan pilihan halaman ini" : "Pilih semua di halaman ini"}
                                        className="cursor-pointer"
                                    >
                                        {isCurrentPageFullySelected || selectAllAcrossPages ? (
                                            <FiCheckSquare className="w-5 h-5 text-indigo-600 mx-auto" />
                                        ) : (
                                            <FiSquare className="w-5 h-5 text-slate-400 mx-auto" />
                                        )}
                                    </button>
                                </th>
                                <th className="p-4">Waktu & Tanggal</th>
                                <th className="p-4">Nama File Excel</th>
                                <th className="p-4">Daftar File PDF</th>
                                <th className="p-4 text-center">Statistik</th>
                                <th className="p-4 text-right">Aksi Cepat</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-400">
                                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="font-extrabold text-slate-700 text-sm">Mengambil data riwayat proses...</p>
                                    </td>
                                </tr>
                            ) : paginatedRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-400">
                                        <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
                                            <FiDatabase className="w-7 h-7" />
                                        </div>
                                        <h4 className="font-black text-slate-800 text-base">Tidak Ada Data Riwayat</h4>
                                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                            Tidak ditemukan data proses pada filter pencarian atau tanggal yang dipilih.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRecords.map((record) => {
                                    const isSelected = selectedProcessIds.has(record.id) || selectAllAcrossPages;
                                    const isExpanded = expandedRecordIds.has(record.id);
                                    const deselectedPdfs = pdfDeselectMap.get(record.id);
                                    const pdfCount = record.pdf_filenames?.length || 0;
                                    const activePdfCount = deselectedPdfs
                                        ? (record.pdf_filenames || []).filter(p => !deselectedPdfs.has(p)).length
                                        : pdfCount;

                                    return (
                                        <React.Fragment key={record.id}>
                                            <tr
                                                className={`transition-colors hover:bg-indigo-50/40 ${isSelected ? 'bg-indigo-50/70' : 'bg-white'}`}
                                            >
                                                {/* Checkbox */}
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => toggleSelectProcess(record.id)}
                                                        className="cursor-pointer"
                                                    >
                                                        {isSelected ? (
                                                            <FiCheckSquare className="w-5 h-5 text-indigo-600 mx-auto" />
                                                        ) : (
                                                            <FiSquare className="w-5 h-5 text-slate-300 hover:text-slate-500 mx-auto" />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Timestamp */}
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="font-extrabold text-slate-800 text-xs">
                                                        {new Date(record.created_at).toLocaleDateString('id-ID', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                    <div className="text-[11px] font-mono text-slate-400">
                                                        {new Date(record.created_at).toLocaleTimeString('id-ID', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit'
                                                        })}
                                                    </div>
                                                </td>

                                                {/* Excel Name & Warehouse */}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 max-w-xs">
                                                        <FaFileExcel className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                                        <span className="font-extrabold text-slate-900 text-xs truncate" title={record.excel_filename}>
                                                            {record.excel_filename || '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                        {record.username && (
                                                            <span className="text-[10px] text-slate-400">
                                                                User: {record.username}
                                                            </span>
                                                        )}
                                                        {(() => {
                                                            const wh = getRecordWarehouse(record);
                                                            if (!wh) return null;
                                                            const isJakarta = wh.name.toLowerCase().includes('jakarta');
                                                            const isSurabaya = wh.name.toLowerCase().includes('surabaya');
                                                            return (
                                                                <span
                                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
                                                                        isJakarta
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                            : isSurabaya
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                            : 'bg-purple-50 text-purple-700 border-purple-200'
                                                                    }`}
                                                                >
                                                                    <FaWarehouse className="w-2.5 h-2.5" />
                                                                    <span>{wh.name}</span>
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>

                                                {/* PDF Filenames Summary */}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 flex-wrap max-w-md">
                                                        {pdfCount === 0 ? (
                                                            <span className="text-slate-400 text-xs italic">Tidak ada file PDF</span>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => toggleExpandRow(record.id)}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold text-xs transition-colors border border-blue-200 cursor-pointer"
                                                                >
                                                                    <FaFilePdf className="w-3.5 h-3.5 text-blue-600" />
                                                                    <span>{activePdfCount} PDF</span>
                                                                    <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                </button>

                                                                {/* First 1-2 filenames preview */}
                                                                <span className="text-slate-600 text-xs font-semibold truncate max-w-[200px]" title={record.pdf_filenames[0]}>
                                                                    {record.pdf_filenames[0]}
                                                                </span>
                                                                {pdfCount > 1 && !isExpanded && (
                                                                    <span className="text-[11px] text-slate-400 font-semibold">
                                                                        +{pdfCount - 1} lainnya
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Stats Badges */}
                                                <td className="p-4 text-center whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200">
                                                            {record.matched_count || 0} Match
                                                        </span>
                                                        {(record.unmatched_excel_count || 0) > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-extrabold text-[11px] border border-amber-200">
                                                                {record.unmatched_excel_count} Excel
                                                            </span>
                                                        )}
                                                        {(record.unmatched_pdf_count || 0) > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-extrabold text-[11px] border border-rose-200">
                                                                {record.unmatched_pdf_count} PDF
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Row Quick Action Buttons */}
                                                <td className="p-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Quick Copy PDF for this row */}
                                                        {pdfCount > 0 && (
                                                            <button
                                                                onClick={() => handleCopyPdfs([record], `row_pdf_${record.id}`)}
                                                                title="Salin semua nama file PDF di proses ini"
                                                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${copiedButtonId === `row_pdf_${record.id}`
                                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                                    : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border-indigo-200'
                                                                    }`}
                                                            >
                                                                <FaFilePdf className="w-3.5 h-3.5" />
                                                                <span>{copiedButtonId === `row_pdf_${record.id}` ? 'Disalin!' : 'Copy PDF'}</span>
                                                            </button>
                                                        )}

                                                        {/* Modal Data Berhasil Diproses for this row */}
                                                        {((record.matched_count || 0) > 0 || (record.matched_awbs && record.matched_awbs.length > 0)) && (
                                                            <button
                                                                onClick={() => handleOpenMatchedModal(record)}
                                                                title="Buka Data Berhasil Diproses (Resi & ID Pesanan)"
                                                                disabled={loadingMatchedModalId === record.id}
                                                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                            >
                                                                {loadingMatchedModalId === record.id ? (
                                                                    <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <FiClipboard className="w-3.5 h-3.5" />
                                                                )}
                                                                <span>Data Resi ({record.matched_count || record.matched_awbs?.length || 0})</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Accordion: View & Select Individual PDFs in this Process */}
                                            {isExpanded && record.pdf_filenames && record.pdf_filenames.length > 0 && (
                                                <tr className="bg-slate-50/80">
                                                    <td colSpan={6} className="px-6 py-4 border-y border-slate-200">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-extrabold text-slate-700">
                                                                    Daftar File PDF ({record.pdf_filenames.length} File) - Klik untuk pilih / hapus centang:
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const next = new Map(pdfDeselectMap);
                                                                            next.delete(record.id);
                                                                            setPdfDeselectMap(next);
                                                                        }}
                                                                        className="text-indigo-600 hover:underline font-bold text-[11px]"
                                                                    >
                                                                        Pilih Semua PDF
                                                                    </button>
                                                                    <span>•</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            const next = new Map(pdfDeselectMap);
                                                                            next.set(record.id, new Set(record.pdf_filenames));
                                                                            setPdfDeselectMap(next);
                                                                        }}
                                                                        className="text-rose-600 hover:underline font-bold text-[11px]"
                                                                    >
                                                                        Batal Pilih Semua
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                                                {record.pdf_filenames.map((pdfName, i) => {
                                                                    const isChecked = !(deselectedPdfs && deselectedPdfs.has(pdfName));
                                                                    return (
                                                                        <div
                                                                            key={i}
                                                                            onClick={() => togglePdfItem(record.id, pdfName)}
                                                                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${isChecked
                                                                                ? 'bg-white border-indigo-200 text-slate-800 shadow-xs'
                                                                                : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                                                                                }`}
                                                                        >
                                                                            {isChecked ? (
                                                                                <FiCheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                                                            ) : (
                                                                                <FiSquare className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                                                            )}
                                                                            <span className="truncate" title={pdfName}>{pdfName}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ─── PAGINATION BAR ─── */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs font-semibold text-slate-600">
                        Menampilkan <strong className="text-slate-900">{paginatedRecords.length}</strong> dari{' '}
                        <strong className="text-slate-900">{filteredRecords.length}</strong> data riwayat
                        {filteredRecords.length > 0 && ` (Halaman ${currentPage} dari ${totalPages})`}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                            <span>Prev</span>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                                let pageNum = idx + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 3 + idx;
                                    if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all ${currentPage === pageNum
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                            <span>Next</span>
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* ─── MODAL DATA BERHASIL DIPROSES (AWB & ID PESANAN) ──────────── */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeMatchedModal && createPortal(
                <div
                    className="fixed inset-0 w-screen h-screen bg-black/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setActiveMatchedModal(null)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="text-xl font-black text-gray-900">Data Berhasil Diproses</h3>
                                    {(() => {
                                        const wh = getRecordWarehouse(activeMatchedModal);
                                        if (!wh) return null;
                                        const isJakarta = wh.name.toLowerCase().includes('jakarta');
                                        const isSurabaya = wh.name.toLowerCase().includes('surabaya');
                                        return (
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide border ${
                                                    isJakarta
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : isSurabaya
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                }`}
                                            >
                                                <FaWarehouse className="w-3 h-3" />
                                                <span>{wh.name}</span>
                                            </span>
                                        );
                                    })()}
                                </div>
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    File: <strong className="text-gray-800">{activeMatchedModal.excel_filename}</strong> ({activeMatchedModal.matched_awbs?.length || activeMatchedModal.matched_count || 0} resi)
                                    {activeMatchedModal.username && (
                                        <span className="ml-2 text-slate-400">• User: <strong className="text-slate-600">{activeMatchedModal.username}</strong></span>
                                    )}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Copy ID Pesanan + AWB */}
                                <button
                                    onClick={() => handleCopyMatched([activeMatchedModal], 'both', 'modal_matched')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${copiedButtonId === 'modal_matched'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                >
                                    <FiClipboard className="w-4 h-4" />
                                    <span>{copiedButtonId === 'modal_matched' ? 'Tersalin!' : 'Copy Data'}</span>
                                </button>

                                {/* Copy Nama File PDF Saja */}
                                <button
                                    onClick={() => handleCopyPdfs([activeMatchedModal], 'modal_pdf')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${copiedButtonId === 'modal_pdf'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    <FaFilePdf className="w-4 h-4" />
                                    <span>
                                        {copiedButtonId === 'modal_pdf'
                                            ? 'PDF Disalin!'
                                            : `Copy Nama PDF (${activeMatchedModal.pdf_filenames?.length || 0})`}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveMatchedModal(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Search in Modal */}
                        <div className="px-6 py-3 border-b border-gray-100 bg-white">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                <input
                                    type="text"
                                    placeholder="Filter AWB / ID Pesanan di tabel ini..."
                                    value={matchedModalSearch}
                                    onChange={(e) => setMatchedModalSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                                />
                            </div>
                        </div>

                        {/* Modal Body Table */}
                        <div className="p-6 overflow-y-auto bg-gray-50/30 flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-100 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                                        <th className="p-3 rounded-tl-xl">ID Pesanan</th>
                                        <th className="p-3">AWB / Resi</th>
                                        <th className="p-3 rounded-tr-xl">Nama File PDF</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loadingMatchedModalId === activeMatchedModal.id ? (
                                        <tr>
                                            <td colSpan={3} className="py-12 text-center text-slate-400">
                                                <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                <p className="font-extrabold text-slate-700 text-xs">Memuat data resi...</p>
                                            </td>
                                        </tr>
                                    ) : (!activeMatchedModal.matched_awbs || activeMatchedModal.matched_awbs.length === 0) ? (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-slate-400 italic">
                                                Tidak ada data resi / ID pesanan untuk file ini
                                            </td>
                                        </tr>
                                    ) : (
                                        activeMatchedModal.matched_awbs
                                            .filter((item: any) => {
                                                if (!matchedModalSearch.trim()) return true;
                                                const query = matchedModalSearch.trim().toLowerCase();
                                                let parsed = item;
                                                if (typeof item === 'string' && item.startsWith('{')) {
                                                    try { parsed = JSON.parse(item); } catch (e) { }
                                                }
                                                const isObj = typeof parsed === 'object' && parsed !== null;
                                                const awb = isObj ? (parsed.awb || '') : String(parsed);
                                                const id_pesanan = isObj ? (parsed.id_pesanan || '') : '';
                                                const pdfName = (isObj && (parsed.pdf_name || parsed.pdf_filename))
                                                    ? String(parsed.pdf_name || parsed.pdf_filename)
                                                    : (activeMatchedModal.pdf_filenames?.join(', ') || '');
                                                return awb.toLowerCase().includes(query) || id_pesanan.toLowerCase().includes(query) || pdfName.toLowerCase().includes(query);
                                            })
                                            .map((item: any, idx: number) => {
                                                let parsed = item;
                                                if (typeof item === 'string' && item.startsWith('{')) {
                                                    try { parsed = JSON.parse(item); } catch (e) { }
                                                }
                                                const isObj = typeof parsed === 'object' && parsed !== null;
                                                const awb = isObj ? parsed.awb : parsed;
                                                const id_pesanan = isObj ? parsed.id_pesanan : '-';
                                                let pdfName = (isObj && (parsed.pdf_name || parsed.pdf_filename))
                                                    ? String(parsed.pdf_name || parsed.pdf_filename)
                                                    : (activeMatchedModal.pdf_filenames && activeMatchedModal.pdf_filenames.length > 0 ? activeMatchedModal.pdf_filenames.join(', ') : '-');
                                                if (stripPdfExtension && pdfName !== '-') {
                                                    pdfName = pdfName.replace(/\.pdf$/i, '');
                                                }

                                                return (
                                                    <tr key={idx} className="hover:bg-white font-mono transition-colors">
                                                        <td className="p-3 font-bold text-gray-900">{id_pesanan || '-'}</td>
                                                        <td className="p-3 text-gray-600">{awb || '-'}</td>
                                                        <td className="p-3 text-indigo-600 font-semibold truncate max-w-xs" title={pdfName}>{pdfName}</td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* ─── MODAL PREVIEW DATA YANG AKAN DISALIN ─────────────────────── */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {previewModalData && createPortal(
                <div
                    className="fixed inset-0 w-screen h-screen bg-black/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewModalData(null)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-base font-black text-gray-900">{previewModalData.title}</h3>
                            <button
                                onClick={() => setPreviewModalData(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto">
                            <textarea
                                readOnly
                                value={previewModalData.content}
                                className="w-full h-80 p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 outline-none resize-none"
                            />
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">
                                Total: {previewModalData.count} baris
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(previewModalData.content);
                                    if (showToast) showToast('✅ Berhasil disalin ke clipboard!');
                                    setPreviewModalData(null);
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5"
                            >
                                <FiCopy className="w-4 h-4" />
                                <span>Salin Semua Teks</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AdminPdfHistoryExtractor;

