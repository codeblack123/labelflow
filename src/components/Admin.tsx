import React, { useState, useEffect, useRef } from 'react';
import { FiSettings, FiLock, FiUnlock, FiX, FiDatabase, FiLayers, FiTrendingDown, FiTrash2, FiBell, FiUser, FiUsers, FiPackage, FiLayout, FiMessageSquare, FiTerminal, FiWifi, FiCheckCircle, FiUploadCloud } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import { supabase } from '../supabaseClient';
import AdminSkuDatabase from './AdminSkuDatabase';
import AdminSkuGrouping from './AdminSkuGrouping';
import AdminSkuPriority from './AdminSkuPriority';
import AdminSkuBulky from './AdminSkuBulky';
import AdminSkuFormatting from './AdminSkuFormatting';
import AdminDataManager from './AdminDataManager';
import AdminToolkitFeatures from './AdminToolkitFeatures';
import AdminNotificationManager from './AdminNotificationManager';
import AdminUserManager from './AdminUserManager';
import AdminBarangKhusus from './AdminBarangKhusus';
import AdminSkuVip from './AdminSkuVip';
import AdminSkuVip50k from './AdminSkuVip50k';
import AdminLabelSettings from './AdminLabelSettings';
import AdminLabelPriority from './AdminLabelPriority';
import AdminRunningText from './AdminRunningText';
import { AdminMenuSettings } from './AdminMenuSettings';
import { SystemUpdateAdmin } from './SystemUpdateAdmin';
import SqlEditor from './SqlEditor';
import AdminNetworkDiagnostics from './AdminNetworkDiagnostics';
import AdminTableCleaner from './AdminTableCleaner';
import AdminFeatureAudit from './AdminFeatureAudit';
import AdminStaffManager from './AdminStaffManager';
interface AdminProps {
    showToast?: (message: string) => void;
    user?: { role: string; username: string; assigned_warehouses?: string[] } | null;
    onMenuSettingsChanged?: (menuOrder: string[], hiddenMenus: string[], skipPinMenus?: string[]) => void;
}

type AdminView = 'database' | 'grouping' | 'priority' | 'labelPriority' | 'bulky' | 'formatting' | 'labelSettings' | 'dataManager' | 'toolkitAccess' | 'menuSettings' | 'notifications' | 'userManager' | 'barangKhusus' | 'runningText' | 'sqlEditor' | 'networkDiagnostics' | 'skuVip' | 'skuVip50k' | 'tableCleaner' | 'featureAudit' | 'systemUpdate';

