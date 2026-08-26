import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiEye, FiEyeOff, FiArrowUp, FiArrowDown, FiSave, FiRefreshCw } from 'react-icons/fi';
import { API_CONFIG } from '../constants';
import { supabase } from '../supabaseClient';

// Define the available menus
const ALL_MENUS = [
    { id: 'dashboard', label: 'Dasbor' },
    { id: 'upload', label: 'Upload' },
    { id: 'upload2', label: 'Upload Tes' },
    { id: 'uploadTest', label: 'Upload 2' },
    { id: 'history', label: 'Riwayat' },
    { id: 'bulkUpload', label: 'Upload Massal' },
    { id: 'bulkUploadTest', label: 'Upload Massal 2' },
    { id: 'bulkUploadTes', label: 'Upload Massal Tes' },
    { id: 'bulkUploadPro', label: 'Massal Pro' },
    { id: 'uploadFlex', label: 'Upload Flex' },
    { id: 'toolkit', label: 'Toolkit' },
    { id: 'admin', label: 'Admin' },
    { id: 'profil', label: 'Profil' }
];

interface AdminMenuSettingsProps {
    onSettingsChanged?: (menuOrder: string[], hiddenMenus: string[]) => void;
}

export const AdminMenuSettings: React.FC<AdminMenuSettingsProps> = ({ onSettingsChanged }) => {
    const [menuOrder, setMenuOrder] = useState<string[]>([]);
    const [hiddenMenus, setHiddenMenus] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchMenuSettings = async () => {
        setIsLoading(true);
        try {
            // Add timestamp to bypass browser cache
            const response = await axios.get(`${API_CONFIG.BASE_URL}/settings/menu?t=${new Date().getTime()}`);
            const data = response.data;
            let order = data.menu_order || [];
            let hidden = data.hidden_menus || [];

            // If order is empty, populate with default order
            if (!order || order.length === 0) {
                order = ALL_MENUS.map(m => m.id);
            } else {
                // Ensure all existing menus are in the order array (in case new menus are added)
                const missing = ALL_MENUS.map(m => m.id).filter(id => !order.includes(id));
                if (missing.length > 0) {
                    order = [...order, ...missing];
                }
            }
            
            setMenuOrder(order);
            setHiddenMenus(hidden);
        } catch (error) {
            console.error('Error fetching menu settings:', error);
            setMessage({ type: 'error', text: 'Gagal mengambil konfigurasi menu. Pastikan backend menyala.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/menu`, {
                hidden_menus: hiddenMenus,
                menu_order: menuOrder
            });
            setMessage({ type: 'success', text: 'Konfigurasi menu berhasil disimpan!' });
            
            // Notify parent to update navigation in real-time
            if (onSettingsChanged) {
                onSettingsChanged(menuOrder, hiddenMenus);
            }
        } catch (error) {
            console.error('Error saving menu settings:', error);
            setMessage({ type: 'error', text: 'Gagal menyimpan konfigurasi menu.' });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleHide = (menuId: string) => {
        if (menuId === 'admin' || menuId === 'dashboard') {
            alert('Menu Admin dan Dasbor tidak boleh disembunyikan untuk alasan keamanan.');
            return;
        }

        if (hiddenMenus.includes(menuId)) {
            setHiddenMenus(hiddenMenus.filter(id => id !== menuId));
        } else {
            setHiddenMenus([...hiddenMenus, menuId]);
        }
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newOrder = [...menuOrder];
        const temp = newOrder[index - 1];
        newOrder[index - 1] = newOrder[index];
        newOrder[index] = temp;
        setMenuOrder(newOrder);
    };

    const moveDown = (index: number) => {
        if (index === menuOrder.length - 1) return;
        const newOrder = [...menuOrder];
        const temp = newOrder[index + 1];
        newOrder[index + 1] = newOrder[index];
        newOrder[index] = temp;
        setMenuOrder(newOrder);
    };

    return (
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-b border-gray-200 px-6 py-5 flex items-center justify-between bg-gray-50">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        Pengaturan Urutan & Visibilitas Menu
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Atur urutan dan sembunyikan menu di sidebar kiri. Pengaturan ini bersifat global untuk semua pengguna.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchMenuSettings}
                        disabled={isLoading}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Muat Ulang"
                    >
                        <FiRefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Menyimpan...</span>
                        ) : (
                            <><FiSave /> Simpan Perubahan</>
                        )}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`px-6 py-3 border-b ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? <FiSave className="w-4 h-4" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                </div>
            )}

            <div className="p-6">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-1 text-center">Urutan</div>
                        <div className="col-span-5">Nama Menu</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-4 text-right">Aksi</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {menuOrder.map((menuId, index) => {
                            const menuDef = ALL_MENUS.find(m => m.id === menuId);
                            if (!menuDef) return null;
                            const isHidden = hiddenMenus.includes(menuId);
                            const isRequired = menuId === 'admin' || menuId === 'dashboard';

                            return (
                                <div key={menuId} className={`grid grid-cols-12 items-center px-4 py-3 transition-colors hover:bg-gray-50 ${isHidden ? 'opacity-60 bg-gray-50' : ''}`}>
                                    <div className="col-span-1 text-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <div className="col-span-5">
                                        <div className="font-semibold text-gray-900">{menuDef.label}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {menuId}</div>
                                    </div>
                                    <div className="col-span-2 text-center">
                                        {isHidden ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                <FiEyeOff className="w-3 h-3" /> Disembunyikan
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                <FiEye className="w-3 h-3" /> Ditampilkan
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-4 flex items-center justify-end gap-2">
                                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-2">
                                            <button
                                                onClick={() => moveUp(index)}
                                                disabled={index === 0}
                                                className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-gray-700"
                                                title="Geser ke Atas"
                                            >
                                                <FiArrowUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => moveDown(index)}
                                                disabled={index === menuOrder.length - 1}
                                                className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-gray-700"
                                                title="Geser ke Bawah"
                                            >
                                                <FiArrowDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => toggleHide(menuId)}
                                            disabled={isRequired}
                                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isRequired ? 'opacity-50 cursor-not-allowed text-gray-400 bg-gray-100' : isHidden ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                                            title={isRequired ? "Menu ini wajib ditampilkan" : isHidden ? "Tampilkan Menu" : "Sembunyikan Menu"}
                                        >
                                            {isHidden ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                                            <span className="text-xs font-semibold hidden sm:inline">{isHidden ? 'Tampilkan' : 'Sembunyikan'}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>

    );
};
