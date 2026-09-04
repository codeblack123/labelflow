import React, { useState, useEffect } from 'react';
import { FiLock, FiUnlock, FiSave, FiRefreshCw, FiCheck, FiX } from 'react-icons/fi';
import { FaWarehouse } from 'react-icons/fa';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import { supabase } from '../supabaseClient';

interface FeatureConfig {
    feature_key: string;
    label: string;
    is_locked: boolean;
    enabled_gudang_ids?: string[] | null;
}

interface Warehouse {
    id: string;
    name: string;
}

interface AdminToolkitFeaturesProps {
    showToast?: (message: string) => void;
}

// All toolkit features with their labels
const ALL_FEATURES: { key: string; label: string; desc: string; color: string; supportsWarehouse?: boolean }[] = [
    { key: 'awb-cleaner', label: 'Filter AWB Duplikat', desc: 'Bersihkan data dari resi duplikat/cancel', color: 'blue' },
    { key: 'label-splitter-v2', label: 'Bagi Rata Label V.2', desc: 'Split label PDF - Satuan (TikTok)', color: 'red' },
    { key: 'label-splitter-v3', label: 'Bagi Rata Label V.3', desc: 'Split label PDF - Campur (Shopee)', color: 'indigo' },
    { key: 'label-splitter-v4', label: 'Bagi Rata Label V.4', desc: 'Split Excel per Batch - Prioritas Satuan + Bulky', color: 'rose' },
    { key: 'label-splitter-v5', label: 'Bagi Rata Label V.5', desc: 'Split Excel per Batch - Campur (Copy V.3)', color: 'teal' },

    { key: 'extract-pesanan', label: 'Extract Pesanan', desc: 'Ambil nomor pesanan dari data Ginee', color: 'indigo' },
    { key: 'wms-cleaner', label: 'Pembersih ID Paket', desc: 'Hapus karakter @ dari No. Pesanan', color: 'orange' },
    { key: 'ginee-processor', label: 'Ginee Data Processor', desc: 'Extract ID Pesanan dari Excel Ginee', color: 'blue' },
    { key: 'orderan-kilat-10k', label: 'Orderan Kilat (VIP >10K)', desc: 'Filter file Excel Ginee, khusus menyisakan pesanan VIP >10K', color: 'amber' },
    { key: 'orderan-kilat-20k', label: 'Orderan Kilat (VIP >20K)', desc: 'Filter file Excel Ginee, khusus menyisakan pesanan VIP >20K', color: 'purple' },
    { key: 'orderan-kilat-50k', label: 'Orderan Kilat (VIP >50K)', desc: 'Filter file Excel Ginee, khusus menyisakan pesanan VIP >50K', color: 'rose' },
    { key: 'packing-list-upload-2', label: 'Sertakan Halaman Packing List (Barcode Akhir)', desc: 'Mengaktifkan pencetakan lembar rekapitulasi / barcode batch di belakang PDF', color: 'teal', supportsWarehouse: true },
    { key: 'custom-label-priority-top', label: 'Prioritas Atas Custom Label', desc: 'Aktifkan fitur urutan atas untuk BOX/SLOP di dalam label resi', color: 'rose' },
    { key: 'productivity-timer', label: 'Timer Produktivitas (Upload 2 & Massal)', desc: 'Timer 3 menit agar admin tetap fokus memproses order', color: 'orange' },
];

const colorVariants: Record<string, { border: string; icon: string; bg: string }> = {
    blue: { border: 'border-blue-200', icon: 'text-blue-600', bg: 'bg-blue-50' },
    red: { border: 'border-red-200', icon: 'text-red-600', bg: 'bg-red-50' },
    indigo: { border: 'border-indigo-200', icon: 'text-indigo-600', bg: 'bg-indigo-50' },
    rose: { border: 'border-rose-200', icon: 'text-rose-600', bg: 'bg-rose-50' },
    orange: { border: 'border-orange-200', icon: 'text-orange-600', bg: 'bg-orange-50' },
    teal: { border: 'border-teal-200', icon: 'text-teal-600', bg: 'bg-teal-50' },
    amber: { border: 'border-amber-200', icon: 'text-amber-600', bg: 'bg-amber-50' },
    purple: { border: 'border-purple-200', icon: 'text-purple-600', bg: 'bg-purple-50' },
};

