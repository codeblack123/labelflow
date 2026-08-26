import React, { useState, useEffect } from 'react';
import { FiTool, FiLock, FiUnlock, FiX, FiBox, FiPrinter, FiFileText, FiTrash2, FiArrowRight, FiScissors, FiCheckSquare, FiCode, FiTable, FiLayers, FiChevronLeft, FiChevronRight, FiEdit3 } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import { supabase } from '../supabaseClient';
import ToolkitAwbFilter from './ToolkitAwbFilter';
import ToolkitLabelSplitter from './ToolkitLabelSplitter';
import ToolkitLabelSplitterV2 from './ToolkitLabelSplitterV2';
import ToolkitLabelSplitterV3 from './ToolkitLabelSplitterV3';
import ToolkitExtractPesanan from './ToolkitExtractPesanan';
import ToolkitWmsCleaner from './ToolkitWmsCleaner';
import ToolkitOrderanKilat from './ToolkitOrderanKilat';
import ToolkitOrderanKilat50k from './ToolkitOrderanKilat50k';
import ToolkitGineeProcessor from './ToolkitGineeProcessor';
import ToolkitLabelSplitterV4 from './ToolkitLabelSplitterV4';
import ToolkitLabelSplitterV5 from './ToolkitLabelSplitterV5';
import ToolkitVerifyLabels from './ToolkitVerifyLabels';
import ToolkitPdfMerger from './ToolkitPdfMerger';
import ToolkitPackingList from './ToolkitPackingList';

interface ToolkitProps {
    showToast?: (message: string) => void;
}


const TOOL_ITEMS = [
    { id: 'awb-cleaner', title: 'Filter AWB Duplikat', desc: 'Bersihkan data Excel dari resi duplikat atau data cancel berdasarkan list referensi.', icon: FiTrash2, colorType: 'blue', type: 'default' },
    { id: 'label-splitter-v2', title: 'Bagi Rata Label V.2', badgeText: '(SATUAN)', badgeColor: 'text-red-600', desc: 'Bagi file PDF label panjang menjadi beberapa file kecil untuk dibagi ke tim packing.', icon: FiScissors, colorType: 'red', type: 'default' },
    { id: 'label-splitter-v3', title: 'Bagi Rata Label V.3', badgeText: '(CAMPUR)', badgeColor: 'text-indigo-600', desc: 'Bagi file PDF label panjang menjadi beberapa file kecil untuk dibagi ke tim packing.', icon: FiScissors, colorType: 'indigo', type: 'default' },
    { id: 'label-splitter-v4', title: 'Bagi Rata Label V.4', badgeText: '(SATUAN)', badgeColor: 'text-rose-600', desc: 'Copy dari V.2. Membagi file PDF berdasarkan prioritasi satuan.', icon: FiScissors, colorType: 'rose', type: 'highlighted', isNew: true },
    { id: 'label-splitter-v5', title: 'Bagi Rata Label V.5', badgeText: '(CAMPUR)', badgeColor: 'text-teal-600', desc: 'Logika Kompleks: Deteksi pola MSKU sama (3+ resi) ke batch khusus, sisanya bagi rata beban SKU.', icon: FiScissors, colorType: 'teal', type: 'highlighted', isNew: true },
    { id: 'extract-pesanan', title: 'Extract Pesanan', desc: 'Ambil nomor pesanan dari data Ginee dengan cepat dan mudah.', icon: FiFileText, colorType: 'indigo', type: 'default' },
    { id: 'wms-cleaner', title: 'Pembersih ID Paket', desc: 'Hapus karakter @ di depan atau belakang No. Pesanan agar data menjadi bersih.', icon: FiTrash2, colorType: 'orange', type: 'default' },
    { id: 'ginee-processor', title: 'Ginee Data Processor', desc: 'Extract ID Pesanan dari file Excel Ginee (pretelan vs satuan).', icon: FiTable, colorType: 'blue', type: 'default' },
    { id: 'verify', title: 'Verify Labels', badgeText: 'New', badgeType: 'pill', badgeColor: 'bg-teal-500', desc: 'Double check dan sinkronisasi antara PDF Asli, Custom, dan data Excel.', icon: FiCheckSquare, colorType: 'teal', type: 'default', isNew: true },
    { id: 'packing-list', title: 'Packing List Excel', badgeText: 'New', badgeType: 'pill', badgeColor: 'bg-green-500', desc: 'Upload file Excel (Packing List) untuk melihat daftar list secara rapi dan cepat.', icon: FiTable, colorType: 'teal', type: 'default', isNew: true },
    { id: 'orderan-kilat-50k', title: 'Orderan Kilat', badgeText: '(VIP >50K)', badgeColor: 'text-rose-600', desc: 'Filter file Excel Ginee, khusus menyisakan pesanan yang mengandung MSKU berharga tinggi (VIP >50K).', icon: FiFileText, colorType: 'rose', type: 'vip' },
    { id: 'pdf-merger', title: 'Gabung Label Asli', badgeText: 'Baru', badgeType: 'pill', badgeColor: 'bg-blue-500', desc: 'Gabungkan 2 atau lebih file PDF resi asli menjadi satu file PDF utuh.', icon: FiLayers, colorType: 'blue', type: 'default', isNew: true }
];