const Admin: React.FC<AdminProps> = ({ showToast, user, onMenuSettingsChanged }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [activeView, setActiveView] = useState<AdminView>('database');

    // Dev Mode Logic
    const [devMode, setDevMode] = useState(() => localStorage.getItem('global_devmode') === 'true');
    const devBufferRef = useRef('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const newBuffer = (devBufferRef.current + e.key).slice(-20); // Keep last 20 chars
            devBufferRef.current = newBuffer;
            if (newBuffer.toLowerCase().endsWith('devmode')) {
                // Only allow developers to toggle devmode
                if (user?.role === 'developer') {
                    const newState = !devMode;
                    setDevMode(newState);
                    localStorage.setItem('global_devmode', newState.toString());
                    showToast && showToast(newState ? '🚀 Dev Mode: Fitur Pengembang Aktif' : '🔒 Dev Mode: Fitur Pengembang Nonaktif');
                    devBufferRef.current = '';
                    // Trigger global sync for App.tsx if they share same storage
                    window.dispatchEvent(new Event('storage'));
                } else {
                    showToast && showToast('❌ Akses ditolak. Mode ini hanya untuk Developer.');
                    devBufferRef.current = '';
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [user, devMode]);

    // Menu Categories
    const categories = [
        {
            title: 'Konten & Database',
            items: [
                { id: 'database', label: 'Database SKU', icon: FiDatabase },
                { id: 'grouping', label: 'Grouping / Packing', icon: FiLayers },
                { id: 'priority', label: 'Atur Urutan Akhir', icon: FiTrendingDown },
                { id: 'labelPriority', label: 'Urutan Akhir Label', icon: FiTrendingDown },
                { id: 'bulky', label: 'SKU Besar (Bulky)', icon: FiPackage },
                { id: 'formatting', label: 'Format Packing List', icon: FiSettings },
                { id: 'labelSettings', label: 'Format Label', icon: FiLayout },
                { id: 'barangKhusus', label: 'Data Barang Khusus', icon: FiDatabase },
                { id: 'skuVip50k', label: 'SKU VIP (>50K)', icon: FiDatabase },
            ]
        },
        {
            title: 'Manajemen Data',
            items: [
                { id: 'staffManager', label: 'Manajemen Staf', icon: FiUsers },
                  { id: 'featureAudit', label: 'Audit & Register Fitur', icon: FiCheckCircle },
                { id: 'dataManager', label: 'Kelola Data History', icon: FiTrash2 },
                { id: 'toolkitAccess', label: 'Kontrol Akses Toolkit', icon: FiLock },
                ...(user?.role === 'developer' ? [
                    { id: 'menuSettings', label: 'Pengaturan Menu', icon: FiLayout },
                    { id: 'systemUpdate', label: 'Manajemen Update Sistem', icon: FiUploadCloud }
                ] : [])
            ]
        },
        (devMode && user?.role === 'developer') ? {
            title: '🛠️ Developer Tools',
            items: [
                { id: 'runningText', label: 'Running Text Shift', icon: FiMessageSquare },
                { id: 'notifications', label: 'Notifikasi Global', icon: FiBell },
                { id: 'userManager', label: 'Manajemen User', icon: FiUser },
                { id: 'sqlEditor', label: 'SQL Editor', icon: FiTerminal },
                { id: 'networkDiagnostics', label: 'Network Diagnostics', icon: FiWifi },
                { id: 'tableCleaner', label: 'Table Cleaner', icon: FiTrash2 },
            ]
        } : null
    ].filter(Boolean) as { title: string, items: { id: string, label: string, icon: any }[] }[];

    useEffect(() => {
        // Check session storage for existing auth
        const auth = sessionStorage.getItem('admin_auth');
        const loginTime = sessionStorage.getItem('admin_login_time');

        if (auth === 'true' && loginTime) {
            const timeDiff = Date.now() - parseInt(loginTime, 10);
            // 6 Hours = 21600000 ms
            if (timeDiff > 21600000) {
                // Session expired
                handleLogout();
                showToast && showToast('Sesi berakhir, silakan login kembali');
            } else {
                setIsAuthenticated(true);
            }
        } else {
            setIsAuthenticated(false);
        }
    }, [isAuthenticated]); // Re-check if auth state changes? No, basically on mount.

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // PRIORITAS: Baca PIN dari Supabase (sumber kebenaran), backend hanya fallback
        try {
            // 1. Cek PIN dari tabel app_pins di Supabase
            const { data: pinData, error: pinError } = await supabase
                .from('app_pins')
                .select('pin')
                .eq('role', 'admin')
                .single();

            if (!pinError && pinData) {
                // Supabase berhasil — bandingkan PIN
                if (pinData.pin === pin) {
                    loginSuccess();
                } else {
                    setError('PIN Salah!');
                    if (showToast) showToast('❌ PIN Salah!');
                }
                return; // selesai, tidak perlu cek backend
            }

            // Supabase gagal (tabel tidak ada, RLS, dll.) → coba backend
            console.warn('[Admin] Supabase PIN check failed, trying backend...', pinError?.message);
            await axios.post(`${API_CONFIG.BASE_URL}/admin/verify-pin`, { pin });
            loginSuccess();

        } catch (err: any) {
            const status = err.response?.status;
            if (status === 401) {
                setError('PIN Salah!');
                if (showToast) showToast('❌ PIN Salah!');
            } else {
                console.error('[Admin] Login error:', err);
                setError('Login gagal. Pastikan koneksi internet aktif atau backend berjalan.');
                if (showToast) showToast('❌ Gagal login. Periksa koneksi.');
            }
        }
    };

    const loginSuccess = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_auth', 'true');
        sessionStorage.setItem('admin_login_time', Date.now().toString());
        if (showToast) showToast('Login Admin Berhasil');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_auth');
        setPin('');
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[65vh] py-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl border border-slate-800/80 shadow-2xl shadow-slate-900/40 p-8 sm:p-10 relative overflow-hidden">
                    {/* Decorative Orbs */}
                    <div className="absolute -top-12 -right-12 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 text-center mb-8">
                        <div className="mx-auto w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-5 border border-white/20 text-indigo-300 shadow-xl shadow-indigo-500/20 relative group">
                            <FiLock className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-xs">
                                <FiLock className="w-2.5 h-2.5 text-white" />
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-black text-white mb-2.5 uppercase tracking-wider backdrop-blur-sm">
                            <span>AUTENTIKASI KEAMANAN ADMIN</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin Access</h2>
                        <p className="text-slate-300 mt-2 text-xs sm:text-sm font-medium leading-relaxed">
                            Masukkan PIN 4-digit untuk melanjutkan ke pusat kontrol admin
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
                            <span>Masuk Admin</span>
                            <FiUnlock className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Ultra Premium Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-900/15 border border-slate-800/80 relative overflow-hidden">
                {/* Decorative Glowing Orbs */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start md:items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-indigo-300 shadow-xl shadow-indigo-500/20 flex-shrink-0 mr-1">
                            <FiSettings className="w-7 h-7 text-white animate-spin-slow" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                                    Admin & Pengaturan
                                </h2>
                                <span className="bg-white/10 text-white border border-white/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                    Control Center
                                </span>
                            </div>
                            <p className="text-xs lg:text-sm font-medium text-slate-300 mt-1">
                                Pusat kontrol database SKU, aturan grouping, prioritas packing, dan konfigurasi sistem
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="bg-rose-500/20 hover:bg-rose-600 border border-rose-400/30 text-rose-200 hover:text-white text-xs font-extrabold px-5 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer self-start md:self-center"
                    >
                        <FiUnlock className="w-4 h-4" />
                        <span>Keluar Admin</span>
                    </button>
                </div>

                {/* Sub Description */}
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-normal">
                    <span>Pilih menu di samping kiri untuk mengelola kategori database.</span>
                    <span className="hidden sm:inline-block text-[11px] text-white/80 font-medium">Real-time database sync</span>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-72 flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto custom-scrollbar">
                    {categories.map((category, catIdx) => (
                        <div key={catIdx} className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-lg p-3 flex flex-col gap-1.5">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 my-1">
                                {category.title}
                            </h4>
                            <div className="grid grid-cols-2 lg:flex lg:flex-col gap-1.5">
                                {category.items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveView(item.id as AdminView)}
                                        className={`text-left px-3.5 py-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${activeView === item.id
                                            ? 'text-white shadow-md font-extrabold'
                                            : 'text-slate-600 hover:bg-slate-100 font-semibold'
                                            }`}
                                        style={{
                                            backgroundColor: activeView === item.id ? 'rgb(var(--theme-600))' : undefined,
                                        }}
                                    >
                                        <item.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${activeView === item.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="text-xs lg:text-sm truncate">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 w-full bg-white border-2 border-slate-200/90 rounded-3xl shadow-lg p-4 md:p-6 min-h-[600px]">
                    <div className={activeView === 'database' ? 'block' : 'hidden'}>
                        <AdminSkuDatabase showToast={showToast} user={user} />
                    </div>
                    <div className={activeView === 'grouping' ? 'block' : 'hidden'}>
                        <AdminSkuGrouping showToast={showToast} />
                    </div>
                    <div className={activeView === 'priority' ? 'block' : 'hidden'}>
                        <AdminSkuPriority showToast={showToast} />
                    </div>
                    <div className={activeView === 'labelPriority' ? 'block' : 'hidden'}>
                        <AdminLabelPriority showToast={showToast} />
                    </div>
                    <div className={activeView === 'bulky' ? 'block' : 'hidden'}>
                        <AdminSkuBulky showToast={showToast} isActive={activeView === 'bulky'} />
                    </div>
                    <div className={activeView === 'formatting' ? 'block' : 'hidden'}>
                        <AdminSkuFormatting showToast={showToast} />
                    </div>
                    <div className={activeView === 'labelSettings' ? 'block' : 'hidden'}>
                        <AdminLabelSettings showToast={showToast} />
                    </div>
                    <div className={activeView === 'toolkitAccess' ? 'block' : 'hidden'}>
                        <AdminToolkitFeatures showToast={showToast} />
                    </div>
                    <div className={activeView === 'menuSettings' ? 'block' : 'hidden'}>
                        <AdminMenuSettings onSettingsChanged={onMenuSettingsChanged} />
                    </div>
                    <div className={activeView === 'dataManager' ? 'block' : 'hidden'}>
                        <AdminDataManager showToast={showToast} user={user} />
                    </div>
                    <div className={activeView === 'networkDiagnostics' ? 'block' : 'hidden'}>
                        <AdminNetworkDiagnostics showToast={showToast} />
                    </div>
                    <div className={activeView === 'barangKhusus' ? 'block' : 'hidden'}>
                        <AdminBarangKhusus showToast={showToast} />
                    </div>
                    <div className={activeView === 'skuVip' ? 'block' : 'hidden'}>
                        <AdminSkuVip showToast={showToast} />
                    </div>
                    <div className={activeView === 'skuVip50k' ? 'block' : 'hidden'}>
                        <AdminSkuVip50k showToast={showToast} />
                    </div>
                    <div className={activeView === 'staffManager' ? 'block' : 'hidden'}>
                        <AdminStaffManager showToast={showToast} user={user} />
                    </div>
                    <div className={activeView === 'featureAudit' ? 'block' : 'hidden'}>
                        <AdminFeatureAudit showToast={showToast} />
                    </div>
                    <div className={activeView === 'systemUpdate' ? 'block' : 'hidden'}>
                        <SystemUpdateAdmin />
                    </div>

                    {/* Dev Mode Only Views */}
                    {devMode && (
                        <>
                            <div className={activeView === 'runningText' ? 'block' : 'hidden'}>
                                <AdminRunningText showToast={showToast} />
                            </div>
                            <div className={activeView === 'notifications' ? 'block' : 'hidden'}>
                                <AdminNotificationManager showToast={showToast} />
                            </div>
                            <div className={activeView === 'userManager' ? 'block' : 'hidden'}>
                                <AdminUserManager showToast={showToast} />
                            </div>
                            <div className={activeView === 'sqlEditor' ? 'block h-[600px]' : 'hidden'}>
                                <SqlEditor showToast={showToast} />
                            </div>
                            <div className={activeView === 'tableCleaner' ? 'block' : 'hidden'}>
                                <AdminTableCleaner showToast={showToast} />
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Admin;
