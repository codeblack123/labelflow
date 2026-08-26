import React, { useState } from 'react';
import { FiSettings, FiServer, FiGlobe, FiDatabase, FiCpu, FiLock, FiX, FiShield, FiLayout } from 'react-icons/fi';
import { supabase } from '../supabaseClient';
import { THEMES, ThemeName, applyTheme } from '../utils/themeUtils';

interface SettingsProps {
    dbMode: 'cloud' | 'local';
    onDbModeChange: (mode: 'cloud' | 'local') => void;
    showToast: (message: string) => void;
    user: any;
    onUpdateUser: (newTheme: ThemeName) => void;
}

const Settings: React.FC<SettingsProps> = ({ dbMode, onDbModeChange, showToast, user, onUpdateUser }) => {
    const [pendingMode, setPendingMode] = useState<'cloud' | 'local' | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');

    const VALID_PINS = ['1995', '1088'];

    const handleModeClick = (mode: 'cloud' | 'local') => {
        if (mode === dbMode) return; // Already active, do nothing
        setPendingMode(mode);
        setPinInput('');
        setPinError('');
    };

    const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

    const handleThemeChange = async (themeName: ThemeName) => {
        if (isUpdatingTheme) return;
        setIsUpdatingTheme(true);

        // Apply immediately to DOM, CSS variables & LocalStorage for instant real-time feedback
        applyTheme(themeName);
        onUpdateUser(themeName);

        try {
            if (user?.username) {
                const { error } = await supabase
                    .from('auth_users')
                    .update({ theme: themeName })
                    .eq('username', user.username);

                if (!error) {
                    showToast(`✅ Tema aplikasi diubah ke ${themeName}`);
                } else {
                    showToast(`✅ Tema ${themeName} diterapkan`);
                }
            } else {
                showToast(`✅ Tema ${themeName} diterapkan`);
            }
        } catch (err) {
            console.error('Failed to change theme in DB:', err);
            showToast(`✅ Tema ${themeName} diterapkan`);
        } finally {
            setIsUpdatingTheme(false);
        }
    };

    const handlePinConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (VALID_PINS.includes(pinInput)) {
            onDbModeChange(pendingMode!);
            showToast(`✅ Mode database diubah ke ${pendingMode === 'cloud' ? 'Cloud (Supabase)' : 'Local (IndexedDB)'}`);
            setPendingMode(null);
            setPinInput('');
            setPinError('');
        } else {
            setPinError('PIN salah!');
            setPinInput('');
        }
    };

    const handleCancel = () => {
        setPendingMode(null);
        setPinInput('');
        setPinError('');
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
            {/* PIN Confirmation Modal */}
            {pendingMode && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={handleCancel}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`relative p-8 text-center ${pendingMode === 'cloud' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                            <button
                                onClick={handleCancel}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
                                <FiShield className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Konfirmasi Perubahan Mode</h3>
                            <p className="text-sm text-white/80 mt-2">
                                Beralih ke mode <strong>{pendingMode === 'cloud' ? 'Cloud (Supabase)' : 'Local (IndexedDB)'}</strong>
                            </p>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handlePinConfirm} className="p-6 space-y-4">
                            <p className="text-sm text-gray-500 text-center">
                                Masukkan PIN keamanan untuk mengonfirmasi perubahan ini.
                            </p>

                            <div>
                                <input
                                    type="password"
                                    value={pinInput}
                                    onChange={e => { setPinInput(e.target.value); setPinError(''); }}
                                    className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 border-b-2 border-gray-200 focus:border-blue-600 outline-none transition-colors bg-transparent text-gray-900 placeholder-gray-200"
                                    placeholder="••••"
                                    maxLength={4}
                                    autoFocus
                                />
                            </div>

                            {pinError && (
                                <div className="flex items-center justify-center gap-2 text-red-600 text-sm font-medium bg-red-50 py-2.5 rounded-xl">
                                    <FiX className="w-4 h-4" /> {pinError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={pinInput.length === 0}
                                    className={`py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg ${pendingMode === 'cloud' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-200' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200'}`}
                                >
                                    <FiLock className="inline w-3.5 h-3.5 mr-1" />
                                    Konfirmasi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex items-start gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-200">
                    <FiSettings className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Pengaturan Aplikasi</h2>
                    <p className="text-blue-500 text-sm font-medium mt-0.5">Konfigurasi sistem dan database</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Database Settings */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FiDatabase className="text-blue-600" />
                            Mode Database
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 ${dbMode === 'cloud' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dbMode === 'cloud' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                            {dbMode} Mode
                        </span>
                    </div>
                    <div className="p-6 space-y-4">
                        <div
                            onClick={() => handleModeClick('cloud')}
                            className={`group p-4 rounded-xl border-2 transition-all cursor-pointer ${dbMode === 'cloud' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${dbMode === 'cloud' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                    <FiServer className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-gray-900">Cloud Mode (Supabase)</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Prioritas data real-time di server. Sinkronisasi antar user & perangkat.</p>
                                </div>
                                {dbMode === 'cloud' && <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-sm"><FiGlobe className="w-3 h-3 text-white" /></div>}
                            </div>
                        </div>

                        <div
                            onClick={() => handleModeClick('local')}
                            className={`group p-4 rounded-xl border-2 transition-all cursor-pointer ${dbMode === 'local' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-emerald-200 hover:bg-gray-50'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${dbMode === 'local' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                                    <FiCpu className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-gray-900">Local Mode (IndexedDB)</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Simpan data di browser saja. Sangat cepat, privasi terjaga, tanpa internet.</p>
                                </div>
                                {dbMode === 'local' && <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm"><FiDatabase className="w-3 h-3 text-white" /></div>}
                            </div>
                        </div>

                        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100/80 mt-2 flex items-start gap-3">
                            <FiLock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700/90 leading-relaxed">
                                Perubahan mode database memerlukan PIN keamanan untuk mencegah perubahan tidak sengaja.
                            </p>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                            <p className="text-[10px] text-blue-600/80 leading-relaxed italic">
                                * Mode Cloud juga menyimpan data ke database lokal sebagai backup (dual-layer storage).
                            </p>
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FiCpu className="text-blue-600" />
                            Informasi Sistem
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-xs text-gray-500">Versi Aplikasi</span>
                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">v2.1.0-pro</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-xs text-gray-500">Backend Status</span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                    CONNECTED
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-xs text-gray-500">Last Sync</span>
                                <span className="text-[10px] text-gray-400 font-medium">{new Date().toLocaleTimeString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs text-gray-500">Browser Environment</span>
                                <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{navigator.userAgent.split(' ')[0]}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                window.location.reload();
                                showToast('Rebuilding application...');
                            }}
                            className="w-full mt-6 py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                        >
                            FORCE RELOAD & CLEAR CACHE
                        </button>
                    </div>
                </div>

                {/* Theme Settings */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden md:col-span-2 mt-2">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FiLayout className="text-blue-600" />
                            Tema Tampilan Aplikasi
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 pl-6">Personalisasikan warna antarmuka aplikasi Anda. Tersimpan di akun.</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
                                const rgb = THEMES[themeName][500]; // Primary 500 color
                                const currentTheme = user?.theme || (typeof window !== 'undefined' ? localStorage.getItem('app_theme') : null) || 'Biru Tua';
                                const isActive = currentTheme === themeName;

                                return (
                                    <button
                                        key={themeName}
                                        onClick={() => handleThemeChange(themeName)}
                                        disabled={isUpdatingTheme}
                                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${isActive
                                                ? 'border-gray-900 bg-gray-90/80 text-gray-900 shadow-lg ring-4 ring-gray-900/10 scale-[1.03]'
                                                : 'border-slate-200/90 bg-white hover:border-slate-400 hover:bg-slate-50 hover:shadow-md active:scale-95'
                                            }`}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-2xl shadow-md ring-4 ring-white relative overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-110"
                                            style={{ backgroundColor: `rgb(${rgb})` }}
                                        >
                                            {isActive && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                                                    <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-[11px] font-black tracking-wider text-center uppercase ${isActive ? 'text-gray-900' : 'text-slate-600'}`}>
                                            {themeName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Settings;