const getColorClasses = (color) => {
    switch (color) {
        case 'blue': return { borderActive: 'border-blue-100 hover:border-blue-300', iconBg: 'bg-blue-50 group-hover:bg-blue-100', iconText: 'text-blue-600' };
        case 'red': return { borderActive: 'border-red-100 hover:border-red-300', iconBg: 'bg-red-50 group-hover:bg-red-100', iconText: 'text-red-600' };
        case 'indigo': return { borderActive: 'border-indigo-100 hover:border-indigo-300', iconBg: 'bg-indigo-50 group-hover:bg-indigo-100', iconText: 'text-indigo-600' };
        case 'rose': return { borderActive: 'bg-rose-50/70 border-rose-400 hover:border-rose-500 hover:bg-rose-50', iconBg: 'bg-rose-50 group-hover:bg-rose-100', iconText: 'text-rose-600' };
        case 'teal': return { borderActive: 'bg-teal-50/70 border-teal-400 hover:border-teal-500 hover:bg-teal-50', iconBg: 'bg-teal-50 group-hover:bg-teal-100', iconText: 'text-teal-600' };
        case 'orange': return { borderActive: 'border-orange-100 hover:border-orange-300', iconBg: 'bg-orange-50 group-hover:bg-orange-100', iconText: 'text-orange-600' };
        default: return { borderActive: 'border-gray-200', iconBg: 'bg-gray-100', iconText: 'text-gray-600' };
    }
};

