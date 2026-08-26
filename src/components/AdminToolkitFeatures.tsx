import React, { useState, useEffect } from 'react';
import { FiLock, FiUnlock, FiSave, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';

interface FeatureConfig {
    feature_key: string;
    label: string;
    is_locked: boolean;
}

interface AdminToolkitFeaturesProps {
    showToast?: (message: string) => void;
}

// All toolkit features with their labels
const ALL_FEATURES: { key: string; label: string; desc: string; color: string }[] = [
    { key: 'awb-cleaner', label: 'Filter AWB Duplikat', desc: 'Bersihkan data dari resi duplikat/cancel', color: 'blue' },
    { key: 'label-splitter-v2', label: 'Bagi Rata Label V.2', desc: 'Split label PDF - Satuan (TikTok)', color: 'red' },
    { key: 'label-splitter-v3', label: 'Bagi Rata Label V.3', desc: 'Split label PDF - Campur (Shopee)', color: 'indigo' },
    { key: 'label-splitter-v4', label: 'Bagi Rata Label V.4', desc: 'Split Excel per Batch - Prioritas Satuan + Bulky', color: 'rose' },
    { key: 'label-splitter-v5', label: 'Bagi Rata Label V.5', desc: 'Split Excel per Batch - Campur (Copy V.3)', color: 'teal' },

    { key: 'extract-pesanan', label: 'Extract Pesanan', desc: 'Ambil nomor pesanan dari data Ginee', color: 'indigo' },
    { key: 'wms-cleaner', label: 'Pembersih ID Paket', desc: 'Hapus karakter @ dari No. Pesanan', color: 'orange' },
    { key: 'ginee-processor', label: 'Ginee Data Processor', desc: 'Extract ID Pesanan dari Excel Ginee', color: 'blue' },
    { key: 'orderan-kilat', label: 'Orderan Kilat (VIP >10K)', desc: 'Filter file Excel Ginee, khusus menyisakan pesanan VIP >10K', color: 'orange' },
    { key: 'orderan-kilat-50k', label: 'Orderan Kilat (VIP >50K)', desc: 'Filter file Excel Ginee, khusus menyisakan pesanan VIP >50K', color: 'rose' },
    { key: 'packing-list-upload-2', label: 'Sertakan Halaman Packing List (Barcode Akhir)', desc: 'Mengaktifkan pencetakan halaman barcode ekstra di belakang PDF (Berlaku Global)', color: 'teal' },
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

};

const AdminToolkitFeatures: React.FC<AdminToolkitFeaturesProps> = ({ showToast }) => {
    const [features, setFeatures] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchFeatures();
    }, []);

    const fetchFeatures = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/toolkit-features`);
            const map: Record<string, boolean> = {};
            // Initialize all features first with default (unlocked)
            ALL_FEATURES.forEach(f => { map[f.key] = false; });
            // Override with data from DB
            (res.data || []).forEach((item: FeatureConfig) => {
                map[item.feature_key] = item.is_locked;
            });
            setFeatures(map);
        } catch (err) {
            console.error('Failed to fetch toolkit features', err);
            // Default all to unlocked on error
            const map: Record<string, boolean> = {};
            ALL_FEATURES.forEach(f => { map[f.key] = false; });
            setFeatures(map);
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
            });
            setFeatures(prev => ({ ...prev, [featureKey]: newLocked }));
            showToast?.(`✓ ${newLocked ? '🔒 Dikunci' : '🔓 Dibuka'}: ${ALL_FEATURES.find(f => f.key === featureKey)?.label}`);
        } catch (err: any) {
            showToast?.(`❌ Gagal mengubah status fitur`);
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
                    });
                }
            }
            const allLocked: Record<string, boolean> = {};
            ALL_FEATURES.forEach(f => { allLocked[f.key] = true; });
            setFeatures(allLocked);
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
                    });
                }
            }
            const allUnlocked: Record<string, boolean> = {};
            ALL_FEATURES.forEach(f => { allUnlocked[f.key] = false; });
            setFeatures(allUnlocked);
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
                            <p className="text-sm text-gray-500">Atur fitur mana yang bisa diakses user di menu Toolkit</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleUnlockAll}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm border border-green-200 text-green-700 rounded-lg hover:bg-green-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                            <FiUnlock className="w-4 h-4" /> Buka Semua
                        </button>
                        <button
                            onClick={handleLockAll}
                            disabled={isLoading}
                            className="px-3 py-2 text-sm border border-red-200 text-red-700 rounded-lg hover:bg-red-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
                        <div className="text-xs text-green-600">Fitur Terbuka</div>
                    </div>
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-700">{lockedCount}</div>
                        <div className="text-xs text-red-600">Fitur Terkunci</div>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-700">{ALL_FEATURES.length}</div>
                        <div className="text-xs text-gray-500">Total Fitur</div>
                    </div>
                </div>

                {/* Feature List */}
                <div className="space-y-3">
                    {ALL_FEATURES.map((feature) => {
                        const isLocked = features[feature.key] ?? false;
                        const cv = colorVariants[feature.color] || colorVariants.blue;
                        const saving = isSaving === feature.key;

                        return (
                            <div
                                key={feature.key}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isLocked
                                        ? 'border-red-200 bg-red-50/50 opacity-80'
                                        : `${cv.border} bg-white hover:shadow-sm`
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 ${isLocked ? 'bg-red-100' : cv.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                        {isLocked
                                            ? <FiLock className="w-4 h-4 text-red-500" />
                                            : <FiUnlock className={`w-4 h-4 ${cv.icon}`} />
                                        }
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-gray-900">{feature.label}</span>
                                            {isLocked && (
                                                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">TERKUNCI</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">{feature.desc}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleToggle(feature.key)}
                                    disabled={saving}
                                    className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${isLocked ? 'bg-red-400' : 'bg-green-400'
                                        } ${saving ? 'opacity-50' : ''}`}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${isLocked ? 'translate-x-5' : 'translate-x-0.5'
                                            }`}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminToolkitFeatures;
