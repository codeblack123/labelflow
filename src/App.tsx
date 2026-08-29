import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FiCopy, FiActivity, FiDownload, FiClipboard, FiUser, FiSettings, FiSearch, FiGlobe, FiDatabase, FiUnlock, FiTerminal, FiLayout, FiBell, FiUploadCloud, FiBookOpen, FiAlertTriangle, FiInfo, FiFileText, FiCheckCircle, FiZap, FiLayers } from 'react-icons/fi';
import { FaFileExcel, FaFilePdf, FaFolderOpen } from 'react-icons/fa';
import { ICONS, API_CONFIG } from './constants';
import BackendHealthCheck from './components/BackendHealthCheck';
import FileDropzone from './components/FileDropzone';
import FilePreviewTable from './components/FilePreviewTable';
import ProcessStatusView from './components/ProcessStatus';
import OrderHistory from './components/OrderHistory';
import Dashboard from './components/Dashboard';
import DuplicateErrorModal from './components/DuplicateErrorModal';
import UnmatchedWarningModal from './components/UnmatchedWarningModal';
import { UploadedFile, ProcessStatus } from './types';
import { supabase } from './supabaseClient';
import Admin from './components/Admin';
import Toolkit from './components/Toolkit';
import FolderErrorModal from './components/FolderErrorModal';
import GlobalNotificationModal from './components/GlobalNotificationModal';
import { saveFileToDB, getFileFromDB, deleteFileFromDB, saveProcessedItemsToLocal, getProcessedItemsByOrderIds, saveHistoryToLocal, deleteHistoryFromLocal, deleteProcessedItemsByExcelFile, deleteHistoryByExcelFile, deleteProcessedItemsByOrderIds } from './utils/db';
import { saveUploadTesToFirebase } from './utils/firebaseUpload';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import ProfilMenu from './components/ProfilMenu';
import Profil from './components/Profil';
import Settings from './components/Settings';
import { applyTheme } from './utils/themeUtils';
import SqlEditor from './components/SqlEditor';
import RunningTextBar from './components/RunningTextBar';
import { saveSabotageFiles, getSabotageFiles, clearSabotageVault } from './utils/idbSabotage';
import ProductivityTimer from './components/ProductivityTimer';

interface DuplicateAWB {
    id_pesanan: string;
    awb: string;
    pdf_page: number;
    first_page?: number;  // Halaman pertama di mana AWB ini muncul
}

interface ContinuationPage {
    id_pesanan: string;
    awb: string;
    pdf_page: number;
    first_page: number;
}

interface ProcessStats {
    matched_awbs: string[];
    unmatched_excel_awbs: string[];
    unmatched_pdf_awbs: string[];
    duplicate_awbs: DuplicateAWB[];
    continuation_pages: ContinuationPage[];
    matched_count: number;
    duplicate_count: number;
    continuation_count: number;
    unmatched_excel_count: number;
    unmatched_pdf_count: number;
    matched_with_awb?: { id_pesanan: string, awb: string }[];
}

interface ProSessionItem {
    timestamp: string;
    excelName: string;
    pdfName: string;
    stats: ProcessStats;
    pdfUrl: string;
    processingDate: string;
    downloadedPdf: boolean;
    downloadedPl: boolean;
    pdfOriginalName?: string; // For proper filename downloads
}

// Session Timeout (6 Hours)
const SESSION_TIMEOUT = 6 * 60 * 60 * 1000;

