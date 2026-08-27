import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
// Use Fa (FontAwesome 5) for solid icons
import { FaBox, FaTruck, FaClock, FaTimesCircle, FaChartPie, FaCalendarAlt, FaSyncAlt, FaSearch } from 'react-icons/fa';
// Keep some Fi icons if suitable replacement not found or if outline preferred for generic UI
import { FiActivity, FiRefreshCcw, FiX, FiMoreVertical, FiCheckCircle, FiShield, FiZap, FiLock, FiUsers } from 'react-icons/fi';

interface ProcessedItem {
    id: string;
    order_id: string;
    awb: string;
    excel_filename: string;
    processed_at: string;
    date_processed: string;
    status?: string;
}

interface DailyStats {
    total_orders: number;
    total_sent: number;
    total_pending: number;
    total_cancel: number;
    last_updated: string;
}

// Fix: Use local date instead of UTC to fix timezone issue (GMT+7 midnight problem)
const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// SVG Background Wave Graph for Card
const SvgCardGraph = ({ type }: { type: 'blue' | 'emerald' | 'amber' | 'rose' }) => {
    const colorMap = {
        blue: '#3b82f6',
        emerald: '#10b981',
        amber: '#f59e0b',
        rose: '#f43f5e'
    };
    const color = colorMap[type];
    const gradId = `card-grad-${type}`;

    return (
        <svg viewBox="0 0 160 70" className="absolute right-0 bottom-0 w-40 h-20 pointer-events-none opacity-70" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
            </defs>
            <path
                d="M 0 50 Q 25 60 55 40 T 110 30 T 160 12 L 160 70 L 0 70 Z"
                fill={`url(#${gradId})`}
            />
            <path
                d="M 0 50 Q 25 60 55 40 T 110 30 T 160 12"
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
};

interface DashboardProps {
    user?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    const [todayStats, setTodayStats] = useState<DailyStats>({
        total_orders: 0,
        total_sent: 0,
        total_pending: 0,
        total_cancel: 0,
        last_updated: ''
    });
    const [recentItems, setRecentItems] = useState<ProcessedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());

    // Track if user manually changed the date (to avoid auto-overriding their choice)
    const isManualDateSelection = useRef(false);

    // Modal state for Cancel/Pending details
    const [detailModal, setDetailModal] = useState<{ type: 'cancel' | 'pending' | null; data: any[] }>({ type: null, data: [] });
    const [cancelDetails, setCancelDetails] = useState<any[]>([]);
    const [pendingDetails, setPendingDetails] = useState<any[]>([]);

    // Auto-update date at midnight
    useEffect(() => {
        const checkDateChange = () => {
            const today = getTodayDateString();
            // Only auto-update if user hasn't manually selected a different date
            if (!isManualDateSelection.current && selectedDate !== today) {
                console.log('[Dashboard] New day detected, auto-updating to:', today);
                setSelectedDate(today);
            }
        };

        // Check every 30 seconds
        const interval = setInterval(checkDateChange, 30000);

        // Also check immediately on mount
        checkDateChange();

        return () => clearInterval(interval);
    }, [selectedDate]);

    // Handle manual date selection
    const handleDateChange = (newDate: string) => {
        const today = getTodayDateString();
        // If user selects today, reset manual flag; otherwise mark as manual
        isManualDateSelection.current = newDate !== today;
        setSelectedDate(newDate);
    };

    // Debounced fetch - wait 300ms after date change before fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDashboardData();
        }, 300);
        return () => clearTimeout(timer);
    }, [selectedDate]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const dateToUse = selectedDate;
            const activeTenantId = user?.tenant_id || user?.username;

            let validFilenames: string[] = [];
            if (activeTenantId) {
                const { data: tenantHistory } = await supabase
                    .from('label_process_history')
                    .select('excel_filename')
                    .eq('tenant_id', activeTenantId);
                if (tenantHistory) {
                    validFilenames = tenantHistory.map((h: any) => h.excel_filename);
                }
            }

            let orderCount = 0;
            let countError = null;
            let recents = [];
            let listError = null;

            if (validFilenames.length > 0) {
                const countQuery = await supabase
                    .from('processed_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('date_processed', dateToUse)
                    .in('excel_filename', validFilenames);
                
                orderCount = countQuery.count || 0;
                countError = countQuery.error;

                const listQuery = await supabase
                    .from('processed_items')
                    .select('*')
                    .in('excel_filename', validFilenames)
                    .order('processed_at', { ascending: false })
                    .limit(50);
                
                recents = listQuery.data || [];
                listError = listQuery.error;
            }

            const [
                { data: cancelData, error: cancelError },
                { data: pendingData, error: pendingError }
            ] = await Promise.all([
                supabase
                    .from('scanned_items')
                    .select('barcode, scan_date')
                    .eq('description', '[CANCEL] Camera Scan')
                    .eq('scan_date', dateToUse)
                    .limit(1000),
                supabase
                    .from('scanned_items')
                    .select('barcode, scan_date')
                    .eq('description', '[PENDING] Camera Scan')
                    .eq('scan_date', dateToUse)
                    .limit(1000)
            ]);

            if (countError) console.error('[Dashboard] Error fetching processed_items count:', countError);

            let cancelCount = 0;
            let uniqueCancelData: any[] = [];
            if (!cancelError && cancelData) {
                const seen = new Set<string>();
                uniqueCancelData = cancelData.filter(item => {
                    if (seen.has(item.barcode)) return false;
                    seen.add(item.barcode);
                    return true;
                });
                cancelCount = uniqueCancelData.length;
            }
            setCancelDetails(uniqueCancelData);

            let pendingCount = 0;
            let uniquePendingData: any[] = [];
            if (!pendingError && pendingData) {
                const seen = new Set<string>();
                uniquePendingData = pendingData.filter(item => {
                    if (seen.has(item.barcode)) return false;
                    seen.add(item.barcode);
                    return true;
                });
                pendingCount = uniquePendingData.length;
            }
            setPendingDetails(uniquePendingData);

            const total = orderCount || 0;
            const cancel = cancelCount;
            const pending = pendingCount;
            const sent = Math.max(0, total - cancel - pending);

            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;

            setTodayStats({
                total_orders: total,
                total_sent: sent,
                total_pending: pending,
                total_cancel: cancel,
                last_updated: timeStr
            });
            setRecentItems(recents || []);

        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [selectedDate, user?.username, user?.tenant_id]);

    const filteredItems = recentItems.filter(item =>
        (item.order_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.awb?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const calcPercent = (val: number, total: number) => {
        if (!total || total === 0) return 0;
        return Math.round((val / total) * 100);
    };

    const totalOrders = todayStats.total_orders;

    return (
        <div className="space-y-6">
            {/* Dasbor Statistik Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-blue-500/25">
                        <FiActivity className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dasbor Statistik</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Ringkasan aktivitas pengiriman secara real-time</p>
                    </div>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className="w-10 h-10 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                    title="Refresh Data"
                >
                    <FiRefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Date & Refresh Banner */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <FaCalendarAlt className="w-4 h-4" />
                    </div>
                    <div className="relative cursor-pointer flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>
                    {loading && <span className="text-xs text-indigo-500 animate-pulse font-medium ml-2">Updating...</span>}
                </div>
                <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                    <FaSyncAlt className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>Update: {todayStats.last_updated || '20.44.09'}</span>
                </div>
            </div>

            {/* 4 Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. TOTAL DIPROSES */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden flex flex-col justify-between h-[160px]">
                    <SvgCardGraph type="blue" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                            <FaBox className="w-5 h-5" />
                        </div>
                        <button className="text-slate-300 hover:text-slate-500 p-1">
                            <FiMoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative z-10 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL DIPROSES</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">{todayStats.total_orders.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                            ↗ {calcPercent(todayStats.total_orders, totalOrders)}% dari total
                        </span>
                    </div>
                </div>

                {/* 2. DIKIRIM HARI INI */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden flex flex-col justify-between h-[160px]">
                    <SvgCardGraph type="emerald" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                            <FaTruck className="w-5 h-5" />
                        </div>
                        <button className="text-slate-300 hover:text-slate-500 p-1">
                            <FiMoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative z-10 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DIKIRIM HARI INI</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">{todayStats.total_sent.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                            ↗ {calcPercent(todayStats.total_sent, totalOrders)}% dari total
                        </span>
                    </div>
                </div>

                {/* 3. TOTAL PENDING */}
                <div 
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden flex flex-col justify-between h-[160px] cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setDetailModal({ type: 'pending', data: pendingDetails })}
                >
                    <SvgCardGraph type="amber" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/25">
                            <FaClock className="w-5 h-5" />
                        </div>
                        <button className="text-slate-300 hover:text-slate-500 p-1">
                            <FiMoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative z-10 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL PENDING</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">{todayStats.total_pending.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                            ⏱ {calcPercent(todayStats.total_pending, totalOrders)}% dari total
                        </span>
                    </div>
                </div>

                {/* 4. TOTAL CANCEL */}
                <div 
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden flex flex-col justify-between h-[160px] cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setDetailModal({ type: 'cancel', data: cancelDetails })}
                >
                    <SvgCardGraph type="rose" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="w-11 h-11 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-rose-500/25">
                            <FaTimesCircle className="w-5 h-5" />
                        </div>
                        <button className="text-slate-300 hover:text-slate-500 p-1">
                            <FiMoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative z-10 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL CANCEL</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">{todayStats.total_cancel.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="relative z-10">
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                            ⏱ {calcPercent(todayStats.total_cancel, totalOrders)}% dari total
                        </span>
                    </div>
                </div>
            </div>

            {/* Progres Pengiriman Harian Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                            <FaChartPie className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-900">Progres Pengiriman Harian</h4>
                            <p className="text-xs text-slate-500 font-normal mt-0.5">Ringkasan status penyelesaian pengiriman hari ini</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-900 text-sm font-bold">
                        <span>{calcPercent(todayStats.total_sent, totalOrders)}% Berhasil</span>
                        <FiCheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
                        <span>Status Penyelesaian</span>
                    </div>
                    <div className="h-7 bg-slate-100 rounded-full overflow-hidden flex items-center shadow-inner">
                        {todayStats.total_orders > 0 ? (
                            <>
                                <div
                                    className="bg-[#009688] h-full flex items-center justify-center text-xs text-white font-bold transition-all duration-700 rounded-full"
                                    style={{ width: `${(todayStats.total_sent / todayStats.total_orders) * 100}%` }}
                                >
                                    {calcPercent(todayStats.total_sent, totalOrders)}%
                                </div>
                                {todayStats.total_pending > 0 && (
                                    <div
                                        className="bg-amber-500 h-full flex items-center justify-center text-xs text-white font-bold"
                                        style={{ width: `${(todayStats.total_pending / todayStats.total_orders) * 100}%` }}
                                    />
                                )}
                                {todayStats.total_cancel > 0 && (
                                    <div
                                        className="bg-rose-500 h-full flex items-center justify-center text-xs text-white font-bold"
                                        style={{ width: `${(todayStats.total_cancel / todayStats.total_orders) * 100}%` }}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">Belum ada data</div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Dikirim ({todayStats.total_sent})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Pending ({todayStats.total_pending})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Cancel ({todayStats.total_cancel})</span>
                    </div>
                </div>
            </div>

            {/* Bottom 4 Quick Info Features Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {/* 1. 99.9% Uptime */}
                <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <FiShield className="w-6 h-6" />
                    </div>
                    <div>
                        <h5 className="text-lg font-extrabold text-slate-900 leading-tight">99.9%</h5>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">Uptime Sistem</p>
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">Sistem berjalan dengan optimal</p>
                    </div>
                </div>

                {/* 2. Real-time Update Data */}
                <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FiZap className="w-6 h-6" />
                    </div>
                    <div>
                        <h5 className="text-lg font-extrabold text-slate-900 leading-tight">Real-time</h5>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">Update Data</p>
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">Data selalu terupdate secara real-time</p>
                    </div>
                </div>

                {/* 3. Aman Data Terlindungi */}
                <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <FiLock className="w-6 h-6" />
                    </div>
                    <div>
                        <h5 className="text-lg font-extrabold text-slate-900 leading-tight">Aman</h5>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">Data Terlindungi</p>
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">Keamanan data terjamin di cloud</p>
                    </div>
                </div>

                {/* 4. Mudah Digunakan */}
                <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-6">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <FiUsers className="w-6 h-6" />
                    </div>
                    <div>
                        <h5 className="text-lg font-extrabold text-slate-900 leading-tight">Mudah</h5>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">Digunakan</p>
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">Antarmuka simpel & intuitif</p>
                    </div>
                </div>
            </div>

            {/* Recent Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Aktivitas Terakhir (50 Order)</h3>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                        <input
                            type="text"
                            placeholder="Cari Order ID / AWB..."
                            className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-60 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-xs text-left">
                        <thead className="text-[11px] text-slate-400 uppercase font-bold bg-slate-50 border-b border-slate-100 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Waktu</th>
                                <th className="px-6 py-3">ID Pesanan</th>
                                <th className="px-6 py-3">AWB</th>
                                <th className="px-6 py-3">File Sumber</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3.5 whitespace-nowrap text-slate-500">
                                            {new Date(item.processed_at).toLocaleTimeString('id-ID')}
                                        </td>
                                        <td className="px-6 py-3.5 font-bold text-slate-900">
                                            {item.order_id}
                                        </td>
                                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">
                                            {item.awb || '-'}
                                        </td>
                                        <td className="px-6 py-3.5 text-slate-500 truncate max-w-[220px]" title={item.excel_filename}>
                                            {item.excel_filename}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                                        {loading ? 'Loading data...' : 'Belum ada data / Tidak ditemukan'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal for Cancel/Pending */}
            {detailModal.type && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setDetailModal({ type: null, data: [] })}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={`p-5 flex items-center justify-between ${detailModal.type === 'cancel' ? 'bg-rose-600' : 'bg-amber-500'}`}>
                            <div className="flex items-center gap-3">
                                {detailModal.type === 'cancel' ? (
                                    <FaTimesCircle className="w-6 h-6 text-white" />
                                ) : (
                                    <FaClock className="w-6 h-6 text-white" />
                                )}
                                <h3 className="text-lg font-bold text-white">
                                    Detail {detailModal.type === 'cancel' ? 'Cancel' : 'Pending'} ({detailModal.data.length})
                                </h3>
                            </div>
                            <button
                                onClick={() => setDetailModal({ type: null, data: [] })}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {detailModal.data.length === 0 ? (
                                <p className="text-center text-slate-400 py-8">Tidak ada data</p>
                            ) : (
                                <div className="space-y-2">
                                    {detailModal.data.map((item, idx) => (
                                        <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <p className="font-mono text-sm font-bold text-slate-900 break-all">{item.barcode}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                📅 {item.scan_date || '-'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={() => setDetailModal({ type: null, data: [] })}
                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