const AdminToolkitFeatures: React.FC<AdminToolkitFeaturesProps> = ({ showToast }) => {
    const [features, setFeatures] = useState<Record<string, boolean>>({});
    const [featureGudangMap, setFeatureGudangMap] = useState<Record<string, string[] | null>>({});
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchWarehouses();
        fetchFeatures();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const { data, error } = await supabase.from('warehouses').select('id, name').order('name');
            if (!error && data) {
                setWarehouses(data);
            }
        } catch (err) {
            console.error('Failed to fetch warehouses', err);
        }
    };

    const fetchFeatures = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/toolkit-features`);
            const map: Record<string, boolean> = {};
            const gMap: Record<string, string[] | null> = {};

            // Initialize all features first with default (unlocked)
            ALL_FEATURES.forEach(f => {
                map[f.key] = false;
                gMap[f.key] = null;
            });

            // Override with data from DB
            (res.data || []).forEach((item: FeatureConfig) => {
                map[item.feature_key] = item.is_locked;
                if (item.enabled_gudang_ids !== undefined) {
                    gMap[item.feature_key] = item.enabled_gudang_ids;
                }
            });
            setFeatures(map);
            setFeatureGudangMap(gMap);
        } catch (err) {
            console.error('Failed to fetch toolkit features', err);
            const map: Record<string, boolean> = {};
            const gMap: Record<string, string[] | null> = {};
            ALL_FEATURES.forEach(f => {
                map[f.key] = false;
                gMap[f.key] = null;
            });
            setFeatures(map);
            setFeatureGudangMap(gMap);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async (featureKey: string) => {
        const newLocked = !features[featureKey];
        setIsSaving(featureKey);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                feature_key: featureKey,
                is_locked: newLocked,
                enabled_gudang_ids: featureGudangMap[featureKey] || null,
            });
            setFeatures(prev => ({ ...prev, [featureKey]: newLocked }));
            showToast?.(`✓ ${newLocked ? '🔒 Dikunci' : '🔓 Dibuka'}: ${ALL_FEATURES.find(f => f.key === featureKey)?.label}`);
        } catch (err: any) {
            showToast?.(`❌ Gagal mengubah status fitur`);
        } finally {
            setIsSaving(null);
        }
    };

    const handleToggleWarehouseForFeature = async (featureKey: string, warehouseId: string) => {
        setIsSaving(`${featureKey}-${warehouseId}`);
        try {
            // Get current enabled list, default to all warehouses if null/not set
            let currentList = featureGudangMap[featureKey];
            if (currentList === null || currentList === undefined) {
                // If it was previously global unlocked, all warehouses are considered initially active
                currentList = features[featureKey] ? [] : warehouses.map(w => w.id);
            }

            let updatedList: string[];
            const isCurrentlyEnabled = currentList.includes(warehouseId);
            if (isCurrentlyEnabled) {
                updatedList = currentList.filter(id => id !== warehouseId);
            } else {
                updatedList = [...currentList, warehouseId];
            }

            const isAllLocked = updatedList.length === 0;

            await axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                feature_key: featureKey,
                is_locked: isAllLocked,
                enabled_gudang_ids: updatedList,
            });

            setFeatureGudangMap(prev => ({ ...prev, [featureKey]: updatedList }));
            setFeatures(prev => ({ ...prev, [featureKey]: isAllLocked }));

            const wName = warehouses.find(w => w.id === warehouseId)?.name || 'Gudang';
            showToast?.(`✓ Halaman Packing List ${!isCurrentlyEnabled ? '✅ DIAKTIFKAN' : '❌ DINONAKTIFKAN'} untuk ${wName}`);
        } catch (err: any) {
            showToast?.(`❌ Gagal mengubah pengaturan gudang`);
        } finally {
            setIsSaving(null);
        }
    };

    const handleSetAllWarehousesForFeature = async (featureKey: string, enableAll: boolean) => {
        setIsSaving(`${featureKey}-all`);
        try {
            const updatedList = enableAll ? warehouses.map(w => w.id) : [];
            const isLocked = !enableAll;

            await axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                feature_key: featureKey,
                is_locked: isLocked,
                enabled_gudang_ids: updatedList,
            });

            setFeatureGudangMap(prev => ({ ...prev, [featureKey]: updatedList }));
            setFeatures(prev => ({ ...prev, [featureKey]: isLocked }));

            showToast?.(enableAll ? '✓ Halaman Packing List diaktifkan untuk SEMUA gudang' : '✓ Halaman Packing List dinonaktifkan untuk SEMUA gudang');
        } catch (err) {
            showToast?.('❌ Gagal memperbarui pengaturan gudang');
        } finally {
            setIsSaving(null);
        }
    };

    const handleLockAll = async () => {
        setIsLoading(true);
        try {
            for (const f of ALL_FEATURES) {
                if (!features[f.key]) {
                    await axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                        feature_key: f.key,
                        is_locked: true,
                        enabled_gudang_ids: [],
                    });
                }
            }
            const allLocked: Record<string, boolean> = {};
            const allGMap: Record<string, string[] | null> = {};
            ALL_FEATURES.forEach(f => {
                allLocked[f.key] = true;
                allGMap[f.key] = [];
            });
            setFeatures(allLocked);
            setFeatureGudangMap(allGMap);
            showToast?.('✓ Semua fitur dikunci');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnlockAll = async () => {
        setIsLoading(true);
        try {
            for (const f of ALL_FEATURES) {
                if (features[f.key]) {
                    await axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                        feature_key: f.key,
                        is_locked: false,
                        enabled_gudang_ids: warehouses.map(w => w.id),
                    });
                }
            }
            const allUnlocked: Record<string, boolean> = {};
            const allGMap: Record<string, string[] | null> = {};
            ALL_FEATURES.forEach(f => {
                allUnlocked[f.key] = false;
                allGMap[f.key] = warehouses.map(w => w.id);
            });
            setFeatures(allUnlocked);
            setFeatureGudangMap(allGMap);
            showToast?.('✓ Semua fitur dibuka');
        } finally {
            setIsLoading(false);
        }
    };

    const lockedCount = Object.values(features).filter(Boolean).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <FiLock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Kontrol Akses Fitur Toolkit</h2>
                            <p className="text-sm text-gray-500">Atur fitur mana yang bisa diakses user di menu Toolkit dan sesuaikan per-gudang</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleUnlockAll}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm border border-green-200 text-green-700 rounded-lg hover:bg-green-50 flex items-center gap-1.5 transition-colors disabled:opacity-50 font-medium"
                        >
                            <FiUnlock className="w-4 h-4" /> Buka Semua
                        </button>
                        <button
                            onClick={handleLockAll}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm border border-red-200 text-red-700 rounded-lg hover:bg-red-50 flex items-center gap-1.5 transition-colors disabled:opacity-50 font-medium"
                        >
                            <FiLock className="w-4 h-4" /> Kunci Semua
                        </button>
                        <button
                            onClick={fetchFeatures}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Status Summary */}
                <div className="flex gap-3 mb-6">
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-700">{ALL_FEATURES.length - lockedCount}</div>
                        <div className="text-xs text-green-600 font-semibold">Fitur Terbuka</div>
                    </div>
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-700">{lockedCount}</div>
                        <div className="text-xs text-red-600 font-semibold">Fitur Terkunci</div>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-700">{ALL_FEATURES.length}</div>
                        <div className="text-xs text-gray-500 font-semibold">Total Fitur</div>
                    </div>
                </div>

                {/* Feature List */}
                <div className="space-y-3">
                    {ALL_FEATURES.map((feature) => {
                        const isLocked = features[feature.key] ?? false;
                        const cv = colorVariants[feature.color] || colorVariants.blue;
                        const saving = isSaving === feature.key;
                        const enabledGudangs = featureGudangMap[feature.key];

                        return (
                            <div
                                key={feature.key}
                                className={`rounded-xl border transition-all ${isLocked
                                        ? 'border-red-200 bg-red-50/50'
                                        : `${cv.border} bg-white hover:shadow-sm`
                                    }`}
                            >
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 ${isLocked ? 'bg-red-100' : cv.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                            {isLocked
                                                ? <FiLock className="w-4 h-4 text-red-500" />
                                                : <FiUnlock className={`w-4 h-4 ${cv.icon}`} />
                                            }
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-sm text-gray-900">{feature.label}</span>
                                                {isLocked ? (
                                                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">TERKUNCI / NONAKTIF</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AKTIF</span>
                                                )}
                                                {feature.supportsWarehouse && (
                                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <FaWarehouse className="w-2.5 h-2.5" /> Granular Per-Gudang
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">{feature.desc}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleToggle(feature.key)}
                                        disabled={saving}
                                        className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ml-3 ${isLocked ? 'bg-red-400' : 'bg-green-500'
                                            } ${saving ? 'opacity-50' : ''}`}
                                        title={isLocked ? 'Klik untuk aktifkan' : 'Klik untuk kunci/matikan'}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${isLocked ? 'translate-x-5' : 'translate-x-0.5'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Per-Warehouse Setting Box for features that support it (e.g. Packing List) */}
                                {feature.supportsWarehouse && warehouses.length > 0 && (
                                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-slate-50/70 rounded-b-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pt-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                <FaWarehouse className="text-blue-500 w-3.5 h-3.5" />
                                                <span>Pilih Gudang Yang Mengaktifkan Halaman Packing List:</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetAllWarehousesForFeature(feature.key, true)}
                                                    className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors font-medium"
                                                >
                                                    Pilih Semua
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetAllWarehousesForFeature(feature.key, false)}
                                                    className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200 hover:bg-gray-200 transition-colors font-medium"
                                                >
                                                    Kosongkan Semua
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                            {warehouses.map((wh) => {
                                                const isWhSaving = isSaving === `${feature.key}-${wh.id}`;
                                                // Check if this warehouse is active
                                                let isWhActive = false;
                                                if (enabledGudangs === null || enabledGudangs === undefined) {
                                                    isWhActive = !isLocked;
                                                } else {
                                                    isWhActive = enabledGudangs.some(id => String(id).toLowerCase() === String(wh.id).toLowerCase());
                                                }

                                                return (
                                                    <div
                                                        key={wh.id}
                                                        onClick={() => !isWhSaving && handleToggleWarehouseForFeature(feature.key, wh.id)}
                                                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                                            isWhActive
                                                                ? 'bg-white border-blue-400 shadow-sm text-slate-900 ring-1 ring-blue-400/20'
                                                                : 'bg-gray-100/80 border-gray-200 text-gray-500 hover:bg-gray-100'
                                                        } ${isWhSaving ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                                                                isWhActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'
                                                            }`}>
                                                                <FaWarehouse className="w-3 h-3" />
                                                            </div>
                                                            <span className="font-semibold truncate">{wh.name}</span>
                                                        </div>

                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 flex-shrink-0 ml-2 ${
                                                            isWhActive
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-200 text-gray-600'
                                                        }`}>
                                                            {isWhActive ? <><FiCheck className="w-3 h-3" /> AKTIF</> : <><FiX className="w-3 h-3" /> OFF</>}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <p className="text-[11px] text-gray-500 mt-2">
                                            ℹ️ Jika gudang diaktifkan, hasil PDF Custom Label untuk gudang tersebut otomatis menyertakan lembar rekapitulasi / packing list batch di halaman terakhir.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminToolkitFeatures;