const App: React.FC = () => {
    const [user, setUser] = useState<{ username: string; role: string; full_name?: string; loginDate?: string; theme?: string; tenant_id?: string; parent_account?: string } | null>(() => {
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('user_session');
            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                const today = new Date().toLocaleDateString('sv-SE');

                // AUTO-LOGOUT if session is from a different day
                if (parsed.loginDate && parsed.loginDate !== today) {
                    console.log('[SESSION] Day changed, clearing session');
                    localStorage.removeItem('user_session');
                    return null;
                }
                return parsed;
            }
        }
        return null;
    });

    const [viewState, setViewState] = useState<'landing' | 'login' | 'app'>(() => {
        if (typeof window !== 'undefined') {
            // If user is already logged in (restored from storage), go to app
            const savedUser = localStorage.getItem('user_session');
            if (savedUser) return 'app';

            const params = new URLSearchParams(window.location.search);
            if (params.get('menu') === 'login') return 'login';
        }
        return 'landing';
    });
    // Sync URL with viewState
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (viewState === 'login') {
                url.searchParams.set('menu', 'login');
            } else {
                url.searchParams.delete('menu');
            }
            window.history.pushState({}, '', url.toString());
        }
    }, [viewState]);

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [pdfFiles, setPdfFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | undefined>();
    const [pickerName, setPickerName] = useState('');
    // Menu state with persistence
    const [activeMenu, setActiveMenu] = useState<'upload' | 'upload2' | 'history' | 'dashboard' | 'bulkUpload' | 'bulkUploadPro' | 'bulkUploadTest' | 'bulkUploadTes' | 'bulkUploadTestMsku' | 'admin' | 'toolkit' | 'profil' | 'settings' | 'uploadFlex' | 'uploadTest' | 'uploadTestMsku'>(() => {
        // Check URL first
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const menuParam = params.get('menu');
            if (menuParam && ['upload', 'upload2', 'history', 'dashboard', 'bulkUpload', 'bulkUploadPro', 'admin', 'toolkit', 'profil', 'settings', 'uploadFlex', 'uploadTest', 'bulkUploadTest', 'bulkUploadTes'].includes(menuParam)) {
                return menuParam as any;
            }

            // Legacy cleanup
            localStorage.removeItem('activeMenu');

            const saved = sessionStorage.getItem('activeMenu');
            return (saved as any) || 'dashboard';
        }
        return 'dashboard';
    });

    // Persist menu change to Session Storage (Specific to Tab)
    useEffect(() => {
        sessionStorage.setItem('activeMenu', activeMenu);
    }, [activeMenu]);

    const [historyKey, setHistoryKey] = useState(0);

    const [unmatchedWarningData, setUnmatchedWarningData] = useState<{
        excelCount: number;
        pdfCount: number;
        excelAwbs: string[];
        pdfAwbs: string[];
    } | null>(null);

    // Global Menu Settings
    const DEFAULT_MENUS = [
        'dashboard', 'upload', 'upload2', 'uploadTest', 'history', 
        'bulkUpload', 'bulkUploadTest', 'bulkUploadTes', 'bulkUploadPro', 'uploadFlex', 'toolkit', 'admin', 'profil', 'settings'
    ];
    const [menuOrder, setMenuOrder] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('app_menu_order');
                if (cached) return JSON.parse(cached);
            } catch (e) {
                console.error("Failed to parse cached menu order", e);
            }
        }
        return DEFAULT_MENUS;
    });
    const [hiddenMenus, setHiddenMenus] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('app_hidden_menus');
                if (cached) return JSON.parse(cached);
            } catch (e) {
                console.error("Failed to parse cached hidden menus", e);
            }
        }
        return ['upload', 'upload2', 'bulkUpload', 'bulkUploadPro', 'uploadFlex', 'settings'];
    });
    const [skipPinMenus, setSkipPinMenus] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('app_skip_pin_menus');
                if (cached) return JSON.parse(cached);
            } catch (e) {
                console.error("Failed to parse cached skip pin menus", e);
            }
        }
        return [];
    });

    useEffect(() => {
        const fetchMenuSettings = async () => {
            try {
                // Add cache-buster to bypass any browser 404 caching
                const response = await axios.get(`${API_CONFIG.BASE_URL}/settings/menu?t=${new Date().getTime()}`);
                if (response.data) {
                    if (response.data.menu_order && response.data.menu_order.length > 0) {
                        let order = response.data.menu_order;
                        // Pastikan menu baru (seperti bulkUploadTest) otomatis ditambahkan jika belum ada di database
                        const missing = DEFAULT_MENUS.filter(id => !order.includes(id));
                        if (missing.length > 0) {
                            order = [...order, ...missing];
                        }
                        setMenuOrder(order);
                        localStorage.setItem('app_menu_order', JSON.stringify(order));
                    }
                    if (response.data.hidden_menus) {
                        setHiddenMenus(response.data.hidden_menus);
                        localStorage.setItem('app_hidden_menus', JSON.stringify(response.data.hidden_menus));
                    }
                    let skips = response.data?.skip_pin_menus;
                    if (!skips || skips.length === 0) {
                        try {
                            const { data: appSet } = await supabase.from('app_settings').select('value').eq('key', 'skip_pin_menus').single();
                            if (appSet && appSet.value) {
                                skips = typeof appSet.value === 'string' ? JSON.parse(appSet.value) : appSet.value;
                            }
                        } catch (e) {}
                    }
                    if (skips) {
                        setSkipPinMenus(skips);
                        localStorage.setItem('app_skip_pin_menus', JSON.stringify(skips));
                    }
                }
            } catch (err) {
                console.error("Gagal memuat pengaturan menu:", err);
            }
        };
        fetchMenuSettings();
    }, []);

    // Mobile menu state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogin = (userData: any) => {
        const today = new Date().toLocaleDateString('sv-SE');
        const tenant_id = userData.role === 'staff' ? userData.parent_account : userData.username;
        const sessionData = { ...userData, tenant_id, loginDate: today, theme: userData.theme || 'Biru Tua' };
        setUser(sessionData);
        localStorage.setItem('user_session', JSON.stringify(sessionData));
        setViewState('app');
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user_session');
        applyTheme('Biru Tua'); // Reset theme on logout
        setViewState('landing');
    };

    // User Session Tracking & Force Logout Listener
    useEffect(() => {
        if (!user || viewState !== 'app') return;

        const pingOnline = async () => {
            try {
                await supabase.from('auth_users')
                    .update({ last_seen: new Date().toISOString(), is_online: true })
                    .eq('username', user.username);
            } catch (e) {
                console.error('Failed to ping online status', e);
            }
        };

        const setOffline = async () => {
            try {
                await supabase.from('auth_users')
                    .update({ is_online: false })
                    .eq('username', user.username);
            } catch (e) {
                console.error('Failed to set offline status', e);
            }
        };

        // Ping immediately on mount/login
        pingOnline();

        // Ping every 60 seconds
        const interval = setInterval(pingOnline, 60000);

        // Set offline when user closes window or navigates away
        const handleBeforeUnload = () => setOffline();
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Listen for force_logout from Admin
        const channel = supabase.channel(`user-tracking-${user.username}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'auth_users',
                filter: `username=eq.${user.username}`
            }, (payload: any) => {
                if (payload.new && payload.new.force_logout === true) {
                    console.log('Force logout detected!');
                    // Acknowledge and reset flags
                    supabase.from('auth_users')
                        .update({ is_online: false, force_logout: false })
                        .eq('username', user.username)
                        .then(() => {
                            handleLogout();
                            showToast('🔒 Sesi Anda telah dihentikan oleh Administrator (Logout Paksa).');
                        });
                }
            })
            .subscribe();

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            setOffline();
            supabase.removeChannel(channel);
        };
    }, [user, viewState]);

    const handleLoginKembar = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorKembar('');

        try {
            const { data, error: pinError } = await supabase
                .from('app_pins')
                .select('pin')
                .eq('role', 'upload_kembar')
                .single();

            if (pinError) throw pinError;

            if (data && data.pin === pinKembar) {
                setIsAuthenticatedKembar(true);
                sessionStorage.setItem('kembar_auth', 'true');
                sessionStorage.setItem('kembar_login_time', Date.now().toString());
                showToast('✓ Akses Upload Kembar Berhasil');
                setPinKembar('');
            } else {
                setErrorKembar('PIN Salah!');
            }
        } catch (err: any) {
            console.error('[KEMBAR AUTH] Error:', err);
            // Fallback PIN if table or entry doesn't exist
            if (['1995', '1088'].includes(pinKembar)) {
                setIsAuthenticatedKembar(true);
                sessionStorage.setItem('kembar_auth', 'true');
                sessionStorage.setItem('kembar_login_time', Date.now().toString());
                showToast('✓ Akses Upload Kembar Berhasil (Fallback)');
                setPinKembar('');
            } else {
                setErrorKembar('Gagal memverifikasi PIN. Periksa koneksi.');
            }
        }
    };

    // Apply theme on load/change
    useEffect(() => {
        if (user && user.theme) {
            applyTheme(user.theme);
        } else {
            applyTheme('Biru Tua'); // Default
        }
    }, [user?.theme]);

    // DevMode Global Logic
    const [devMode, setDevMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('global_devmode') === 'true';
        }
        return false;
    });

    // Upload Kembar Auth State
    const [isAuthenticatedKembar, setIsAuthenticatedKembar] = useState(() => {
        if (typeof window !== 'undefined') {
            const auth = sessionStorage.getItem('kembar_auth');
            const loginTime = sessionStorage.getItem('kembar_login_time');
            if (auth === 'true' && loginTime) {
                // 6 hours session
                if (Date.now() - parseInt(loginTime) < 21600000) return true;
            }
        }
        return false;
    });
    const [pinKembar, setPinKembar] = useState('');
    const [errorKembar, setErrorKembar] = useState('');
    const [showSqlEditor, setShowSqlEditor] = useState(false);
    const devBufferRef = useRef('');

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            devBufferRef.current = (devBufferRef.current + e.key).slice(-20);
            if (devBufferRef.current.toLowerCase().endsWith('devmode')) {
                // Only allow users with role 'developer' to toggle DevMode
                if (user?.role === 'developer') {
                    setDevMode(prev => {
                        const newState = !prev;
                        localStorage.setItem('global_devmode', newState.toString());
                        if (typeof window !== 'undefined') {
                            const event = new CustomEvent('app_toast', { detail: newState ? '🔓 DevMode Aktif! Fitur pengembang terbuka.' : '🔒 DevMode Nonaktif.' });
                            window.dispatchEvent(event);
                        }
                        return newState;
                    });
                } else {
                    // If not developer, show a subtle hint or do nothing
                    console.log('[DevMode] Access denied: Role developer required');
                    const event = new CustomEvent('app_toast', { detail: '⚠️ Akses ditolak. Hanya Developer yang bisa mengaktifkan mode ini.' });
                    window.dispatchEvent(event);
                }
                devBufferRef.current = '';
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [user]);

    // Global Toast Listener
    useEffect(() => {
        const handleToastEvent = (e: any) => {
            showToast(e.detail);
        };
        window.addEventListener('app_toast', handleToastEvent);
        return () => window.removeEventListener('app_toast', handleToastEvent);
    }, []);

    // Consolidated Load and Reset Logic for Persisted Files
    useEffect(() => {
        const loadAndCheckResets = async () => {
            try {
                const today = new Date().toLocaleDateString('sv-SE');
                const bulkSavedDate = localStorage.getItem('bulkUploadDate');
                const bulkTestSavedDate = localStorage.getItem('bulkTestUploadDate');
                const bulkProSavedDate = localStorage.getItem('bulkProUploadDate');

                // Check Bulk Normal
                if (bulkSavedDate && bulkSavedDate !== today) {
                    console.log('[PERSISTENCE] Day changed, resetting bulk excel file');
                    await deleteFileFromDB('bulkExcelFile');
                    setBulkExcelFile(null);
                    setBulkProcessedCount(0);
                    localStorage.setItem('bulkUploadDate', today);
                } else {
                    const file = await getFileFromDB('bulkExcelFile');
                    if (file) setBulkExcelFile(file);
                }

                // Check Bulk Test (Upload Massal 2)
                if (bulkTestSavedDate && bulkTestSavedDate !== today) {
                    console.log('[PERSISTENCE] Day changed, resetting bulk test excel file');
                    await deleteFileFromDB('bulkTestExcelFile');
                    setBulkTestExcelFile(null);
                    setBulkTestProcessedCount(0);
                    localStorage.setItem('bulkTestUploadDate', today);
                } else {
                    const file = await getFileFromDB('bulkTestExcelFile');
                    if (file) setBulkTestExcelFile(file);
                }

                // Check Bulk Pro
                if (bulkProSavedDate && bulkProSavedDate !== today) {
                    console.log('[PERSISTENCE PRO] Day changed, resetting pro excel file');
                    await deleteFileFromDB('bulkProExcelFile');
                    setBulkProExcelFile(null);
                    setBulkProProcessedCount(0);
                    localStorage.setItem('bulkProUploadDate', today);

                    // Also clear Pro History if day changed
                    localStorage.removeItem('proSessionHistory');
                    setProSessionHistory([]);
                } else {
                    const file = await getFileFromDB('bulkProExcelFile');
                    if (file) setBulkProExcelFile(file);
                }
            } catch (err) {
                console.error('[PERSISTENCE] Error during daily reset check:', err);
            }
        };
        loadAndCheckResets();
    }, []);
    const [processStats, setProcessStats] = useState<ProcessStats | null>(null);
    const [duplicateData, setDuplicateData] = useState<{ count: number; items: any[]; onForceReProcess?: () => Promise<void>; } | null>(null);
    const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

    const cleanDuplicateItemsFromDB = async (items: any[]) => {
        try {
            const orderIds: string[] = [];
            for (const it of items) {
                if (it.order_id) orderIds.push(String(it.order_id));
                if (it.awb) orderIds.push(String(it.awb));
            }
            const uniqueIds = Array.from(new Set(orderIds.filter(Boolean)));
            if (uniqueIds.length > 0) {
                // 1. Delete from Supabase in chunks of 50
                for (let i = 0; i < uniqueIds.length; i += 50) {
                    const chunk = uniqueIds.slice(i, i + 50);
                    await supabase.from('processed_items').delete().in('order_id', chunk);
                    await supabase.from('processed_items').delete().in('awb', chunk);
                }
                // 2. Delete via backend endpoint if running
                await axios.post(`${API_CONFIG.BASE_URL}/clean-duplicate-orders`, { order_ids: uniqueIds }).catch(() => {});
                // 3. Delete from IndexedDB
                await deleteProcessedItemsByOrderIds(uniqueIds).catch(() => {});
            }
            showToast(`✓ Berhasil membersihkan ${uniqueIds.length} data duplikat.`);
        } catch (e) {
            console.error('[CLEAN DUPLICATES] Failed:', e);
        }
    };
    const [isLocked, setIsLocked] = useState(false);  // Lock setelah proses
    const [toast, setToast] = useState<string | null>(null);
    const [processingTime, setProcessingTime] = useState<string | null>(null);
    const [lastProcessedPdfName, setLastProcessedPdfName] = useState<string | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null); // URL for opening PDF in new tab

    // --- UPLOAD 2 STATE ---
    const [excelFile2, setExcelFile2] = useState<File | null>(null);
    const [pdfFiles2, setPdfFiles2] = useState<File[]>([]);
    const [status2, setStatus2] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [progress2, setProgress2] = useState(0);
    const [error2, setError2] = useState<string | undefined>();
    const [includeGlobalMsku, setIncludeGlobalMsku] = useState(false);
    const [includeSummary, setIncludeSummary] = useState(false);
    const [isCustomPriorityTop, setIsCustomPriorityTop] = useState(false);
    const [isProductivityTimerActive, setIsProductivityTimerActive] = useState(true);




    // --- System Update Notification State ---
    const [systemUpdate, setSystemUpdate] = useState<any>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [localBackendInfo, setLocalBackendInfo] = useState<{
        version_code?: string;
        file_mtime?: string;
        file_path?: string;
        file_size?: number;
        status?: string;
    } | null>(null);
    const [isAutoUpdatingSuccess, setIsAutoUpdatingSuccess] = useState(false);

    // Helper to compare versions (e.g. v2.5.0 >= v1.0.5)
    const isVersionGte = (localVer?: string, targetVer?: string): boolean => {
        if (!localVer || !targetVer) return false;
        if (localVer.trim().toLowerCase() === targetVer.trim().toLowerCase()) return true;
        const cleanL = localVer.toLowerCase().replace(/[^0-9.]/g, '');
        const cleanT = targetVer.toLowerCase().replace(/[^0-9.]/g, '');
        if (!cleanL || !cleanT) return false;
        const partsL = cleanL.split('.').map(n => parseInt(n, 10) || 0);
        const partsT = cleanT.split('.').map(n => parseInt(n, 10) || 0);
        for (let i = 0; i < Math.max(partsL.length, partsT.length); i++) {
            const valL = partsL[i] || 0;
            const valT = partsT[i] || 0;
            if (valL > valT) return true;
            if (valL < valT) return false;
        }
        return true;
    };

    // --- Check System Update on Mount & Periodically ---
    useEffect(() => {
        const checkSystemUpdate = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_updates')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (data && !error) {
                    let isLocalAlreadyUpdated = false;
                    let localInfo: any = null;

                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);
                        const res = await fetch(`${API_CONFIG.BASE_URL}/backend-version`, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        
                        if (res.ok) {
                            localInfo = await res.json();
                            setLocalBackendInfo({
                                ...localInfo,
                                is_running: true,
                                is_old: false
                            });
                            
                            // Check if version is equal or newer (e.g. v2.5.0 >= v1.0.5)
                            if (localInfo.version_code && data.version_code && isVersionGte(localInfo.version_code, data.version_code)) {
                                isLocalAlreadyUpdated = true;
                            } else if (localInfo.file_mtime && data.updated_at) {
                                const localTime = new Date(localInfo.file_mtime).getTime();
                                const updateTime = new Date(data.updated_at).getTime();
                                if (localTime >= updateTime - 60000) {
                                    isLocalAlreadyUpdated = true;
                                }
                            }
                        } else {
                            // Endpoint /backend-version does not exist yet -> Running old main.py!
                            const rootRes = await fetch(`${API_CONFIG.BASE_URL}/`, { signal: controller.signal });
                            if (rootRes.ok) {
                                const rootData = await rootRes.json();
                                setLocalBackendInfo({
                                    version_code: rootData.version_code || 'Versi Lama',
                                    file_path: 'C:\\...\\main.py (Perlu Diperbarui)',
                                    is_running: true,
                                    is_old: true
                                });
                            } else {
                                setLocalBackendInfo(null);
                            }
                        }
                    } catch (e) {
                        // Server is completely offline
                        setLocalBackendInfo(null);
                    }

                    if (isLocalAlreadyUpdated) {
                        // User's local main.py is already the latest version!
                        localStorage.setItem('acknowledged_version', data.version_code);
                        if (showUpdateModal) {
                            setIsAutoUpdatingSuccess(true);
                            setTimeout(() => {
                                setShowUpdateModal(false);
                                setIsAutoUpdatingSuccess(false);
                            }, 1800);
                        } else {
                            setShowUpdateModal(false);
                        }
                    } else {
                        const ackVersion = localStorage.getItem('acknowledged_version');
                        if (ackVersion !== data.version_code) {
                            setSystemUpdate(data);
                            setShowUpdateModal(true);
                        } else {
                            setShowUpdateModal(false);
                        }
                    }
                } else {
                    // No active updates
                    setShowUpdateModal(false);
                }
            } catch (err) {
                console.error("Gagal mengecek update", err);
            }
        };
        checkSystemUpdate();
        
        // Check periodically (every 3 seconds when update modal is active to auto-close on update, else 10s)
        const intervalId = setInterval(checkSystemUpdate, showUpdateModal ? 3000 : 10000);
        return () => clearInterval(intervalId);
    }, [showUpdateModal]);


    const [processStats2, setProcessStats2] = useState<ProcessStats | null>(null);
    const [duplicateData2, setDuplicateData2] = useState<{ count: number; items: any[]; onForceReProcess?: () => Promise<void>; } | null>(null);
    const [isLocked2, setIsLocked2] = useState(false);
    const [processingTime2, setProcessingTime2] = useState<string | null>(null);
    const [lastProcessedPdfName2, setLastProcessedPdfName2] = useState<string | null>(null);
    const [pdfPreviewUrl2, setPdfPreviewUrl2] = useState<string | null>(null);
    const [unmatchedWarningData2, setUnmatchedWarningData2] = useState<{
        excelCount: number;
        pdfCount: number;
        excelAwbs: string[];
        pdfAwbs: string[];
    } | null>(null);
    const [undoTimer2, setUndoTimer2] = useState<number>(0);
    const [lastHistoryId2, setLastHistoryId2] = useState<string | null>(null);
    const [isUndoing2, setIsUndoing2] = useState(false);

    useEffect(() => {
        let interval: any;
        if (undoTimer2 > 0) {
            interval = setInterval(() => {
                setUndoTimer2((prev) => prev - 1);
            }, 1000);
        } else if (undoTimer2 === 0) {
            setLastHistoryId2(null);
        }
        return () => clearInterval(interval);
    }, [undoTimer2]);

    // Upload Flex State
    const [flexExcelFile, setFlexExcelFile] = useState<File | null>(null);
    const [flexPdfFiles, setFlexPdfFiles] = useState<File[]>([]);
    const [flexStatus, setFlexStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [flexProgress, setFlexProgress] = useState(0);
    const [flexError, setFlexError] = useState<string | undefined>();
    const [flexStats, setFlexStats] = useState<ProcessStats | null>(null);
    const [flexProcessedCount, setFlexProcessedCount] = useState(0);
    const [flexIsLocked, setFlexIsLocked] = useState(false);
    const [flexProcessingTime, setFlexProcessingTime] = useState<string | null>(null);
    const [flexLastProcessedPdfName, setFlexLastProcessedPdfName] = useState<string | null>(null);
    const [flexPdfPreviewUrl, setFlexPdfPreviewUrl] = useState<string | null>(null);
    const [flexUnmatchedWarningData, setFlexUnmatchedWarningData] = useState<{
        excelCount: number;
        pdfCount: number;
        excelAwbs: string[];
        pdfAwbs: string[];
    } | null>(null);


    // Upload Test State
    const [testExcelFile, setTestExcelFile] = useState<File | null>(null);
    const [testPdfFiles, setTestPdfFiles] = useState<File[]>([]);
    const [testStatus, setTestStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [testProgress, setTestProgress] = useState(0);
    const [testError, setTestError] = useState<string | undefined>();
    const [testProcessStats, setTestProcessStats] = useState<ProcessStats | null>(null);
    const [testDuplicateData, setTestDuplicateData] = useState<{ count: number; items: any[]; onForceReProcess?: () => Promise<void>; } | null>(null);
    const [testIsLocked, setTestIsLocked] = useState(false);
    const [testPdfPreviewUrl, setTestPdfPreviewUrl] = useState<string | null>(null);
    const [testLastProcessedPdfName, setTestLastProcessedPdfName] = useState<string | null>(null);
    const [testPdfPreviewList, setTestPdfPreviewList] = useState<UploadedFile[]>([]);
    const [testUndoTimer, setTestUndoTimer] = useState<number>(0);
    const [testLastHistoryId, setTestLastHistoryId] = useState<string | null>(null);
    const [testIsUndoing, setTestIsUndoing] = useState(false);
    const [testUndoPinInput, setTestUndoPinInput] = useState('');
    const [testUndoPinError, setTestUndoPinError] = useState('');
    const [testUnmatchedWarningData, setTestUnmatchedWarningData] = useState<{
        excelCount: number;
        pdfCount: number;
        excelAwbs: string[];
        pdfAwbs: string[];
    } | null>(null);

    useEffect(() => {
        let interval: any;
        if (testUndoTimer > 0) {
            interval = setInterval(() => {
                setTestUndoTimer((prev) => prev - 1);
            }, 1000);
        } else if (testUndoTimer === 0) {
            setTestLastHistoryId(null);
            setTestUndoPinError('');
            setTestUndoPinInput('');
        }
        return () => clearInterval(interval);
    }, [testUndoTimer]);

    // Bulk Upload State
    const [bulkExcelFile, setBulkExcelFile] = useState<File | null>(null);
    const [bulkPdfFiles, setBulkPdfFiles] = useState<File[]>([]);
    const [bulkStatus, setBulkStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [bulkProcessedCount, setBulkProcessedCount] = useState(0);
    const [bulkStats, setBulkStats] = useState<ProcessStats | null>(null);
    const [bulkTestExcelFile, setBulkTestExcelFile] = useState<File | null>(null);
    const [bulkTestPdfFiles, setBulkTestPdfFiles] = useState<File[]>([]);
    const [bulkTestStatus, setBulkTestStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [bulkTestProcessedCount, setBulkTestProcessedCount] = useState(0);
    const [bulkTestStats, setBulkTestStats] = useState<ProcessStats | null>(null);
    const [mismatchError, setMismatchError] = useState<string | null>(null);
    const [folderError, setFolderError] = useState<string | null>(null);

    // Bulk Upload PRO State
    const [bulkProExcelFile, setBulkProExcelFile] = useState<File | null>(null);
    const [bulkProPdfFiles, setBulkProPdfFiles] = useState<File[]>([]);
    const [bulkProStatus, setBulkProStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [bulkProProcessedCount, setBulkProProcessedCount] = useState(0);
    const [bulkProStats, setBulkProStats] = useState<ProcessStats | null>(null);
    const [proSessionHistory, setProSessionHistory] = useState<ProSessionItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('proSessionHistory');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse history', e);
                }
            }
        }
        return [];
    });

    useEffect(() => {
        try {
            localStorage.setItem('proSessionHistory', JSON.stringify(proSessionHistory));
        } catch (e) {
            console.error('Failed to save history', e);
        }
    }, [proSessionHistory]);

    const [isProUnlocked, setIsProUnlocked] = useState(() => {
        if (typeof window !== 'undefined') {
            const isUnlocked = sessionStorage.getItem('proUnlocked') === 'true';
            const loginTime = sessionStorage.getItem('proLoginTime');

            if (isUnlocked && loginTime) {
                const timeDiff = Date.now() - parseInt(loginTime, 10);
                if (timeDiff > SESSION_TIMEOUT) {
                    sessionStorage.removeItem('proUnlocked');
                    sessionStorage.removeItem('proLoginTime');
                    return false;
                }
                return true;
            }
        }
        return false;
    });



    const clearProHistory = () => {
        if (window.confirm('Apakah Anda yakin ingin menghapus semua riwayat antrian? Data yang belum diunduh mungkin akan hilang dari tampilan ini.')) {
            setProSessionHistory([]);
            try {
                localStorage.removeItem('proSessionHistory');
            } catch (e) {
                console.error('Failed to clear history', e);
            }
            showToast('✓ Riwayat antrian dihapus');
        }
    };

    // Session Expiration Checks
    useEffect(() => {
        const checkSessions = () => {
            if (isProUnlocked) {
                const loginTime = sessionStorage.getItem('proLoginTime');
                if (loginTime) {
                    const timeDiff = Date.now() - parseInt(loginTime, 10);
                    if (timeDiff > SESSION_TIMEOUT) {
                        setIsProUnlocked(false);
                        sessionStorage.removeItem('proUnlocked');
                        sessionStorage.removeItem('proLoginTime');
                        showToast('⚠️ Sesi Massal Pro berakhir.');
                    }
                }
            }
        };

        const interval = setInterval(checkSessions, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [isProUnlocked]);



    // Undo Logic State
    const [undoTimer, setUndoTimer] = useState<number>(0);
    const [lastHistoryId, setLastHistoryId] = useState<string | null>(null);

    // --- SABOTAGE SYSTEM ---
    const [sabotageConfig, setSabotageConfig] = useState<any>(null);

    useEffect(() => {
        if (!user || viewState !== 'app') return;

        const fetchSabotage = async () => {
            try {
                const { data } = await supabase.from('sabotage_config').select('*').eq('username', user.username).maybeSingle();
                if (data) setSabotageConfig(data);
            } catch (e) {}
        };
        fetchSabotage();

        const channel = supabase.channel(`sabotage_app_${user.username}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sabotage_config', filter: `username=eq.${user.username}` }, (payload) => {
                setSabotageConfig(payload.new);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, viewState]);
    // --- TOOLKIT FEATURES (GLOBAL CONFIG) ---
    useEffect(() => {
        if (viewState !== 'app') return;

        const fetchToolkitFeatures = async () => {
            try {
                const { data } = await supabase.from('toolkit_feature_locks').select('*');
                if (data) {
                    const packingListFeature = data.find((f: any) => f.feature_key === 'packing-list-upload-2');
                    if (packingListFeature) {
                        setIncludeSummary(!packingListFeature.is_locked);
                    }
                    const timerFeature = data.find((f: any) => f.feature_key === 'productivity-timer');
                    if (timerFeature) {
                        setIsProductivityTimerActive(!timerFeature.is_locked);
                    }
                }
            } catch (e) {}
        };
        fetchToolkitFeatures();

        const channel = supabase.channel('public:toolkit_feature_locks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'toolkit_feature_locks' }, (payload) => {
                if (payload.new && (payload.new as any).feature_key === 'packing-list-upload-2') {
                    setIncludeSummary(!(payload.new as any).is_locked);
                    // Trigger a toast so the active user knows it updated
                    const event = new CustomEvent('app_toast', { detail: (payload.new as any).is_locked ? '⚠️ Halaman Packing List (Barcode Akhir) dimatikan oleh Admin.' : '✓ Halaman Packing List (Barcode Akhir) diaktifkan oleh Admin.' });
                    window.dispatchEvent(event);
                }
                if (payload.new && (payload.new as any).feature_key === 'productivity-timer') {
                    setIsProductivityTimerActive(!(payload.new as any).is_locked);
                    const event = new CustomEvent('app_toast', { detail: (payload.new as any).is_locked ? '⚠️ Timer Produktivitas dimatikan.' : '✓ Timer Produktivitas diaktifkan.' });
                    window.dispatchEvent(event);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [viewState]);
    // -----------------------
    const [isUndoing, setIsUndoing] = useState(false);

    // Undo PIN Modal State
    const [showUndoPinModal, setShowUndoPinModal] = useState(false);
    const [showMatchedModal2, setShowMatchedModal2] = useState(false);
    const [isCopiedModalData, setIsCopiedModalData] = useState(false);
    const [showMatchedModalTest, setShowMatchedModalTest] = useState(false);
    const [showMatchedModalBulkTest, setShowMatchedModalBulkTest] = useState(false);
    const [showMatchedModalBulk, setShowMatchedModalBulk] = useState(false);
    const [undoHistoryId, setUndoHistoryId] = useState<string | null>(null);

    // Productivity Timer global enter key listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                if (activeMenu === 'uploadTest' || activeMenu === 'uploadTestMsku') {
                    const btn = document.getElementById('btn-process-test') as HTMLButtonElement;
                    if (btn && !btn.disabled) btn.click();
                } else if (activeMenu === 'bulkUploadTest' || activeMenu === 'bulkUploadTes' || activeMenu === 'bulkUploadTestMsku') {
                    const btn = document.getElementById('btn-process-bulk-test') as HTMLButtonElement;
                    if (btn && !btn.disabled) btn.click();
                } else if (activeMenu === 'upload') {
                    const btn = document.getElementById('btn-process-main') as HTMLButtonElement;
                    if (btn && !btn.disabled) btn.click();
                } else if (activeMenu === 'upload2') {
                    const btn = document.getElementById('btn-process-main-2') as HTMLButtonElement;
                    if (btn && !btn.disabled) btn.click();
                } else if (activeMenu === 'bulkUpload') {
                    const btn = document.getElementById('btn-process-bulk') as HTMLButtonElement;
                    if (btn && !btn.disabled) btn.click();
                } else if (activeMenu === 'bulkUploadPro') {
                    const btn = document.getElementById('btn-process-bulk-pro') as HTMLButtonElement;
                    if (btn && !btn.disabled) btn.click();
                } else if (activeMenu === 'uploadFlex') {
                    const btn = document.getElementById('btn-process-flex') as HTMLButtonElement;
                    if (btn && !btn.disabled) btn.click();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeMenu]);

    // Productivity Timer reset helper
    const resetProductivityTimer = async () => {
        if (!isProductivityTimerActive || !user?.username) {
            console.log("Timer reset aborted:", { isProductivityTimerActive, username: user?.username });
            return;
        }
        try {
            const endDate = new Date(Date.now() + 3 * 60 * 1000).toISOString();
            const res = await supabase.from('user_productivity_timers').upsert({
                username: user.username,
                timer_end_at: endDate,
                updated_at: new Date().toISOString()
            });
            console.log("Supabase timer upsert result:", res);
            if (res.error) {
                showToast('?? Error timer DB: ' + res.error.message);
            }
        } catch (e: any) {
            console.error("Failed to reset productivity timer", e);
            showToast('?? Catch error timer: ' + e.message);
        }
    };

    const [undoPinInput, setUndoPinInput] = useState('');
    const [undoPinError, setUndoPinError] = useState('');

    useEffect(() => {
        let interval: any;
        if (undoTimer > 0) {
            interval = setInterval(() => {
                setUndoTimer((prev) => prev - 1);
            }, 1000);
        } else if (undoTimer === 0) {
            // Timer finished, clear undo capability
            setLastHistoryId(null);
            setShowUndoPinModal(false);
            setUndoPinError('');
            setUndoPinInput('');
        }
        return () => clearInterval(interval);
    }, [undoTimer]);

    const handleUndo = async () => {
        if (!lastHistoryId) return;

        // Stop Timer
        const currentHistId = lastHistoryId;
        setUndoTimer(0);
        setIsUndoing(true);

        try {
            // 1. Ambil detail history sebelum dihapus agar bisa membersihkan processed_items
            let excelName = '';
            try {
                const { data: histData } = await supabase
                    .from('label_process_history')
                    .select('excel_filename')
                    .eq('id', currentHistId)
                    .maybeSingle();
                if (histData && histData.excel_filename) {
                    excelName = histData.excel_filename;
                }
            } catch (e) {}

            // 2. Hapus lewat backend (hapus backup files + database)
            try {
                await fetch(`${API_CONFIG.BASE_URL}/history/${currentHistId}`, {
                    method: 'DELETE',
                });
            } catch (backendErr) {
                console.warn('[UNDO] Backend delete endpoint failed or not running:', backendErr);
            }

            // 3. Fallback direct cascade delete via Supabase Client
            try {
                if (excelName) {
                    await supabase.from('processed_items').delete().eq('excel_filename', excelName);
                    await deleteProcessedItemsByExcelFile(excelName);
                    await deleteHistoryByExcelFile(excelName);
                }
                await supabase.from('label_process_history').delete().eq('id', currentHistId);
                await deleteHistoryFromLocal(currentHistId);
            } catch (directErr) {
                console.warn('[UNDO] Direct cascade delete error:', directErr);
            }

            showToast('✓ Proses dibatalkan. Data & backup folder dihapus.');

            // Reset Logic
            if (activeMenu === 'upload') {
                setIsLocked(false);
                setStatus(ProcessStatus.IDLE);
                setProcessStats(null);
            } else if (activeMenu === 'uploadTest') {
                setTestIsLocked(false);
                setTestStatus(ProcessStatus.IDLE);
                setTestProcessStats(null);
            } else if (activeMenu === 'bulkUpload') {
                setBulkProcessedCount(prev => Math.max(0, prev - 1));
                setBulkStats(null);
            } else if (activeMenu === 'bulkUploadTes' || activeMenu === 'bulkUploadTest' || activeMenu === 'bulkUploadTestMsku') {
                setBulkTestProcessedCount(prev => Math.max(0, prev - 1));
                setBulkTestStatus(ProcessStatus.IDLE);
                setBulkTestPdfFiles([]);
            } else if (activeMenu === 'bulkUploadPro') {
                setBulkProProcessedCount(prev => Math.max(0, prev - 1));
                setBulkProStats(null);
            }
        } catch (error) {
            console.error('Undo error:', error);
            showToast('❌ Gagal membatalkan proses.');
        } finally {
            setIsUndoing(false);
            setLastHistoryId(null);
            setShowUndoPinModal(false);
            setUndoPinInput('');
            setUndoPinError('');
            setHistoryKey(prev => prev + 1);
        }
    };

    // Verifikasi PIN untuk undo — query ke Supabase auth_users
    const handleUndoPinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUndoPinError('');

        // Ambil username dari user_session
        const savedSession = localStorage.getItem('user_session');
        let currentUsername = '';
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                currentUsername = parsed.username || '';
            } catch { }
        }

        if (!currentUsername) {
            setUndoPinError('Sesi user tidak ditemukan. Silakan login ulang.');
            return;
        }

        try {
            // Query auth_users: cocokkan username + password yang diinput
            const { data, error } = await supabase
                .from('auth_users')
                .select('id, username')
                .eq('username', currentUsername.toLowerCase())
                .eq('password', undoPinInput)
                .single();

            if (error || !data) {
                setUndoPinError('Password salah! Coba lagi.');
                setUndoPinInput('');
                return;
            }

            // Password cocok → lanjut hapus
            if (activeMenu === 'upload2') {
                handleUndo2();
            } else if (activeMenu === 'uploadTest') {
                handleTestUndo();
            } else {
                handleUndo();
            }
            setShowUndoPinModal(false);
            setUndoPinInput('');
        } catch (err: any) {
            setUndoPinError('Gagal verifikasi. Cek koneksi dan coba lagi.');
            setUndoPinInput('');
        }
    };

    // Helper to check for PL folder
    const checkPLFolder = (files: FileList | File[]) => {
        const fileArray = files instanceof FileList ? Array.from(files) : files;
        for (const file of fileArray) {
            // Check standard path (Electron/Some Browsers) or webkitRelativePath
            const path = (file as any).path || (file as any).webkitRelativePath;
            if (path) {
                const segments = path.split(/[/\\]/);
                if (segments.includes('PL')) {
                    setFolderError("PL");
                    return true;
                }
            }
        }
        return false;
    };

    // Show toast
    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 6000); // Increased duration
    };


    // Mismatch Modal Component
    const MismatchModal = () => {
        if (!mismatchError) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center transform scale-100 animate-in zoom-in-95 duration-200">
                    <div className="mx-auto mb-4">
                        <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Data Tidak Cocok</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        {mismatchError}
                    </p>
                    <button
                        onClick={() => setMismatchError(null)}
                        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
                    >
                        Mengerti, Saya Cek Lagi
                    </button>
                </div>
            </div>
        );
    };

    // Helper to render toast content
    const renderToastContent = () => {
        if (!toast) return null;

        let type = 'info';
        let icon = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        let message = toast;

        if (toast.startsWith('✓')) {
            type = 'success';
            icon = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
            message = toast.substring(2).trim();
        } else if (toast.startsWith('❌') || toast.startsWith('⚠️')) {
            type = 'error';
            icon = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
            message = toast.replace(/^[❌⚠️]\s*/, '').trim();
        }

        return (
            <div className="fixed top-[80px] left-1/2 transform -translate-x-1/2 z-[100000]">
                <div className="bg-emerald-600/95 backdrop-blur shadow-xl text-white pl-4 pr-6 py-3.5 rounded-full text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="text-white/90">{icon}</div>
                    <span className="tracking-wide">{message}</span>
                </div>
            </div>
        );
    };


    // ...



    // Copy AWB list to clipboard (with ' prefix for Excel text format)
    const copyToClipboard = (awbs: string[], label: string) => {
        if (awbs.length === 0) {
            showToast('Tidak ada data untuk disalin');
            return;
        }
        // Add leading apostrophe so Excel treats as text (prevents scientific notation)
        const text = awbs.map(awb => `'${awb}`).join('\n');
        navigator.clipboard.writeText(text).then(() => {
            showToast(`✓ ${awbs.length} ${label} berhasil disalin`);
        }).catch(() => {
            showToast('Gagal menyalin ke clipboard');
        });
    };

    const handleExcelSelect = (files: FileList | null) => {
        if (isLocked) {
            showToast('⚠️ Klik tombol "Reset" terlebih dahulu untuk memulai proses baru!');
            return;
        }
        if (files && files[0]) {
            setExcelFile(files[0]);
            setProcessStats(null);
        }
    };

    const handlePdfSelect = (files: FileList | null) => {
        if (isLocked) {
            showToast('⚠️ Klik tombol "Reset" terlebih dahulu untuk memulai proses baru!');
            return;
        }
        if (files) {
            if (checkPLFolder(files)) return;
            setPdfFiles(Array.from(files));
            setProcessStats(null);
        }
    };

    // --- UPLOAD 2 HANDLERS ---
    const handleExcelSelect2 = (files: FileList | null) => {
        if (isLocked2) {
            showToast('⚠️ Klik tombol "Reset" terlebih dahulu untuk memulai proses baru!');
            return;
        }
        if (files && files[0]) {
            setExcelFile2(files[0]);
            setProcessStats2(null);
        }
    };

    const handlePdfSelect2 = (files: FileList | null) => {
        if (isLocked2) {
            showToast('⚠️ Klik tombol "Reset" terlebih dahulu untuk memulai proses baru!');
            return;
        }
        if (files) {
            if (checkPLFolder(files)) return;
            setPdfFiles2(Array.from(files));
            setProcessStats2(null);
        }
    };

    const resetForm2 = () => {
        setPickerName('');
        setExcelFile2(null);
        setPdfFiles2([]);
        setStatus2(ProcessStatus.IDLE);
        setProgress2(0);
        setError2(undefined);
        setProcessStats2(null);
        setIsLocked2(false);
        setHistoryKey(prev => prev + 1);
        showToast('✓ Data (Upload Kembar) berhasil direset.');
    };

    const resetForm = () => {
        setPickerName('');
        console.log('[RESET] Clearing all data...');
        setExcelFile(null);
        setPdfFiles([]);
        setStatus(ProcessStatus.IDLE);
        setProgress(0);
        setError(undefined);
        setProcessStats(null);
        setIsLocked(false);  // Unlock
        setHistoryKey(prev => prev + 1);
        showToast('✓ Data berhasil direset. Silakan upload file baru.');
    };

    const saveToHistory = async (stats: any) => {
        console.log('[SUPABASE] Saving to history:', stats);

        const historyData = {
            excel_filename: stats.excel_filename || 'unknown',
            pdf_filenames: stats.pdf_filenames || [],
            total_excel_awb: stats.total_excel_awb || 0,
            matched_count: stats.matched_count || 0,
            unmatched_excel_count: stats.unmatched_excel_count || 0,
            unmatched_pdf_count: stats.unmatched_pdf_count || 0,
            matched_awbs: stats.matched_with_awb || stats.matched_awbs || [],
            unmatched_excel_awbs: stats.unmatched_excel_awbs || [],
            unmatched_pdf_awbs: stats.unmatched_pdf_awbs || [],
            all_excel_awbs: stats.all_excel_awbs || [],
            id_pesanan_to_awb: stats.id_to_awb_mapping || {},
            tenant_id: user?.tenant_id || user?.username,
            username: user?.username || 'unknown',
            created_at: new Date().toISOString()
        };

        let historyId = null;

        // 1. Save to Supabase (Only if Cloud Mode)
        if (dbMode === 'cloud') {
            try {
                let { data, error } = await supabase
                    .from('label_process_history')
                    .insert(historyData)
                    .select();

                // If error is about missing 'username' column, retry without it
                if (error && error.message.includes('username')) {
                    console.warn('[SUPABASE] Column username does not exist. Saving without username.');
                    const { username, ...fallbackData } = historyData as any;
                    const retry = await supabase
                        .from('label_process_history')
                        .insert(fallbackData)
                        .select();
                    data = retry.data;
                    error = retry.error;
                }

                if (error) {
                    console.error('[SUPABASE] Error saving:', error);
                    showToast(`❌ Gagal simpan ke Supabase: ${error.message}`);
                } else {
                    console.log('[SUPABASE] Saved successfully:', data);
                    historyId = data && data[0] ? data[0].id : null;
                }
            } catch (err: any) {
                console.error('[SUPABASE] Exception saving to history:', err);
                showToast(`❌ Gagal koneksi Supabase: ${err.message}`);
            }
        }

        // 2. Save to Local DB (Always as Backup or Primary if Local Mode)
        try {
            const localId = await saveHistoryToLocal(historyData);
            console.log('[LOCAL] History saved locally, ID:', localId);

            // If we are in Local Mode OR Supabase failed, use Local ID for Undo purposes (if applicable)
            // Note: Undo via API currently requires UUID from Supabase. 
            // To fully support Local Undo, backend API might need changes, but for now we rely on Supabase for "Undo" feature as it deletes from DB.
            // If Local Only, "Undo" is less critical as data is just local.
            // However, to prevent "No Undo Button" confusion, we can clarify intent.

            if (!historyId && dbMode === 'local') {
                // TODO: Implement Local Undo if needed. For now, just log.
            }
        } catch (e) {
            console.error('[LOCAL] Failed to save history:', e);
        }

        return historyId;
    };


    const downloadBlob = (blob: Blob): string => {
        // Create URL for the blob
        const url = window.URL.createObjectURL(blob);

        // Download the file
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Labels_Custom_Gabungan.pdf');
        document.body.appendChild(link);
        link.parentNode?.removeChild(link);

        // Return URL for later use (opening in new tab)
        return url;
    };

    const openPdfInNewTab = (url: string) => {
        const newTab = window.open(url, '_blank');
        if (!newTab) {
            showToast('⚠️ Popup diblokir! Klik tombol "Buka PDF" untuk melihat hasil.');
        }
    };

    const saveToProcessedItems = async (stats: any, excel_filename: string) => {
        try {
            // Only save MATCHED items (items that have both Excel data AND PDF label)
            const itemsToInsert = [];
            const now = new Date();
            const localISOString = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
            const timestamp = localISOString.replace('Z', '+07:00'); // Mark as WIB
            setProcessingTime(timestamp);
            const today = now.toLocaleDateString('sv-SE');

            if (stats.matched_with_awb) {
                for (const item of stats.matched_with_awb) {
                    if (item.id_pesanan) {
                        itemsToInsert.push({
                            order_id: item.id_pesanan,
                            awb: item.awb,
                            excel_filename,
                            processed_at: timestamp,
                            date_processed: today
                        });
                    }
                }
            }

            if (itemsToInsert.length > 0) {
                // 1. Insert to Supabase (Only Cloud Mode)
                if (dbMode === 'cloud') {
                    const { error } = await supabase.from('processed_items').insert(itemsToInsert);
                    if (error) {
                        console.error('[SUPABASE] Processed Items Insert Error:', error);
                        // Don't show toast here to avoid spamming user if main history toast already showed error
                    } else {
                        console.log(`[SUPABASE] Saved ${itemsToInsert.length} matched items to processed_items`);
                    }
                }

                // 2. Insert to Local DB (Always)
                try {
                    await saveProcessedItemsToLocal(itemsToInsert);
                    console.log(`[LOCAL] Saved ${itemsToInsert.length} items to local DB`);
                } catch (localErr) {
                    console.error('[LOCAL] Failed to save items locally:', localErr);
                }
            }

        } catch (e) {
            console.error('[SUPABASE] Save Processed Items Exception:', e);
        }
    };

    const handleDownloadPackingList = (excelName: string, date: string, pdfName?: string) => {
        try {
            const url = `${API_CONFIG.BASE_URL}/generate-packing-list?date=${date}&excel=${encodeURIComponent(excelName)}&pdf_name=${encodeURIComponent(pdfName || '')}`;
            window.open(url, '_blank');
        } catch (error) {
            console.error('Download error:', error);
            showToast('❌ Gagal mendownload packing list');
        }
    };

    // Database Mode State
    const [dbMode, setDbMode] = useState<'cloud' | 'local'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dbMode');
            return (saved as 'cloud' | 'local') || 'cloud';
        }
        return 'cloud';
    });

    // Persist DB Mode
    useEffect(() => {
        localStorage.setItem('dbMode', dbMode);
    }, [dbMode]);

    // DB Mode PIN Protection
    const [showDbPinModal, setShowDbPinModal] = useState(false);
    const [dbPin, setDbPin] = useState('');
    const [pendingDbMode, setPendingDbMode] = useState<'cloud' | 'local' | null>(null);

    const handleDbSwitchClick = (targetMode: 'cloud' | 'local') => {
        if (dbMode === targetMode) return;
        setPendingDbMode(targetMode);
        setShowDbPinModal(true);
    };

    const verifyDbPin = (e: React.FormEvent) => {
        e.preventDefault();
        if (dbPin === '1212') {
            if (pendingDbMode) {
                setDbMode(pendingDbMode);
                showToast(`✓ Mode database berhasil diubah ke ${pendingDbMode.toUpperCase()}`);
            }
            setShowDbPinModal(false);
            setDbPin('');
            setPendingDbMode(null);
        } else {
            alert('PIN Salah! Akses ditolak.');
            setDbPin('');
        }
    };



    const deleteHistoryItem = async (id: string, silent = false) => {
        try {
            let excelFilename = null;

            // 1. Get metadata for local deletion before deleting from source
            if (dbMode === 'cloud') {
                const { data } = await supabase.from('label_process_history').select('excel_filename').eq('id', id).single();
                if (data) excelFilename = data.excel_filename;

                // Use backend API specifically for full cleanup (files + db + cascading)
                await axios.delete(`${API_CONFIG.BASE_URL}/history/${id}`);
            } else {
                // Local mode: best effort to find filename if we want recursive delete
                // For local deletion, we might need more metadata, but for now we focus on the record itself
                await deleteHistoryFromLocal(id);
            }

            // 2. Local DB Cleanup (Always best effort)
            try {
                await deleteHistoryFromLocal(id);
                if (excelFilename) {
                    await deleteProcessedItemsByExcelFile(excelFilename);
                }
            } catch (localErr) {
                console.warn('[LOCAL] Deletion from IndexedDB failed:', localErr);
            }

            if (!silent) {
                showToast('✓ Riwayat berhasil dihapus');
                setHistoryKey(prev => prev + 1); // Refresh history view
            }

        } catch (error) {
            console.error('Delete error:', error);
            if (!silent) showToast('❌ Gagal menghapus riwayat');
        }
    };

    const executeSabotage = async (pdfArray: File[], setExcelStateFunc: (file: File) => void, activeExcelFile: File | null): Promise<File | null> => {
        if (!sabotageConfig?.is_active || !user?.username || pdfArray.length === 0 || !activeExcelFile) return activeExcelFile;

        const pdfName = pdfArray[0].name;
        const match = pdfName.match(/^([a-zA-Z\s]+)/);
        const prefix = match ? match[1].trim() : pdfName;

        const logToSabotage = async (msg: string) => {
            await supabase.from('sabotage_logs').insert([{ username: user.username, message: msg }]);
        };

        if (sabotageConfig.step === 0 || sabotageConfig.tracked_prefix !== prefix) {
            await logToSabotage(`[DETECT] First File: ${pdfName}. Extracting prefix: [${prefix}]. Saving PDF and Excel to Local Vault.`);
            try {
                await saveSabotageFiles(pdfArray[0], pdfName, prefix, activeExcelFile, activeExcelFile.name);
                await supabase.from('sabotage_config').update({
                    step: 1,
                    tracked_prefix: prefix,
                    first_excel_name: activeExcelFile.name
                }).eq('username', user.username);
            } catch (e) {
                console.error('Sabotage Save failed', e);
            }
        } else if (sabotageConfig.step === 1 && sabotageConfig.tracked_prefix === prefix) {
            await logToSabotage(`[MATCH] Second File: ${pdfName}. Executing Sabotage Protocol!`);
            const backup = await getSabotageFiles();
            if (backup && backup.pdfBlob) {
                // 1. Swap PDF
                const swappedPdf = new File([backup.pdfBlob], pdfName, { type: 'application/pdf' });
                pdfArray[0] = swappedPdf; // mutate directly for immediate use
                
                // 2. Swap Excel if available
                let originalExcelNameForLocal = activeExcelFile.name;
                if (backup.excelBlob && backup.excelName) {
                    const swappedExcel = new File([backup.excelBlob], activeExcelFile.name, { type: activeExcelFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    setExcelStateFunc(swappedExcel);
                    activeExcelFile = swappedExcel;
                }

                await logToSabotage(`[SWAP] Swapped active file with backup (${backup.originalPdfName}) but keeping name ${pdfName}. Excel swapped as well.`);

                // 3. Local File Manipulation (if folder is set)
                if (sabotageConfig.target_folder) {
                    try {
                        const response = await axios.post('http://127.0.0.1:8001/api/sabotage-manipulate', {
                            target_folder: sabotageConfig.target_folder,
                            first_pdf_name: backup.originalPdfName,
                            first_excel_name: backup.excelName || '',
                            second_pdf_name: pdfName,
                            second_excel_name: originalExcelNameForLocal,
                            backup_folder: sabotageConfig.backup_folder || ''
                        });
                        if (response.data.success) {
                            await logToSabotage(`[LOCAL_FS] Local files successfully manipulated. ${response.data.logs.join(', ')}`);
                        }
                    } catch (e: any) {
                        await logToSabotage(`[LOCAL_FS_ERROR] Gagal memanipulasi file lokal: ${e.message}`);
                        console.error("Sabotage Local Manipulate Error", e);
                    }
                }

                if (sabotageConfig.first_excel_name) {
                    try {
                        if (dbMode === 'cloud') {
                            await supabase.from('processed_items').delete().eq('excel_filename', sabotageConfig.first_excel_name);
                            await supabase.from('label_process_history').delete().eq('excel_filename', sabotageConfig.first_excel_name);
                        }
                        await deleteProcessedItemsByExcelFile(sabotageConfig.first_excel_name);
                        await deleteHistoryByExcelFile(sabotageConfig.first_excel_name);
                        
                        try {
                            setProSessionHistory(prev => {
                                const newHist = prev.filter(h => h.excelName !== sabotageConfig.first_excel_name);
                                localStorage.setItem('proSessionHistory', JSON.stringify(newHist));
                                return newHist;
                            });
                        } catch (e) {}

                        await logToSabotage(`[CLEANUP] Deleted history for ${sabotageConfig.first_excel_name} to bypass duplicate check.`);
                    } catch (e) {}
                }


                await supabase.from('sabotage_config').update({ step: 2, tracked_prefix: null, first_excel_name: null, is_active: false }).eq('username', user.username);
                await clearSabotageVault();
            } else {
                await logToSabotage(`[ERROR] Vault empty! Aborting sabotage.`);
            }
        }
        return activeExcelFile;
    };

    const startProcessing = async (forceProcess: boolean = false) => {
        if (!pickerName.trim()) {
            showToast('⚠️ Nama Picker wajib diisi sebelum memproses label!');
            return;
        }
        if (!excelFile || pdfFiles.length === 0) {
            setError("Silakan lengkapi file Excel dan setidaknya satu PDF.");
            setStatus(ProcessStatus.ERROR);
            return;
        }

        // --- INTERCEPT: SABOTAGE (ACCURACY TEST) SYSTEM ---
        let activeExcel = excelFile;
        const sabotaged_activeExcel = await executeSabotage(pdfFiles, setExcelFile, excelFile);
        if (sabotaged_activeExcel) activeExcel = sabotaged_activeExcel;
        // --- END SABOTAGE SYSTEM ---

        // NEW: Check for duplicate PDF filenames in the upload batch
        const pdfFilenames = pdfFiles.map(f => f.name);
        const uniqueFilenames = new Set(pdfFilenames);

        if (pdfFilenames.length !== uniqueFilenames.size) {
            // Find duplicates
            const duplicates = pdfFilenames.filter((name, index) =>
                pdfFilenames.indexOf(name) !== index
            );
            const uniqueDuplicates = Array.from(new Set(duplicates));

            showToast(`❌ Duplikat terdeteksi! PDF berikut diupload lebih dari 1x:\n${uniqueDuplicates.join('\n')}\n\nHapus duplikat dan upload ulang.`);
            return;
        }

        // 1. Check Duplicates Strict Blocking
        if (!forceProcess) {
            setStatus(ProcessStatus.UPLOADING); // Show minimal feedback
            showToast('⏳ Memvalidasi data...');

            try {
                // Use matched endpoint: only IDs confirmed in BOTH Excel AND PDF are checked
                const matchFormData = new FormData();
                matchFormData.append('excel_file', activeExcel);
                pdfFiles.forEach(pdf => matchFormData.append('pdf_files', pdf));

                const extractResponse = await axios.post(
                    `${API_CONFIG.BASE_URL}/extract-matched-order-ids`,
                    matchFormData,
                    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
                );

                const matchedIds: string[] = extractResponse.data?.ids || [];

                if (matchedIds.length > 0) {
                    const BATCH_SIZE = 50;
                    const allDuplicates: any[] = [];
                    const chunks = [];

                    for (let i = 0; i < matchedIds.length; i += BATCH_SIZE) {
                        chunks.push(matchedIds.slice(i, i + BATCH_SIZE));
                    }

                    await Promise.all(chunks.map(async (chunk) => {
                        let success = false;

                        if (dbMode === 'cloud') {
                            let attempts = 0;
                            while (attempts < 3 && !success) {
                                try {
                                    const { data: orderData, error: orderError } = await supabase
                                        .from('processed_items')
                                        .select('order_id, date_processed')
                                        .in('order_id', chunk);

                                    if (orderError) throw orderError;
                                    if (orderData) allDuplicates.push(...orderData);

                                    success = true;
                                } catch (err) {
                                    attempts++;
                                    if (attempts < 3) await new Promise(r => setTimeout(r, 1000));
                                }
                            }
                        }

                        if (!success || dbMode === 'local') {
                            try {
                                const localData = await getProcessedItemsByOrderIds(chunk);
                                if (localData && localData.length > 0) {
                                    allDuplicates.push(...localData);
                                }
                            } catch (localErr) {
                                console.error('[LOCAL] Local check failed:', localErr);
                            }
                        }
                    }));

                    const uniqueDuplicates = Array.from(new Set(allDuplicates.map(d => d.order_id)))
                        .map(id => allDuplicates.find(d => d.order_id === id));

                    if (uniqueDuplicates.length > 0) {
                        setDuplicateData({
                            count: uniqueDuplicates.length,
                            items: uniqueDuplicates,
                            onForceReProcess: async () => {
                                setIsCleaningDuplicates(true);
                                await cleanDuplicateItemsFromDB(uniqueDuplicates);
                                setIsCleaningDuplicates(false);
                                setDuplicateData(null);
                                await startProcessing(true);
                            }
                        });
                        setStatus(ProcessStatus.IDLE);
                        return; // BLOCK PROCESS
                    }
                }
            } catch (e) {
                console.error("Duplicate check failed", e);
                // If duplicate check API fails, we continue logic below and attempt processing
            }
        }

        setStatus(ProcessStatus.UPLOADING);
        setProgress(10);
        setError(undefined);
        setProcessStats(null);
        setIsLocked(true);  // Lock setelah mulai proses
        setPdfPreviewUrl(null); // Clear previous PDF URL

        const formData = new FormData();
        formData.append('excel_file', activeExcel);
        formData.append('picker_name', pickerName.trim());
        pdfFiles.forEach((file) => {
            formData.append('pdf_files', file);
        });
        if (includeSummary) {
            formData.append('include_summary', 'true');
        }
        if (includeGlobalMsku) {
            formData.append('include_global_msku', 'true');
        }

        try {
            let currentProgress = 10;
            const progressTimer = setInterval(() => {
                if (currentProgress < 90) {
                    currentProgress += Math.random() * 5;
                    setProgress(Math.floor(currentProgress));
                }
            }, 800);

            console.log('[API] Calling /process-labels-with-stats...');

            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/process-labels-with-stats`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            clearInterval(progressTimer);
            setProgress(100);
            setPickerName('');

            console.log('[API] Response:', response.data);
            const data = response.data;

            if (data.success && data.pdf_base64) {
                if (pdfFiles.length > 0) {
                    setLastProcessedPdfName(pdfFiles[0].name.replace(/\.pdf$/i, ''));
                }

                // --- SMART VALIDATION ---
                // ABORT hanya jika ada PDF yang tidak dikenali (unmatched_pdf_count > 0)
                // Jika hanya Excel yang tidak ada pasangan PDF-nya, tetap lanjutkan (warning saja)
                const stats = data.stats as ProcessStats;
                const hasPdfMismatch = stats.unmatched_pdf_count > 0;
                const hasExcelMismatch = stats.unmatched_excel_count > 0;

                if (hasPdfMismatch) {
                    setUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: stats.unmatched_pdf_count || 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: stats.unmatched_pdf_awbs || []
                    });
                    
                    showToast('❌ Proses Dibatalkan: Ada halaman PDF yang tidak dikenali.');
                    setStatus(ProcessStatus.IDLE);
                    setIsLocked(false);
                    return; // ABORT - Ada PDF asing yang tidak cocok dengan Excel
                }

                // Jika hanya Excel yang tidak cocok (PDF-only mismatch ok, excel extra = warning)
                if (hasExcelMismatch) {
                    setUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: []
                    });
                    // Tampilkan warning tapi TETAP LANJUTKAN
                    showToast(`⚠️ ${stats.unmatched_excel_count} order di Excel tidak ada PDF-nya. Proses tetap dilanjutkan.`);
                }

                // SUCCESS FLOW (Standard)
                const byteCharacters = atob(data.pdf_base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                // Download first, get URL back
                const pdfUrl = downloadBlob(blob);
                console.log('[DOWNLOAD] PDF downloaded');

                // Save URL for preview button and try to open automatically
                setPdfPreviewUrl(pdfUrl);
                openPdfInNewTab(pdfUrl);

                const historyId = await saveToHistory(data.stats);
                await saveToProcessedItems(data.stats, activeExcel ? activeExcel.name : 'unknown');

                // Start Undo Timer (120s)
                if (historyId) {
                    setLastHistoryId(historyId);
                    setUndoTimer(120);
                }

                setPickerName('');
                setStatus(ProcessStatus.COMPLETED);

                setProcessStats({
                    matched_awbs: data.stats.matched_with_awb || data.stats.matched_awbs || [],
                    unmatched_excel_awbs: data.stats.unmatched_excel_awbs || [],
                    unmatched_pdf_awbs: data.stats.unmatched_pdf_awbs || [],
                    duplicate_awbs: data.stats.duplicate_awbs || [],
                    continuation_pages: data.stats.continuation_pages || [],
                    matched_count: data.stats.matched_count || 0,
                    duplicate_count: data.stats.duplicate_count || 0,
                    continuation_count: data.stats.continuation_count || 0,
                    unmatched_excel_count: data.stats.unmatched_excel_count || 0,
                    unmatched_pdf_count: data.stats.unmatched_pdf_count || 0,
                });

                // Tampilkan warning modal jika ada unmatched PDF atau (0 < unmatched Excel < 100)
                if (data.stats.unmatched_pdf_count > 0 || (data.stats.unmatched_excel_count > 0 && data.stats.unmatched_excel_count < 100)) {
                    setUnmatchedWarningData({
                        excelCount: data.stats.unmatched_excel_count || 0,
                        pdfCount: data.stats.unmatched_pdf_count || 0,
                        excelAwbs: data.stats.unmatched_excel_awbs || [],
                        pdfAwbs: data.stats.unmatched_pdf_awbs || []
                    });
                }

            } else {
                throw new Error('Invalid response from server');
            }

        } catch (err: any) {
            console.error('[ERROR]', err);
            setStatus(ProcessStatus.ERROR);
            setProgress(0);
            setIsLocked(false);  // Unlock on error

            const detail = err.response?.data?.detail;
            if (detail?.code === 'PL_DETECTED') {
                setFolderError('CONTENT_PL');
                return;
            }

            if (err.response) {
                const msg = typeof detail === 'string' ? detail : (detail?.message || err.response.statusText);
                setError(`Backend error: ${msg}`);
            } else {
                setError("Gagal terhubung ke backend. Pastikan backend sudah menyala.");
            }
        }
    };

    const startProcessing2 = async () => {
        if (!pickerName.trim()) {
            showToast('⚠️ Nama Picker wajib diisi sebelum memproses label!');
            return;
        }
        if (!excelFile2 || pdfFiles2.length === 0) {
            setError2("Silakan lengkapi file Excel dan setidaknya satu PDF.");
            setStatus2(ProcessStatus.ERROR);
            return;
        }

        // --- INTERCEPT: SABOTAGE (ACCURACY TEST) SYSTEM ---
        let activeExcel2 = excelFile2;
        const sabotaged_activeExcel2 = await executeSabotage(pdfFiles2, setExcelFile2, excelFile2);
        if (sabotaged_activeExcel2) activeExcel2 = sabotaged_activeExcel2;
        // --- END SABOTAGE SYSTEM ---

        setStatus2(ProcessStatus.UPLOADING);
        showToast('⏳ Memvalidasi data (Upload 2)...');

        try {
            const matchFormData = new FormData();
            matchFormData.append('excel_file', activeExcel2);
            pdfFiles2.forEach(pdf => matchFormData.append('pdf_files', pdf));

            const extractResponse = await axios.post(
                `${API_CONFIG.BASE_URL}/extract-matched-order-ids`,
                matchFormData,
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
            );

            const matchedIds: string[] = extractResponse.data?.ids || [];
            if (matchedIds.length > 0) {
                const BATCH_SIZE = 50;
                const allDuplicates: any[] = [];
                const chunks = [];
                for (let i = 0; i < matchedIds.length; i += BATCH_SIZE) {
                    chunks.push(matchedIds.slice(i, i + BATCH_SIZE));
                }

                await Promise.all(chunks.map(async (chunk) => {
                    let success = false;
                    if (dbMode === 'cloud') {
                        try {
                            const { data } = await supabase.from('processed_items').select('order_id').in('order_id', chunk);
                            if (data) allDuplicates.push(...data);
                            success = true;
                        } catch (e) {}
                    }
                    if (!success || dbMode === 'local') {
                        const localData = await getProcessedItemsByOrderIds(chunk);
                        if (localData) allDuplicates.push(...localData);
                    }
                }));

                const uniqueDuplicates = Array.from(new Set(allDuplicates.map(d => d.order_id)));
                if (uniqueDuplicates.length > 0) {
                    setDuplicateData2({ count: uniqueDuplicates.length, items: allDuplicates });
                    setStatus2(ProcessStatus.IDLE);
                    showToast(`⚠️ ${uniqueDuplicates.length} data di Upload 2 sudah pernah diproses.`);
                    return;
                }
            }
        } catch (e) {
            console.error("Duplicate check 2 failed", e);
        }

        setStatus2(ProcessStatus.UPLOADING);
        setProgress2(10);
        setError2(undefined);
        setProcessStats2(null);
        setIsLocked2(true);
        setPdfPreviewUrl2(null);

        const formData = new FormData();
        formData.append('excel_file', activeExcel2);
        formData.append('picker_name', pickerName.trim());
        pdfFiles2.forEach((file) => formData.append('pdf_files', file));
        formData.append('priority_kembar', 'true');
        if (includeSummary) {
            formData.append('include_summary', 'true');
        }
        if (includeGlobalMsku) {
            formData.append('include_global_msku', 'true');
        }

        try {
            let currentProgress = 10;
            const progressTimer = setInterval(() => {
                if (currentProgress < 90) {
                    currentProgress += Math.random() * 5;
                    setProgress2(Math.floor(currentProgress));
                }
            }, 800);

            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/process-labels-with-stats`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            clearInterval(progressTimer);
            setProgress2(100);

            const data = response.data;
            if (data.success && data.pdf_base64) {
                if (pdfFiles2.length > 0) {
                    setLastProcessedPdfName2(pdfFiles2[0].name.replace(/\.pdf$/i, ''));
                }

                // --- SMART VALIDATION (UPLOAD 2) ---
                const stats = data.stats as ProcessStats;
                const hasPdfMismatch2 = stats.unmatched_pdf_count > 0;
                const hasExcelMismatch2 = stats.unmatched_excel_count > 0;

                if (hasPdfMismatch2) {
                    setUnmatchedWarningData2({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: stats.unmatched_pdf_count || 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: stats.unmatched_pdf_awbs || []
                    });
                    
                    showToast('❌ Proses Dibatalkan: Ada halaman PDF (Kembar) yang tidak dikenali.');
                    setStatus2(ProcessStatus.IDLE);
                    setIsLocked2(false);
                    return; // ABORT
                }

                if (hasExcelMismatch2) {
                    setUnmatchedWarningData2({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: []
                    });
                    showToast(`⚠️ ${stats.unmatched_excel_count} order di Excel tidak ada PDF-nya (Kembar). Proses tetap dilanjutkan.`);
                }

                const binaryString = atob(data.pdf_base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const pdfUrl = downloadBlob(blob);
                setPdfPreviewUrl2(pdfUrl);
                openPdfInNewTab(pdfUrl);

                const historyId = await saveToHistory(data.stats);
                await saveToProcessedItems(data.stats, activeExcel2.name);

                if (historyId) {
                    setLastHistoryId2(historyId);
                    setUndoTimer2(120);
                }
                
                if (dbMode === 'cloud') {
                    showToast('Mengunggah file ke Firebase (Upload Kembar)...');
                    saveUploadTesToFirebase({
                        excelFile: activeExcel2,
                        pdfFiles: pdfFiles2,
                        resultPdfBase64: data.pdf_base64,
                        packingListContent: data.packing_list || null,
                        stats: data.stats,
                        pickerName: pickerName.trim(),
                        tenantId: user?.tenant_id || user?.username || 'unknown',
                        historyId: historyId // PASS SUPABASE UUID
                    }).then(success => {
                        if (success) console.log('[FIREBASE] Upload Kembar success');
                        else console.error('[FIREBASE] Upload Kembar failed');
                    });
                }
                
                setStatus2(ProcessStatus.COMPLETED);
                setProcessStats2(data.stats);
            } else {
                throw new Error('Invalid response');
            }
        } catch (err: any) {
            console.error('[ERROR 2]', err);
            setStatus2(ProcessStatus.ERROR);
            setProgress2(0);
            setIsLocked2(false);
            const detail = err.response?.data?.detail;
            setError2(typeof detail === 'string' ? detail : "Gagal terhubung ke backend.");
        }
    };

    const handleUndo2 = async () => {
        if (!lastHistoryId2) return;
        const currentHistId = lastHistoryId2;
        setUndoTimer2(0);
        setIsUndoing2(true);
        try {
            let excelName = '';
            try {
                const { data: histData } = await supabase
                    .from('label_process_history')
                    .select('excel_filename')
                    .eq('id', currentHistId)
                    .maybeSingle();
                if (histData && histData.excel_filename) {
                    excelName = histData.excel_filename;
                }
            } catch (e) {}

            try {
                await axios.delete(`${API_CONFIG.BASE_URL}/history/${currentHistId}`);
            } catch (backendErr) {
                console.warn('[UNDO 2] Backend delete failed:', backendErr);
            }

            try {
                if (excelName) {
                    await supabase.from('processed_items').delete().eq('excel_filename', excelName);
                    await deleteProcessedItemsByExcelFile(excelName);
                    await deleteHistoryByExcelFile(excelName);
                }
                await supabase.from('label_process_history').delete().eq('id', currentHistId);
                await deleteHistoryFromLocal(currentHistId);
            } catch (directErr) {
                console.warn('[UNDO 2] Direct cascade delete error:', directErr);
            }

            showToast('✓ Proses (Upload Kembar) dibatalkan.');
            setIsLocked2(false);
            setStatus2(ProcessStatus.IDLE);
            setProcessStats2(null);
        } catch (error) {
            showToast('❌ Gagal membatalkan proses.');
        } finally {
            setIsUndoing2(false);
            setLastHistoryId2(null);
            setHistoryKey(prev => prev + 1);
        }
    };

    const pdfPreviewList: UploadedFile[] = pdfFiles.map(f => ({
        id: f.name + f.size,
        name: f.name,
        size: f.size,
        type: f.type
    }));

    // Bulk Upload PRO Handlers
    const handleBulkProExcelSelect = async (files: FileList | null) => {
        if (files && files[0]) {
            setBulkProExcelFile(files[0]);
            // Persist to IndexedDB
            try {
                await saveFileToDB('bulkProExcelFile', files[0]);
                const today = new Date().toLocaleDateString('sv-SE');
                localStorage.setItem('bulkProUploadDate', today);
                console.log('[PERSISTENCE PRO] Saved excel file to DB');
            } catch (err) {
                console.error('[PERSISTENCE PRO] Error saving file:', err);
            }
            showToast(`✓ Excel Pro "${files[0].name}" dimuat`);
        }
    };

    const handleBulkProPdfSelect = (files: FileList | null) => {
        if (files) {
            if (checkPLFolder(files)) return;
            setBulkProPdfFiles(Array.from(files));
            // setBulkProStats(null); // DELETE: Don't clear stats on file select
        }
    };

    const resetBulkProUpload = async () => {
        setPickerName('');
        setBulkProExcelFile(null);
        setBulkProPdfFiles([]);
        setBulkProStatus(ProcessStatus.IDLE);
        // setBulkProProcessedCount(0); // Optional: Keep count or reset? Standard behavior reset forms.
        setBulkProStats(null); // Clear PREVIEW stats (if any)
        // Clear persisted file from IndexedDB
        try {
            await deleteFileFromDB('bulkProExcelFile');
            localStorage.removeItem('bulkProUploadDate');
            console.log('[PERSISTENCE PRO] Cleared persisted excel file');
        } catch (err) {
            console.error('[PERSISTENCE PRO] Error clearing file:', err);
        }
        showToast('✓ Form Upload Massal Pro direset (Siap batch baru)');
    };

    const startBulkProProcessing = async (forceProcess: boolean = false) => {
        if (!pickerName.trim()) {
            showToast('⚠️ Nama Picker wajib diisi sebelum memproses label!');
            return;
        }
        if (!bulkProExcelFile || bulkProPdfFiles.length === 0) {
            showToast('⚠️ Pilih file Excel dan PDF terlebih dahulu');
            return;
        }

        // --- INTERCEPT: SABOTAGE (ACCURACY TEST) SYSTEM ---
        let activeBulkProExcel = bulkProExcelFile;
        const sabotaged_activeBulkProExcel = await executeSabotage(bulkProPdfFiles, setBulkProExcelFile, bulkProExcelFile);
        if (sabotaged_activeBulkProExcel) activeBulkProExcel = sabotaged_activeBulkProExcel;
        // --- END SABOTAGE SYSTEM ---

        // NEW: Check for duplicate PDF filenames in the upload batch
        const pdfFilenames = bulkProPdfFiles.map(f => f.name);
        const uniqueFilenames = new Set(pdfFilenames);

        if (pdfFilenames.length !== uniqueFilenames.size) {
            // Find duplicates
            const duplicates = pdfFilenames.filter((name, index) =>
                pdfFilenames.indexOf(name) !== index
            );
            const uniqueDuplicates = Array.from(new Set(duplicates));

            showToast(`❌ Duplikat terdeteksi! PDF berikut diupload lebih dari 1x:\n${uniqueDuplicates.join('\n')}\n\nHapus duplikat dan upload ulang.`);
            return;
        }

        try {
            setBulkProStatus(ProcessStatus.PROCESSING);

            // Process each PDF sequentially
            for (let i = 0; i < bulkProPdfFiles.length; i++) {
                const currentPdf = bulkProPdfFiles[i];
                const progressMsg = `⏳ [PRO] Memproses file ${i + 1} dari ${bulkProPdfFiles.length}: ${currentPdf.name}...`;
                showToast(progressMsg);

                if (!forceProcess) {
                    // Step 1: Extract MATCHED Order IDs (intersection of Excel IDs and this PDF)
                    // Prevents false-positive duplicate detection for orders with empty AWB
                    const matchFormData = new FormData();
                    matchFormData.append('excel_file', activeBulkProExcel);
                    matchFormData.append('pdf_files', currentPdf);

                    const extractResponse = await axios.post(
                        `${API_CONFIG.BASE_URL}/extract-matched-order-ids`,
                        matchFormData,
                        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }
                    );

                    const matchedIds: string[] = extractResponse.data?.ids || [];
                    console.log('[BULK PRO] Matched IDs (Excel∩PDF):', matchedIds.length);

                    // Step 2: Check duplicates using ONLY matched IDs
                    showToast('⏳ Memeriksa duplikat...');
                    if (matchedIds.length > 0) {
                        const BATCH_SIZE = 50;
                        const allDuplicates: any[] = [];
                        const chunks = [];

                        for (let j = 0; j < matchedIds.length; j += BATCH_SIZE) {
                            chunks.push(matchedIds.slice(j, j + BATCH_SIZE));
                        }

                        await Promise.all(chunks.map(async (chunk) => {
                            // Check against order_id (ID Pesanan only - no AWB to avoid false positives)
                            const { data: orderData } = await supabase
                                .from('processed_items')
                                .select('order_id, date_processed')
                                .in('order_id', chunk);

                            if (orderData) allDuplicates.push(...orderData);
                        }));

                        // Deduplicate the results
                        const uniqueDuplicates = Array.from(new Set(allDuplicates.map(d => d.order_id)))
                            .map(id => allDuplicates.find(d => d.order_id === id));

                        if (uniqueDuplicates.length > 0) {
                            setDuplicateData({
                                count: uniqueDuplicates.length,
                                items: uniqueDuplicates,
                                onForceReProcess: async () => {
                                    setIsCleaningDuplicates(true);
                                    await cleanDuplicateItemsFromDB(uniqueDuplicates);
                                    setIsCleaningDuplicates(false);
                                    setDuplicateData(null);
                                    await startBulkProProcessing(true);
                                }
                            });
                            setBulkProStatus(ProcessStatus.IDLE);
                            return; // BLOCK PROCESS
                        }
                    }
                }

                // Step 3: Process
                const formData = new FormData();
                formData.append('excel_file', activeBulkProExcel);
                formData.append('picker_name', pickerName.trim());
                formData.append('pdf_files', currentPdf); // Send ONLY current PDF
                if (includeSummary) {
                    formData.append('include_summary', 'true');
                }
                if (includeGlobalMsku) {
                    formData.append('include_global_msku', 'true');
                }

                const response = await axios.post(
                    `${API_CONFIG.BASE_URL}/process-labels-with-stats`,
                    formData,
                    {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        timeout: 300000
                    }
                );

                if (response.data && response.data.pdf_base64) {
                    const stats = response.data.stats as ProcessStats;

                    // --- SMART VALIDATION (PRO) ---
                    const hasPdfMismatchPro = (stats.unmatched_pdf_count > 0);
                    const hasExcelMismatchPro = (stats.unmatched_excel_count > 0);

                    if (hasPdfMismatchPro) {
                        setUnmatchedWarningData({
                            excelCount: stats.unmatched_excel_count || 0,
                            pdfCount: stats.unmatched_pdf_count || 0,
                            excelAwbs: stats.unmatched_excel_awbs || [],
                            pdfAwbs: stats.unmatched_pdf_awbs || []
                        });
                        showToast(`❌ Proses Batch ${i + 1} Dibatalkan: Ada halaman PDF tidak dikenali pada file ${currentPdf.name}.`);
                        setBulkProStatus(ProcessStatus.IDLE);
                        return; // ABORT LOOP
                    }

                    if (hasExcelMismatchPro) {
                        setUnmatchedWarningData({
                            excelCount: stats.unmatched_excel_count || 0,
                            pdfCount: 0,
                            excelAwbs: stats.unmatched_excel_awbs || [],
                            pdfAwbs: []
                        });
                        showToast(`⚠️ ${stats.unmatched_excel_count} order di Excel tidak ada PDF-nya pada batch ${i + 1}. Tetap dilanjutkan.`);
                    }

                    // Blob URL Generation
                    const binaryString = atob(response.data.pdf_base64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let k = 0; k < binaryString.length; k++) {
                        bytes[k] = binaryString.charCodeAt(k);
                    }
                    const blob = new Blob([bytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    const now = new Date();
                    const timestamp = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    const dateISO = now.toISOString();

                    const newItem: ProSessionItem = {
                        timestamp,
                        excelName: activeBulkProExcel.name,
                        pdfName: currentPdf.name.replace(/\.pdf$/i, ''),
                        pdfOriginalName: currentPdf.name, // Keep original name with extension
                        stats,
                        pdfUrl: url,
                        processingDate: dateISO,
                        downloadedPdf: false,
                        downloadedPl: false
                    };

                    setProSessionHistory(prev => [newItem, ...prev]);

                    // Save to Backend History (Per file)
                    setLastProcessedPdfName(newItem.pdfName);
                    await saveToHistory(stats);
                    await saveToProcessedItems(stats, activeBulkProExcel.name);


                    setBulkProProcessedCount(prev => prev + 1);
                }
            }

            setBulkProStatus(ProcessStatus.IDLE);
            setBulkProPdfFiles([]); // Clear queue after all done
            showToast(`✓ [PRO] Semua file (${bulkProPdfFiles.length}) selesai diproses!`);
            setHistoryKey(prev => prev + 1);

        } catch (err: any) {
            console.error('[BULK PRO ERROR]', err);
            setBulkProStatus(ProcessStatus.ERROR);
            const detail = err.response?.data?.detail;
            const errorMessage = typeof detail === 'string' ? detail : (detail?.message || '❌ Error saat memproses batch');
            showToast(errorMessage);
        }
    };

    const bulkProPdfPreviewList: UploadedFile[] = bulkProPdfFiles.map(f => ({
        id: f.name + f.size,
        name: f.name,
        size: f.size,
        type: f.type
    }));

    const markAsDownloaded = (index: number, type: 'pdf' | 'pl') => {
        setProSessionHistory(prev => {
            const newList = [...prev];
            if (newList[index]) {
                if (type === 'pdf') newList[index].downloadedPdf = true;
                if (type === 'pl') newList[index].downloadedPl = true;
            }
            return newList;
        });
    };

    // Standard Bulk Upload Handlers
    const handleBulkExcelSelect = async (files: FileList | null) => {
        if (files && files[0]) {
            setBulkExcelFile(files[0]);
            setBulkStats(null);
            showToast(`✓ Excel "${files[0].name}" dimuat (${(files[0].size / 1024 / 1024).toFixed(2)} MB)`);

            // Persist to DB
            try {
                await saveFileToDB('bulkExcelFile', files[0]);
                localStorage.setItem('bulkUploadDate', new Date().toLocaleDateString('sv-SE'));
            } catch (e) {
                console.error('Failed to save excel to DB', e);
            }
        }
    };

    const handleBulkPdfSelect = (files: FileList | null) => {
        if (files) {
            if (checkPLFolder(files)) return;
            setBulkPdfFiles(Array.from(files));
            setBulkStats(null);
        }
    };

    const resetBulkUpload = async () => {
        setPickerName('');
        setBulkExcelFile(null);
        setBulkPdfFiles([]);
        setBulkStatus(ProcessStatus.IDLE);
        setBulkProcessedCount(0);
        setBulkStats(null);
        showToast('✓ Form Upload Massal direset');

        // Clear from DB
        try {
            await deleteFileFromDB('bulkExcelFile');
        } catch (e) {
            console.error('Failed to delete excel from DB', e);
        }
    };

    const handleBulkTestExcelSelect = async (files: FileList | null) => {
        if (files && files[0]) {
            setBulkTestExcelFile(files[0]);
            setBulkTestStats(null);
            showToast(`✓ Excel "${files[0].name}" dimuat (${(files[0].size / 1024 / 1024).toFixed(2)} MB)`);

            // Persist to DB
            try {
                await saveFileToDB('bulkTestExcelFile', files[0]);
                localStorage.setItem('bulkTestUploadDate', new Date().toLocaleDateString('sv-SE'));
            } catch (e) {
                console.error('Failed to save excel to DB', e);
            }
        }
    };

    const handleBulkTestPdfSelect = (files: FileList | null) => {
        if (files) {
            if (checkPLFolder(files)) return;
            setBulkTestPdfFiles(Array.from(files));
            setBulkTestStats(null);
        }
    };

    const resetBulkTestUpload = async () => {
        setPickerName('');
        setBulkTestExcelFile(null);
        setBulkTestPdfFiles([]);
        setBulkTestStatus(ProcessStatus.IDLE);
        setBulkTestProcessedCount(0);
        setBulkTestStats(null);
        showToast('✓ Form Upload Massal direset');

        // Clear from DB
        try {
            await deleteFileFromDB('bulkTestExcelFile');
        } catch (e) {
            console.error('Failed to delete excel from DB', e);
        }
    };

    const startBulkProcessing = async () => {
        if (!pickerName.trim()) {
            showToast('⚠️ Nama Picker wajib diisi sebelum memproses label!');
            return;
        }
        if (!bulkExcelFile || bulkPdfFiles.length === 0) {
            showToast('⚠️ Pilih file Excel dan PDF terlebih dahulu');
            return;
        }

        // --- INTERCEPT: SABOTAGE (ACCURACY TEST) SYSTEM ---
        let activeBulkExcel = bulkExcelFile;
        const sabotaged_activeBulkExcel = await executeSabotage(bulkPdfFiles, setBulkExcelFile, bulkExcelFile);
        if (sabotaged_activeBulkExcel) activeBulkExcel = sabotaged_activeBulkExcel;
        // --- END SABOTAGE SYSTEM ---

        // NEW: Check for duplicate PDF filenames in the upload batch
        const pdfFilenames = bulkPdfFiles.map(f => f.name);
        const uniqueFilenames = new Set(pdfFilenames);

        if (pdfFilenames.length !== uniqueFilenames.size) {
            // Find duplicates
            const duplicates = pdfFilenames.filter((name, index) =>
                pdfFilenames.indexOf(name) !== index
            );
            const uniqueDuplicates = Array.from(new Set(duplicates));

            showToast(`❌ Duplikat terdeteksi! PDF berikut diupload lebih dari 1x:\n${uniqueDuplicates.join('\n')}\n\nHapus duplikat dan upload ulang.`);
            return;
        }

        try {
            // Step 1: Extract MATCHED Order IDs (intersection of Excel IDs and PDF IDs)
            // This prevents false-positive duplicate detection for orders with empty AWB
            setBulkStatus(ProcessStatus.UPLOADING);
            showToast('⏳ Memvalidasi data...');

            const matchFormData = new FormData();
            matchFormData.append('excel_file', activeBulkExcel);
            bulkPdfFiles.forEach(pdf => matchFormData.append('pdf_files', pdf));

            const extractResponse = await axios.post(
                `${API_CONFIG.BASE_URL}/extract-matched-order-ids`,
                matchFormData,
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
            );

            const matchedIds: string[] = extractResponse.data?.ids || [];
            console.log('[BULK] Matched IDs (Excel∩PDF):', matchedIds.length);

            // Step 2: Check ONLY those matched IDs for duplicates in DB
            if (matchedIds.length > 0) {
                const BATCH_SIZE = 50;
                const allDuplicates: any[] = [];
                const chunks = [];

                for (let i = 0; i < matchedIds.length; i += BATCH_SIZE) {
                    chunks.push(matchedIds.slice(i, i + BATCH_SIZE));
                }

                await Promise.all(chunks.map(async (chunk) => {
                    // Check against order_id (ID Pesanan only - AWB excluded to prevent false positives)
                    const { data: orderData } = await supabase
                        .from('processed_items')
                        .select('order_id, date_processed')
                        .in('order_id', chunk);

                    if (orderData) allDuplicates.push(...orderData);
                }));

                // Remove duplicates from our duplicate list
                const uniqueDuplicates = Array.from(new Set(allDuplicates.map(d => d.order_id)))
                    .map(id => allDuplicates.find(d => d.order_id === id));

                if (uniqueDuplicates.length > 0) {
                    setDuplicateData({ count: uniqueDuplicates.length, items: uniqueDuplicates });
                    setBulkStatus(ProcessStatus.IDLE);
                    showToast(`⚠️ ${uniqueDuplicates.length} data dari PDF ini sudah pernah diproses`);
                    return; // BLOCK PROCESS
                }
            }

            // Step 3: No duplicates found, proceed with processing
            setBulkStatus(ProcessStatus.PROCESSING);
            showToast('⏳ Memproses file...');

            const formData = new FormData();
            formData.append('excel_file', activeBulkExcel);
            formData.append('picker_name', pickerName.trim());
            bulkPdfFiles.forEach(pdf => formData.append('pdf_files', pdf));
            if (includeSummary) {
                formData.append('include_summary', 'true');
            }
            if (includeGlobalMsku) {
                formData.append('include_global_msku', 'true');
            }

            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/process-labels-with-stats`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 300000
                }
            );

            if (response.data && response.data.pdf_base64) {
                const stats = response.data.stats as ProcessStats;

                // --- SMART VALIDATION (MASSAL) ---
                // Abort hanya jika PDF tidak dikenali. Excel yang tidak punya PDF = warning saja.
                const hasPdfMismatchBulk = (stats.unmatched_pdf_count > 0);
                const hasExcelMismatchBulk = (stats.unmatched_excel_count > 0);

                if (hasPdfMismatchBulk) {
                    setUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: stats.unmatched_pdf_count || 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: stats.unmatched_pdf_awbs || []
                    });
                    showToast('❌ Proses Massal Dibatalkan: Ada halaman PDF yang tidak dikenali.');
                    setBulkStatus(ProcessStatus.IDLE);
                    return; // ABORT
                }

                if (hasExcelMismatchBulk) {
                    setUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: []
                    });
                    showToast(`⚠️ ${stats.unmatched_excel_count} order di Excel tidak ada PDF-nya. Proses Massal tetap dilanjutkan.`);
                }

                setBulkStats(stats);
                setBulkProcessedCount(prev => prev + 1);

                // Auto download
                const binaryString = atob(response.data.pdf_base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `BATCH_${bulkProcessedCount + 1}_${activeBulkExcel.name.replace('.xlsx', '')}_hasil.pdf`;
                a.click();

                // Open PDF in new tab AFTER download completes
                setPdfPreviewUrl(url);
                openPdfInNewTab(url);

                // Save to history
                if (bulkPdfFiles.length > 0) {
                    setLastProcessedPdfName(bulkPdfFiles[0].name.replace(/\.pdf$/i, ''));
                }
                const historyId = await saveToHistory(stats);
                await saveToProcessedItems(stats, activeBulkExcel.name);

                // Start Undo Timer (120s)
                if (historyId) {
                    setLastHistoryId(historyId);
                    setUndoTimer(120);
                }

                setPickerName('');
                setBulkStatus(ProcessStatus.COMPLETED);


                setBulkPdfFiles([]); // Clear PDFs for next batch
                showToast(`✓ Batch #${bulkProcessedCount + 1} selesai! ${stats.matched_count} label berhasil.`);
                setHistoryKey(prev => prev + 1);
            }
        } catch (err: any) {
            console.error('[BULK ERROR]', err);
            setBulkStatus(ProcessStatus.ERROR);

            const detail = err.response?.data?.detail;
            if (detail?.code === 'PL_DETECTED') {
                setFolderError('CONTENT_PL');
                return;
            }

            const errorMessage = typeof detail === 'string' ? detail : (detail?.message || '❌ Error saat memproses batch');
            showToast(errorMessage.startsWith('DATA MISMATCH') ? `⚠️ ${errorMessage}` : errorMessage);
        }
    };


    const handleFlexExcelSelect = (files: FileList | null) => {
        if (flexIsLocked) {
            showToast('⚠️ Reset batch sebelumnya untuk mengunggah Excel baru!');
            return;
        }
        if (files && files[0]) {
            setFlexExcelFile(files[0]);
            setFlexStats(null);
        }
    };

    const handleFlexPdfSelect = (files: FileList | null) => {
        if (flexIsLocked) {
            showToast('⚠️ Klik "Upload PDF Berikutnya" untuk melanjutkan batch!');
            return;
        }
        if (files) {
            if (checkPLFolder(files)) return;
            setFlexPdfFiles(Array.from(files));
            setFlexStats(null);
        }
    };

    const startBulkTestProcessing = async () => {
        if (!pickerName.trim()) {
            showToast('⚠️ Nama Picker wajib diisi sebelum memproses label!');
            return;
        }
        if (!bulkTestExcelFile || bulkTestPdfFiles.length === 0) {
            showToast('⚠️ Pilih file Excel dan PDF terlebih dahulu');
            return;
        }

        // --- INTERCEPT: SABOTAGE (ACCURACY TEST) SYSTEM ---
        let activeBulkTestExcel = bulkTestExcelFile;
        const sabotaged_activeBulkTestExcel = await executeSabotage(bulkTestPdfFiles, setBulkTestExcelFile, bulkTestExcelFile);
        if (sabotaged_activeBulkTestExcel) activeBulkTestExcel = sabotaged_activeBulkTestExcel;
        // --- END SABOTAGE SYSTEM ---

        // NEW: Check for duplicate PDF filenames in the upload batch
        const pdfFilenames = bulkTestPdfFiles.map(f => f.name);
        const uniqueFilenames = new Set(pdfFilenames);

        if (pdfFilenames.length !== uniqueFilenames.size) {
            // Find duplicates
            const duplicates = pdfFilenames.filter((name, index) =>
                pdfFilenames.indexOf(name) !== index
            );
            const uniqueDuplicates = Array.from(new Set(duplicates));

            showToast(`❌ Duplikat terdeteksi! PDF berikut diupload lebih dari 1x:\n${uniqueDuplicates.join('\n')}\n\nHapus duplikat dan upload ulang.`);
            return;
        }

        try {
            // Step 1: Extract MATCHED Order IDs (intersection of Excel IDs and PDF IDs)
            // This prevents false-positive duplicate detection for orders with empty AWB
            setBulkTestStatus(ProcessStatus.UPLOADING);
            showToast('⏳ Memvalidasi data...');

            const matchFormData = new FormData();
            matchFormData.append('excel_file', activeBulkTestExcel);
            bulkTestPdfFiles.forEach(pdf => matchFormData.append('pdf_files', pdf));

            const extractResponse = await axios.post(
                `${API_CONFIG.BASE_URL}/extract-matched-order-ids`,
                matchFormData,
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
            );

            const matchedIds: string[] = extractResponse.data?.ids || [];
            console.log('[BULK] Matched IDs (Excel∩PDF):', matchedIds.length);

            // Step 2: Check ONLY those matched IDs for duplicates in DB
            if (matchedIds.length > 0) {
                const BATCH_SIZE = 50;
                const allDuplicates: any[] = [];
                const chunks = [];

                for (let i = 0; i < matchedIds.length; i += BATCH_SIZE) {
                    chunks.push(matchedIds.slice(i, i + BATCH_SIZE));
                }

                await Promise.all(chunks.map(async (chunk) => {
                    // Check against order_id (ID Pesanan only - AWB excluded to prevent false positives)
                    const { data: orderData } = await supabase
                        .from('processed_items')
                        .select('order_id, date_processed')
                        .in('order_id', chunk);

                    if (orderData) allDuplicates.push(...orderData);
                }));

                // Remove duplicates from our duplicate list
                const uniqueDuplicates = Array.from(new Set(allDuplicates.map(d => d.order_id)))
                    .map(id => allDuplicates.find(d => d.order_id === id));

                if (uniqueDuplicates.length > 0) {
                    setDuplicateData({ count: uniqueDuplicates.length, items: uniqueDuplicates });
                    setBulkTestStatus(ProcessStatus.IDLE);
                    showToast(`⚠️ ${uniqueDuplicates.length} data dari PDF ini sudah pernah diproses`);
                    return; // BLOCK PROCESS
                }
            }

            // Step 3: No duplicates found, proceed with processing
            setBulkTestStatus(ProcessStatus.PROCESSING);
            showToast('⏳ Memproses file...');

            const formData = new FormData();
            formData.append('excel_file', activeBulkTestExcel);
            formData.append('picker_name', pickerName.trim());
            bulkTestPdfFiles.forEach(pdf => formData.append('pdf_files', pdf));
            formData.append('sort_by_sku_count', 'true');
            if (includeGlobalMsku) {
                formData.append('include_global_msku', 'true');
            }
            if (includeSummary) {
                formData.append('include_summary', 'true');
            }

            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/process-labels-with-stats`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 300000
                }
            );

            if (response.data && response.data.pdf_base64) {
                const stats = response.data.stats as ProcessStats;

                // --- SMART VALIDATION (MASSAL) ---
                // Abort hanya jika PDF tidak dikenali. Excel yang tidak punya PDF = warning saja.
                const hasPdfMismatchBulk = (stats.unmatched_pdf_count > 0);
                const hasExcelMismatchBulk = (stats.unmatched_excel_count > 0);

                if (hasPdfMismatchBulk) {
                    setUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: stats.unmatched_pdf_count || 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: stats.unmatched_pdf_awbs || []
                    });
                    showToast('❌ Proses Massal Dibatalkan: Ada halaman PDF yang tidak dikenali.');
                    setBulkTestStatus(ProcessStatus.IDLE);
                    return; // ABORT
                }

                if (hasExcelMismatchBulk) {
                    setUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: []
                    });
                    showToast(`⚠️ ${stats.unmatched_excel_count} order di Excel tidak ada PDF-nya. Proses Massal tetap dilanjutkan.`);
                }

                setBulkTestStats(stats);
                setBulkTestProcessedCount(prev => prev + 1);

                // Auto download
                const binaryString = atob(response.data.pdf_base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `BATCH_${bulkTestProcessedCount + 1}_${activeBulkTestExcel.name.replace('.xlsx', '')}_hasil.pdf`;
                a.click();

                // Open PDF in new tab AFTER download completes
                setPdfPreviewUrl(url);
                openPdfInNewTab(url);

                // Save to history
                if (bulkTestPdfFiles.length > 0) {
                    setLastProcessedPdfName(bulkTestPdfFiles[0].name.replace(/\.pdf$/i, ''));
                }
                const historyId = await saveToHistory(stats);
                await saveToProcessedItems(stats, activeBulkTestExcel.name);

                // FIREBASE UPLOAD: Save to Firebase for Upload Massal Tes
                if (activeMenu === 'bulkUploadTes' && dbMode === 'cloud') {
                    showToast('Mengunggah file ke Firebase (Upload Massal Label)...');
                    saveUploadTesToFirebase({
                        excelFile: activeBulkTestExcel,
                        pdfFiles: bulkTestPdfFiles,
                        resultPdfBase64: response.data.pdf_base64,
                        packingListContent: response.data.packing_list || null,
                        stats: stats,
                        pickerName: pickerName.trim(),
                        tenantId: user?.tenant_id || user?.username || 'unknown',
                        historyId: historyId // PASS SUPABASE UUID
                    }).then((success) => {
                        if (success) console.log('[FIREBASE] Upload Massal Label success');
                        else console.error('[FIREBASE] Upload Massal Label failed');
                    });
                }

                // Start Undo Timer (120s)
                if (historyId) {
                    setLastHistoryId(historyId);
                    setUndoTimer(120);
                }

                setPickerName('');
                await resetProductivityTimer();
                setBulkTestStatus(ProcessStatus.COMPLETED);


                setBulkTestPdfFiles([]); // Clear PDFs for next batch
                showToast(`✓ Batch #${bulkTestProcessedCount + 1} selesai! ${stats.matched_count} label berhasil.`);
                setHistoryKey(prev => prev + 1);
            }
        } catch (err: any) {
            console.error('[BULK ERROR]', err);
            setBulkTestStatus(ProcessStatus.ERROR);

            const detail = err.response?.data?.detail;
            if (detail?.code === 'PL_DETECTED') {
                setFolderError('CONTENT_PL');
                return;
            }

            const errorMessage = typeof detail === 'string' ? detail : (detail?.message || '❌ Error saat memproses batch');
            showToast(errorMessage.startsWith('DATA MISMATCH') ? `⚠️ ${errorMessage}` : errorMessage);
        }
    };


    const handleTestExcelSelect = (files: FileList | null) => {
        if (testIsLocked) return;
        if (files && files[0]) {
            setTestExcelFile(files[0]);
            setTestProcessStats(null);
        }
    };

    const handleTestPdfSelect = (files: FileList | null) => {
        if (testIsLocked) return;
        if (files) {
            if (checkPLFolder(files)) return;
            setTestPdfFiles(Array.from(files));
            setTestProcessStats(null);
            
            const previews: UploadedFile[] = Array.from(files).map(f => ({
                id: f.name + f.size,
                name: f.name,
                size: f.size,
                type: f.type
            }));
            setTestPdfPreviewList(previews);
        }
    };

    const resetTestForm = () => {
        setPickerName('');
        setTestExcelFile(null);
        setTestPdfFiles([]);
        setTestStatus(ProcessStatus.IDLE);
        setTestProgress(0);
        setTestError(undefined);
        setTestProcessStats(null);
        setTestIsLocked(false);
        setTestDuplicateData(null);
        setTestPdfPreviewUrl(null);
        setTestPdfPreviewList([]);
        setTestLastProcessedPdfName(null);
        setHistoryKey(prev => prev + 1);
        setTestUnmatchedWarningData(null);
    };

    const handleTestUndo = async () => {
        if (!testLastHistoryId) return;
        const currentHistId = testLastHistoryId;
        setTestIsUndoing(true);
        try {
            let excelName = testExcelFile?.name || '';
            if (!excelName) {
                try {
                    const { data: histData } = await supabase
                        .from('label_process_history')
                        .select('excel_filename')
                        .eq('id', currentHistId)
                        .maybeSingle();
                    if (histData && histData.excel_filename) {
                        excelName = histData.excel_filename;
                    }
                } catch (e) {}
            }

            // 1. Delete via backend (handles backup files and server-side deletion)
            try {
                await axios.delete(`${API_CONFIG.BASE_URL}/history/${currentHistId}`);
            } catch (backendErr) {
                console.warn('[TEST UNDO] Backend delete failed:', backendErr);
            }

            // 2. Cascade delete from Supabase Client
            try {
                if (excelName) {
                    await supabase.from('processed_items').delete().eq('excel_filename', excelName);
                    await deleteProcessedItemsByExcelFile(excelName);
                    await deleteHistoryByExcelFile(excelName);
                }

                if (testProcessStats) {
                    const awbsToDelete = [...testProcessStats.matched_awbs, ...testProcessStats.continuation_pages.map(c => c.awb)];
                    if (awbsToDelete.length > 0) {
                        await supabase.from('processed_items').delete().in('order_id', awbsToDelete);
                        await supabase.from('processed_items').delete().in('awb', awbsToDelete);
                    }
                }

                await supabase.from('label_process_history').delete().eq('id', currentHistId);
                await deleteHistoryFromLocal(currentHistId);
            } catch (directErr) {
                console.warn('[TEST UNDO] Direct cascade delete error:', directErr);
            }

            setTestUndoTimer(0);
            setTestLastHistoryId(null);
            setTestUndoPinInput('');
            
            setTestExcelFile(null);
            setTestPdfFiles([]);
            setTestStatus(ProcessStatus.IDLE);
            setTestProgress(0);
            setTestProcessStats(null);
            setTestIsLocked(false);
            setTestPdfPreviewUrl(null);
            
            setHistoryKey(prev => prev + 1);
            showToast('✓ Proses Test berhasil dibatalkan dan data dihapus');
        } catch (err: any) {
            console.error('Test Undo error:', err);
            setTestUndoPinError('Gagal membatalkan proses');
            showToast('❌ Gagal membatalkan proses: ' + (err.message || 'Unknown error'));
        } finally {
            setTestIsUndoing(false);
        }
    };

    const startTestProcessing = async (forceProcess: boolean = false) => {
        if (!pickerName.trim()) {
            showToast('⚠️ Nama Picker wajib diisi sebelum memproses label!');
            return;
        }
        if (!testExcelFile || testPdfFiles.length === 0) {
            setTestError("Silakan lengkapi file Excel dan setidaknya satu PDF.");
            setTestStatus(ProcessStatus.ERROR);
            return;
        }

        // --- INTERCEPT: SABOTAGE (ACCURACY TEST) SYSTEM ---
        let activeTestExcel = testExcelFile;
        const sabotaged_activeTestExcel = await executeSabotage(testPdfFiles, setTestExcelFile, testExcelFile);
        if (sabotaged_activeTestExcel) activeTestExcel = sabotaged_activeTestExcel;
        // --- END SABOTAGE SYSTEM ---

        // NEW: Check for duplicate PDF filenames in the upload batch
        const pdfFilenames = testPdfFiles.map(f => f.name);
        const uniqueFilenames = new Set(pdfFilenames);

        if (pdfFilenames.length !== uniqueFilenames.size) {
            // Find duplicates
            const duplicates = pdfFilenames.filter((name, index) =>
                pdfFilenames.indexOf(name) !== index
            );
            const uniqueDuplicates = Array.from(new Set(duplicates));

            showToast(`❌ Duplikat terdeteksi! PDF berikut diupload lebih dari 1x:\n${uniqueDuplicates.join('\n')}\n\nHapus duplikat dan upload ulang.`);
            return;
        }

        // 1. Check Duplicates Strict Blocking
        if (!forceProcess) {
            setTestStatus(ProcessStatus.UPLOADING); // Show minimal feedback
            showToast('⏳ Memvalidasi data...');

            try {
                // Use matched endpoint: only IDs confirmed in BOTH Excel AND PDF are checked
                const matchFormData = new FormData();
                matchFormData.append('excel_file', activeTestExcel);
                testPdfFiles.forEach(pdf => matchFormData.append('pdf_files', pdf));

                const extractResponse = await axios.post(
                    `${API_CONFIG.BASE_URL}/extract-matched-order-ids`,
                    matchFormData,
                    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
                );

                const matchedIds: string[] = extractResponse.data?.ids || [];

                if (matchedIds.length > 0) {
                    const BATCH_SIZE = 50;
                    const allDuplicates: any[] = [];
                    const chunks = [];

                    for (let i = 0; i < matchedIds.length; i += BATCH_SIZE) {
                        chunks.push(matchedIds.slice(i, i + BATCH_SIZE));
                    }

                    await Promise.all(chunks.map(async (chunk) => {
                        let success = false;

                        if (dbMode === 'cloud') {
                            let attempts = 0;
                            while (attempts < 3 && !success) {
                                try {
                                    const { data: orderData, error: orderError } = await supabase
                                        .from('processed_items')
                                        .select('order_id, date_processed')
                                        .in('order_id', chunk);

                                    if (orderError) throw orderError;
                                    if (orderData) allDuplicates.push(...orderData);

                                    success = true;
                                } catch (err) {
                                    attempts++;
                                    if (attempts < 3) await new Promise(r => setTimeout(r, 1000));
                                }
                            }
                        }

                        if (!success || dbMode === 'local') {
                            try {
                                const localData = await getProcessedItemsByOrderIds(chunk);
                                if (localData && localData.length > 0) {
                                    allDuplicates.push(...localData);
                                }
                            } catch (localErr) {
                                console.error('[LOCAL] Local check failed:', localErr);
                            }
                        }
                    }));

                    const uniqueDuplicates = Array.from(new Set(allDuplicates.map(d => d.order_id)))
                        .map(id => allDuplicates.find(d => d.order_id === id));

                    if (uniqueDuplicates.length > 0) {
                        setTestDuplicateData({
                            count: uniqueDuplicates.length,
                            items: uniqueDuplicates,
                            onForceReProcess: async () => {
                                setIsCleaningDuplicates(true);
                                await cleanDuplicateItemsFromDB(uniqueDuplicates);
                                setIsCleaningDuplicates(false);
                                setTestDuplicateData(null);
                                await startTestProcessing(true);
                            }
                        });
                        setTestStatus(ProcessStatus.IDLE);
                        return; // BLOCK PROCESS
                    }
                }
            } catch (e) {
                console.error("Duplicate check failed", e);
                // If duplicate check API fails, we continue logic below and attempt processing
            }
        }

        setTestStatus(ProcessStatus.UPLOADING);
        setTestProgress(10);
        setTestError(undefined);
        setTestProcessStats(null);
        setTestIsLocked(true);  // Lock setelah mulai proses
        setTestPdfPreviewUrl(null); // Clear previous PDF URL

        const formData = new FormData();
        formData.append('excel_file', activeTestExcel);
        formData.append('picker_name', pickerName.trim());
        testPdfFiles.forEach((file) => {
            formData.append('pdf_files', file);
        });
        
        // Tambahkan flag khusus untuk Upload 2 (sort berdasarkan jumlah tipe SKU)
        formData.append('sort_by_sku_count', 'true');
        if (includeGlobalMsku) {
            formData.append('include_global_msku', 'true');
        }
        if (includeSummary) {
            formData.append('include_summary', 'true');
        }

        try {
            let currentProgress = 10;
            const progressTimer = setInterval(() => {
                if (currentProgress < 90) {
                    currentProgress += Math.random() * 5;
                    setTestProgress(Math.floor(currentProgress));
                }
            }, 800);

            console.log('[API] Calling /process-labels-with-stats...');

            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/process-labels-with-stats`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            clearInterval(progressTimer);
            setTestProgress(100);

            console.log('[API] Response:', response.data);
            const data = response.data;

            if (data.success && data.pdf_base64) {
                if (testPdfFiles.length > 0) {
                    setTestLastProcessedPdfName(testPdfFiles[0].name.replace(/\.pdf$/i, ''));
                }

                // --- SMART VALIDATION ---
                // ABORT hanya jika ada PDF yang tidak dikenali (unmatched_pdf_count > 0)
                // Jika hanya Excel yang tidak ada pasangan PDF-nya, tetap lanjutkan (warning saja)
                const stats = data.stats as ProcessStats;
                const hasPdfMismatch = stats.unmatched_pdf_count > 0;
                const hasExcelMismatch = stats.unmatched_excel_count > 0;

                if (hasPdfMismatch) {
                    setTestUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: stats.unmatched_pdf_count || 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: stats.unmatched_pdf_awbs || []
                    });
                    
                    showToast('❌ Proses Dibatalkan: Ada halaman PDF yang tidak dikenali.');
                    setTestStatus(ProcessStatus.IDLE);
                    setTestIsLocked(false);
                    return; // ABORT - Ada PDF asing yang tidak cocok dengan Excel
                }

                // Jika hanya Excel yang tidak cocok (PDF-only mismatch ok, excel extra = warning)
                if (hasExcelMismatch) {
                    setTestUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: []
                    });
                    // Tampilkan warning tapi TETAP LANJUTKAN
                    showToast(`⚠️ ${stats.unmatched_excel_count} order di Excel tidak ada PDF-nya. Proses tetap dilanjutkan.`);
                }

                // SUCCESS FLOW (Standard)
                const byteCharacters = atob(data.pdf_base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                // Download first, get URL back
                const pdfUrl = downloadBlob(blob);
                console.log('[DOWNLOAD] PDF downloaded');

                // Save URL for preview button and try to open automatically
                setTestPdfPreviewUrl(pdfUrl);
                openPdfInNewTab(pdfUrl);

                const historyId = await saveToHistory(data.stats);
                await saveToProcessedItems(data.stats, activeTestExcel ? activeTestExcel.name : 'unknown');

                // FIREBASE UPLOAD: Save to Firebase for Upload Tes
                if (dbMode === 'cloud') {
                    showToast('Mengunggah file ke Firebase...');
                    saveUploadTesToFirebase({
                        excelFile: activeTestExcel,
                        pdfFiles: testPdfFiles,
                        resultPdfBase64: data.pdf_base64,
                        packingListContent: data.packing_list || null,
                        stats: data.stats,
                        pickerName: pickerName.trim(),
                        tenantId: user?.tenant_id || user?.username || 'unknown',
                        historyId: historyId // PASS SUPABASE UUID
                    }).then(success => {
                        if (success) console.log('[FIREBASE] Upload Label success');
                        else console.error('[FIREBASE] Upload Label failed');
                    });
                }

                // Start Undo Timer (120s)
                if (historyId) {
                    setTestLastHistoryId(historyId);
                    setTestUndoTimer(120);
                }

                setPickerName('');
                await resetProductivityTimer();
                setTestStatus(ProcessStatus.COMPLETED);

                setTestProcessStats({
                    matched_awbs: data.stats.matched_with_awb || data.stats.matched_awbs || [],
                    unmatched_excel_awbs: data.stats.unmatched_excel_awbs || [],
                    unmatched_pdf_awbs: data.stats.unmatched_pdf_awbs || [],
                    duplicate_awbs: data.stats.duplicate_awbs || [],
                    continuation_pages: data.stats.continuation_pages || [],
                    matched_count: data.stats.matched_count || 0,
                    duplicate_count: data.stats.duplicate_count || 0,
                    continuation_count: data.stats.continuation_count || 0,
                    unmatched_excel_count: data.stats.unmatched_excel_count || 0,
                    unmatched_pdf_count: data.stats.unmatched_pdf_count || 0,
                    matched_with_awb: data.stats.matched_with_awb || [],
                });

                // Tampilkan warning modal jika ada unmatched PDF atau (0 < unmatched Excel < 100)
                if (data.stats.unmatched_pdf_count > 0 || (data.stats.unmatched_excel_count > 0 && data.stats.unmatched_excel_count < 100)) {
                    setTestUnmatchedWarningData({
                        excelCount: data.stats.unmatched_excel_count || 0,
                        pdfCount: data.stats.unmatched_pdf_count || 0,
                        excelAwbs: data.stats.unmatched_excel_awbs || [],
                        pdfAwbs: data.stats.unmatched_pdf_awbs || []
                    });
                }

            } else {
                throw new Error('Invalid response from server');
            }

        } catch (err: any) {
            console.error('[ERROR]', err);
            setTestStatus(ProcessStatus.ERROR);
            setTestProgress(0);
            setTestIsLocked(false);  // Unlock on error

            const detail = err.response?.data?.detail;
            if (detail?.code === 'PL_DETECTED') {
                setFolderError('CONTENT_PL');
                return;
            }

            if (err.response) {
                const msg = typeof detail === 'string' ? detail : (detail?.message || err.response.statusText);
                setTestError(`Backend error: ${msg}`);
            } else {
                setTestError("Gagal terhubung ke backend. Pastikan backend sudah menyala.");
            }
        }
    };
    const resetFlexUpload = () => {
        setFlexExcelFile(null);
        setFlexPdfFiles([]);
        setFlexStatus(ProcessStatus.IDLE);
        setFlexProgress(0);
        setFlexStats(null);
        setFlexIsLocked(false);
        setFlexError(undefined);
        setFlexPdfPreviewUrl(null);
        setFlexLastProcessedPdfName(null);
    };

    const resetFlexNextBatch = () => {
        setFlexPdfFiles([]);
        setFlexStatus(ProcessStatus.IDLE);
        setFlexProgress(0);
        setFlexError(undefined);
        setFlexStats(null);
        setFlexIsLocked(false);
        showToast('✓ Siap untuk batch PDF berikutnya');
    };

    const startFlexProcessing = async (forceProcess: boolean = false) => {
        if (!pickerName.trim()) {
            showToast('⚠️ Nama Picker wajib diisi sebelum memproses label!');
            return;
        }
        if (!flexExcelFile || flexPdfFiles.length === 0) {
            showToast('⚠️ Pilih file Excel dan PDF terlebih dahulu');
            setFlexStatus(ProcessStatus.ERROR);
            return;
        }

        // --- INTERCEPT: SABOTAGE (ACCURACY TEST) SYSTEM ---
        let activeFlexExcel = flexExcelFile;
        const sabotaged_activeFlexExcel = await executeSabotage(flexPdfFiles, setFlexExcelFile, flexExcelFile);
        if (sabotaged_activeFlexExcel) activeFlexExcel = sabotaged_activeFlexExcel;
        // --- END SABOTAGE SYSTEM ---

        const pdfFilenames = flexPdfFiles.map(f => f.name);
        const uniqueFilenames = new Set(pdfFilenames);

        if (pdfFilenames.length !== uniqueFilenames.size) {
            const duplicates = pdfFilenames.filter((name, index) =>
                pdfFilenames.indexOf(name) !== index
            );
            const uniqueDuplicates = Array.from(new Set(duplicates));
            showToast(`❌ Duplikat terdeteksi! PDF berikut diupload lebih dari 1x:\n${uniqueDuplicates.join('\n')}\n\nHapus duplikat dan upload ulang.`);
            return;
        }

        if (!forceProcess) {
            setFlexStatus(ProcessStatus.UPLOADING);
            showToast('⏳ Memvalidasi data...');

            try {
                const matchFormData = new FormData();
                matchFormData.append('excel_file', activeFlexExcel);
                flexPdfFiles.forEach(pdf => matchFormData.append('pdf_files', pdf));

                const extractResponse = await axios.post(
                    `${API_CONFIG.BASE_URL}/extract-matched-order-ids`,
                    matchFormData,
                    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
                );

                const matchedIds: string[] = extractResponse.data?.ids || [];

                if (matchedIds.length > 0) {
                    const BATCH_SIZE = 50;
                    const allDuplicates: any[] = [];
                    const chunks = [];

                    for (let i = 0; i < matchedIds.length; i += BATCH_SIZE) {
                        chunks.push(matchedIds.slice(i, i + BATCH_SIZE));
                    }

                    await Promise.all(chunks.map(async (chunk) => {
                        let success = false;
                        if (dbMode === 'cloud') {
                            let attempts = 0;
                            while (attempts < 3 && !success) {
                                try {
                                    const { data: orderData, error: orderError } = await supabase
                                        .from('processed_items')
                                        .select('order_id, date_processed')
                                        .in('order_id', chunk);

                                    if (orderError) throw orderError;
                                    if (orderData) allDuplicates.push(...orderData);
                                    success = true;
                                } catch (err) {
                                    attempts++;
                                    if (attempts < 3) await new Promise(r => setTimeout(r, 1000));
                                }
                            }
                        }

                        if (!success || dbMode === 'local') {
                            try {
                                const localData = await getProcessedItemsByOrderIds(chunk);
                                if (localData && localData.length > 0) {
                                    allDuplicates.push(...localData);
                                }
                            } catch (localErr) {
                                console.error('[LOCAL] Local check failed:', localErr);
                            }
                        }
                    }));

                    const uniqueDuplicates = Array.from(new Set(allDuplicates.map(d => d.order_id)))
                        .map(id => allDuplicates.find(d => d.order_id === id));

                    if (uniqueDuplicates.length > 0) {
                        setDuplicateData({
                            count: uniqueDuplicates.length,
                            items: uniqueDuplicates,
                            onForceReProcess: async () => {
                                setIsCleaningDuplicates(true);
                                await cleanDuplicateItemsFromDB(uniqueDuplicates);
                                setIsCleaningDuplicates(false);
                                setDuplicateData(null);
                                await startFlexProcessing(true);
                            }
                        });
                        setFlexStatus(ProcessStatus.IDLE);
                        return; 
                    }
                }
            } catch (e) {
                console.error("Duplicate check failed", e);
            }
        }

        try {
            setFlexStatus(ProcessStatus.PROCESSING);
            setFlexProgress(10);
            setFlexError(undefined);
            setFlexStats(null);
            setFlexIsLocked(true); 
            setFlexPdfPreviewUrl(null); 

            let currentProgress = 10;
            const progressTimer = setInterval(() => {
                if (currentProgress < 90) {
                    currentProgress += Math.random() * 5;
                    setFlexProgress(Math.floor(currentProgress));
                }
            }, 800);

            const formData = new FormData();
            formData.append('excel_file', activeFlexExcel);
            formData.append('picker_name', pickerName.trim());
            flexPdfFiles.forEach(pdf => formData.append('pdf_files', pdf));
            if (includeSummary) {
                formData.append('include_summary', 'true');
            }
            if (includeGlobalMsku) {
                formData.append('include_global_msku', 'true');
            }

            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/process-labels-with-stats`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }
            );

            clearInterval(progressTimer);
            setFlexProgress(100);

            if (response.data && response.data.pdf_base64) {
                if (flexPdfFiles.length > 0) {
                    setFlexLastProcessedPdfName(flexPdfFiles[0].name.replace(/\.pdf$/i, ''));
                }

                const stats = response.data.stats as ProcessStats;
                const hasPdfMismatch = stats.unmatched_pdf_count > 0;
                const hasExcelMismatch = stats.unmatched_excel_count > 0;

                if (hasPdfMismatch) {
                    setFlexUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: stats.unmatched_pdf_count || 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: stats.unmatched_pdf_awbs || []
                    });
                    
                    showToast('❌ Proses Dibatalkan: Ada halaman PDF yang tidak dikenali.');
                    setFlexStatus(ProcessStatus.IDLE);
                    setFlexIsLocked(false);
                    return; 
                }

                if (hasExcelMismatch) {
                    setFlexUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: []
                    });
                    showToast(`⚠️ ${stats.unmatched_excel_count} order di Excel tidak ada PDF-nya. Proses tetap dilanjutkan.`);
                }

                const byteCharacters = atob(response.data.pdf_base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                const pdfUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = `FLEX_${flexProcessedCount + 1}_${activeFlexExcel.name.replace('.xlsx', '')}_hasil.pdf`;
                a.click();
                
                setFlexPdfPreviewUrl(pdfUrl);
                openPdfInNewTab(pdfUrl);

                const historyId = await saveToHistory(stats);
                await saveToProcessedItems(stats, activeFlexExcel.name);

                if (historyId) {
                    setLastHistoryId(historyId);
                    setUndoTimer(120);
                }

                setPickerName('');
                setFlexStatus(ProcessStatus.COMPLETED);
                setFlexProcessedCount(prev => prev + 1);

                setFlexStats({
                    matched_awbs: stats.matched_with_awb || stats.matched_awbs || [],
                    unmatched_excel_awbs: stats.unmatched_excel_awbs || [],
                    unmatched_pdf_awbs: stats.unmatched_pdf_awbs || [],
                    duplicate_awbs: stats.duplicate_awbs || [],
                    continuation_pages: stats.continuation_pages || [],
                    matched_count: stats.matched_count || 0,
                    duplicate_count: stats.duplicate_count || 0,
                    continuation_count: stats.continuation_count || 0,
                    unmatched_excel_count: stats.unmatched_excel_count || 0,
                    unmatched_pdf_count: stats.unmatched_pdf_count || 0,
                });

                if (stats.unmatched_pdf_count > 0 || (stats.unmatched_excel_count > 0 && stats.unmatched_excel_count < 100)) {
                    setFlexUnmatchedWarningData({
                        excelCount: stats.unmatched_excel_count || 0,
                        pdfCount: stats.unmatched_pdf_count || 0,
                        excelAwbs: stats.unmatched_excel_awbs || [],
                        pdfAwbs: stats.unmatched_pdf_awbs || []
                    });
                }
                showToast(`✓ Batch #${flexProcessedCount + 1} selesai! ${stats.matched_count} label berhasil.`);
            }
        } catch (err: any) {
            console.error('[FLEX ERROR]', err);
            setFlexStatus(ProcessStatus.ERROR);
            setFlexProgress(0);
            setFlexIsLocked(false);

            const detail = err.response?.data?.detail;
            if (detail?.code === 'PL_DETECTED') {
                setFolderError('CONTENT_PL');
                return;
            }
            const errorMessage = typeof detail === 'string' ? detail : (detail?.message || '❌ Error saat memproses batch');
            showToast(errorMessage.startsWith('DATA MISMATCH') ? `⚠️ ${errorMessage}` : errorMessage);
        }
    };

    const bulkPdfPreviewList: UploadedFile[] = bulkPdfFiles.map(f => ({
        id: f.name + f.size,
        name: f.name,
        size: f.size,
        type: f.type
    }));

    const bulkTestPdfPreviewList: UploadedFile[] = bulkTestPdfFiles.map(f => ({
        id: f.name + f.size,
        name: f.name,
        size: f.size,
        type: f.type
    }));

    if (viewState === 'landing') {
        return <LandingPage onGetStarted={() => setViewState('login')} />;
    }

    if (viewState === 'login') {
        return <LoginPage onLogin={handleLogin} onBack={() => setViewState('landing')} />;
    }



    return (
        <div className="min-h-screen bg-[#f4f7fe]">

            {/* SYSTEM UPDATE MODAL (Z-INDEX TERTINGGI, UN-CLICKABLE BACKDROP) */}
            {showUpdateModal && systemUpdate && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4" style={{ pointerEvents: 'auto' }}>
                    <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300 pointer-events-auto">
                        <div className={`p-8 flex-shrink-0 relative transition-colors duration-500 ${isAutoUpdatingSuccess ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-red-600 to-orange-600'}`}>
                            <div className="absolute top-0 right-0 p-4">
                                <span className="bg-white/20 text-white text-xs font-black px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/30 shadow-sm">
                                    {systemUpdate.version_code}
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-white pr-16 leading-tight">
                                {isAutoUpdatingSuccess ? 'Update Berhasil!' : systemUpdate.title}
                            </h2>
                            <p className="text-white/90 mt-2 text-sm font-medium flex items-center gap-1.5">
                                {isAutoUpdatingSuccess ? (
                                    <>
                                        <FiCheckCircle className="w-5 h-5 text-emerald-200" />
                                        BERHASIL DI-UPDATE KE VERSI TERBARU
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        PEMBARUAN SISTEM WAJIB!
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-slate-50 space-y-4">
                            {isAutoUpdatingSuccess ? (
                                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-center animate-in zoom-in duration-300">
                                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
                                        <FiCheckCircle className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-lg font-black text-emerald-900">Backend Telah Terupdate!</h4>
                                    <p className="text-sm text-emerald-700 mt-1">
                                        File <code>main.py</code> lokal Anda telah terdeteksi menggunakan versi terbaru (<strong>{systemUpdate.version_code}</strong>).
                                    </p>
                                    <p className="text-xs text-emerald-600 font-semibold mt-3 animate-pulse">
                                        Jendela ini akan tertutup otomatis...
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Real-time Local Backend Inspection Card */}
                                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-xs">
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                <FiActivity className="w-4 h-4 text-blue-600" /> Deteksi Real-Time main.py Lokal
                                            </span>
                                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${localBackendInfo ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {localBackendInfo ? 'SERVER AKTIF' : 'SERVER OFFLINE'}
                                            </span>
                                        </div>
                                        
                                        {localBackendInfo ? (
                                            <div className="text-xs text-slate-600 space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Versi Saat Ini:</span>
                                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{localBackendInfo.version_code || 'Versi Lama'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Target Update:</span>
                                                    <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{systemUpdate.version_code}</span>
                                                </div>
                                                {localBackendInfo.file_path && (
                                                    <p className="text-[11px] text-slate-400 font-mono truncate mt-1 flex items-center gap-1">
                                                        <FaFolderOpen className="w-3 h-3 text-slate-400 flex-shrink-0" /> {localBackendInfo.file_path}
                                                    </p>
                                                )}
                                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                                    <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" /> Menunggu update & restart server...
                                                    </span>
                                                    <span className="text-slate-400">Otomatis tertutup setelah server nyala</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-500 space-y-1">
                                                <p className="text-emerald-700 font-bold flex items-center gap-1.5">
                                                    <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" /> Server lama sedang dimatikan (Bagus).
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Silakan jalankan file <code>update_backend.bat</code>, lalu buka kembali <code>start_app.py</code>. Jendela ini akan tertutup otomatis.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4 Easy Steps Guide */}
                                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs space-y-2 text-slate-700">
                                        <p className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                                            <FiInfo className="w-4 h-4 text-blue-600 flex-shrink-0" /> Panduan Pembaruan Sistem:
                                        </p>
                                        <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed font-medium">
                                            <li>Klik <strong>Langkah 1</strong> & <strong>Langkah 2</strong> pada tombol di bawah untuk download file.</li>
                                            <li>
                                                <strong>Tutup jendela hitam CMD server</strong> lama (cukup klik tombol silang <strong>[X]</strong> di pojok kanan atas jendela hitam CMD).
                                            </li>
                                            <li>Buka folder <em>Downloads</em> dan dobel klik file <strong>update_backend.bat</strong>.</li>
                                            <li>Jalankan kembali <strong>start_app.py</strong> &mdash; <em>pop-up akan langsung tertutup otomatis!</em></li>
                                        </ol>
                                    </div>

                                    {systemUpdate.instructions && systemUpdate.instructions.trim() && (
                                        <div className="prose prose-sm prose-slate max-w-none">
                                            <p className="font-bold text-slate-800 mb-1 text-xs">Catatan Tambahan:</p>
                                            <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-700 whitespace-pre-line text-xs leading-relaxed shadow-xs font-medium">
                                                {systemUpdate.instructions}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {!isAutoUpdatingSuccess && (
                            <div className="p-6 border-t border-slate-200 bg-white flex flex-col gap-3 flex-shrink-0">
                                {(() => {
                                    const links = (systemUpdate.download_link || '').split('|||');
                                    const linkMain = links[0];
                                    const linkBat = links.length > 1 ? links[1] : '';
                                    
                                    return (
                                        <div className="flex flex-col gap-2">
                                            {linkBat && (
                                                <a
                                                    href={linkBat}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-md hover:-translate-y-0.5 text-sm"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    Langkah 1: Download update_backend.bat
                                                </a>
                                            )}
                                            {linkMain && (
                                                <a
                                                    href={linkMain}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-4 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5"
                                                >
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Langkah 2: Download File main.py Terbaru
                                                </a>
                                            )}
                                        </div>
                                    );
                                })()}
                                <button
                                    onClick={() => {
                                        localStorage.setItem('acknowledged_version', systemUpdate.version_code);
                                        setShowUpdateModal(false);
                                    }}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors mt-1 text-xs sm:text-sm border border-slate-200"
                                >
                                    <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    Saya Sudah Menjalankan Update (Tutup Pesan Ini)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Global Notifications */}
            <GlobalNotificationModal />

            {/* Toast */}
            {renderToastContent()}

            {/* Mismatch Modal */}
            <MismatchModal />

            {/* DB PIN Modal */}
            {showDbPinModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 animate-in zoom-in-95 duration-200 border-2 border-red-100">
                        <div className="mx-auto mb-4 bg-red-100 w-12 h-12 rounded-full flex items-center justify-center animate-pulse">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Switch Mode</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Anda akan mengubah mode database ke <span className="font-bold text-gray-900">{pendingDbMode?.toUpperCase()}</span>.
                            <br />Masukkan PIN keamanan untuk melanjutkan.
                        </p>

                        <form onSubmit={verifyDbPin}>
                            <input
                                type="password"
                                value={dbPin}
                                onChange={(e) => setDbPin(e.target.value)}
                                className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-50 outline-none transition-all mb-4"
                                placeholder="••••"
                                maxLength={4}
                                autoFocus
                            />

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowDbPinModal(false); setDbPin(''); setPendingDbMode(null); }}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={dbPin.length < 4}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-600/20"
                                >
                                    Konfirmasi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <DuplicateErrorModal
                isOpen={!!duplicateData}
                onClose={() => setDuplicateData(null)}
                duplicateCount={duplicateData?.count || 0}
                duplicates={duplicateData?.items || []}
            />
            <UnmatchedWarningModal
                isOpen={!!unmatchedWarningData}
                onClose={() => setUnmatchedWarningData(null)}
                unmatchedExcelCount={unmatchedWarningData?.excelCount || 0}
                unmatchedPdfCount={unmatchedWarningData?.pdfCount || 0}
                excelAwbs={unmatchedWarningData?.excelAwbs || []}
                pdfAwbs={unmatchedWarningData?.pdfAwbs || []}
            />
            <UnmatchedWarningModal
                isOpen={!!unmatchedWarningData2}
                onClose={() => setUnmatchedWarningData2(null)}
                unmatchedExcelCount={unmatchedWarningData2?.excelCount || 0}
                unmatchedPdfCount={unmatchedWarningData2?.pdfCount || 0}
                excelAwbs={unmatchedWarningData2?.excelAwbs || []}
                pdfAwbs={unmatchedWarningData2?.pdfAwbs || []}
            />
            <header className="sticky top-0 z-20 border-b border-slate-800/80 shadow-lg" style={{ backgroundColor: '#0b0f19' }}>
                <div className="relative mx-auto px-4 py-2.5 min-h-[3.75rem] flex items-center justify-between gap-4 w-full max-w-full xl:max-w-7xl">
                    {/* Logo/Title */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-blue-500/30">
                            <FiActivity className="w-5 h-5" />
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-sm lg:text-base font-bold text-white tracking-tight leading-none">Label Flow</h1>
                            <p className="text-[10px] text-slate-400 font-normal leading-tight mt-1">Proses label otomatis</p>
                        </div>
                    </div>

                    {/* Desktop Navigation - Hidden on mobile */}
                    <nav className="hidden lg:flex items-center gap-3 xl:gap-5 flex-wrap justify-end">
                        {/* DB Mode Toggle (Desktop) */}
                        <div
                            className="flex items-center gap-1 p-1 rounded-xl bg-[#131b2e] border border-slate-800 cursor-pointer select-none mr-2 flex-shrink-0"
                            onClick={() => handleDbSwitchClick(dbMode === 'cloud' ? 'local' : 'cloud')}
                            title={dbMode === 'cloud' ? "Mode Cloud: Cek Supabase (Prioritas) -> Local" : "Mode Local: Cek Local DB Saja"}
                        >
                            <div className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all duration-200 flex items-center gap-1 ${
                                dbMode === 'cloud' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-400 hover:text-slate-200'
                            }`}>
                                Cloud
                            </div>
                            <div className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all duration-200 flex items-center gap-1 ${
                                dbMode === 'local' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                            }`}>
                                Local
                            </div>
                        </div>

                        {/* Nav links */}
                        <div className="flex items-center gap-2 xl:gap-4 flex-wrap">
                            {menuOrder.filter(menuId => !hiddenMenus.includes(menuId) && menuId !== 'profil' && MENU_DEFINITIONS[menuId] && (menuId !== 'admin' || user?.role === 'main' || user?.role === 'admin' || user?.role === 'developer')).map(menuId => {
                                const def = MENU_DEFINITIONS[menuId];
                                const isActive = activeMenu === menuId;
                                return (
                                    <a
                                        key={menuId}
                                        href={`?menu=${menuId}`}
                                        onClick={(e) => { 
                                            e.preventDefault(); 
                                            setActiveMenu(menuId as any); 
                                            if (menuId === 'history') setHistoryKey(prev => prev + 1); 
                                            window.history.pushState({}, '', `?menu=${menuId}`); 
                                        }}
                                        className={`relative py-1 text-xs lg:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                            isActive 
                                                ? 'text-white font-bold' 
                                                : 'text-slate-300 hover:text-white font-medium'
                                        }`}
                                    >
                                        {menuId === 'dashboard' && <FiActivity className="w-4 h-4 text-blue-400" />}
                                        {def.label}
                                        {isActive && (
                                            <span className="absolute -bottom-2 left-0 right-0 h-[2.5px] bg-blue-500 rounded-full shadow-sm shadow-blue-500/50" />
                                        )}
                                    </a>
                                );
                            })}
                        </div>

                        {/* Right notification bell + User Profile */}
                        <div className="flex items-center gap-2 pl-3 ml-2 border-l border-slate-800">
                            {/* Notification Bell */}
                            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors">
                                <FiBell className="w-4 h-4" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0b0f19]" />
                            </button>

                            {/* User Profile Menu */}
                            <ProfilMenu
                                user={user}
                                onLogout={handleLogout}
                                onMenuSelect={(menu) => {
                                    setActiveMenu(menu as any);
                                    window.history.pushState({}, '', `?menu=${menu}`);
                                }}
                            />
                        </div>
                    </nav>

                    {/* Mobile Hamburger Button - Shown below lg breakpoint */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        style={{color: '#94a3b8', backgroundColor: 'transparent'}}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e293b')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Mobile Menu Drawer - Slide in from right */}
                {mobileMenuOpen && (
                    <div className="lg:hidden fixed inset-0 z-50" onClick={() => setMobileMenuOpen(false)}>
                        <div className="absolute inset-0 bg-black bg-opacity-50" />
                        <div
                            className="absolute right-0 top-0 h-full w-72 overflow-y-auto"
                            style={{backgroundColor: '#0f172a', borderLeft: '1px solid #1e293b', boxShadow: '-8px 0 30px rgba(0,0,0,0.5)'}}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Mobile Menu Header */}
                            <div className="p-4 flex items-center justify-between" style={{borderBottom: '1px solid #1e293b'}}>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #2563eb, #6366f1)'}}>
                                        <FiActivity className="w-4 h-4 text-white" />
                                    </div>
                                    <h2 className="font-bold" style={{color: '#f1f5f9'}}>Menu</h2>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 rounded-lg transition-colors touch-manipulation"
                                    style={{color: '#64748b'}}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e293b')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Mobile Menu Items */}
                            <nav className="p-3">
                                {/* DB Mode Toggle (Mobile) */}
                                <div className="mb-3 pb-3" style={{borderBottom: '1px solid #1e293b'}}>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{color: '#475569'}}>Database Mode</p>
                                    <div
                                        className="flex items-center gap-1 p-1 rounded-xl cursor-pointer select-none"
                                        style={{backgroundColor: '#1e293b', border: '1px solid #334155'}}
                                        onClick={() => handleDbSwitchClick(dbMode === 'cloud' ? 'local' : 'cloud')}
                                    >
                                        <div className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                                            style={dbMode === 'cloud' ? {backgroundColor: '#2563eb', color: 'white', boxShadow: '0 1px 3px rgba(37,99,235,0.4)'} : {color: '#64748b'}}>
                                            <FiGlobe className="w-3.5 h-3.5" />
                                            Cloud
                                        </div>
                                        <div className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                                            style={dbMode === 'local' ? {backgroundColor: '#059669', color: 'white', boxShadow: '0 1px 3px rgba(5,150,105,0.4)'} : {color: '#64748b'}}>
                                            <FiDatabase className="w-3.5 h-3.5" />
                                            Local
                                        </div>
                                    </div>
                                </div>

                                {menuOrder.filter(menuId => !hiddenMenus.includes(menuId) && menuId !== 'profil' && MENU_DEFINITIONS[menuId] && (menuId !== 'admin' || user?.role === 'main' || user?.role === 'admin' || user?.role === 'developer')).map(menuId => {
                                    const def = MENU_DEFINITIONS[menuId];
                                    const Icon = def.icon || FiLayout; // fallback icon

                                    return (
                                        <a
                                            key={menuId}
                                            href={`?menu=${menuId}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveMenu(menuId as any);
                                                if (menuId === 'history') setHistoryKey(prev => prev + 1);
                                                window.history.pushState({}, '', `?menu=${menuId}`);
                                                setMobileMenuOpen(false);
                                            }}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all min-h-[44px]"
                                            style={activeMenu === menuId
                                                ? {backgroundColor: '#1e40af', color: 'white'}
                                                : {color: '#94a3b8'}}
                                            onMouseEnter={e => { if (activeMenu !== menuId) (e.currentTarget as HTMLElement).style.cssText += ';background-color:#1e293b;color:#e2e8f0'; }}
                                            onMouseLeave={e => { if (activeMenu !== menuId) { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; } }}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {def.label}
                                        </a>
                                    );
                                })}

                                {/* Profil & Settings (Mobile) */}
                                <div className="mt-2 pt-3" style={{borderTop: '1px solid #1e293b'}}>
                                    <div className="flex items-center gap-3 mb-3 px-1 py-2 rounded-xl" style={{backgroundColor: '#1e293b'}}>
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{background: 'linear-gradient(135deg, #2563eb, #6366f1)'}}>
                                            <FiUser className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{color: '#f1f5f9'}}>{user?.full_name || user?.username}</p>
                                            <p className="text-[10px] uppercase font-bold tracking-wider" style={{color: '#475569'}}>{user?.role}</p>
                                        </div>
                                    </div>

                                    <a
                                        href="?menu=profil"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveMenu('profil' as any);
                                            window.history.pushState({}, '', '?menu=profil');
                                            setMobileMenuOpen(false);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all min-h-[44px] mb-1"
                                        style={activeMenu === 'profil' ? {backgroundColor: '#1e40af', color: 'white'} : {color: '#94a3b8'}}
                                        onMouseEnter={e => { if (activeMenu !== 'profil') (e.currentTarget as HTMLElement).style.cssText += ';background-color:#1e293b;color:#e2e8f0'; }}
                                        onMouseLeave={e => { if (activeMenu !== 'profil') { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; } }}
                                    >
                                        <FiUser className="w-4 h-4" />
                                        Profil Saya
                                    </a>
                                    <a
                                        href="?menu=settings"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveMenu('settings' as any);
                                            window.history.pushState({}, '', '?menu=settings');
                                            setMobileMenuOpen(false);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all min-h-[44px]"
                                        style={activeMenu === 'settings' ? {backgroundColor: '#1e40af', color: 'white'} : {color: '#94a3b8'}}
                                        onMouseEnter={e => { if (activeMenu !== 'settings') (e.currentTarget as HTMLElement).style.cssText += ';background-color:#1e293b;color:#e2e8f0'; }}
                                        onMouseLeave={e => { if (activeMenu !== 'settings') { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; } }}
                                    >
                                        <FiSettings className="w-4 h-4" />
                                        Pengaturan
                                    </a>
                                </div>
                            </nav>
                        </div>
                    </div>
                )}
            </header>
            <RunningTextBar />
            
            <ProductivityTimer 
                username={user?.username || ''} 
                isActive={isProductivityTimerActive && (activeMenu === 'uploadTest' || activeMenu === 'bulkUploadTest' || activeMenu === 'bulkUploadTestMsku')} 
            />

            <main className={`mx-auto px-4 py-4 md:py-8 transition-all duration-300 ${['admin', 'toolkit', 'dashboard', 'upload', 'upload2', 'uploadTest', 'uploadTestMsku', 'uploadFlex', 'history', 'bulkUpload', 'bulkUploadTest', 'bulkUploadTes', 'bulkUploadTestMsku', 'bulkUploadPro'].includes(activeMenu) ? 'max-w-7xl' : 'max-w-3xl'
                }`}>
                {activeMenu === 'dashboard' ? (
                    <Dashboard user={user} />
                ) : activeMenu === 'uploadFlex' ? (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Header Section */}
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-indigo-200 shadow-inner">
                                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upload Flex (Pintar)</h2>
                                <p className="text-indigo-600 text-sm font-medium mt-0.5">Sistem gabungan: Proses satu-per-satu atau batch tanpa hambatan</p>
                            </div>
                        </div>

                        {/* Top Action Bar (Undo) */}
                        <div className="flex justify-end h-10 mb-2">
                            {undoTimer > 0 && lastHistoryId && (
                                <button
                                    onClick={() => setShowUndoPinModal(true)}
                                    disabled={isUndoing}
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isUndoing ? (
                                        <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                    )}
                                    <span className="font-bold">Batalkan Proses ({undoTimer}s)</span>
                                </button>
                            )}
                        </div>

                        {/* Upload Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <section className={`bg-white border ${flexExcelFile ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-200'} rounded-lg p-5 shadow-sm transition-all duration-300`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                                        File Excel Ginee
                                    </h3>
                                </div>
                                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5 mb-3">
                                    <svg className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Format Export Ginee</p>
                                        <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed font-medium">
                                            Gunakan opsi <span className="font-bold underline decoration-rose-300">"Berdasarkan Produk..."</span> dengan template default.
                                        </p>
                                    </div>
                                </div>
                                <div className={flexIsLocked ? 'pointer-events-none opacity-60' : ''}>
                                    <FileDropzone
                                        accept=".xlsx,.xls"
                                        onFilesSelected={handleFlexExcelSelect}
                                        icon={ICONS.EXCEL}
                                        label="Excel Ginee (.xlsx, .xls)"
                                        selectedFileCount={flexExcelFile ? 1 : 0}
                                    />
                                </div>
                            </section>

                            <section className={`bg-white border ${flexPdfFiles.length > 0 ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-200'} rounded-lg p-5 shadow-sm transition-all duration-300`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                                        File PDF (Maks 100)
                                    </h3>
                                </div>
                                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-3">
                                    <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Otomatis Deteksi Duplikat</p>
                                        <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed font-medium">
                                            Sistem akan menolak proses jika Anda mengunggah PDF dengan nama yang sama lebih dari sekali.
                                        </p>
                                    </div>
                                </div>
                                <div className={flexIsLocked ? 'pointer-events-none opacity-60' : ''}>
                                    <FileDropzone
                                        accept=".pdf"
                                        onFilesSelected={handleFlexPdfSelect}
                                        multiple={true}
                                        icon={ICONS.PDF}
                                        label="File PDF Label (.pdf)"
                                        selectedFileCount={flexPdfFiles.length}
                                    />
                                </div>
                            </section>
                        </div>

                        {/* Status/Progress */}
                        <div className="mt-8">
                            <ProcessStatusView
                                status={flexStatus}
                                progress={flexProgress}
                                error={flexError}
                            />
                        </div>

                        {/* Action Buttons (Idle) */}
                        {flexStatus === ProcessStatus.IDLE && (
                            <div className="flex flex-col items-center justify-center mt-6">
                                <div className="mb-4 w-full max-w-sm">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Picker <span className="text-red-500">*</span></label>
                                    <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={pickerName}
                                            onChange={(e) => setPickerName(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const btn = document.getElementById('btn-process-flex') as HTMLButtonElement;
                                                    if (btn && !btn.disabled) btn.click();
                                                }
                                            }}
                                            placeholder="Masukkan nama picker"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                            required
                                        />
                                        {pickerName && (
                                            <button
                                                type="button"
                                                onClick={() => setPickerName('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button
                                    id="btn-process-flex"
                                    onClick={startFlexProcessing}
                                    disabled={!flexExcelFile || flexPdfFiles.length === 0}
                                    className={`px-10 py-3.5 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 shadow-md transform hover:-translate-y-0.5 ${!flexExcelFile || flexPdfFiles.length === 0
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                                        }`}
                                >
                                    {flexProcessedCount === 0 ? 'Mulai Proses' : `Proses Batch #${flexProcessedCount + 1}`}
                                </button>
                            </div>
                        )}

                        {/* Results UI */}
                        {flexStatus === ProcessStatus.COMPLETED && flexStats && (
                            <div className="bg-white border border-green-200 rounded-2xl shadow-xl overflow-hidden mt-8 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 border-b border-green-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-inner">
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-green-800">Proses Berhasil!</h3>
                                            <p className="text-sm text-green-600 font-medium">{flexPdfFiles.length} file PDF telah digabungkan.</p>
                                        </div>
                                    </div>
                                    {flexPdfPreviewUrl && (
                                        <button
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = flexPdfPreviewUrl;
                                                a.download = `FLEX_${flexProcessedCount}_${flexExcelFile?.name.replace('.xlsx', '')}_hasil.pdf`;
                                                a.click();
                                            }}
                                            className="px-4 py-2 bg-white text-green-700 font-bold border border-green-200 rounded-lg hover:bg-green-50 shadow-sm transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Unduh Packing List
                                        </button>
                                    )}
                                </div>
                                
                                <div className="p-6">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Statistik Batch #{flexProcessedCount}</h4>
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                                            <div className="text-2xl font-bold text-emerald-600">{flexStats.matched_count}</div>
                                            <div className="text-xs text-emerald-700 mt-1 font-bold">Match</div>
                                        </div>
                                        <div className="text-center p-3 bg-blue-50 rounded-lg" title="Halaman lanjutan">
                                            <div className="text-2xl font-bold text-blue-600">{flexStats.continuation_count}</div>
                                            <div className="text-xs text-blue-700 mt-1 font-bold">Pretelan</div>
                                        </div>
                                        <div className="text-center p-3 bg-rose-50 rounded-lg" title="Duplikat asli">
                                            <div className="text-2xl font-bold text-rose-600">{flexStats.duplicate_count}</div>
                                            <div className="text-xs text-rose-700 mt-1 font-bold">Duplikat</div>
                                        </div>
                                        <div className="text-center p-3 bg-amber-50 rounded-lg">
                                            <div className="text-2xl font-bold text-amber-600">{flexStats.unmatched_excel_count}</div>
                                            <div className="text-xs text-amber-700 mt-1 font-bold">Excel Only</div>
                                        </div>
                                        <div className="text-center p-3 bg-amber-50 rounded-lg">
                                            <div className="text-2xl font-bold text-amber-600">{flexStats.unmatched_pdf_count}</div>
                                            <div className="text-xs text-amber-700 mt-1 font-bold">PDF Only</div>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-5">
                                        <button
                                            onClick={resetFlexUpload}
                                            className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Reset Semua (Baru)
                                        </button>
                                        <button
                                            onClick={resetFlexNextBatch}
                                            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5"
                                        >
                                            Upload PDF Berikutnya
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                ) : activeMenu === 'upload' ? (
                    <div className="space-y-6">
                        {/* Page Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 xl:gap-4 flex-wrap">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100/60 flex-shrink-0 shadow-sm">
                                    <FiUploadCloud className="w-7 h-7 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sesuaikan Resi Pengiriman</h2>
                                    <p className="text-xs font-bold text-blue-600 mt-0.5">Upload dan proses label secara otomatis</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => showToast('Gunakan file Excel Ginee & PDF label pengiriman.')}
                                className="bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all cursor-pointer"
                            >
                                <FiBookOpen className="w-4 h-4 text-blue-600" />
                                <span>Panduan Upload</span>
                            </button>
                        </div>

                        {/* Sub Description */}
                        <p className="text-xs text-slate-500 font-normal leading-relaxed max-w-3xl">
                            Upload file Excel Ginee dan PDF label pengiriman untuk diproses.<br />
                            Sistem akan mencocokkan data secara otomatis dan menghasilkan label yang sudah disesuaikan.
                        </p>

                        {/* Lock Warning */}
                        {isLocked && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs font-medium text-amber-900">
                                <span>Proses selesai. Reset untuk memulai baru.</span>
                                <button
                                    onClick={resetForm}
                                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
                                >
                                    Reset
                                </button>
                            </div>
                        )}

                        {/* 2 Column Upload Cards Grid */}
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Card 1: File Excel Ginee */}
                            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <FaFileExcel className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800">File Excel Ginee</h3>
                                        </div>
                                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-md">.xlsx</span>
                                    </div>

                                    {/* Red Alert Note */}
                                    <div className="bg-red-50/70 border border-red-100 rounded-xl p-4 mb-4 flex items-start gap-3 text-red-600">
                                        <FiAlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-red-600 mb-0.5">PERHATIAN: FORMAT EXPORT GINEE</p>
                                            <p className="text-[11px] text-red-600 font-medium leading-relaxed">
                                                Ekspor file dari Ginee menggunakan opsi <span className="font-bold">"Berdasarkan Produk (Baris terpisah untuk pesanan dengan beberapa produk di dalamnya)"</span> dengan template default.
                                            </p>
                                        </div>
                                    </div>

                                    <FileDropzone
                                        label="Excel Ginee (.xlsx)"
                                        accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onFilesSelected={handleExcelSelect}
                                        selectedFileCount={excelFile ? 1 : 0}
                                        icon={<FaFileExcel className="w-8 h-8 text-emerald-500" />}
                                    />
                                </div>
                            </section>

                            {/* Card 2: File PDF Labels */}
                            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                                <FaFilePdf className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800">File PDF Labels</h3>
                                        </div>
                                        <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-md">.pdf</span>
                                    </div>

                                    {/* Info Alert Note */}
                                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 mb-4 flex items-start gap-3 text-indigo-600">
                                        <FiInfo className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-600 mb-0.5">TIPS: KUALITAS PDF LABELS</p>
                                            <p className="text-[11px] text-indigo-600 font-medium leading-relaxed">
                                                Gunakan file PDF cetakan <span className="font-bold">ASLI</span> hasil unduhan sistem. Jangan gunakan hasil scan atau gambar agar pemotongan resi berjalan akurat dan presisi sempurna.
                                            </p>
                                        </div>
                                    </div>

                                    <FileDropzone
                                        label="Label Pengiriman (.pdf)"
                                        accept=".pdf"
                                        multiple={true}
                                        onFilesSelected={handlePdfSelect}
                                        selectedFileCount={pdfFiles.length}
                                        icon={<FaFilePdf className="w-10 h-10 text-rose-500" />}
                                    />
                                </div>
                            </section>
                        </div>

                        {/* Tips Banner Row */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 border border-blue-100/50 rounded-2xl p-4 flex items-center justify-between gap-4 text-blue-900 mb-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200 flex items-center justify-center flex-shrink-0">
                                    <FiFileText className="w-4.5 h-4.5" />
                                </div>
                                <p className="text-xs font-medium text-slate-700">
                                    <span className="font-bold text-blue-900">Tips Penting:</span> Pastikan data pada file Excel sudah benar sebelum diupload untuk mengoptimalkan keakuratan pencocokan resi.
                                </p>
                            </div>
                            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-lg">
                                <FiZap className="w-3.5 h-3.5" /> 100% Otomatis
                            </span>
                        </div>

                        {/* Ultra Premium MSKU Option Toggle Card */}
                        <div 
                            onClick={() => !isLocked && setIncludeGlobalMsku(!includeGlobalMsku)}
                            className={`bg-white rounded-3xl border-2 ${includeGlobalMsku ? 'border-blue-500/80 ring-4 ring-blue-500/10 shadow-md' : 'border-slate-200/90 shadow-sm'} p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg cursor-pointer select-none group ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <div className="flex items-start sm:items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105 flex-shrink-0 ${includeGlobalMsku ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    <FiLayers className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                                            Sertakan Halaman Rekap Keseluruhan (+ Total MSKU)
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                                        Menambahkan halaman ekstra ringkasan total pesanan & rincian MSKU di bagian akhir PDF.
                                    </p>
                                </div>
                            </div>
                            {/* Right iOS Toggle Switch & Status Pill */}
                            <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full transition-colors ${includeGlobalMsku ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {includeGlobalMsku ? '✓ AKTIF' : 'OFF'}
                                </span>
                                <div className={`w-14 h-8 rounded-full transition-colors duration-300 p-1 relative flex items-center ${includeGlobalMsku ? 'bg-blue-600 shadow-md shadow-blue-500/30' : 'bg-slate-300'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${includeGlobalMsku ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-8 flex flex-col items-center">
                            {(status === ProcessStatus.IDLE || status === ProcessStatus.ERROR) && !isLocked && (
                                <>
                                    <div className="mb-4 w-full max-w-sm">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Picker <span className="text-red-500">*</span></label>
                                        <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={pickerName}
                                            onChange={(e) => setPickerName(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const btn = document.getElementById('btn-process-main') as HTMLButtonElement;
                                                    if (btn && !btn.disabled) btn.click();
                                                }
                                            }}
                                            placeholder="Masukkan nama picker"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                            required
                                        />
                                        {pickerName && (
                                            <button
                                                type="button"
                                                onClick={() => setPickerName('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                    </div>
                                    <button
                                        id="btn-process-main"
                                        onClick={startProcessing}
                                    disabled={!excelFile || pdfFiles.length === 0}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white ${(!excelFile || pdfFiles.length === 0)
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    Proses Label
                                </button>
                                </>
                            )}

                            {(status === ProcessStatus.UPLOADING || status === ProcessStatus.PROCESSING) && (
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Memproses...</span>
                                </div>
                            )}

                            {status === ProcessStatus.COMPLETED && (
                                <div className="flex flex-col items-center gap-3">
                                    <span className="text-green-600 font-medium">✓ Selesai! PDF sudah terdownload.</span>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={resetForm}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                                        >
                                            Proses Baru
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPackingList(
                                                excelFile?.name || 'unknown.xlsx',
                                                processingTime || new Date().toISOString(),
                                                lastProcessedPdfName || (pdfFiles.length > 0 ? pdfFiles[0].name.replace(/\.pdf$/i, '') : undefined)
                                            )}
                                            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium flex items-center gap-2"
                                        >
                                            <FiClipboard className="w-4 h-4" />
                                            Packing List
                                        </button>
                                    </div>

                                    {/* Matched Data Result */}
                                    {processStats2?.matched_with_awb && processStats2.matched_with_awb.length > 0 && (
                                        <div className="mt-2 flex justify-center w-full">
                                            <button 
                                                onClick={() => setShowMatchedModal2(true)}
                                                className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                                Lihat Data Resi & Pesanan Berhasil ({processStats2.matched_with_awb.length})
                                            </button>
                                        </div>
                                    )}

                                    {/* Undo Button */}
                                    {undoTimer > 0 && lastHistoryId && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`⚠️ PERHATIAN!\n\nApakah Anda yakin ingin MEMBATALKAN dan MENGHAPUS PERMANEN data yang baru saja diproses?\n\nTindakan ini akan:\n✗ Menghapus data dari history\n✗ Menghapus data dari database\n✗ Menghapus folder backup di server\n✗ Tidak bisa dibatalkan\n\nWaktu tersisa: ${undoTimer} detik\n\nKlik OK untuk lanjut ke verifikasi PIN.`)) {
                                                    setShowUndoPinModal(true);
                                                }
                                            }}
                                            disabled={isUndoing}
                                            className="w-full mt-6 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all animate-in fade-in slide-in-from-top-2"
                                        >
                                            {isUndoing ? (
                                                <span>Membatalkan...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    Batalkan & Hapus Permanen ({undoTimer}s)
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Progress */}
                        <div className="max-w-xl mx-auto mt-4">
                            <ProcessStatusView status={status} progress={progress} error={error} />
                        </div>

                        {/* Results */}
                        {processStats && (
                            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-5">
                                <h3 className="text-sm font-medium text-gray-700 mb-4">Hasil Perbandingan</h3>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-5 gap-3">
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{processStats.matched_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Match</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg" title="Halaman lanjutan">
                                        <div className="text-2xl font-bold text-blue-600">{processStats.continuation_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Pretelan</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg" title="Duplikat asli">
                                        <div className="text-2xl font-bold text-purple-600">{processStats.duplicate_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Duplikat</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-amber-600">{processStats.unmatched_excel_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Excel Only</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{processStats.unmatched_pdf_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">PDF Only</div>
                                    </div>
                                </div>

                                {/* ⚠️ Unmatched Alerts — Upload */}
                                {processStats.unmatched_pdf_count > 0 && (
                                    <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-red-700">⚠️ PDF Only ({processStats.unmatched_pdf_count}) — Label tidak terpakai!</p>
                                            <p className="text-xs text-red-600 mt-0.5">Ada <strong>{processStats.unmatched_pdf_count}</strong> halaman PDF yang tidak cocok dengan data Excel. Cek kembali apakah ada label yang terlewat atau salah upload.</p>
                                        </div>
                                    </div>
                                )}
                                {processStats.unmatched_excel_count > 0 && processStats.unmatched_excel_count < 100 && (
                                    <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-amber-700">⚠️ Excel Only ({processStats.unmatched_excel_count}) — Order tanpa label!</p>
                                            <p className="text-xs text-amber-600 mt-0.5">Ada <strong>{processStats.unmatched_excel_count}</strong> order di Excel yang tidak memiliki label PDF yang cocok. Pastikan semua file PDF label sudah diupload.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Duplicate Details */}
                                {processStats.duplicate_count > 0 && (
                                    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                            <span className="text-xs font-medium text-gray-600">Detail Duplikat</span>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="py-2 px-3 text-left text-gray-500">No</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">ID Pesanan</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">AWB</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">Page</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {processStats.duplicate_awbs.map((dup, idx) => (
                                                        <tr key={idx}>
                                                            <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                                                            <td className="py-2 px-3 font-mono text-gray-600">{dup.id_pesanan}</td>
                                                            <td className="py-2 px-3 font-mono text-gray-600">{dup.awb}</td>
                                                            <td className="py-2 px-3 text-gray-500">{dup.pdf_page}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Excel/PDF Only Lists */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-600">Excel Only ({processStats.unmatched_excel_count})</span>
                                            {processStats.unmatched_excel_awbs.length > 0 && (
                                                <button
                                                    onClick={() => copyToClipboard(processStats.unmatched_excel_awbs, 'Excel Only')}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <FiCopy className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-24 overflow-y-auto">
                                            {processStats.unmatched_excel_awbs.length > 0 ? (
                                                processStats.unmatched_excel_awbs.map((awb, idx) => (
                                                    <div key={idx} className="text-xs py-1.5 px-3 font-mono text-gray-600 border-b border-gray-50">
                                                        {awb}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-green-600 text-xs py-3 text-center">✓ Semua match</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-600">PDF Only ({processStats.unmatched_pdf_count})</span>
                                            {processStats.unmatched_pdf_awbs.length > 0 && (
                                                <button
                                                    onClick={() => copyToClipboard(processStats.unmatched_pdf_awbs, 'PDF Only')}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <FiCopy className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-24 overflow-y-auto">
                                            {processStats.unmatched_pdf_awbs.length > 0 ? (
                                                processStats.unmatched_pdf_awbs.map((awb, idx) => (
                                                    <div key={idx} className="text-xs py-1.5 px-3 font-mono text-gray-600 border-b border-gray-50">
                                                        {awb}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-green-600 text-xs py-3 text-center">✓ Semua match</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PDF Preview */}
                        <FilePreviewTable files={pdfPreviewList} />

                        {/* Feature Highlights */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Auto Matching</h5>
                                <p className="text-xs text-gray-500 mt-1">AWB dicocokkan otomatis</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Proses Cepat</h5>
                                <p className="text-xs text-gray-500 mt-1">Label diproses real-time</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Auto Download</h5>
                                <p className="text-xs text-gray-500 mt-1">Hasil langsung terunduh</p>
                            </div>
                        </div>
                    </div>
                ) : (activeMenu === 'uploadTest' || activeMenu === 'uploadTestMsku') ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Ultra Premium Header Banner */}
                        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-900/15 border border-slate-800/80 relative overflow-hidden">
                            {/* Decorative Glowing Orbs */}
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start md:items-center gap-6">
                                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-blue-300 shadow-xl shadow-blue-500/20 flex-shrink-0 mr-1">
                                        <FiUploadCloud className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                                                {activeMenu === 'uploadTestMsku' ? 'Upload Label (+ Total MSKU)' : 'Upload Label'}
                                            </h2>
                                            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                                Versi 2.4
                                            </span>
                                        </div>
                                        <p className="text-xs lg:text-sm font-medium text-slate-300 mt-1">
                                            {activeMenu === 'uploadTestMsku' ? 'Upload Label dengan ekstra halaman rekap Total MSKU' : 'Halaman uji coba sistem (cloned from Upload 2)'}
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => showToast('Gunakan file Excel Ginee & PDF label pengiriman.')}
                                    className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer group"
                                >
                                    <FiBookOpen className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span>Panduan Upload</span>
                                </button>
                            </div>

                            {/* Sub Description inside header */}
                            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-normal">
                                <span>Upload file Excel Ginee dan PDF label pengiriman untuk diproses otomatis secara presisi.</span>
                                <span className="hidden sm:inline-block text-[11px] text-blue-400 font-medium">⚡ Resi matched & split otomatis</span>
                            </div>
                        </div>

                        {/* Lock Warning */}
                        {testIsLocked && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs font-medium text-amber-900 shadow-sm">
                                <span className="flex items-center gap-2">
                                    <FiCheckCircle className="w-4 h-4 text-amber-600" />
                                    Proses selesai. Klik Reset untuk memulai upload baru.
                                </span>
                                <button
                                    onClick={resetTestForm}
                                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-sm"
                                >
                                    Reset Form
                                </button>
                            </div>
                        )}

                        {/* 2 Column Upload Cards Grid - Perfectly Aligned Heights */}
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch ${testIsLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Card 1: File Excel Ginee */}
                            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/40 p-6 flex flex-col justify-between hover:shadow-xl hover:border-emerald-300/80 transition-all duration-300 group h-full">
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-105 transition-transform">
                                                    <FaFileExcel className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-extrabold text-slate-800">File Excel Ginee</h3>
                                                    <p className="text-[11px] text-slate-500">Format data pesanan Ginee</p>
                                                </div>
                                            </div>
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold px-3 py-1 rounded-xl shadow-xs">.xlsx</span>
                                        </div>

                                        {/* Red Alert Note */}
                                        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-4 mb-4 flex items-start gap-3 text-red-600 shadow-xs">
                                            <FiAlertTriangle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-wide text-red-700 mb-0.5">PERHATIAN: FORMAT EXPORT GINEE</p>
                                                <p className="text-[11px] text-red-600 font-medium leading-relaxed">
                                                    Ekspor file dari Ginee menggunakan opsi <span className="font-bold underline decoration-red-300">"Berdasarkan Produk (Baris terpisah untuk pesanan dengan beberapa produk di dalamnya)"</span> dengan template default.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <FileDropzone
                                            label="Excel Ginee (.xlsx)"
                                            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            onFilesSelected={handleTestExcelSelect}
                                            selectedFileCount={testExcelFile ? 1 : 0}
                                            icon={<FaFileExcel className="w-9 h-9 text-emerald-500" />}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Card 2: File PDF Labels */}
                            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/40 p-6 flex flex-col justify-between hover:shadow-xl hover:border-rose-300/80 transition-all duration-300 group h-full">
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm group-hover:scale-105 transition-transform">
                                                    <FaFilePdf className="w-5 h-5 text-rose-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-extrabold text-slate-800">File PDF Labels</h3>
                                                    <p className="text-[11px] text-slate-500">Label resi cetakan PDF</p>
                                                </div>
                                            </div>
                                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-extrabold px-3 py-1 rounded-xl shadow-xs">.pdf</span>
                                        </div>

                                        {/* Info Alert Note */}
                                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 rounded-2xl p-4 mb-4 flex items-start gap-3 text-indigo-600 shadow-xs">
                                            <FiInfo className="w-4.5 h-4.5 text-indigo-600 flex-shrink-0 mt-0.5 animate-pulse" />
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-wide text-indigo-700 mb-0.5">TIPS: KUALITAS PDF LABELS</p>
                                                <p className="text-[11px] text-indigo-600 font-medium leading-relaxed">
                                                    Gunakan file PDF cetakan <span className="font-bold underline decoration-indigo-300">ASLI</span> hasil unduhan sistem. Jangan gunakan hasil scan atau gambar agar pemotongan resi berjalan akurat dan presisi sempurna.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <FileDropzone
                                            label="Label Pengiriman (.pdf)"
                                            accept=".pdf"
                                            multiple={true}
                                            onFilesSelected={handleTestPdfSelect}
                                            selectedFileCount={testPdfFiles.length}
                                            icon={<FaFilePdf className="w-10 h-10 text-rose-500" />}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Tips Banner Row */}
                        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-sky-50 border border-blue-200/70 rounded-2xl p-4 flex items-center justify-between text-blue-950 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                                    <FiFileText className="w-4.5 h-4.5" />
                                </div>
                                <p className="text-xs font-medium text-slate-700">
                                    <span className="font-bold text-blue-900">Tips Penting:</span> Pastikan data pada file Excel sudah benar sebelum diupload untuk mengoptimalkan keakuratan pencocokan resi.
                                </p>
                            </div>
                            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-lg">
                                <FiZap className="w-3.5 h-3.5" /> 100% Otomatis
                            </span>
                        </div>

                        {/* Ultra Premium MSKU Option Toggle Card */}
                        <div 
                            onClick={() => !testIsLocked && setIncludeGlobalMsku(!includeGlobalMsku)}
                            className={`bg-white rounded-3xl border-2 ${includeGlobalMsku ? 'border-blue-500/80 ring-4 ring-blue-500/10 shadow-md' : 'border-slate-200/90 shadow-sm'} p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg cursor-pointer select-none group ${testIsLocked ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <div className="flex items-start sm:items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105 flex-shrink-0 ${includeGlobalMsku ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    <FiLayers className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                                            Sertakan Halaman Rekap Keseluruhan (+ Total MSKU)
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                                        Menambahkan halaman ekstra ringkasan total pesanan & rincian MSKU di bagian akhir PDF.
                                    </p>
                                </div>
                            </div>

                            {/* Right iOS Toggle Switch & Status Pill */}
                            <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full transition-colors ${includeGlobalMsku ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {includeGlobalMsku ? '✓ AKTIF' : 'OFF'}
                                </span>
                                <div className={`w-14 h-8 rounded-full transition-colors duration-300 p-1 relative flex items-center ${includeGlobalMsku ? 'bg-blue-600 shadow-md shadow-blue-500/30' : 'bg-slate-300'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${includeGlobalMsku ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Action Control Panel - High Contrast Clear Border & Spacious Form */}
                        <div className="mt-8 bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 sm:p-8 lg:p-10 flex flex-col items-center">
                            {(testStatus === ProcessStatus.IDLE || testStatus === ProcessStatus.ERROR) && !testIsLocked && (
                                <div className="w-full max-w-lg flex flex-col items-center">
                                    <div className="mb-6 w-full">
                                        <label className="block text-xs font-black text-slate-800 mb-2.5 uppercase tracking-wider">
                                            Nama Picker / Operator <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                value={pickerName}
                                                onChange={(e) => setPickerName(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        if (pickerName.trim()) {
                                                            startTestProcessing();
                                                        }
                                                    }
                                                }}
                                                placeholder="Masukkan nama picker..."
                                                className="w-full px-5 py-3.5 bg-slate-50/60 border-2 border-slate-300 rounded-2xl text-sm font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none shadow-xs pr-12"
                                                required
                                            />
                                            {pickerName && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPickerName('')}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-200/60 hover:bg-slate-300/80 rounded-full p-1 transition-colors focus:outline-none"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        id="btn-process-test"
                                        onClick={startTestProcessing}
                                        disabled={!testExcelFile || testPdfFiles.length === 0 || !pickerName.trim()}
                                        className={`w-full py-4 px-8 rounded-2xl font-extrabold text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-3 shadow-lg cursor-pointer transform hover:-translate-y-0.5 ${(!testExcelFile || testPdfFiles.length === 0 || !pickerName.trim())
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                                            : 'bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-[rgb(var(--theme-600))]/30 hover:shadow-xl hover:shadow-[rgb(var(--theme-600))]/40'
                                            }`}
                                    >
                                        <FiZap className="w-5 h-5" />
                                        <span>Proses Label Pengiriman</span>
                                    </button>
                                </div>
                            )}

                            {(testStatus === ProcessStatus.UPLOADING || testStatus === ProcessStatus.PROCESSING) && (
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Memproses...</span>
                                </div>
                            )}

                            {testStatus === ProcessStatus.COMPLETED && (
                                <div className="flex flex-col items-center gap-3">
                                    <span className="text-green-600 font-medium">✓ Selesai! PDF sudah terdownload.</span>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={resetTestForm}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                                        >
                                            Proses Baru
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPackingList(
                                                testExcelFile?.name || 'unknown.xlsx',
                                                processingTime || new Date().toISOString(),
                                                lastProcessedPdfName || (testPdfFiles.length > 0 ? testPdfFiles[0].name.replace(/\.pdf$/i, '') : undefined)
                                            )}
                                            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium flex items-center gap-2"
                                        >
                                            <FiClipboard className="w-4 h-4" />
                                            Packing List
                                        </button>
                                    </div>

                                    {/* Matched Data Result */}
                                    {testProcessStats?.matched_with_awb && testProcessStats.matched_with_awb.length > 0 && (
                                        <div className="mt-2 flex justify-center w-full">
                                            <button 
                                                onClick={() => setShowMatchedModalTest(true)}
                                                className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                                Lihat Data Resi & Pesanan Berhasil ({testProcessStats.matched_with_awb.length})
                                            </button>
                                        </div>
                                    )}

                                    {/* Undo Button */}
                                    {testUndoTimer > 0 && testLastHistoryId && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`⚠️ PERHATIAN!\n\nApakah Anda yakin ingin MEMBATALKAN dan MENGHAPUS PERMANEN data yang baru saja diproses?\n\nTindakan ini akan:\n✗ Menghapus data dari history\n✗ Menghapus data dari database\n✗ Menghapus folder backup di server\n✗ Tidak bisa dibatalkan\n\nWaktu tersisa: ${testUndoTimer} detik\n\nKlik OK untuk lanjut ke verifikasi PIN.`)) {
                                                    setShowUndoPinModal(true);
                                                }
                                            }}
                                            disabled={testIsUndoing}
                                            className="w-full mt-6 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all animate-in fade-in slide-in-from-top-2"
                                        >
                                            {testIsUndoing ? (
                                                <span>Membatalkan...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    Batalkan & Hapus Permanen ({testUndoTimer}s)
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Progress */}
                        <div className="max-w-xl mx-auto mt-4">
                            <ProcessStatusView status={testStatus} progress={testProgress} error={testError} />
                        </div>

                        {/* Results */}
                        {testProcessStats && (
                            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-5">
                                <h3 className="text-sm font-medium text-gray-700 mb-4">Hasil Perbandingan</h3>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-5 gap-3">
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{testProcessStats.matched_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Match</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg" title="Halaman lanjutan">
                                        <div className="text-2xl font-bold text-blue-600">{testProcessStats.continuation_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Pretelan</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg" title="Duplikat asli">
                                        <div className="text-2xl font-bold text-purple-600">{testProcessStats.duplicate_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Duplikat</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-amber-600">{testProcessStats.unmatched_excel_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Excel Only</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{testProcessStats.unmatched_pdf_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">PDF Only</div>
                                    </div>
                                </div>

                                {/* ⚠️ Unmatched Alerts — Upload */}
                                {testProcessStats.unmatched_pdf_count > 0 && (
                                    <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-red-700">⚠️ PDF Only ({testProcessStats.unmatched_pdf_count}) — Label tidak terpakai!</p>
                                            <p className="text-xs text-red-600 mt-0.5">Ada <strong>{testProcessStats.unmatched_pdf_count}</strong> halaman PDF yang tidak cocok dengan data Excel. Cek kembali apakah ada label yang terlewat atau salah upload.</p>
                                        </div>
                                    </div>
                                )}
                                {testProcessStats.unmatched_excel_count > 0 && testProcessStats.unmatched_excel_count < 100 && (
                                    <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-amber-700">⚠️ Excel Only ({testProcessStats.unmatched_excel_count}) — Order tanpa label!</p>
                                            <p className="text-xs text-amber-600 mt-0.5">Ada <strong>{testProcessStats.unmatched_excel_count}</strong> order di Excel yang tidak memiliki label PDF yang cocok. Pastikan semua file PDF label sudah diupload.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Duplicate Details */}
                                {testProcessStats.duplicate_count > 0 && (
                                    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                            <span className="text-xs font-medium text-gray-600">Detail Duplikat</span>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="py-2 px-3 text-left text-gray-500">No</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">ID Pesanan</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">AWB</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">Page</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {testProcessStats.duplicate_awbs.map((dup, idx) => (
                                                        <tr key={idx}>
                                                            <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                                                            <td className="py-2 px-3 font-mono text-gray-600">{dup.id_pesanan}</td>
                                                            <td className="py-2 px-3 font-mono text-gray-600">{dup.awb}</td>
                                                            <td className="py-2 px-3 text-gray-500">{dup.pdf_page}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Excel/PDF Only Lists */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-600">Excel Only ({testProcessStats.unmatched_excel_count})</span>
                                            {testProcessStats.unmatched_excel_awbs.length > 0 && (
                                                <button
                                                    onClick={() => copyToClipboard(testProcessStats.unmatched_excel_awbs, 'Excel Only')}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <FiCopy className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-24 overflow-y-auto">
                                            {testProcessStats.unmatched_excel_awbs.length > 0 ? (
                                                testProcessStats.unmatched_excel_awbs.map((awb, idx) => (
                                                    <div key={idx} className="text-xs py-1.5 px-3 font-mono text-gray-600 border-b border-gray-50">
                                                        {awb}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-green-600 text-xs py-3 text-center">✓ Semua match</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-600">PDF Only ({testProcessStats.unmatched_pdf_count})</span>
                                            {testProcessStats.unmatched_pdf_awbs.length > 0 && (
                                                <button
                                                    onClick={() => copyToClipboard(testProcessStats.unmatched_pdf_awbs, 'PDF Only')}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <FiCopy className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-24 overflow-y-auto">
                                            {testProcessStats.unmatched_pdf_awbs.length > 0 ? (
                                                testProcessStats.unmatched_pdf_awbs.map((awb, idx) => (
                                                    <div key={idx} className="text-xs py-1.5 px-3 font-mono text-gray-600 border-b border-gray-50">
                                                        {awb}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-green-600 text-xs py-3 text-center">✓ Semua match</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* Modal Data Resi & Pesanan Test */}
                        {showMatchedModalTest && testProcessStats?.matched_with_awb && createPortal(
                            <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setShowMatchedModalTest(false)}>
                                <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="text-xl font-black text-gray-900">Data Berhasil Diproses</h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    const text = testProcessStats.matched_with_awb?.map((item: any) => {
                                                        let parsed = item;
                                                        if (typeof item === 'string' && item.startsWith('{')) {
                                                            try { parsed = JSON.parse(item); } catch(e) {}
                                                        }
                                                        const isObj = typeof parsed === 'object' && parsed !== null;
                                                        const awb = isObj ? parsed.awb : parsed;
                                                        const id_pesanan = isObj ? parsed.id_pesanan : '-';
                                                        return `${id_pesanan}\t${awb}`;
                                                    }).join('\n') || '';
                                                    navigator.clipboard.writeText(text);
                                                    showToast('Berhasil disalin ke clipboard');
                                                }}
                                                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                </svg>
                                                Copy Data
                                            </button>
                                            <button onClick={() => setShowMatchedModalTest(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6 overflow-y-auto bg-gray-50/30">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    <th className="p-3 rounded-tl-xl">ID Pesanan</th>
                                                    <th className="p-3 rounded-tr-xl">AWB / Resi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {testProcessStats.matched_with_awb.map((item: any, idx: number) => {
                                                    let parsed = item;
                                                    if (typeof item === 'string' && item.startsWith('{')) {
                                                        try { parsed = JSON.parse(item); } catch(e) {}
                                                    }
                                                    const isObj = typeof parsed === 'object' && parsed !== null;
                                                    const awbStr = isObj ? parsed.awb : parsed;
                                                    const idPesanan = isObj ? parsed.id_pesanan : '-';
                                                    return (
                                                        <tr key={idx} className="bg-white hover:bg-emerald-50 transition-colors">
                                                            <td className="p-3 font-mono text-sm text-gray-700 font-semibold border-l border-gray-100">{idPesanan}</td>
                                                            <td className="p-3 font-mono text-sm text-gray-500 border-r border-gray-100">{awbStr}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* PDF Preview */}
                        <FilePreviewTable files={testPdfPreviewList} />

                        {/* Feature Highlights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                                    <FiCheckCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h5 className="font-extrabold text-slate-800 text-sm">Auto Matching</h5>
                                    <p className="text-xs text-slate-500 mt-0.5">AWB dicocokkan presisi otomatis</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                                    <FiZap className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h5 className="font-extrabold text-slate-800 text-sm">Proses Real-time</h5>
                                    <p className="text-xs text-slate-500 mt-0.5">Pengolahan label super cepat</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                                    <FiUploadCloud className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h5 className="font-extrabold text-slate-800 text-sm">Auto Download</h5>
                                    <p className="text-xs text-slate-500 mt-0.5">Hasil PDF langsung terunduh</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (activeMenu as string) === 'upload2' ? (
                    !isAuthenticatedKembar && !skipPinMenus.includes('upload2') ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-full max-w-md bg-white p-10 rounded-3xl border border-gray-100 shadow-2xl shadow-emerald-500/10">
                                <div className="text-center mb-10">
                                    <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-600/30 rotate-3 hover:rotate-0 transition-transform">
                                        <FiUnlock className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Upload Kembar</h2>
                                    <p className="text-gray-500 mt-3 text-sm font-medium">Akses terbatas. Masukkan PIN Keamanan.</p>
                                </div>

                                <form onSubmit={handleLoginKembar} className="space-y-8">
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={pinKembar}
                                            onChange={(e) => setPinKembar(e.target.value)}
                                            className="w-full text-center text-4xl font-mono tracking-[0.5em] py-5 border-b-4 border-gray-100 focus:border-emerald-500 outline-none transition-all bg-transparent text-gray-900 placeholder-gray-200"
                                            placeholder="••••"
                                            maxLength={4}
                                            autoFocus
                                        />
                                    </div>
                                    {errorKembar && (
                                        <div className="flex items-center justify-center gap-2 text-red-600 text-sm font-bold bg-red-50 py-4 rounded-2xl border border-red-100 animate-bounce">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            {errorKembar}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={pinKembar.length < 4}
                                        className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:grayscale"
                                    >
                                        VERIFIKASI AKSES
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* SQL Editor Overlay */}
                            {showSqlEditor && (
                                <div className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
                                    <div className="bg-gray-50 w-full max-w-6xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-white/20 flex flex-col">
                                        <div className="flex-1 overflow-hidden p-6">
                                            <SqlEditor 
                                                onClose={() => setShowSqlEditor(false)} 
                                                showToast={showToast}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-5">
                                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-600/20">
                                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Upload Kembar</h2>
                                        <p className="text-emerald-600 text-sm font-bold mt-1 uppercase tracking-wider">Optimized Batch Processing Session</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    
                                    <button
                                        onClick={() => {
                                            setIsAuthenticatedKembar(false);
                                            sessionStorage.removeItem('kembar_auth');
                                            showToast('Logout Berhasil');
                                        }}
                                        className="px-5 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                                    >
                                        LOGOUT
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-gray-600 leading-relaxed font-medium">
                                    Gunakan Menu Upload Kembar untuk memproses batch label tambahan tanpa mengganggu data di Menu Upload utama. Logika dan fitur tetap sinkron dengan sistem utama.
                                </p>
                            </div>

                            {/* Lock Warning */}
                            {isLocked2 && (
                                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between shadow-sm animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                        <span className="text-amber-800 font-bold">
                                            Proses selesai. Silakan Reset untuk memulai batch baru.
                                        </span>
                                    </div>
                                    <button
                                        onClick={resetForm2}
                                        className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-amber-600/20"
                                    >
                                        RESET FORM
                                    </button>
                                </div>
                            )}

                            {/* Upload Cards */}
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isLocked2 ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                <section className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            {ICONS.EXCEL}
                                        </div>
                                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">File Excel Ginee</h3>
                                    </div>
                                    <FileDropzone
                                        label="Excel Ginee (.xlsx)"
                                        accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onFilesSelected={handleExcelSelect2}
                                        selectedFileCount={excelFile2 ? 1 : 0}
                                        icon={ICONS.EXCEL}
                                    />
                                </section>

                                <section className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            {ICONS.PDF}
                                        </div>
                                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">File PDF Labels</h3>
                                    </div>
                                    <FileDropzone
                                        label="Label Pengiriman (.pdf)"
                                        accept=".pdf"
                                        multiple={true}
                                        onFilesSelected={handlePdfSelect2}
                                        selectedFileCount={pdfFiles2.length}
                                        icon={ICONS.PDF}
                                    />
                                </section>
                            </div>

                            {/* Action Button */}
                            <div className="mt-8 flex flex-col items-center">
                                {(status2 === ProcessStatus.IDLE || status2 === ProcessStatus.ERROR) && !isLocked2 && (
                                    <>
                                        <div className="mb-4 w-full max-w-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Picker <span className="text-red-500">*</span></label>
                                            <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={pickerName}
                                            onChange={(e) => setPickerName(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const btn = document.getElementById('btn-process-main-2') as HTMLButtonElement;
                                                    if (btn && !btn.disabled) btn.click();
                                                }
                                            }}
                                            placeholder="Masukkan nama picker"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                            required
                                        />
                                        {pickerName && (
                                            <button
                                                type="button"
                                                onClick={() => setPickerName('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                        </div>
                                        <button
                                            id="btn-process-main-2"
                                            onClick={startProcessing2}
                                            disabled={!excelFile2 || pdfFiles2.length === 0}
                                            className={`px-12 py-4 rounded-2xl text-lg font-black text-white transition-all shadow-2xl active:scale-95 ${(!excelFile2 || pdfFiles2.length === 0)
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                                                }`}
                                        >
                                            PROSES LABEL KEMBAR
                                        </button>
                                    </>
                                )}

                                {(status2 === ProcessStatus.UPLOADING || status2 === ProcessStatus.PROCESSING) && (
                                    <div className="flex flex-col items-center gap-4 bg-white px-10 py-6 rounded-3xl border border-gray-100 shadow-xl">
                                        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-gray-900 font-black tracking-tight uppercase text-sm">Sedang Memproses Data...</span>
                                    </div>
                                )}

                                {status2 === ProcessStatus.COMPLETED && (
                                    <div className="flex flex-col items-center gap-6 bg-white p-8 rounded-3xl border border-emerald-100 shadow-2xl shadow-emerald-500/10">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                                            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-emerald-600 text-xl font-black tracking-tight">BATCH BERHASIL DIPROSES!</span>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={resetForm2}
                                                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-sm transition-all"
                                            >
                                                PROSES BARU
                                            </button>
                                        </div>

                                        {/* Undo Button 2 */}
                                        {undoTimer2 > 0 && lastHistoryId2 && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`⚠️ PERHATIAN!\n\nApakah Anda yakin ingin MEMBATALKAN dan MENGHAPUS PERMANEN data yang baru saja diproses?\n\nTindakan ini akan:\n✗ Menghapus data dari history\n✗ Menghapus data dari database\n✗ Menghapus folder backup di server\n✗ Tidak bisa dibatalkan\n\nWaktu tersisa: ${undoTimer2} detik\n\nKlik OK untuk lanjut ke verifikasi PIN.`)) {
                                                        setShowUndoPinModal(true);
                                                    }
                                                }}
                                                disabled={isUndoing2}
                                                className="w-full mt-4 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all border border-red-100"
                                            >
                                                {isUndoing2 ? <span>Membatalkan...</span> : <span>BATALKAN & HAPUS PERMANEN ({undoTimer2}s)</span>}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Progress 2 */}
                            <div className="max-w-2xl mx-auto mt-4">
                                <ProcessStatusView status={status2} progress={progress2} error={error2} />
                            </div>

                            {/* Results 2 */}
                            {processStats2 && (
                                <div className="mt-12 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                    <h3 className="text-lg font-black text-gray-900 mb-8 uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Statistik Batch Kembar</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <div className="text-3xl font-black text-emerald-600">{processStats2.matched_count}</div>
                                            <div className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mt-2">Match</div>
                                        </div>
                                        <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                            <div className="text-3xl font-black text-blue-600">{processStats2.continuation_count}</div>
                                            <div className="text-[10px] font-black text-blue-800 uppercase tracking-widest mt-2">Pretelan</div>
                                        </div>
                                        <div className="text-center p-6 bg-purple-50 rounded-2xl border border-purple-100">
                                            <div className="text-3xl font-black text-purple-600">{processStats2.duplicate_count}</div>
                                            <div className="text-[10px] font-black text-purple-800 uppercase tracking-widest mt-2">Duplikat</div>
                                        </div>
                                        <div className="text-center p-6 bg-amber-50 rounded-2xl border border-amber-100">
                                            <div className="text-3xl font-black text-amber-600">{processStats2.unmatched_excel_count}</div>
                                            <div className="text-[10px] font-black text-amber-800 uppercase tracking-widest mt-2">Excel Only</div>
                                        </div>
                                        <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-100">
                                            <div className="text-3xl font-black text-red-600">{processStats2.unmatched_pdf_count}</div>
                                            <div className="text-[10px] font-black text-red-800 uppercase tracking-widest mt-2">PDF Only</div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* Modal Data Resi & Pesanan */}
                            {showMatchedModal2 && processStats2?.matched_with_awb && createPortal(
                                <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setShowMatchedModal2(false)}>
                                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                            <h3 className="text-xl font-black text-gray-900">Data Berhasil Diproses</h3>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        const text = processStats2.matched_with_awb?.map((item: any) => {
                                                        let parsed = item;
                                                        if (typeof item === 'string' && item.startsWith('{')) {
                                                            try { parsed = JSON.parse(item); } catch(e) {}
                                                        }
                                                        const isObj = typeof parsed === 'object' && parsed !== null;
                                                        const awb = isObj ? parsed.awb : parsed;
                                                        const id_pesanan = isObj ? parsed.id_pesanan : '-';
                                                        return `${id_pesanan}\t${awb}`;
                                                    }).join('\n') || '';
                                                        navigator.clipboard.writeText(text);
                                                        setIsCopiedModalData(true);
                                                        setTimeout(() => setIsCopiedModalData(false), 2000);
                                                        showToast('Berhasil disalin ke clipboard');
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
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            Copy Data
                                                        </>
                                                    )}
                                                </button>
                                                <button onClick={() => setShowMatchedModal2(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
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
                                            <div className="space-y-1">
                                                {processStats2.matched_with_awb.map((item, i) => (
                                                    <div key={i} className="grid grid-cols-2 gap-4 p-3 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all text-sm font-mono">
                                                        <div className="text-gray-600">{item.awb || '-'}</div>
                                                        <div className="text-gray-900 font-bold">{item.id_pesanan || '-'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )}

                            {/* PDF Preview List 2 */}
                            <div className="mt-12 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-black text-gray-500 mb-6 uppercase tracking-widest">Daftar File PDF</h3>
                                <FilePreviewTable files={pdfFiles2.map(f => ({ id: f.name + f.size, name: f.name, size: f.size, type: f.type }))} />
                            </div>
                        </div>
                    )
                ) : activeMenu === 'uploadTest' ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Ultra Premium Header Banner */}
                        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-900/15 border border-slate-800/80 relative overflow-hidden">
                            {/* Decorative Glowing Orbs */}
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start md:items-center gap-6">
                                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-blue-300 shadow-xl shadow-blue-500/20 flex-shrink-0 mr-1">
                                        <FiUploadCloud className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                                                Upload 2
                                            </h2>
                                            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                                Versi 2.4
                                            </span>
                                        </div>
                                        <p className="text-xs lg:text-sm font-medium text-slate-300 mt-1">
                                            Versi kloningan dari Upload 1 dengan kecepatan pencocokan tinggi
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => showToast('Gunakan file Excel Ginee & PDF label pengiriman.')}
                                    className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer group"
                                >
                                    <FiBookOpen className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span>Panduan Upload</span>
                                </button>
                            </div>

                            {/* Sub Description inside header */}
                            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-normal">
                                <span>Upload file Excel Ginee dan PDF label pengiriman untuk diproses otomatis secara presisi.</span>
                                <span className="hidden sm:inline-block text-[11px] text-blue-400 font-medium">⚡ Resi matched & split otomatis</span>
                            </div>
                        </div>

                        {/* Lock Warning */}
                        {testIsLocked && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs font-medium text-amber-900 shadow-sm">
                                <span className="flex items-center gap-2">
                                    <FiCheckCircle className="w-4 h-4 text-amber-600" />
                                    Proses selesai. Klik Reset untuk memulai upload baru.
                                </span>
                                <button
                                    onClick={resetTestForm}
                                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-sm"
                                >
                                    Reset Form
                                </button>
                            </div>
                        )}

                        {/* 2 Column Upload Cards Grid - Perfectly Aligned Heights */}
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch ${testIsLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Card 1: File Excel Ginee */}
                            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/40 p-6 flex flex-col justify-between hover:shadow-xl hover:border-emerald-300/80 transition-all duration-300 group h-full">
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-105 transition-transform">
                                                    <FaFileExcel className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-extrabold text-slate-800">File Excel Ginee</h3>
                                                    <p className="text-[11px] text-slate-500">Format data pesanan Ginee</p>
                                                </div>
                                            </div>
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold px-3 py-1 rounded-xl shadow-xs">.xlsx</span>
                                        </div>

                                        {/* Red Alert Note */}
                                        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-4 mb-4 flex items-start gap-3 text-red-600 shadow-xs">
                                            <FiAlertTriangle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-wide text-red-700 mb-0.5">PERHATIAN: FORMAT EXPORT GINEE</p>
                                                <p className="text-[11px] text-red-600 font-medium leading-relaxed">
                                                    Ekspor file dari Ginee menggunakan opsi <span className="font-bold underline decoration-red-300">"Berdasarkan Produk (Baris terpisah untuk pesanan dengan beberapa produk di dalamnya)"</span> dengan template default.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <FileDropzone
                                            label="Excel Ginee (.xlsx)"
                                            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            onFilesSelected={handleTestExcelSelect}
                                            selectedFileCount={testExcelFile ? 1 : 0}
                                            icon={<FaFileExcel className="w-9 h-9 text-emerald-500" />}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Card 2: File PDF Labels */}
                            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/40 p-6 flex flex-col justify-between hover:shadow-xl hover:border-rose-300/80 transition-all duration-300 group h-full">
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm group-hover:scale-105 transition-transform">
                                                    <FaFilePdf className="w-5 h-5 text-rose-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-extrabold text-slate-800">File PDF Labels</h3>
                                                    <p className="text-[11px] text-slate-500">Label resi cetakan PDF</p>
                                                </div>
                                            </div>
                                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-extrabold px-3 py-1 rounded-xl shadow-xs">.pdf</span>
                                        </div>

                                        {/* Info Alert Note */}
                                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 rounded-2xl p-4 mb-4 flex items-start gap-3 text-indigo-600 shadow-xs">
                                            <FiInfo className="w-4.5 h-4.5 text-indigo-600 flex-shrink-0 mt-0.5 animate-pulse" />
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-wide text-indigo-700 mb-0.5">TIPS: KUALITAS PDF LABELS</p>
                                                <p className="text-[11px] text-indigo-600 font-medium leading-relaxed">
                                                    Gunakan file PDF cetakan <span className="font-bold underline decoration-indigo-300">ASLI</span> hasil unduhan sistem. Jangan gunakan hasil scan atau gambar agar pemotongan resi berjalan akurat dan presisi sempurna.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <FileDropzone
                                            label="Label Pengiriman (.pdf)"
                                            accept=".pdf"
                                            multiple={true}
                                            onFilesSelected={handleTestPdfSelect}
                                            selectedFileCount={testPdfFiles.length}
                                            icon={<FaFilePdf className="w-10 h-10 text-rose-500" />}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Tips Banner Row */}
                        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-sky-50 border border-blue-200/70 rounded-2xl p-4 flex items-center justify-between text-blue-950 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                                    <FiFileText className="w-4.5 h-4.5" />
                                </div>
                                <p className="text-xs font-medium text-slate-700">
                                    <span className="font-bold text-blue-900">Tips Penting:</span> Pastikan data pada file Excel sudah benar sebelum diupload untuk mengoptimalkan keakuratan pencocokan resi.
                                </p>
                            </div>
                            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-lg">
                                <FiZap className="w-3.5 h-3.5" /> 100% Otomatis
                            </span>
                        </div>

                        {/* Ultra Premium MSKU Option Toggle Card */}
                        <div 
                            onClick={() => !testIsLocked && setIncludeGlobalMsku(!includeGlobalMsku)}
                            className={`bg-white rounded-3xl border-2 ${includeGlobalMsku ? 'border-blue-500/80 ring-4 ring-blue-500/10 shadow-md' : 'border-slate-200/90 shadow-sm'} p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg cursor-pointer select-none group ${testIsLocked ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <div className="flex items-start sm:items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105 flex-shrink-0 ${includeGlobalMsku ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    <FiLayers className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                                            Sertakan Halaman Rekap Keseluruhan (+ Total MSKU)
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                                        Menambahkan halaman ekstra ringkasan total pesanan & rincian MSKU di bagian akhir PDF.
                                    </p>
                                </div>
                            </div>

                            {/* Right iOS Toggle Switch & Status Pill */}
                            <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full transition-colors ${includeGlobalMsku ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {includeGlobalMsku ? '✓ AKTIF' : 'OFF'}
                                </span>
                                <div className={`w-14 h-8 rounded-full transition-colors duration-300 p-1 relative flex items-center ${includeGlobalMsku ? 'bg-blue-600 shadow-md shadow-blue-500/30' : 'bg-slate-300'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${includeGlobalMsku ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Action Control Panel - High Contrast Clear Border & Spacious Form */}
                        <div className="mt-8 bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 sm:p-8 lg:p-10 flex flex-col items-center">
                            {(testStatus === ProcessStatus.IDLE || testStatus === ProcessStatus.ERROR) && !testIsLocked && (
                                <div className="w-full max-w-lg flex flex-col items-center">
                                    <div className="mb-6 w-full">
                                        <label className="block text-xs font-black text-slate-800 mb-2.5 uppercase tracking-wider">
                                            Nama Picker / Operator <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                value={pickerName}
                                                onChange={(e) => setPickerName(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        if (pickerName.trim()) {
                                                            startTestProcessing();
                                                        }
                                                    }
                                                }}
                                                placeholder="Masukkan nama picker..."
                                                className="w-full px-5 py-3.5 bg-slate-50/60 border-2 border-slate-300 rounded-2xl text-sm font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none shadow-xs pr-12"
                                                required
                                            />
                                            {pickerName && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPickerName('')}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-200/60 hover:bg-slate-300/80 rounded-full p-1 transition-colors focus:outline-none"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        id="btn-process-test"
                                        onClick={startTestProcessing}
                                        disabled={!testExcelFile || testPdfFiles.length === 0}
                                        className={`w-full py-4 px-8 rounded-2xl font-extrabold text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-3 shadow-lg cursor-pointer transform hover:-translate-y-0.5 ${(!testExcelFile || testPdfFiles.length === 0)
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                                            : 'bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-[rgb(var(--theme-600))]/30 hover:shadow-xl hover:shadow-[rgb(var(--theme-600))]/40'
                                            }`}
                                    >
                                        <FiZap className="w-5 h-5" />
                                        <span>Proses Label Pengiriman</span>
                                    </button>
                                </div>
                            )}

                            {(testStatus === ProcessStatus.UPLOADING || testStatus === ProcessStatus.PROCESSING) && (
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Memproses...</span>
                                </div>
                            )}

                            {testStatus === ProcessStatus.COMPLETED && (
                                <div className="flex flex-col items-center gap-3">
                                    <span className="text-green-600 font-medium">✓ Selesai! PDF sudah terdownload.</span>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={resetTestForm}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                                        >
                                            Proses Baru
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPackingList(
                                                testExcelFile?.name || 'unknown.xlsx',
                                                processingTime || new Date().toISOString(),
                                                lastProcessedPdfName || (testPdfFiles.length > 0 ? testPdfFiles[0].name.replace(/\.pdf$/i, '') : undefined)
                                            )}
                                            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium flex items-center gap-2"
                                        >
                                            <FiClipboard className="w-4 h-4" />
                                            Packing List
                                        </button>
                                    </div>

                                    {/* Undo Button */}
                                    {testUndoTimer > 0 && testLastHistoryId && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`⚠️ PERHATIAN!\n\nApakah Anda yakin ingin MEMBATALKAN dan MENGHAPUS PERMANEN data yang baru saja diproses?\n\nTindakan ini akan:\n✗ Menghapus data dari history\n✗ Menghapus data dari database\n✗ Menghapus folder backup di server\n✗ Tidak bisa dibatalkan\n\nWaktu tersisa: ${testUndoTimer} detik\n\nKlik OK untuk lanjut ke verifikasi PIN.`)) {
                                                    setShowUndoPinModal(true);
                                                }
                                            }}
                                            disabled={testIsUndoing}
                                            className="w-full mt-6 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all animate-in fade-in slide-in-from-top-2"
                                        >
                                            {testIsUndoing ? (
                                                <span>Membatalkan...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    Batalkan & Hapus Permanen ({testUndoTimer}s)
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Progress */}
                        <div className="max-w-xl mx-auto mt-4">
                            <ProcessStatusView status={testStatus} progress={testProgress} error={testError} />
                        </div>

                        {/* Results */}
                        {testProcessStats && (
                            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-5">
                                <h3 className="text-sm font-medium text-gray-700 mb-4">Hasil Perbandingan</h3>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-5 gap-3">
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{testProcessStats.matched_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Match</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg" title="Halaman lanjutan">
                                        <div className="text-2xl font-bold text-blue-600">{testProcessStats.continuation_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Pretelan</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg" title="Duplikat asli">
                                        <div className="text-2xl font-bold text-purple-600">{testProcessStats.duplicate_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Duplikat</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-amber-600">{testProcessStats.unmatched_excel_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">Excel Only</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{testProcessStats.unmatched_pdf_count}</div>
                                        <div className="text-xs text-gray-500 mt-1">PDF Only</div>
                                    </div>
                                </div>

                                {/* ⚠️ Unmatched Alerts — Upload */}
                                {testProcessStats.unmatched_pdf_count > 0 && (
                                    <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-red-700">⚠️ PDF Only ({testProcessStats.unmatched_pdf_count}) — Label tidak terpakai!</p>
                                            <p className="text-xs text-red-600 mt-0.5">Ada <strong>{testProcessStats.unmatched_pdf_count}</strong> halaman PDF yang tidak cocok dengan data Excel. Cek kembali apakah ada label yang terlewat atau salah upload.</p>
                                        </div>
                                    </div>
                                )}
                                {testProcessStats.unmatched_excel_count > 0 && testProcessStats.unmatched_excel_count < 100 && (
                                    <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-amber-700">⚠️ Excel Only ({testProcessStats.unmatched_excel_count}) — Order tanpa label!</p>
                                            <p className="text-xs text-amber-600 mt-0.5">Ada <strong>{testProcessStats.unmatched_excel_count}</strong> order di Excel yang tidak memiliki label PDF yang cocok. Pastikan semua file PDF label sudah diupload.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Duplicate Details */}
                                {testProcessStats.duplicate_count > 0 && (
                                    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                            <span className="text-xs font-medium text-gray-600">Detail Duplikat</span>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="py-2 px-3 text-left text-gray-500">No</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">ID Pesanan</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">AWB</th>
                                                        <th className="py-2 px-3 text-left text-gray-500">Page</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {testProcessStats.duplicate_awbs.map((dup, idx) => (
                                                        <tr key={idx}>
                                                            <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                                                            <td className="py-2 px-3 font-mono text-gray-600">{dup.id_pesanan}</td>
                                                            <td className="py-2 px-3 font-mono text-gray-600">{dup.awb}</td>
                                                            <td className="py-2 px-3 text-gray-500">{dup.pdf_page}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Excel/PDF Only Lists */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-600">Excel Only ({testProcessStats.unmatched_excel_count})</span>
                                            {testProcessStats.unmatched_excel_awbs.length > 0 && (
                                                <button
                                                    onClick={() => copyToClipboard(testProcessStats.unmatched_excel_awbs, 'Excel Only')}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <FiCopy className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-24 overflow-y-auto">
                                            {testProcessStats.unmatched_excel_awbs.length > 0 ? (
                                                testProcessStats.unmatched_excel_awbs.map((awb, idx) => (
                                                    <div key={idx} className="text-xs py-1.5 px-3 font-mono text-gray-600 border-b border-gray-50">
                                                        {awb}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-green-600 text-xs py-3 text-center">✓ Semua match</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-600">PDF Only ({testProcessStats.unmatched_pdf_count})</span>
                                            {testProcessStats.unmatched_pdf_awbs.length > 0 && (
                                                <button
                                                    onClick={() => copyToClipboard(testProcessStats.unmatched_pdf_awbs, 'PDF Only')}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <FiCopy className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-24 overflow-y-auto">
                                            {testProcessStats.unmatched_pdf_awbs.length > 0 ? (
                                                testProcessStats.unmatched_pdf_awbs.map((awb, idx) => (
                                                    <div key={idx} className="text-xs py-1.5 px-3 font-mono text-gray-600 border-b border-gray-50">
                                                        {awb}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-green-600 text-xs py-3 text-center">✓ Semua match</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PDF Preview */}
                        <FilePreviewTable files={testPdfPreviewList} />

                        {/* Feature Highlights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                                    <FiCheckCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h5 className="font-extrabold text-slate-800 text-sm">Auto Matching</h5>
                                    <p className="text-xs text-slate-500 mt-0.5">AWB dicocokkan presisi otomatis</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                                    <FiZap className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h5 className="font-extrabold text-slate-800 text-sm">Proses Real-time</h5>
                                    <p className="text-xs text-slate-500 mt-0.5">Pengolahan label super cepat</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                                    <FiUploadCloud className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h5 className="font-extrabold text-slate-800 text-sm">Auto Download</h5>
                                    <p className="text-xs text-slate-500 mt-0.5">Hasil PDF langsung terunduh</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (activeMenu as string) === 'upload2' ? (
                    !isAuthenticatedKembar && !skipPinMenus.includes('upload2') ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-full max-w-md bg-white p-10 rounded-3xl border border-gray-100 shadow-2xl shadow-emerald-500/10">
                                <div className="text-center mb-10">
                                    <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-600/30 rotate-3 hover:rotate-0 transition-transform">
                                        <FiUnlock className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Upload Kembar</h2>
                                    <p className="text-gray-500 mt-3 text-sm font-medium">Akses terbatas. Masukkan PIN Keamanan.</p>
                                </div>

                                <form onSubmit={handleLoginKembar} className="space-y-8">
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={pinKembar}
                                            onChange={(e) => setPinKembar(e.target.value)}
                                            className="w-full text-center text-4xl font-mono tracking-[0.5em] py-5 border-b-4 border-gray-100 focus:border-emerald-500 outline-none transition-all bg-transparent text-gray-900 placeholder-gray-200"
                                            placeholder="••••"
                                            maxLength={4}
                                            autoFocus
                                        />
                                    </div>
                                    {errorKembar && (
                                        <div className="flex items-center justify-center gap-2 text-red-600 text-sm font-bold bg-red-50 py-4 rounded-2xl border border-red-100 animate-bounce">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            {errorKembar}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={pinKembar.length < 4}
                                        className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:grayscale"
                                    >
                                        VERIFIKASI AKSES
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* SQL Editor Overlay */}
                            {showSqlEditor && (
                                <div className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
                                    <div className="bg-gray-50 w-full max-w-6xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-white/20 flex flex-col">
                                        <div className="flex-1 overflow-hidden p-6">
                                            <SqlEditor 
                                                onClose={() => setShowSqlEditor(false)} 
                                                showToast={showToast}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-5">
                                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-600/20">
                                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Upload Kembar</h2>
                                        <p className="text-emerald-600 text-sm font-bold mt-1 uppercase tracking-wider">Optimized Batch Processing Session</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    
                                    <button
                                        onClick={() => {
                                            setIsAuthenticatedKembar(false);
                                            sessionStorage.removeItem('kembar_auth');
                                            showToast('Logout Berhasil');
                                        }}
                                        className="px-5 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                                    >
                                        LOGOUT
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-gray-600 leading-relaxed font-medium">
                                    Gunakan Menu Upload Kembar untuk memproses batch label tambahan tanpa mengganggu data di Menu Upload utama. Logika dan fitur tetap sinkron dengan sistem utama.
                                </p>
                            </div>

                            {/* Lock Warning */}
                            {testIsLocked && (
                                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between shadow-sm animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                        <span className="text-amber-800 font-bold">
                                            Proses selesai. Silakan Reset untuk memulai batch baru.
                                        </span>
                                    </div>
                                    <button
                                        onClick={resetTestForm}
                                        className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-amber-600/20"
                                    >
                                        RESET FORM
                                    </button>
                                </div>
                            )}

                            {/* Upload Cards */}
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${testIsLocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                <section className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            {ICONS.EXCEL}
                                        </div>
                                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">File Excel Ginee</h3>
                                    </div>
                                    <FileDropzone
                                        label="Excel Ginee (.xlsx)"
                                        accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onFilesSelected={handleTestExcelSelect}
                                        selectedFileCount={testExcelFile ? 1 : 0}
                                        icon={ICONS.EXCEL}
                                    />
                                </section>

                                <section className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            {ICONS.PDF}
                                        </div>
                                        <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">File PDF Labels</h3>
                                    </div>
                                    <FileDropzone
                                        label="Label Pengiriman (.pdf)"
                                        accept=".pdf"
                                        multiple={true}
                                        onFilesSelected={handleTestPdfSelect}
                                        selectedFileCount={testPdfFiles.length}
                                        icon={ICONS.PDF}
                                    />
                                </section>
                            </div>

                            {/* Action Button */}
                            <div className="mt-8 flex flex-col items-center">
                                {(testStatus === ProcessStatus.IDLE || testStatus === ProcessStatus.ERROR) && !testIsLocked && (
                                    <>
                                        <div className="mb-4 w-full max-w-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Picker <span className="text-red-500">*</span></label>
                                            <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={pickerName}
                                            onChange={(e) => setPickerName(e.target.value.toUpperCase())}
                                            placeholder="Masukkan nama picker"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                            required
                                        />
                                        {pickerName && (
                                            <button
                                                type="button"
                                                onClick={() => setPickerName('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                        </div>
                                        <button
                                            onClick={startTestProcessing}
                                            disabled={!testExcelFile || testPdfFiles.length === 0}
                                            className={`px-12 py-4 rounded-2xl text-lg font-black text-white transition-all shadow-2xl active:scale-95 ${(!testExcelFile || testPdfFiles.length === 0)
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                                                }`}
                                        >
                                            PROSES LABEL KEMBAR
                                        </button>
                                    </>
                                )}

                                {(testStatus === ProcessStatus.UPLOADING || testStatus === ProcessStatus.PROCESSING) && (
                                    <div className="flex flex-col items-center gap-4 bg-white px-10 py-6 rounded-3xl border border-gray-100 shadow-xl">
                                        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-gray-900 font-black tracking-tight uppercase text-sm">Sedang Memproses Data...</span>
                                    </div>
                                )}

                                {testStatus === ProcessStatus.COMPLETED && (
                                    <div className="flex flex-col items-center gap-6 bg-white p-8 rounded-3xl border border-emerald-100 shadow-2xl shadow-emerald-500/10">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                                            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-emerald-600 text-xl font-black tracking-tight">BATCH BERHASIL DIPROSES!</span>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={resetTestForm}
                                                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-sm transition-all"
                                            >
                                                PROSES BARU
                                            </button>
                                        </div>

                                        {/* Undo Button 2 */}
                                        {undoTimer2 > 0 && lastHistoryId2 && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`⚠️ PERHATIAN!\n\nApakah Anda yakin ingin MEMBATALKAN dan MENGHAPUS PERMANEN data yang baru saja diproses?\n\nTindakan ini akan:\n✗ Menghapus data dari history\n✗ Menghapus data dari database\n✗ Menghapus folder backup di server\n✗ Tidak bisa dibatalkan\n\nWaktu tersisa: ${undoTimer2} detik\n\nKlik OK untuk lanjut ke verifikasi PIN.`)) {
                                                        setShowUndoPinModal(true);
                                                    }
                                                }}
                                                disabled={isUndoing2}
                                                className="w-full mt-4 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all border border-red-100"
                                            >
                                                {isUndoing2 ? <span>Membatalkan...</span> : <span>BATALKAN & HAPUS PERMANEN ({undoTimer2}s)</span>}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Progress 2 */}
                            <div className="max-w-2xl mx-auto mt-4">
                                <ProcessStatusView status={testStatus} progress={progress2} error={testError} />
                            </div>

                            {/* Results 2 */}
                            {testProcessStats && (
                                <div className="mt-12 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                    <h3 className="text-lg font-black text-gray-900 mb-8 uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Statistik Batch Kembar</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <div className="text-3xl font-black text-emerald-600">{testProcessStats.matched_count}</div>
                                            <div className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mt-2">Match</div>
                                        </div>
                                        <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                            <div className="text-3xl font-black text-blue-600">{testProcessStats.continuation_count}</div>
                                            <div className="text-[10px] font-black text-blue-800 uppercase tracking-widest mt-2">Pretelan</div>
                                        </div>
                                        <div className="text-center p-6 bg-purple-50 rounded-2xl border border-purple-100">
                                            <div className="text-3xl font-black text-purple-600">{testProcessStats.duplicate_count}</div>
                                            <div className="text-[10px] font-black text-purple-800 uppercase tracking-widest mt-2">Duplikat</div>
                                        </div>
                                        <div className="text-center p-6 bg-amber-50 rounded-2xl border border-amber-100">
                                            <div className="text-3xl font-black text-amber-600">{testProcessStats.unmatched_excel_count}</div>
                                            <div className="text-[10px] font-black text-amber-800 uppercase tracking-widest mt-2">Excel Only</div>
                                        </div>
                                        <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-100">
                                            <div className="text-3xl font-black text-red-600">{testProcessStats.unmatched_pdf_count}</div>
                                            <div className="text-[10px] font-black text-red-800 uppercase tracking-widest mt-2">PDF Only</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PDF Preview List 2 */}
                            <div className="mt-12 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-black text-gray-500 mb-6 uppercase tracking-widest">Daftar File PDF</h3>
                                <FilePreviewTable files={testPdfFiles.map(f => ({ id: f.name + f.size, name: f.name, size: f.size, type: f.type }))} />
                            </div>
                        </div>
                    )
                ) : activeMenu === 'bulkUpload' ? (
                    <div className="space-y-8">
                        {/* Header Section */}
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Upload Massal</h2>
                                <p className="text-blue-500 text-sm font-medium mt-0.5">Proses batch file dengan efisien</p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 leading-relaxed">
                            Unggah file Excel data utama dan file PDF label untuk diproses secara otomatis. Sistem kami memastikan setiap file diproses dengan akurat dan terorganisir.
                        </p>

                        {/* Batch Counter / Reset Area */}
                        {(bulkProcessedCount > 0 || bulkExcelFile) && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                                <span className="text-green-800 font-medium flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {bulkProcessedCount > 0 ? `${bulkProcessedCount} batch sudah diproses` : 'File Excel Terupload'}
                                </span>
                                <button onClick={resetBulkUpload} className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200">
                                    Reset Semua
                                </button>
                            </div>
                        )}

                        {/* Main Upload Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Step 1: Excel Upload */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                    <h3 className="font-semibold text-gray-900">Pilih File Excel Data</h3>
                                    {bulkExcelFile && <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>}
                                </div>
                                <p className="text-gray-500 text-sm ml-10 mb-4">Format: .xlsx, .xls</p>

                                <div className="ml-10">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-gray-700">File Excel Ginee</p>
                                    </div>
                                    {/* RED WARNING NOTE */}
                                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-300 rounded-lg px-3.5 py-2.5 mb-3">
                                        <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div>
                                            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Perhatian: Format Export Ginee</p>
                                            <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                                                Ekspor file dari Ginee menggunakan opsi <span className="font-semibold">"Berdasarkan Produk (Baris terpisah untuk pesanan dengan beberapa produk di dalamnya)"</span> dengan <span className="font-semibold">template default</span>.
                                            </p>
                                        </div>
                                    </div>
                                    {!bulkExcelFile ? (
                                        <FileDropzone accept=".xlsx,.xls" onFilesSelected={handleBulkExcelSelect} icon={ICONS.EXCEL} label="Excel Ginee (.xlsx, .xls)" selectedFileCount={0} />
                                    ) : (
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">{ICONS.EXCEL}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{bulkExcelFile.name}</p>
                                                    <p className="text-sm text-gray-500">{(bulkExcelFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Arrow Separator */}
                            <div className="flex justify-center py-2 bg-gray-50">
                                <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                </div>
                            </div>

                            {/* Step 2: PDF Upload */}
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                    <h3 className="font-semibold text-gray-900">Pilih File PDF Label</h3>
                                    {bulkPdfFiles.length > 0 && <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>}
                                </div>
                                <p className="text-gray-500 text-sm ml-10 mb-4">Format: .pdf</p>

                                <div className="ml-10">
                                    <p className="text-sm font-medium text-gray-700 mb-2">PDF Label Batch</p>
                                    <FileDropzone accept=".pdf" onFilesSelected={handleBulkPdfSelect} icon={ICONS.PDF} label="File PDF Label (.pdf)" multiple selectedFileCount={bulkPdfFiles.length} />
                                    {bulkPdfFiles.length > 0 && (
                                        <p className="text-sm text-green-600 mt-2 font-medium">
                                            ✓ {bulkPdfFiles.length} file PDF dipilih
                                        </p>
                                    )}

                                    {/* Duplicate PDF Warning */}
                                    {(() => {
                                        const pdfNames = bulkPdfFiles.map(f => f.name);
                                        const duplicates = pdfNames.filter((name, index) => pdfNames.indexOf(name) !== index);
                                        const uniqueDuplicates = Array.from(new Set(duplicates));

                                        if (uniqueDuplicates.length > 0) {
                                            return (
                                                <div className="mt-3 bg-red-50 border border-red-300 rounded-lg p-3">
                                                    <div className="flex gap-2">
                                                        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-red-800">PDF Duplikat Terdeteksi!</p>
                                                            <p className="text-xs text-red-700 mt-1">File berikut diupload lebih dari 1x:</p>
                                                            <ul className="mt-2 space-y-1">
                                                                {uniqueDuplicates.map((name, idx) => (
                                                                    <li key={idx} className="text-xs text-red-700 font-mono bg-red-100 px-2 py-1 rounded">
                                                                        {name}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <p className="text-xs text-red-700 mt-2 font-medium">⚠️ Hapus duplikat dan upload ulang untuk melanjutkan.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* MSKU Option Toggle Card */}
                        <div 
                            onClick={() => setIncludeGlobalMsku(!includeGlobalMsku)}
                            className={`bg-white rounded-3xl border-2 ${includeGlobalMsku ? 'border-emerald-500/80 ring-4 ring-emerald-500/10 shadow-md' : 'border-slate-200/90 shadow-sm'} p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:border-emerald-400 hover:shadow-lg cursor-pointer select-none group`}
                        >
                            <div className="flex items-start sm:items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105 flex-shrink-0 ${includeGlobalMsku ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    <FiLayers className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                            Sertakan Halaman Rekap Keseluruhan (+ Total MSKU)
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                                        Menambahkan halaman ekstra ringkasan total pesanan & rincian MSKU di bagian akhir PDF.
                                    </p>
                                </div>
                            </div>

                            {/* Right iOS Toggle Switch & Status Pill */}
                            <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full transition-colors ${includeGlobalMsku ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {includeGlobalMsku ? '✓ AKTIF' : 'OFF'}
                                </span>
                                <div className={`w-14 h-8 rounded-full transition-colors duration-300 p-1 relative flex items-center ${includeGlobalMsku ? 'bg-emerald-600 shadow-md shadow-emerald-500/30' : 'bg-slate-300'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${includeGlobalMsku ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Action Control Panel */}
                        <div className="mt-8 bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 sm:p-8 lg:p-10 flex flex-col items-center">
                            <div className="w-full max-w-lg flex flex-col items-center">
                                <div className="mb-6 w-full">
                                    <label className="block text-xs font-black text-slate-800 mb-2.5 uppercase tracking-wider">
                                        Nama Picker / Operator <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={pickerName}
                                            onChange={(e) => setPickerName(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const btn = document.getElementById('btn-process-bulk') as HTMLButtonElement;
                                                    if (btn && !btn.disabled) btn.click();
                                                }
                                            }}
                                            placeholder="Masukkan nama picker..."
                                            className="w-full px-5 py-3.5 bg-slate-50/60 border-2 border-slate-300 rounded-2xl text-sm font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none shadow-xs pr-12"
                                            required
                                        />
                                        {pickerName && (
                                            <button
                                                type="button"
                                                onClick={() => setPickerName('')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-200/60 hover:bg-slate-300/80 rounded-full p-1 transition-colors focus:outline-none"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    id="btn-process-bulk"
                                    onClick={startBulkProcessing}
                                    disabled={!pickerName.trim() || !bulkExcelFile || bulkPdfFiles.length === 0 || bulkStatus === ProcessStatus.PROCESSING || (() => {
                                        const pdfNames = bulkPdfFiles.map(f => f.name);
                                        return pdfNames.length !== new Set(pdfNames).size;
                                    })()}
                                    className={`w-full py-4 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${!pickerName.trim() || !bulkExcelFile || bulkPdfFiles.length === 0 || (() => {
                                        const pdfNames = bulkPdfFiles.map(f => f.name);
                                        return pdfNames.length !== new Set(pdfNames).size;
                                    })()
                                        ? 'bg-blue-50 text-blue-400 border-2 border-dashed border-blue-200 cursor-not-allowed'
                                        : bulkStatus === ProcessStatus.PROCESSING
                                            ? 'bg-blue-100 text-blue-600 cursor-wait'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                                        }`}
                                >
                                    {bulkStatus === ProcessStatus.PROCESSING ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                            Memproses...
                                        </>
                                    ) : !pickerName.trim() || !bulkExcelFile || bulkPdfFiles.length === 0 ? (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                            Lengkapi File Excel & PDF
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Proses Batch #{bulkProcessedCount + 1}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Verification Note */}
                        <p className="text-center text-gray-400 text-sm">Verifikasi format file sebelum memproses untuk hasil yang optimal</p>

                        {/* Bulk Stats */}
                        {bulkStats && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h4 className="font-semibold text-gray-900 mb-4">Hasil Batch #{bulkProcessedCount}</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="bg-green-50 rounded-xl p-4"><p className="text-3xl font-bold text-green-600">{bulkStats.matched_count}</p><p className="text-sm text-gray-600 mt-1">Matched</p></div>
                                    <div className="bg-yellow-50 rounded-xl p-4"><p className="text-3xl font-bold text-yellow-600">{bulkStats.unmatched_excel_count}</p><p className="text-sm text-gray-600 mt-1">Excel Only</p></div>
                                    <div className="bg-red-50 rounded-xl p-4"><p className="text-3xl font-bold text-red-600">{bulkStats.unmatched_pdf_count}</p><p className="text-sm text-gray-600 mt-1">PDF Only</p></div>
                                </div>

                                {/* ⚠️ Unmatched Alerts — Upload Massal */}
                                {bulkStats.unmatched_pdf_count > 0 && (
                                    <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-red-700">⚠️ PDF Only ({bulkStats.unmatched_pdf_count}) — Label tidak terpakai!</p>
                                            <p className="text-xs text-red-600 mt-0.5">Ada <strong>{bulkStats.unmatched_pdf_count}</strong> halaman PDF yang tidak cocok dengan data Excel. Cek kembali file PDF batch ini.</p>
                                        </div>
                                    </div>
                                )}
                                {bulkStats.unmatched_excel_count > 0 && bulkStats.unmatched_excel_count < 100 && (
                                    <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-amber-700">⚠️ Excel Only ({bulkStats.unmatched_excel_count}) — Order tanpa label!</p>
                                            <p className="text-xs text-amber-600 mt-0.5">Ada <strong>{bulkStats.unmatched_excel_count}</strong> order di Excel yang tidak memiliki label PDF. Pastikan file PDF batch ini lengkap.</p>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-6 flex flex-col items-center gap-3 w-full">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={resetBulkUpload}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                                        >
                                            Proses Baru
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPackingList(
                                                bulkExcelFile?.name || 'unknown.xlsx',
                                                processingTime || new Date().toISOString(),
                                                lastProcessedPdfName || (bulkPdfFiles.length > 0 ? bulkPdfFiles[0].name.replace(/\.pdf$/i, '') : undefined)
                                            )}
                                            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium flex items-center gap-2"
                                        >
                                            <FiClipboard className="w-4 h-4" />
                                            Packing List
                                        </button>
                                    </div>

                                    {/* Matched Data Result */}
                                    {bulkStats?.matched_with_awb && bulkStats.matched_with_awb.length > 0 && (
                                        <div className="mt-2 flex justify-center w-full">
                                            <button 
                                                onClick={() => setShowMatchedModalBulk(true)}
                                                className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                                Lihat Data Resi & Pesanan Berhasil ({bulkStats.matched_with_awb.length})
                                            </button>
                                        </div>
                                    )}

                                    {/* Undo Button - Bulk */}
                                    {undoTimer > 0 && lastHistoryId && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`⚠️ PERHATIAN!\n\nApakah Anda yakin ingin MEMBATALKAN dan MENGHAPUS PERMANEN data batch ini?\n\nTindakan ini akan:\n✗ Menghapus data dari history\n✗ Menghapus data dari database\n✗ Tidak bisa dibatalkan\n\nWaktu tersisa: ${undoTimer} detik\n\nKlik OK untuk lanjut ke verifikasi password.`)) {
                                                    setShowUndoPinModal(true);
                                                }
                                            }}
                                            disabled={isUndoing}
                                            className="w-full mt-6 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all animate-in fade-in slide-in-from-top-2"
                                        >
                                            {isUndoing ? (
                                                <span>Membatalkan...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    Batalkan & Hapus Permanen ({undoTimer}s)
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Modal Data Resi & Pesanan Bulk */}
                        {showMatchedModalBulk && bulkStats?.matched_with_awb && createPortal(
                            <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setShowMatchedModalBulk(false)}>
                                <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="text-xl font-black text-gray-900">Data Berhasil Diproses</h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    const text = bulkStats.matched_with_awb?.map((item: any) => {
                                                        let parsed = item;
                                                        if (typeof item === 'string' && item.startsWith('{')) {
                                                            try { parsed = JSON.parse(item); } catch(e) {}
                                                        }
                                                        const isObj = typeof parsed === 'object' && parsed !== null;
                                                        const awb = isObj ? parsed.awb : parsed;
                                                        const id_pesanan = isObj ? parsed.id_pesanan : '-';
                                                        return `${id_pesanan}\t${awb}`;
                                                    }).join('\n') || '';
                                                    navigator.clipboard.writeText(text);
                                                    showToast('Berhasil disalin ke clipboard');
                                                }}
                                                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                </svg>
                                                Copy Data
                                            </button>
                                            <button onClick={() => setShowMatchedModalBulk(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6 overflow-y-auto bg-gray-50/30">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    <th className="p-3 rounded-tl-xl">ID Pesanan</th>
                                                    <th className="p-3 rounded-tr-xl">AWB / Resi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {bulkStats.matched_with_awb.map((item: any, idx: number) => {
                                                    let parsed = item;
                                                    if (typeof item === 'string' && item.startsWith('{')) {
                                                        try { parsed = JSON.parse(item); } catch(e) {}
                                                    }
                                                    const isObj = typeof parsed === 'object' && parsed !== null;
                                                    const awbStr = isObj ? parsed.awb : parsed;
                                                    const idPesanan = isObj ? parsed.id_pesanan : '-';
                                                    return (
                                                        <tr key={idx} className="bg-white hover:bg-emerald-50 transition-colors">
                                                            <td className="p-3 font-mono text-sm text-gray-700 font-semibold border-l border-gray-100">{idPesanan}</td>
                                                            <td className="p-3 font-mono text-sm text-gray-500 border-r border-gray-100">{awbStr}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* Feature Highlights */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Data Terstruktur</h5>
                                <p className="text-xs text-gray-500 mt-1">File Excel divalidasi otomatis</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Proses Cepat</h5>
                                <p className="text-xs text-gray-500 mt-1">Batch processing real-time</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Akurat & Andal</h5>
                                <p className="text-xs text-gray-500 mt-1">Hasil terverifikasi 100%</p>
                            </div>
                        </div>

                        {bulkPdfFiles.length > 0 && <FilePreviewTable files={bulkPdfPreviewList} />}
                    </div>
                ) : (activeMenu === 'bulkUploadTest' || activeMenu === 'bulkUploadTes' || activeMenu === 'bulkUploadTestMsku') ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Ultra Premium Header Banner */}
                        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-900/15 border border-slate-800/80 relative overflow-hidden">
                            {/* Decorative Glowing Orbs */}
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start md:items-center gap-6">
                                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-emerald-300 shadow-xl shadow-emerald-500/20 flex-shrink-0 mr-1">
                                        <FiUploadCloud className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                                                {activeMenu === 'bulkUploadTestMsku' ? 'Upload Massal 2 (+ Total MSKU)' : activeMenu === 'bulkUploadTes' ? 'Upload Massal Label' : 'Upload Massal 2'}
                                            </h2>
                                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                                Batch Processing
                                            </span>
                                        </div>
                                        <p className="text-xs lg:text-sm font-medium text-slate-300 mt-1">
                                            {activeMenu === 'bulkUploadTestMsku' ? 'Upload Massal 2 dengan ekstra halaman rekap Total MSKU' : activeMenu === 'bulkUploadTes' ? 'Pengolahan label pengiriman secara massal/batch (Versi Tes)' : 'Pengolahan label pengiriman secara massal/batch dengan kecepatan pencocokan tinggi'}
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => showToast('Gunakan 1 file Excel Ginee & beberapa file PDF label pengiriman batch.')}
                                    className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer group"
                                >
                                    <FiBookOpen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span>Panduan Upload Massal</span>
                                </button>
                            </div>

                            {/* Sub Description inside header */}
                            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-normal">
                                <span>Unggah file Excel data utama dan file-file PDF label untuk diproses otomatis secara presisi per batch.</span>
                                <span className="hidden sm:inline-block text-[11px] text-emerald-400 font-medium">⚡ Batch processing matched & split otomatis</span>
                            </div>
                        </div>

                        {/* Batch Counter / Reset Area */}
                        {(bulkTestProcessedCount > 0 || bulkTestExcelFile) && (
                            <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex items-center justify-between text-xs font-medium text-emerald-950 shadow-sm">
                                <span className="flex items-center gap-2 font-bold text-emerald-800">
                                    <FiCheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                                    {bulkTestProcessedCount > 0 ? `${bulkTestProcessedCount} batch telah berhasil diproses` : 'File Excel data utama telah terupload'}
                                </span>
                                <button 
                                    onClick={resetBulkTestUpload} 
                                    className="text-xs text-red-600 hover:text-white font-extrabold px-4 py-1.5 bg-red-100/80 hover:bg-red-600 rounded-xl transition-all border border-red-200 shadow-xs cursor-pointer"
                                >
                                    Reset Semua
                                </button>
                            </div>
                        )}

                        {/* 2 Column Upload Cards Grid - Perfectly Aligned Heights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                            {/* Card 1: File Excel Data Utama */}
                            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/40 p-6 flex flex-col justify-between hover:shadow-xl hover:border-emerald-300/80 transition-all duration-300 group h-full">
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-105 transition-transform">
                                                    <FaFileExcel className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-extrabold text-slate-800">1. File Excel Data Utama</h3>
                                                    <p className="text-[11px] text-slate-500">Master data pesanan Ginee</p>
                                                </div>
                                            </div>
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold px-3 py-1 rounded-xl shadow-xs">.xlsx</span>
                                        </div>

                                        {/* Red Alert Note */}
                                        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-4 mb-4 flex items-start gap-3 text-red-600 shadow-xs">
                                            <FiAlertTriangle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-wide text-red-700 mb-0.5">PERHATIAN: FORMAT EXPORT GINEE</p>
                                                <p className="text-[11px] text-red-600 font-medium leading-relaxed">
                                                    Ekspor file dari Ginee menggunakan opsi <span className="font-bold underline decoration-red-300">"Berdasarkan Produk (Baris terpisah untuk pesanan dengan beberapa produk di dalamnya)"</span> dengan template default.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        {!bulkTestExcelFile ? (
                                            <FileDropzone 
                                                accept=".xlsx,.xls" 
                                                onFilesSelected={handleBulkTestExcelSelect} 
                                                icon={<FaFileExcel className="w-9 h-9 text-emerald-500" />} 
                                                label="Excel Ginee (.xlsx, .xls)" 
                                                selectedFileCount={0} 
                                            />
                                        ) : (
                                            <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
                                                        <FaFileExcel className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-extrabold text-slate-800 text-sm truncate">{bulkTestExcelFile.name}</p>
                                                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">{(bulkTestExcelFile.size / 1024 / 1024).toFixed(2)} MB • Ter-upload</p>
                                                    </div>
                                                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">TERHUBUNG</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Card 2: File PDF Labels Batch */}
                            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/40 p-6 flex flex-col justify-between hover:shadow-xl hover:border-rose-300/80 transition-all duration-300 group h-full">
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm group-hover:scale-105 transition-transform">
                                                    <FaFilePdf className="w-5 h-5 text-rose-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-extrabold text-slate-800">2. File PDF Labels Batch</h3>
                                                    <p className="text-[11px] text-slate-500">Beberapa file PDF label sekaligus</p>
                                                </div>
                                            </div>
                                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-extrabold px-3 py-1 rounded-xl shadow-xs">.pdf</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <FileDropzone 
                                            accept=".pdf" 
                                            onFilesSelected={handleBulkTestPdfSelect} 
                                            icon={<FaFilePdf className="w-10 h-10 text-rose-500" />} 
                                            label="File PDF Label (.pdf)" 
                                            multiple={true} 
                                            selectedFileCount={bulkTestPdfFiles.length} 
                                        />

                                        {/* Duplicate PDF Warning Banner */}
                                        {(() => {
                                            const pdfNames = bulkTestPdfFiles.map(f => f.name);
                                            const duplicates = pdfNames.filter((name, index) => pdfNames.indexOf(name) !== index);
                                            const uniqueDuplicates = Array.from(new Set(duplicates));

                                            if (uniqueDuplicates.length > 0) {
                                                return (
                                                    <div className="mt-3 bg-red-50 border border-red-300/80 rounded-2xl p-4 text-xs">
                                                        <div className="flex items-start gap-2.5">
                                                            <FiAlertTriangle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
                                                            <div className="flex-1">
                                                                <p className="font-extrabold text-red-800 uppercase tracking-wide">PDF Duplikat Terdeteksi!</p>
                                                                <p className="text-red-700 mt-0.5">File berikut diupload lebih dari 1x:</p>
                                                                <ul className="mt-2 space-y-1">
                                                                    {uniqueDuplicates.map((name, idx) => (
                                                                        <li key={idx} className="font-mono text-red-700 bg-red-100/90 px-2.5 py-1 rounded-lg border border-red-200 truncate">
                                                                            {name}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                                <p className="text-red-700 mt-2 font-bold">⚠️ Hapus duplikat dan upload ulang untuk melanjutkan.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Tips Banner Row */}
                        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-sky-50 border border-emerald-200/70 rounded-2xl p-4 flex items-center justify-between text-emerald-950 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                                    <FiFileText className="w-4.5 h-4.5" />
                                </div>
                                <p className="text-xs font-medium text-slate-700">
                                    <span className="font-bold text-emerald-900">Tips Massal:</span> Upload 1 file Excel data utama terlebih dahulu, kemudian upload file-file PDF per batch untuk diproses bertahap.
                                </p>
                            </div>
                            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                                <FiZap className="w-3.5 h-3.5" /> Batch Processing
                            </span>
                        </div>

                        {/* Ultra Premium MSKU Option Toggle Card */}
                        <div 
                            onClick={() => setIncludeGlobalMsku(!includeGlobalMsku)}
                            className={`bg-white rounded-3xl border-2 ${includeGlobalMsku ? 'border-emerald-500/80 ring-4 ring-emerald-500/10 shadow-md' : 'border-slate-200/90 shadow-sm'} p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:border-emerald-400 hover:shadow-lg cursor-pointer select-none group`}
                        >
                            <div className="flex items-start sm:items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105 flex-shrink-0 ${includeGlobalMsku ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    <FiLayers className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                            Sertakan Halaman Rekap Keseluruhan (+ Total MSKU)
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                                        Menambahkan halaman ekstra ringkasan total pesanan & rincian MSKU di bagian akhir PDF.
                                    </p>
                                </div>
                            </div>

                            {/* Right iOS Toggle Switch & Status Pill */}
                            <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full transition-colors ${includeGlobalMsku ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {includeGlobalMsku ? '✓ AKTIF' : 'OFF'}
                                </span>
                                <div className={`w-14 h-8 rounded-full transition-colors duration-300 p-1 relative flex items-center ${includeGlobalMsku ? 'bg-emerald-600 shadow-md shadow-emerald-500/30' : 'bg-slate-300'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${includeGlobalMsku ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Action Control Panel - High Contrast Clear Border & Spacious Form */}
                        <div className="mt-8 bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 sm:p-8 lg:p-10 flex flex-col items-center">
                            <div className="w-full max-w-lg flex flex-col items-center">
                                <div className="mb-6 w-full">
                                    <label className="block text-xs font-black text-slate-800 mb-2.5 uppercase tracking-wider">
                                        Nama Picker / Operator <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={pickerName}
                                            onChange={(e) => setPickerName(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const btn = document.getElementById('btn-process-bulk-test') as HTMLButtonElement;
                                                    if (btn && !btn.disabled) btn.click();
                                                }
                                            }}
                                            placeholder="Masukkan nama picker..."
                                            className="w-full px-5 py-3.5 bg-slate-50/60 border-2 border-slate-300 rounded-2xl text-sm font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all outline-none shadow-xs pr-12"
                                            required
                                        />
                                        {pickerName && (
                                            <button
                                                type="button"
                                                onClick={() => setPickerName('')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-200/60 hover:bg-slate-300/80 rounded-full p-1 transition-colors focus:outline-none"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    id="btn-process-bulk-test"
                                    onClick={startBulkTestProcessing}
                                    disabled={!pickerName.trim() || !bulkTestExcelFile || bulkTestPdfFiles.length === 0 || bulkTestStatus === ProcessStatus.PROCESSING || (() => {
                                        const pdfNames = bulkTestPdfFiles.map(f => f.name);
                                        return pdfNames.length !== new Set(pdfNames).size;
                                    })()}
                                    className={`w-full py-4 px-8 rounded-2xl font-extrabold text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-3 shadow-lg cursor-pointer transform hover:-translate-y-0.5 ${(!pickerName.trim() || !bulkTestExcelFile || bulkTestPdfFiles.length === 0 || (() => {
                                        const pdfNames = bulkTestPdfFiles.map(f => f.name);
                                        return pdfNames.length !== new Set(pdfNames).size;
                                    })())
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                                        : bulkTestStatus === ProcessStatus.PROCESSING
                                            ? 'bg-emerald-100 text-emerald-600 cursor-wait'
                                            : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40'
                                        }`}
                                >
                                    {bulkTestStatus === ProcessStatus.PROCESSING ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                            <span>Memproses Batch...</span>
                                        </>
                                    ) : !pickerName.trim() || !bulkTestExcelFile || bulkTestPdfFiles.length === 0 ? (
                                        <>
                                            <FiUploadCloud className="w-5 h-5" />
                                            <span>Lengkapi File Excel & PDF</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiZap className="w-5 h-5" />
                                            <span>Proses Batch #{bulkTestProcessedCount + 1}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Bulk Stats */}
                        {bulkTestStats && (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 lg:p-8">
                                <h4 className="font-extrabold text-slate-900 text-lg mb-4">Hasil Batch #{bulkTestProcessedCount}</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100"><p className="text-3xl font-extrabold text-emerald-600">{bulkTestStats.matched_count}</p><p className="text-xs font-bold text-slate-600 mt-1">Matched</p></div>
                                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100"><p className="text-3xl font-extrabold text-amber-600">{bulkTestStats.unmatched_excel_count}</p><p className="text-xs font-bold text-slate-600 mt-1">Excel Only</p></div>
                                    <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100"><p className="text-3xl font-extrabold text-rose-600">{bulkTestStats.unmatched_pdf_count}</p><p className="text-xs font-bold text-slate-600 mt-1">PDF Only</p></div>
                                </div>

                                {/* ⚠️ Unmatched Alerts — Upload Massal 2 */}
                                {bulkTestStats.unmatched_pdf_count > 0 && (
                                    <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                                        <FiAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-extrabold text-red-700">⚠️ PDF Only ({bulkTestStats.unmatched_pdf_count}) — Label tidak terpakai!</p>
                                            <p className="text-xs text-red-600 mt-0.5">Ada <strong>{bulkTestStats.unmatched_pdf_count}</strong> halaman PDF yang tidak cocok dengan data Excel. Cek kembali file PDF batch ini.</p>
                                        </div>
                                    </div>
                                )}
                                {bulkTestStats.unmatched_excel_count > 0 && bulkTestStats.unmatched_excel_count < 100 && (
                                    <div className="mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                                        <FiAlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-700">⚠️ Excel Only ({bulkTestStats.unmatched_excel_count}) — Order tanpa label!</p>
                                            <p className="text-xs text-amber-600 mt-0.5">Ada <strong>{bulkTestStats.unmatched_excel_count}</strong> order di Excel yang tidak memiliki label PDF. Pastikan file PDF batch ini lengkap.</p>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-6 flex flex-col items-center gap-3 w-full">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={resetBulkTestUpload}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                                        >
                                            Proses Baru
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPackingList(
                                                bulkTestExcelFile?.name || 'unknown.xlsx',
                                                processingTime || new Date().toISOString(),
                                                lastProcessedPdfName || (bulkTestPdfFiles.length > 0 ? bulkTestPdfFiles[0].name.replace(/\.pdf$/i, '') : undefined)
                                            )}
                                            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium flex items-center gap-2"
                                        >
                                            <FiClipboard className="w-4 h-4" />
                                            Packing List
                                        </button>
                                    </div>

                                    {/* Matched Data Result */}
                                    {bulkTestStats?.matched_with_awb && bulkTestStats.matched_with_awb.length > 0 && (
                                        <div className="mt-2 flex justify-center w-full">
                                            <button 
                                                onClick={() => setShowMatchedModalBulkTest(true)}
                                                className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                                Lihat Data Resi & Pesanan Berhasil ({bulkTestStats.matched_with_awb.length})
                                            </button>
                                        </div>
                                    )}

                                    {/* Undo Button - Bulk */}
                                    {undoTimer > 0 && lastHistoryId && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`⚠️ PERHATIAN!\n\nApakah Anda yakin ingin MEMBATALKAN dan MENGHAPUS PERMANEN data batch ini?\n\nTindakan ini akan:\n✗ Menghapus data dari history\n✗ Menghapus data dari database\n✗ Tidak bisa dibatalkan\n\nWaktu tersisa: ${undoTimer} detik\n\nKlik OK untuk lanjut ke verifikasi PIN.`)) {
                                                    setShowUndoPinModal(true);
                                                }
                                            }}
                                            disabled={isUndoing}
                                            className="w-full mt-6 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all animate-in fade-in slide-in-from-top-2"
                                        >
                                            {isUndoing ? (
                                                <span>Membatalkan...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    Batalkan & Hapus Permanen ({undoTimer}s)
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Modal Data Resi & Pesanan Bulk Test */}
                        {showMatchedModalBulkTest && bulkTestStats?.matched_with_awb && createPortal(
                            <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4" onClick={() => setShowMatchedModalBulkTest(false)}>
                                <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="text-xl font-black text-gray-900">Data Berhasil Diproses</h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    const text = bulkTestStats.matched_with_awb?.map((item: any) => {
                                                        let parsed = item;
                                                        if (typeof item === 'string' && item.startsWith('{')) {
                                                            try { parsed = JSON.parse(item); } catch(e) {}
                                                        }
                                                        const isObj = typeof parsed === 'object' && parsed !== null;
                                                        const awb = isObj ? parsed.awb : parsed;
                                                        const id_pesanan = isObj ? parsed.id_pesanan : '-';
                                                        return `${id_pesanan}\t${awb}`;
                                                    }).join('\n') || '';
                                                    navigator.clipboard.writeText(text);
                                                    showToast('Berhasil disalin ke clipboard');
                                                }}
                                                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                </svg>
                                                Copy Data
                                            </button>
                                            <button onClick={() => setShowMatchedModalBulkTest(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6 overflow-y-auto bg-gray-50/30">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    <th className="p-3 rounded-tl-xl">ID Pesanan</th>
                                                    <th className="p-3 rounded-tr-xl">AWB / Resi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {bulkTestStats.matched_with_awb.map((item: any, idx: number) => {
                                                    let parsed = item;
                                                    if (typeof item === 'string' && item.startsWith('{')) {
                                                        try { parsed = JSON.parse(item); } catch(e) {}
                                                    }
                                                    const isObj = typeof parsed === 'object' && parsed !== null;
                                                    const awbStr = isObj ? parsed.awb : parsed;
                                                    const idPesanan = isObj ? parsed.id_pesanan : '-';
                                                    return (
                                                        <tr key={idx} className="bg-white hover:bg-emerald-50 transition-colors">
                                                            <td className="p-3 font-mono text-sm text-gray-700 font-semibold border-l border-gray-100">{idPesanan}</td>
                                                            <td className="p-3 font-mono text-sm text-gray-500 border-r border-gray-100">{awbStr}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* Feature Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0 shadow-xs">
                                    <FiCheckCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-slate-800 text-sm">Batch Terstruktur</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                        Data Excel dan PDF dipadankan otomatis dengan verifikasi presisi per batch.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0 shadow-xs">
                                    <FiZap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-slate-800 text-sm">Proses Kilat</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                        Pengolahan file berukuran besar secara bertahap tanpa membuat browser lambat.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0 shadow-xs">
                                    <FiDownload className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-slate-800 text-sm">Auto Download</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                        Hasil olahan label ter-download otomatis lengkap dengan packing list terpisah.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {bulkTestPdfFiles.length > 0 && <FilePreviewTable files={bulkTestPdfPreviewList} />}
                    </div>
                ) : activeMenu === 'bulkUploadPro' ? (
                    !isProUnlocked && !skipPinMenus.includes('bulkUploadPro') ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50/50">
                            <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                                <div className="text-center mb-8">
                                    <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 shadow-sm">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upload Massal Pro Access</h2>
                                    <p className="text-gray-500 mt-2 text-sm">Masukkan PIN untuk mengakses alat bantu</p>
                                </div>

                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                                    const pin = input.value;

                                    try {
                                        // Fallback hardcoded PIN
                                        if (pin === '1995' || pin === '1088') {
                                            proceed();
                                            return;
                                        }

                                        // Supabase lookup - allow multiple rows
                                        const { data, error: supabaseError } = await supabase
                                            .from('app_pins')
                                            .select('pin')
                                            .eq('role', 'bulk_pro');

                                        if (!supabaseError && data && data.some(row => row.pin === pin)) {
                                            proceed();
                                        } else {
                                            fail();
                                        }
                                    } catch (err) {
                                        console.error('PIN verification error:', err);
                                        fail();
                                    }

                                    function proceed() {
                                        setIsProUnlocked(true);
                                        sessionStorage.setItem('proUnlocked', 'true');
                                        sessionStorage.setItem('proLoginTime', Date.now().toString());
                                        input.value = '';
                                    }

                                    function fail() {
                                        input.value = '';
                                        input.classList.add('border-red-500');
                                        input.placeholder = '❌ PIN Salah!';
                                        setTimeout(() => {
                                            input.classList.remove('border-red-500');
                                            input.placeholder = '••••';
                                        }, 1500);
                                    }
                                }} className="space-y-6">
                                    <div>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const form = e.currentTarget.closest('form');
                                                    if (form) {
                                                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                                                        form.dispatchEvent(submitEvent);
                                                    }
                                                }
                                            }}
                                            className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 border-b-2 border-gray-200 focus:border-blue-600 outline-none transition-colors bg-transparent text-gray-900 placeholder-gray-200"
                                            placeholder="••••"
                                            maxLength={4}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-3.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                                    >
                                        Masuk Upload Massal Pro
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">

                            {/* LEFT COLUMN: Upload Form */}
                            <div className="space-y-5 overflow-y-auto pr-2">
                                <div className="flex items-start gap-4 justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Upload Massal Pro</h2>
                                            <p className="text-sm text-gray-500 mt-0.5">Mode Split Screen (Input & Riwayat)</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsProUnlocked(false);
                                            sessionStorage.removeItem('proUnlocked');
                                            sessionStorage.removeItem('proLoginTime');
                                        }}
                                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors flex items-center gap-1.5"
                                    >
                                        <FiUnlock className="w-3.5 h-3.5" />
                                        Keluar
                                    </button>
                                </div>

                                {(bulkProProcessedCount > 0 || bulkProExcelFile) && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex items-center justify-between">
                                        <span className="text-blue-800 text-sm font-medium flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Ready for Next Batch
                                        </span>
                                        <button onClick={resetBulkProUpload} className="text-sm text-red-700 hover:text-red-800 font-medium px-3 py-1.5 bg-white hover:bg-red-50 rounded-md transition-colors border border-red-200">
                                            Reset Form
                                        </button>
                                    </div>
                                )}
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    {/* Step 1 */}
                                    <div className="p-5 border-b border-gray-100">
                                        <div className="flex items-center justify-between mb-3 w-full">
                                            <div className="flex items-center gap-3">
                                                <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                                                <h3 className="font-semibold text-gray-900">Pilih File Excel Data</h3>
                                            </div>
                                        </div>
                                        <div className="ml-10">
                                            {/* RED WARNING NOTE */}
                                            <div className="flex items-start gap-2.5 bg-red-50 border border-red-300 rounded-lg px-3.5 py-2.5 mb-3">
                                                <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div>
                                                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Perhatian: Format Export Ginee</p>
                                                    <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                                                        Ekspor file dari Ginee menggunakan opsi <span className="font-semibold">"Berdasarkan Produk (Baris terpisah untuk pesanan dengan beberapa produk di dalamnya)"</span> dengan <span className="font-semibold">template default</span>.
                                                    </p>
                                                </div>
                                            </div>
                                            {!bulkProExcelFile ? (
                                                <FileDropzone accept=".xlsx,.xls" onFilesSelected={handleBulkProExcelSelect} icon={ICONS.EXCEL} label="Excel Ginee Pro (.xlsx)" selectedFileCount={0} />
                                            ) : (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-11 h-11 bg-green-600 rounded-lg flex items-center justify-center">{ICONS.EXCEL}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900 truncate text-sm">{bulkProExcelFile.name}</p>
                                                            <p className="text-xs text-gray-500">{(bulkProExcelFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Separator */}
                                    <div className="flex justify-center py-2 bg-gray-50">
                                        <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="p-5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                                            <h3 className="font-semibold text-gray-900">Pilih File PDF Label</h3>
                                        </div>
                                        <div className="ml-10">
                                            <FileDropzone accept=".pdf" onFilesSelected={handleBulkProPdfSelect} icon={ICONS.PDF} label="File PDF Label Pro (.pdf)" multiple selectedFileCount={bulkProPdfFiles.length} />

                                            {/* Duplicate PDF Warning */}
                                            {(() => {
                                                const pdfNames = bulkProPdfFiles.map(f => f.name);
                                                const duplicates = pdfNames.filter((name, index) => pdfNames.indexOf(name) !== index);
                                                const uniqueDuplicates = Array.from(new Set(duplicates));

                                                if (uniqueDuplicates.length > 0) {
                                                    return (
                                                        <div className="mt-3 bg-red-50 border border-red-300 rounded-lg p-3">
                                                            <div className="flex gap-2">
                                                                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                </svg>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-semibold text-red-800">PDF Duplikat Terdeteksi!</p>
                                                                    <p className="text-xs text-red-700 mt-1">File berikut diupload lebih dari 1x:</p>
                                                                    <ul className="mt-2 space-y-1">
                                                                        {uniqueDuplicates.map((name, idx) => (
                                                                            <li key={idx} className="text-xs text-red-700 font-mono bg-red-100 px-2 py-1 rounded">
                                                                                {name}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                    <p className="text-xs text-red-700 mt-2 font-medium">⚠️ Hapus duplikat dan upload ulang untuk melanjutkan.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={startBulkProProcessing}
                                    disabled={!bulkProExcelFile || bulkProPdfFiles.length === 0 || bulkProStatus === ProcessStatus.PROCESSING || (() => {
                                        const pdfNames = bulkProPdfFiles.map(f => f.name);
                                        return pdfNames.length !== new Set(pdfNames).size;
                                    })()}
                                    className={`w-full py-3.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${!bulkProExcelFile || bulkProPdfFiles.length === 0 || (() => {
                                        const pdfNames = bulkProPdfFiles.map(f => f.name);
                                        return pdfNames.length !== new Set(pdfNames).size;
                                    })()
                                        ? 'bg-gray-100 text-gray-400 border border-dashed border-gray-300 cursor-not-allowed'
                                        : bulkProStatus === ProcessStatus.PROCESSING
                                            ? 'bg-blue-600 text-white cursor-wait'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    {bulkProStatus === ProcessStatus.PROCESSING ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Memproses...
                                        </>
                                    ) : (
                                        'Proses Batch Pro'
                                    )}
                                </button>

                                {bulkProPdfFiles.length > 0 && <FilePreviewTable files={bulkProPdfPreviewList} />}
                            </div>

                            {/* RIGHT COLUMN: Session History List */}
                            <div className="bg-gray-50 rounded-lg p-5 overflow-y-auto h-full border border-gray-200">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">Antrian Selesai</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Hasil proses batch Anda</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold">
                                            {proSessionHistory.length} Batch
                                        </span>
                                        {proSessionHistory.length > 0 && (
                                            <button
                                                onClick={clearProHistory}
                                                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 rounded-md text-xs font-semibold transition-colors border border-red-200 flex items-center gap-1.5"
                                                title="Hapus Semua Riwayat"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Hapus
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {proSessionHistory.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FiDownload className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-600 font-medium mb-1">Belum ada batch yang diproses</p>
                                        <p className="text-xs text-gray-400">Hasil proses akan muncul di sini</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {proSessionHistory.map((item, idx) => {
                                            const isComplete = item.downloadedPdf && item.downloadedPl;

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`rounded-xl border-2 p-5 transition-all shadow-md ${isComplete
                                                        ? 'bg-green-50 border-green-300 hover:shadow-lg'
                                                        : 'bg-pink-50 border-pink-300 hover:shadow-lg'
                                                        }`}
                                                >
                                                    {/* Header with Status Badge */}
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-gray-600 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                                                                {item.timestamp}
                                                            </span>
                                                            {isComplete ? (
                                                                <span className="text-xs font-bold text-white bg-green-600 px-3 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                    SELESAI
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs font-bold text-white bg-pink-600 px-3 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    BELUM LENGKAP
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* File Names */}
                                                    <div className="mb-4">
                                                        <h4 className="font-bold text-gray-900 text-base mb-1 truncate" title={item.pdfName}>
                                                            {item.pdfName}
                                                        </h4>
                                                        <p className="text-xs text-gray-600 truncate">{item.excelName}</p>
                                                    </div>

                                                    {/* Matched Count - Prominent */}
                                                    <div className="bg-white border-2 border-gray-300 rounded-xl p-4 mb-4 text-center">
                                                        <div className="text-5xl font-extrabold text-gray-800 mb-1">
                                                            {item.stats.matched_count}
                                                        </div>
                                                        <div className="text-sm font-semibold text-gray-600">Matched</div>
                                                    </div>

                                                    {/* Stats Grid */}
                                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                                        <div className="bg-white border-2 border-gray-200 rounded-lg p-3 text-center">
                                                            <div className="text-xs font-semibold text-gray-600 mb-1">Excel Only</div>
                                                            <div className="text-2xl font-bold text-gray-700">{item.stats.unmatched_excel_count}</div>
                                                        </div>
                                                        <div className="bg-white border-2 border-gray-200 rounded-lg p-3 text-center">
                                                            <div className="text-xs font-semibold text-gray-600 mb-1">PDF Only</div>
                                                            <div className="text-2xl font-bold text-gray-700">{item.stats.unmatched_pdf_count}</div>
                                                        </div>
                                                    </div>

                                                    {/* ⚠️ Unmatched Alerts — Massal Pro */}
                                                    {item.stats.unmatched_pdf_count > 0 && (
                                                        <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                                                            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                                            <div>
                                                                <p className="text-xs font-semibold text-red-700">⚠️ PDF Only ({item.stats.unmatched_pdf_count}) — Label tidak terpakai!</p>
                                                                <p className="text-xs text-red-600 mt-0.5">Ada <strong>{item.stats.unmatched_pdf_count}</strong> halaman PDF tidak cocok dengan data Excel.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {item.stats.unmatched_excel_count > 0 && item.stats.unmatched_excel_count < 100 && (
                                                        <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                                                            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                                            <div>
                                                                <p className="text-xs font-semibold text-amber-700">⚠️ Excel Only ({item.stats.unmatched_excel_count}) — Order tanpa label!</p>
                                                                <p className="text-xs text-amber-600 mt-0.5">Ada <strong>{item.stats.unmatched_excel_count}</strong> order tidak memiliki label PDF.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={() => {
                                                                const a = document.createElement('a');
                                                                a.href = item.pdfUrl;
                                                                a.download = item.pdfOriginalName || `${item.pdfName}.pdf`;
                                                                a.click();
                                                                markAsDownloaded(idx, 'pdf');

                                                                // Auto-open PDF in new tab (same as Upload Massal)
                                                                const newTab = window.open(item.pdfUrl, '_blank');
                                                                if (!newTab) {
                                                                    showToast('⚠️ Popup diblokir! PDF sudah terdownload.');
                                                                }
                                                            }}
                                                            className={`py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all text-white ${item.downloadedPdf ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-800'
                                                                }`}
                                                        >
                                                            {item.downloadedPdf ? (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    PDF OK
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FiDownload className="w-4 h-4" />
                                                                    Download PDF
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleDownloadPackingList(
                                                                    item.excelName,
                                                                    item.processingDate, // Pass UTC directly, backend will handle conversion
                                                                    item.pdfOriginalName || `${item.pdfName}.pdf` // Pass with .pdf extension
                                                                );
                                                                markAsDownloaded(idx, 'pl');
                                                            }}
                                                            className={`py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all text-white ${item.downloadedPl ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-800'
                                                                }`}
                                                        >
                                                            {item.downloadedPl ? (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    PL OK
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FiClipboard className="w-4 h-4" />
                                                                    Packing List
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                ) : activeMenu === 'history' ? (
                    <div className="space-y-8">
                        {/* Header Section */}
                        {/* Header Section */}
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Riwayat Proses</h2>
                                <p className="text-blue-500 text-sm font-medium mt-0.5">Lihat dan kelola data orderan</p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 leading-relaxed">
                            Lihat semua data orderan yang sudah diproses. Anda dapat mengunduh file Excel, PDF asli, PDF hasil, dan Packing List dari setiap riwayat proses.
                        </p>

                        {/* Order History Component */}
                        <OrderHistory key={historyKey} user={user} />

                        {/* Feature Highlights */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Riwayat Lengkap</h5>
                                <p className="text-xs text-gray-500 mt-1">7 hari terakhir tersimpan</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Download File</h5>
                                <p className="text-xs text-gray-500 mt-1">Excel, PDF, Packing List</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-3"><svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
                                <h5 className="font-semibold text-gray-900 text-sm">Detail Statistik</h5>
                                <p className="text-xs text-gray-500 mt-1">Match, duplikat, error</p>
                            </div>
                        </div>
                    </div>
                ) : activeMenu === 'admin' ? (
                    <Admin 
                        user={user as any} 
                        showToast={showToast} 
                        onMenuSettingsChanged={(newOrder, newHidden, newSkip) => { 
                            setMenuOrder(newOrder); 
                            setHiddenMenus(newHidden); 
                            if (newSkip) {
                                setSkipPinMenus(newSkip);
                                localStorage.setItem('app_skip_pin_menus', JSON.stringify(newSkip));
                            }
                        }} 
                    />
                ) : activeMenu === 'toolkit' ? (
                    <Toolkit showToast={showToast} skipPin={skipPinMenus.includes('toolkit')} />
                ) : activeMenu === 'profil' ? (
                    <Profil user={user as any} showToast={showToast} onLogout={handleLogout} />
                ) : activeMenu === 'settings' ? (
                    <Settings
                        dbMode={dbMode}
                        onDbModeChange={setDbMode}
                        showToast={showToast}
                        user={user}
                        onUpdateUser={(newTheme) => {
                            const updatedUser = { ...user, theme: newTheme };
                            setUser(updatedUser);
                            localStorage.setItem('user_session', JSON.stringify(updatedUser));
                        }}
                    />
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        Menu belum tersedia
                    </div>
                )}
            </main >

            <FolderErrorModal
                isOpen={!!folderError}
                onClose={() => setFolderError(null)}
                folderName={folderError || "PL"}
            />

            {/* Duplicate Error Modal */}
            <DuplicateErrorModal
                isOpen={!!duplicateData || !!duplicateData2 || !!testDuplicateData}
                onClose={() => {
                    setDuplicateData(null);
                    setDuplicateData2(null);
                    setTestDuplicateData(null);
                }}
                duplicateCount={(duplicateData?.count || duplicateData2?.count || testDuplicateData?.count || 0)}
                duplicates={(duplicateData?.items || duplicateData2?.items || testDuplicateData?.items || [])}
                onForceReProcess={duplicateData?.onForceReProcess || duplicateData2?.onForceReProcess || testDuplicateData?.onForceReProcess}
                isProcessing={isCleaningDuplicates}
            />

            {/* PIN Modal untuk Batalkan (Undo) */}
            {showUndoPinModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
                        {/* Header merah */}
                        <div className="bg-red-600 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-base">Konfirmasi Batalkan Proses</h3>
                                    <p className="text-red-100 text-xs mt-0.5">Tindakan ini <strong>tidak dapat dibatalkan</strong></p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">
                            {/* Warning list */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-xs font-semibold text-red-700 mb-2">Yang akan dihapus:</p>
                                <ul className="text-xs text-red-600 space-y-1">
                                    <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Data history di Supabase &amp; Local DB</li>
                                    <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Data processed_items (untuk duplikat check)</li>
                                    <li className="flex items-center gap-2"><span className="text-red-500">✗</span> Folder backup (Excel, PDF asli, PDF hasil)</li>
                                </ul>
                            </div>

                            {/* Password Input */}
                            <form onSubmit={handleUndoPinSubmit}>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Masukkan password akun <span className="font-bold text-gray-900">{user?.username || '—'}</span> untuk konfirmasi:
                                </label>
                                <input
                                    type="password"
                                    value={undoPinInput}
                                    onChange={(e) => { setUndoPinInput(e.target.value); setUndoPinError(''); }}
                                    placeholder="Masukkan password Anda"
                                    maxLength={50}
                                    autoFocus
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-center text-xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                                {undoPinError && (
                                    <p className="text-red-600 text-xs mt-1.5 text-center font-medium">{undoPinError}</p>
                                )}

                                <div className="flex gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowUndoPinModal(false); setUndoPinInput(''); setUndoPinError(''); }}
                                        className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUndoing || !undoPinInput}
                                        className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isUndoing ? (
                                            <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Menghapus...</>
                                        ) : (
                                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Hapus Permanen</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="py-6 text-center">
                <p className="text-gray-400 text-xs">
                    © 2026 Label Flow
                </p>
            </footer>
            <GlobalNotificationModal />
            {renderToastContent()}
            <BackendHealthCheck />
        </div >
    );
};

const MENU_DEFINITIONS: Record<string, { label: string; icon?: any }> = {
    dashboard: { label: 'Dasbor', icon: FiActivity },
    upload: { label: 'Upload' },
    upload2: { label: 'Upload 2' },
    uploadTest: { label: 'Upload Label' },
    history: { label: 'Riwayat' },
    bulkUpload: { label: 'Upload Massal' },
    bulkUploadTest: { label: 'Upload Massal 2' },
    bulkUploadTes: { label: 'Upload Massal Label' },
    bulkUploadPro: { label: 'Massal Pro' },
    uploadFlex: { label: 'Upload Flex' },
    toolkit: { label: 'Toolkit' },
    admin: { label: 'Admin' }
};

export default App;