const Toolkit: React.FC<ToolkitProps> = ({ showToast }) => {

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [activeTool, setActiveTool] = useState<'awb-cleaner' | 'splitter' | 'label-splitter-v2' | 'label-splitter-v3' | 'label-splitter-v4' | 'label-splitter-v5' | 'extract-pesanan' | 'wms-cleaner' | 'ginee-processor' | 'verify' | 'pdf-merger' | 'packing-list' | 'orderan-kilat' | 'orderan-kilat-50k' | null>(null);
    const [lockedFeatures, setLockedFeatures] = useState<Set<string>>(new Set());
    const [devMode, setDevMode] = useState(false);

    
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [toolOrder, setToolOrder] = useState<string[]>([]);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/toolkit-order`);
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    // Filter out any invalid items
                    const validOrder = res.data.filter((id: string) => TOOL_ITEMS.some(t => t.id === id));
                    // Add any missing new items to the end
                    const missingItems = TOOL_ITEMS.filter(t => !validOrder.includes(t.id)).map(t => t.id);
                    const finalOrder = [...validOrder, ...missingItems];
                    setToolOrder(finalOrder);
                    localStorage.setItem('toolkit_tool_order', JSON.stringify(finalOrder));
                } else {
                    const defaultOrder = TOOL_ITEMS.map(t => t.id);
                    setToolOrder(defaultOrder);
                    localStorage.setItem('toolkit_tool_order', JSON.stringify(defaultOrder));
                }
            } catch (error) {
                console.error("Failed to fetch toolkit order", error);
                // Fallback to local storage
                const saved = localStorage.getItem('toolkit_tool_order');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const validOrder = parsed.filter((id: string) => TOOL_ITEMS.some(t => t.id === id));
                            const missingItems = TOOL_ITEMS.filter(t => !validOrder.includes(t.id)).map(t => t.id);
                            setToolOrder([...validOrder, ...missingItems]);
                            return;
                        }
                    } catch (e) {}
                }
                setToolOrder(TOOL_ITEMS.map(t => t.id));
            }
        };
        fetchOrder();
    }, []);

    
    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (!isEditingOrder) return;
        setDraggedIndex(index);
        // Set visual drag image
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            // Slight transparency on the dragged item
            setTimeout(() => {
                const element = e.target as HTMLElement;
                if (element && element.style) {
                    element.style.opacity = '0.4';
                }
            }, 0);
        }
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        if (!isEditingOrder || draggedIndex === null || draggedIndex === index) return;
        
        // Reorder array on the fly
        const newOrder = [...toolOrder];
        const draggedItem = newOrder[draggedIndex];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(index, 0, draggedItem);
        
        setToolOrder(newOrder);
        setDraggedIndex(index); // Update the current position of the dragged item
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (!isEditingOrder) return;
        setDraggedIndex(null);
        const element = e.target as HTMLElement;
        if (element && element.style) {
            element.style.opacity = '1';
        }
        // Save to local storage for immediate fallback
        localStorage.setItem('toolkit_tool_order', JSON.stringify(toolOrder));
    };

    const moveItem = (index: number, direction: number) => {
        if (index + direction < 0 || index + direction >= toolOrder.length) return;
        const newOrder = [...toolOrder];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + direction];
        newOrder[index + direction] = temp;
        setToolOrder(newOrder);
        // Save to local storage for immediate fallback
        localStorage.setItem('toolkit_tool_order', JSON.stringify(newOrder));
    };

    const saveOrderToDatabase = async () => {
        if (isEditingOrder) { // If toggling off editing mode, save to DB
            setIsSavingOrder(true);
            try {
                await axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-order`, { order: toolOrder });
                showToast?.("Urutan berhasil disimpan ke server");
            } catch (error) {
                console.error("Failed to save toolkit order", error);
                showToast?.("Gagal menyimpan ke server, disimpan secara lokal");
            } finally {
                setIsSavingOrder(false);
            }
        }
        setIsEditingOrder(!isEditingOrder);
    };


    // Sync devMode when storage changes (e.g. toggled from Admin panel or global keydown)
    useEffect(() => {
        const handleStorageChange = () => {
            setDevMode(localStorage.getItem('global_devmode') === 'true');
        };
        window.addEventListener('storage', handleStorageChange);
        // Also listen for the custom app_toast event used when devMode is toggled
        const handleCustomStorage = () => {
            setDevMode(localStorage.getItem('global_devmode') === 'true');
        };
        // Poll every second for devMode changes (lightweight)
        const interval = setInterval(handleCustomStorage, 1000);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    // Fetch locked features from backend/Supabase
    useEffect(() => {
        const fetchLocks = async () => {
            try {
                const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/toolkit-features`);
                const locked = new Set<string>(
                    (res.data || []).filter((f: any) => f.is_locked).map((f: any) => f.feature_key)
                );
                setLockedFeatures(locked);
            } catch (err) {
                console.warn('[Toolkit] Could not fetch feature locks, all features will be accessible.');
            }
        };
        if (isAuthenticated) fetchLocks();
    }, [isAuthenticated]);

    const openTool = (toolKey: any) => {
        if (lockedFeatures.has(toolKey)) {
            showToast?.('🔒 Fitur ini sedang dikunci oleh Admin');
            return;
        }
        setActiveTool(toolKey);
    };

    useEffect(() => {
        const auth = sessionStorage.getItem('toolkit_auth');
        const loginTime = sessionStorage.getItem('toolkit_login_time');

        if (auth === 'true' && loginTime) {
            const timeDiff = Date.now() - parseInt(loginTime, 10);
            if (timeDiff > 21600000) {
                handleLogout();
                showToast && showToast('Sesi toolkit berakhir, silakan login kembali');
            } else {
                setIsAuthenticated(true);
            }
        } else {
            setIsAuthenticated(false);
        }
    }, []);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Hybrid Authentication: Try backend first, fallback to Supabase
        try {
            // 1. Try backend (for localhost development)
            await axios.post(`${API_CONFIG.BASE_URL}/toolkit/verify-pin`, { pin });
            loginSuccess();
        } catch (backendErr: any) {
            // Backend failed (network error or 404)
            console.log('[Toolkit] Backend auth failed, trying Supabase fallback...');

            // 2. Fallback to Supabase (for Netlify production)
            try {
                const { data, error: supabaseError } = await supabase
                    .from('app_pins')
                    .select('pin')
                    .eq('role', 'toolkit')
                    .single();

                if (supabaseError) {
                    throw supabaseError;
                }

                if (['1995', '1088'].includes(pin)) { // Fallback PIN
                    loginSuccess();
                } else if (data && data.pin === pin) {
                    loginSuccess();
                } else {
                    setError('PIN Salah!');
                }
            } catch (supabaseErr: any) {
                console.error('[Toolkit] Supabase fallback failed:', supabaseErr);
                // Check if it's a 401 from backend vs table not found from supabase
                if (backendErr.response?.status === 401) {
                    setError('PIN Salah!');
                } else {
                    setError('Login gagal. Pastikan tabel app_pins ada di Supabase atau backend jalan.');
                }
            }
        }
    };

    const loginSuccess = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem('toolkit_auth', 'true');
        sessionStorage.setItem('toolkit_login_time', Date.now().toString());
        if (showToast) showToast('Login Toolkit Berhasil');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('toolkit_auth');
        setPin('');
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[65vh] py-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl border border-slate-800/80 shadow-2xl shadow-slate-900/40 p-8 sm:p-10 relative overflow-hidden">
                    {/* Decorative Orbs */}
                    <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 text-center mb-8">
                        <div className="mx-auto w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-5 border border-white/20 text-blue-300 shadow-xl shadow-blue-500/20 relative group">
                            <FiTool className="w-8 h-8 text-white group-hover:rotate-12 transition-transform duration-300" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-xs">
                                <FiLock className="w-2.5 h-2.5 text-white" />
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-black text-white mb-2.5 uppercase tracking-wider backdrop-blur-sm">
                            <span>AUTENTIKASI KEAMANAN TOOLKIT</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Toolkit Access</h2>
                        <p className="text-slate-300 mt-2 text-xs sm:text-sm font-medium leading-relaxed">
                            Masukkan PIN 4-digit untuk membuka akses alat bantu operasional
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        <div className="relative">
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleLogin(e as any);
                                    }
                                }}
                                className="w-full bg-slate-800/80 border-2 border-slate-700/80 rounded-2xl py-4 px-6 text-center text-3xl font-mono tracking-[0.6em] font-extrabold text-white placeholder:text-slate-600 focus:bg-slate-800 focus:border-white focus:ring-4 focus:ring-white/20 shadow-inner transition-all outline-none"
                                placeholder="••••"
                                maxLength={4}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-center justify-center gap-2 text-rose-300 text-xs font-extrabold bg-rose-500/20 border border-rose-500/30 py-3 px-4 rounded-2xl backdrop-blur-sm animate-shake">
                                <FiX className="w-4 h-4 flex-shrink-0 text-rose-400" /> 
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 text-white rounded-2xl font-extrabold text-sm shadow-lg transition-all duration-300 hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer border border-white/20"
                            style={{ backgroundColor: 'rgb(var(--theme-600))' }}
                        >
                            <span>Masuk Toolkit</span>
                            <FiArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Ultra Premium Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-900/15 border border-slate-800/80 relative overflow-hidden">
                {/* Decorative Glowing Orbs */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start md:items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-blue-300 shadow-xl shadow-blue-500/20 flex-shrink-0 mr-1">
                            <FiTool className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                                    Toolkit Operasional
                                </h2>
                                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                    13 Tools
                                </span>
                            </div>
                            <p className="text-xs lg:text-sm font-medium text-slate-300 mt-1">
                                Kumpulan alat bantu kerja harian admin & pengolahan data otomatis
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {devMode && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-2xl text-xs font-bold backdrop-blur-sm">
                                <FiCode className="w-3.5 h-3.5" />
                                Dev Mode
                            </span>
                        )}
                        {!activeTool && (
                            <button
                                onClick={saveOrderToDatabase} 
                                disabled={isSavingOrder}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                                    isEditingOrder 
                                    ? 'bg-blue-600 text-white border border-blue-500 shadow-blue-500/30' 
                                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'
                                }`}
                            >
                                <FiEdit3 className="w-4 h-4 text-blue-300" />
                                <span>{isSavingOrder ? 'Menyimpan...' : (isEditingOrder ? 'Selesai Mengatur' : 'Atur Urutan')}</span>
                            </button>
                        )}

                        {activeTool && (
                            <button
                                onClick={() => setActiveTool(null)}
                                className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <FiChevronLeft className="w-4 h-4 text-blue-300" />
                                <span>Ke Menu Utama Toolkit</span>
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="bg-rose-500/20 hover:bg-rose-600 border border-rose-400/30 text-rose-200 hover:text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <FiUnlock className="w-4 h-4" />
                            <span>Keluar</span>
                        </button>
                    </div>
                </div>

                {/* Sub Description */}
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-normal">
                    <span>Klik pada salah satu alat di bawah untuk mulai memproses data.</span>
                    <span className="hidden sm:inline-block text-[11px] text-blue-400 font-medium">⚡ Resi filter, splitter, & merger otomatis</span>
                </div>
            </div>

            {/* Active Tool View */}
            {activeTool === 'awb-cleaner' ? (
                <ToolkitAwbFilter showToast={showToast} />
            ) : activeTool === 'splitter' ? (
                <ToolkitLabelSplitter showToast={showToast} />
            ) : activeTool === 'label-splitter-v2' ? (
                <ToolkitLabelSplitterV2 showToast={showToast} />
            ) : activeTool === 'label-splitter-v3' ? (
                <ToolkitLabelSplitterV3 showToast={showToast} />
            ) : activeTool === 'label-splitter-v4' ? (
                <ToolkitLabelSplitterV4 showToast={showToast} />
            ) : activeTool === 'label-splitter-v5' ? (
                <ToolkitLabelSplitterV5 showToast={showToast} />
            ) : activeTool === 'extract-pesanan' ? (
                <ToolkitExtractPesanan />
            ) : activeTool === 'wms-cleaner' ? (
                <ToolkitWmsCleaner />
            ) : activeTool === 'orderan-kilat' ? (
                <ToolkitOrderanKilat showToast={showToast} />
            ) : activeTool === 'orderan-kilat-50k' ? (
                <ToolkitOrderanKilat50k showToast={showToast} />
            ) : activeTool === 'ginee-processor' ? (
                <ToolkitGineeProcessor />
            ) : activeTool === 'verify' ? (
                <ToolkitVerifyLabels showToast={showToast as any} />
            ) : activeTool === 'pdf-merger' ? (
                <ToolkitPdfMerger showToast={showToast} />
            ) : activeTool === 'packing-list' ? (
                <ToolkitPackingList />
            ) : (
                /* Dashboard View */
                <>
                    {/* ====== MAIN TOOLS GRID ====== */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {toolOrder.map((id, index) => {
                            const item = TOOL_ITEMS.find(t => t.id === id);
                            if (!item) return null;
                            const isLocked = lockedFeatures.has(item.id);
                            const colors = getColorClasses(item.colorType);
                            const Icon = item.icon;

                            if (item.type === 'vip') {
                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => !isEditingOrder && openTool(item.id)}
                                        className={`bg-white border-2 border-amber-200/80 rounded-3xl p-6 ${isEditingOrder ? 'cursor-default' : 'cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-amber-400'} transition-all duration-300 group relative overflow-hidden flex flex-col justify-between shadow-lg shadow-amber-500/5`}
                                    >
                                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full opacity-40 group-hover:scale-150 transition-transform duration-500 ease-out"></div>
                                        <div>
                                            <div className="flex items-center justify-between mb-4 relative z-10">
                                                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200 shadow-sm group-hover:scale-110 transition-transform">
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                    VIP FEATURE
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-extrabold text-slate-900 relative z-10 group-hover:text-amber-600 transition-colors">
                                                {item.title} {item.badgeText && <span className="text-amber-600 text-xs ml-1 font-bold">{item.badgeText}</span>}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed relative z-10">
                                                {item.desc}
                                            </p>
                                        </div>
                                        {!isEditingOrder && (
                                            <div className="mt-5 pt-3 border-t border-amber-100 flex items-center justify-between text-xs font-black text-amber-700 relative z-10 group-hover:translate-x-1 transition-transform">
                                                <span>Buka Alat</span>
                                                <FiArrowRight className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => !isEditingOrder && openTool(item.id)}
                                    className={`p-6 rounded-3xl border-2 bg-white shadow-lg shadow-slate-200/30 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between ${isEditingOrder ? 'cursor-default' : 'cursor-pointer hover:shadow-xl hover:-translate-y-1'} ${isLocked
                                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed shadow-none'
                                        : `${colors.borderActive}`
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-100 transition-transform group-hover:scale-110 shadow-xs ${colors.iconBg}`}>
                                                <Icon className={`w-6 h-6 ${colors.iconText}`} />
                                            </div>
                                            {isLocked ? (
                                                <div className="bg-slate-100 p-1.5 rounded-full border border-slate-200"><FiLock className="w-4 h-4 text-slate-400" /></div>
                                            ) : (
                                                item.isNew && (
                                                    <div className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${item.colorType === 'teal' ? 'bg-teal-500 text-white shadow-xs' : item.colorType === 'rose' ? 'bg-rose-500 text-white shadow-xs' : 'bg-blue-500 text-white shadow-xs'}`}>Baru</div>
                                                )
                                            )}
                                        </div>

                                        <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                                            {item.title} 
                                            {item.badgeText && item.badgeType === 'pill' ? (
                                                <span className={`text-[10px] text-white px-2 py-0.5 rounded-full ml-1 font-bold ${item.badgeColor}`}>{item.badgeText}</span>
                                            ) : item.badgeText ? (
                                                <span className={`font-bold text-sm ml-1 ${item.badgeColor}`}>{item.badgeText}</span>
                                            ) : null}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>

                                    {!isEditingOrder && (
                                        <div className={`mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold ${colors.iconText} group-hover:translate-x-1 transition-transform`}>
                                            <span>Buka Alat</span>
                                            <FiArrowRight className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ====== DEV MODE TOOLS ====== */}
                    {devMode && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 mt-8">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-purple-200"></div>
                                <span className="flex items-center gap-2 text-xs font-extrabold text-purple-700 uppercase tracking-widest bg-purple-50 px-4 py-1.5 rounded-full border border-purple-200">
                                    <FiCode className="w-3.5 h-3.5" />
                                    Dev Tools – Alat Tersembunyi
                                </span>
                                <div className="h-px flex-1 bg-purple-200"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div
                                    onClick={() => setActiveTool('label-splitter' as any)}
                                    className="bg-white p-6 rounded-3xl border-2 border-purple-200 shadow-lg hover:shadow-xl cursor-pointer transition-all hover:border-purple-400 group relative overflow-hidden flex flex-col justify-between"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100 group-hover:scale-110 transition-transform">
                                            <FiScissors className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full uppercase">Dev Mode</span>
                                    </div>
                                    <h3 className="font-extrabold text-slate-900 text-base">Bagi Rata Label V.1</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">Bagi file PDF label panjang menjadi beberapa file kecil untuk dibagi ke tim packing.</p>
                                    <div className="mt-5 pt-3 border-t border-purple-100 flex items-center justify-between text-xs font-extrabold text-purple-600 group-hover:translate-x-1 transition-transform">
                                        <span>Buka Alat</span>
                                        <FiArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Toolkit;
