import React, { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiSettings, FiLayout, FiInfo, FiSave, FiRefreshCw, FiSliders, FiPackage } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';

interface AdminLabelSettingsProps {
    showToast?: (message: string) => void;
}

interface LabelConfig {
    std_col_msku: number;
    std_col_qty: number;
    std_font_msku: number;
    std_font_qty: number;
    std_row_height: number;
    ext_col_rak: number;
    ext_col_msku: number;
    ext_col_qty: number;
    ext_font_rak: number;
    ext_font_msku: number;
    ext_font_qty: number;
    ext_row_height: number;
    border_thickness: number;
    header_bg: string;
    header_color: string;
    // Font Families
    std_font_msku_family: string;
    std_font_qty_family: string;
    ext_font_rak_family: string;
    ext_font_msku_family: string;
    ext_font_qty_family: string;
    std_font_msku_bold: boolean;
    std_font_qty_bold: boolean;
    ext_font_rak_bold: boolean;
    ext_font_msku_bold: boolean;
    ext_font_qty_bold: boolean;
}

const DEFAULTS: LabelConfig = {
    std_col_msku: 220, 
    std_col_qty: 50, 
    std_font_msku: 8, 
    std_font_qty: 13.5, 
    std_row_height: 18,
    ext_col_rak: 80, 
    ext_col_msku: 150, 
    ext_col_qty: 50, 
    ext_font_rak: 10, 
    ext_font_msku: 8, 
    ext_font_qty: 13.5, 
    ext_row_height: 25,
    border_thickness: 0.5, 
    header_bg: '#ffffff', 
    header_color: '#000000',
    std_font_msku_family: 'Helvetica',
    std_font_qty_family: 'Bahnschrift',
    ext_font_rak_family: 'Bahnschrift',
    ext_font_msku_family: 'Helvetica',
    ext_font_qty_family: 'Bahnschrift',
    std_font_msku_bold: false,
    std_font_qty_bold: true,
    ext_font_rak_bold: false,
    ext_font_msku_bold: false,
    ext_font_qty_bold: true,
};

const FONT_OPTIONS = [
    { value: 'Helvetica', label: 'Helvetica (Standard)' },
    { value: 'Bahnschrift', label: 'Bahnschrift' },
    { value: 'Courier', label: 'Courier' },
    { value: 'Times-Roman', label: 'Times New Roman' },
];

// Converts PDF-pt value to a rough CSS pixel for preview scaling
// Preview container is ~350px wide, real PDF label is ~270pt wide
const SCALE = 350 / 270;
const ptToPx = (pt: number) => Math.round(pt * SCALE);

const AdminLabelSettings: React.FC<AdminLabelSettingsProps> = ({ showToast }) => {
    const [formatMode, setFormatMode] = useState<'standar' | 'extended' | 'bundling' | 'bundling_2'>('standar');
    const [isExtended, setIsExtended] = useState(false);
    const [isInterleaveSort, setIsInterleaveSort] = useState(false);
    const [cfg, setCfg] = useState<LabelConfig>({ ...DEFAULTS });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'format' | 'standar' | 'extended' | 'bundling' | 'bundling_2'>('format');
    // Bundling format config
    const BUNDLING_DEFAULTS = {
        col_jenis: 65, col_model: 113, col_varian: 55.5, col_qty: 38,
        font_jenis: 9, font_model: 8, font_varian: 8, font_qty: 13.5,
        row_height: 20,
        align_model: 'left' as 'left' | 'center',
    };
    const [bCfg, setBCfg] = useState(BUNDLING_DEFAULTS);
    const updateBCfg = (key: keyof typeof BUNDLING_DEFAULTS, val: any) =>
        setBCfg(prev => ({ ...prev, [key]: val }));

    // Bundling 2 format config (Terpisah & Terisolasi - Kolom JENIS Ramping 2 Baris)
    const BUNDLING_2_DEFAULTS = {
        col_jenis: 65, col_model: 113, col_varian: 55.5, col_qty: 38,
        font_jenis: 9, font_model: 8, font_varian: 8, font_qty: 13.5,
        row_height: 20,
        align_model: 'left' as 'left' | 'center',
    };
    const [b2Cfg, setB2Cfg] = useState(BUNDLING_2_DEFAULTS);
    const updateB2Cfg = (key: keyof typeof BUNDLING_2_DEFAULTS, val: any) =>
        setB2Cfg(prev => ({ ...prev, [key]: val }));

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const [featRes, cfgRes, bundRes, bund2Res] = await Promise.all([
                axios.get(`${API_CONFIG.BASE_URL}/settings/toolkit-features`),
                axios.get(`${API_CONFIG.BASE_URL}/settings/label-table-config?t=${Date.now()}`),
                axios.get(`${API_CONFIG.BASE_URL}/settings/label-bundling-config?t=${Date.now()}`).catch(() => ({ data: null })),
                axios.get(`${API_CONFIG.BASE_URL}/settings/label-bundling-2-config?t=${Date.now()}`).catch(() => ({ data: null })),
            ]);
            const extFeature = (featRes.data || []).find((f: any) => f.feature_key === 'label_extended_format');
            const bundFeature = (featRes.data || []).find((f: any) => f.feature_key === 'label_bundling_format');
            const bund2Feature = (featRes.data || []).find((f: any) => f.feature_key === 'label_bundling_2_format');
            
            if (bund2Feature?.is_locked) {
                setFormatMode('bundling_2');
                setIsExtended(false);
            } else if (bundFeature?.is_locked) {
                setFormatMode('bundling');
                setIsExtended(false);
            } else if (extFeature?.is_locked) {
                setFormatMode('extended');
                setIsExtended(true);
            } else {
                setFormatMode('standar');
                setIsExtended(false);
            }
            
            const sortFeature = (featRes.data || []).find((f: any) => f.feature_key === 'label_sort_rak_msku');
            setIsInterleaveSort(sortFeature ? sortFeature.is_locked : false);

            if (cfgRes.data) setCfg({ ...DEFAULTS, ...cfgRes.data });
            if (bundRes?.data) setBCfg(prev => ({ ...prev, ...bundRes.data }));
            if (bund2Res?.data) setB2Cfg(prev => ({ ...prev, ...bund2Res.data }));
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const handleSelectFormatMode = async (mode: 'standar' | 'extended' | 'bundling' | 'bundling_2') => {
        setIsSaving(true);
        try {
            await Promise.all([
                axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                    feature_key: 'label_extended_format',
                    is_locked: mode === 'extended',
                }),
                axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                    feature_key: 'label_bundling_format',
                    is_locked: mode === 'bundling',
                }),
                axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                    feature_key: 'label_bundling_2_format',
                    is_locked: mode === 'bundling_2',
                }),
            ]);
            setFormatMode(mode);
            setIsExtended(mode === 'extended');
            const labels: Record<string, string> = {
                standar: 'Format Standar',
                extended: 'Format Rak & ID',
                bundling: 'Format Bundling',
                bundling_2: 'Format Bundling 2 (Eksperimen / Revisi)'
            };
            if (showToast) showToast(`✓ Format Label Aktif: ${labels[mode]}`);
        } catch {
            if (showToast) showToast('❌ Gagal menyimpan format');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleFormat = (val: boolean) => {
        handleSelectFormatMode(val ? 'extended' : 'standar');
    };

    const handleToggleInterleaveSort = async (val: boolean) => {
        setIsSaving(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/toolkit-features`, {
                feature_key: 'label_sort_rak_msku',
                is_locked: val,
            });
            setIsInterleaveSort(val);
            if (showToast) showToast(`✓ Sort Rak & MSKU: ${val ? 'ON' : 'OFF'}`);
        } catch {
            if (showToast) showToast('❌ Gagal menyimpan pengaturan sort');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/label-table-config`, cfg);
            if (showToast) showToast('✓ Pengaturan tabel label disimpan!');
        } catch {
            if (showToast) showToast('❌ Gagal menyimpan pengaturan tabel');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setCfg({ ...DEFAULTS });
        if (showToast) showToast('⚠️ Pengaturan direset ke default (belum disimpan)');
    };

    const updateCfg = (key: keyof LabelConfig, val: number | string | boolean) => {
        setCfg(prev => ({ ...prev, [key]: val }));
    };

    // ---- LIVE PREVIEW ----
    const stdMaxFont = Math.max(cfg.std_font_msku || 8, cfg.std_font_qty || 8);
    const extMaxFont = Math.max(cfg.ext_font_rak || 8, cfg.ext_font_msku || 8, cfg.ext_font_qty || 8);
    
    const stdRowH  = Math.max(cfg.std_row_height, stdMaxFont * 2.25);
    const extRowH  = Math.max(cfg.ext_row_height, extMaxFont * 2.25);

    const stdTotal  = ptToPx(cfg.std_col_msku + cfg.std_col_qty);
    const extTotal  = ptToPx(cfg.ext_col_rak + cfg.ext_col_msku + cfg.ext_col_qty);
    const previewW  = isExtended ? extTotal : stdTotal;

    // Replicate Python split_msku_at_dash: split at first dash when text > MSKU_SAFETY_CHARS
    // Backend default max_chars = 22 (matches main.py MSKU_SAFETY_CHARS)
    const splitMskuAtDash = (msku: string): string[] => {
        const maxChars = 22;
        if (msku.length <= maxChars) return [msku];
        const firstDash = msku.indexOf('-');
        if (firstDash === -1) return [msku.slice(0, maxChars), msku.slice(maxChars)];
        return [msku.slice(0, firstDash + 1), msku.slice(firstDash + 1)];
    };

    // Convert pt to CSS px (1pt = 1.333px at 96dpi)
    const ptToCssPx = (pt: number) => Math.round(pt * 1.333);

    const StdPreview = () => {
        const mw = ptToPx(cfg.std_col_msku);
        const qw = ptToPx(cfg.std_col_qty);
        // font size per kolom
        const fm = ptToCssPx(cfg.std_font_msku || 8);
        const fq = ptToCssPx(cfg.std_font_qty || 8);
        const baseRh = ptToPx(stdRowH);
        const border = `${Math.max(0.5, cfg.border_thickness)}px solid #111`;
        const rows = [
            { msku: 'MSKU', qty: 'Qty', isHeader: true },
            { msku: 'BAG-DCB-32/A4', qty: '1', isHeader: false },
            { msku: 'PULPEN-1BOX/GP-266/BLACK', qty: '2', isHeader: false },
            { msku: 'LOOSELEAF-B5-7026/50Lembar', qty: '1', isHeader: false },
        ];
        return (
            <table style={{ borderCollapse: 'collapse', width: mw + qw, tableLayout: 'fixed' }}>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} style={{ background: row.isHeader ? cfg.header_bg : '#fff' }}>
                            <td style={{ 
                                width: mw, minHeight: baseRh, border, padding: '2px 4px', 
                                fontSize: row.isHeader ? '12px' : fm, 
                                fontFamily: row.isHeader ? 'Helvetica, Arial, sans-serif' : cfg.std_font_msku_family,
                                color: row.isHeader ? cfg.header_color : '#111', 
                                fontWeight: row.isHeader || cfg.std_font_msku_bold ? 'bold' : 'normal', 
                                textAlign: 'left', verticalAlign: 'middle',
                                wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal',
                                lineHeight: 1.4,
                            }}>
                                {row.msku}
                            </td>
                            <td style={{ 
                                width: qw, minHeight: baseRh, border, padding: '2px 4px', 
                                fontSize: row.isHeader ? '12px' : fq, 
                                fontFamily: row.isHeader ? 'Helvetica, Arial, sans-serif' : cfg.std_font_qty_family,
                                color: row.isHeader ? cfg.header_color : '#111', 
                                fontWeight: row.isHeader || cfg.std_font_qty_bold ? 'bold' : 'normal', 
                                textAlign: 'center', verticalAlign: 'middle',
                            }}>
                                {row.qty}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const ExtPreview = () => {
        const rw = ptToPx(cfg.ext_col_rak);
        const mw = ptToPx(cfg.ext_col_msku);
        const qw = ptToPx(cfg.ext_col_qty);
        // font size per kolom
        const fr = ptToCssPx(cfg.ext_font_rak || 8);
        const fm = ptToCssPx(cfg.ext_font_msku || 8);
        const fq = ptToCssPx(cfg.ext_font_qty || 8);
        const baseRh = ptToPx(extRowH);
        const border = `${Math.max(0.5, cfg.border_thickness)}px solid #111`;
        const rows = [
            { rak: 'Rak & ID', msku: 'MSKU', qty: 'Qty', isHeader: true },
            { rak: '1-W-02-01', msku: 'BINDERNOTE-B5MHIM-M140/DRKGREY', qty: '1', isHeader: false },
            { rak: '2-W-03-02', msku: 'BINDERNOTE-B5-MHPT-143/BLUE', qty: '1', isHeader: false },
            { rak: 'F-DS-01-04', msku: 'LOOSELEAF-B5-7026/50Lembar', qty: '2', isHeader: false },
        ];
        return (
            <table style={{ borderCollapse: 'collapse', width: rw + mw + qw, tableLayout: 'fixed' }}>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} style={{ background: row.isHeader ? cfg.header_bg : '#fff' }}>
                            <td style={{ 
                                width: rw, minHeight: baseRh, border, padding: '2px 4px', 
                                fontSize: row.isHeader ? '12px' : fr, 
                                fontFamily: row.isHeader ? 'Helvetica, Arial, sans-serif' : cfg.ext_font_rak_family,
                                color: row.isHeader ? cfg.header_color : '#111', 
                                fontWeight: row.isHeader || cfg.ext_font_rak_bold ? 'bold' : 'normal', 
                                textAlign: 'center', verticalAlign: 'middle',
                                wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal',
                                lineHeight: 1.4,
                            }}>
                                {row.rak}
                            </td>
                            <td style={{ 
                                width: mw, minHeight: baseRh, border, padding: '2px 4px', 
                                fontSize: row.isHeader ? '12px' : fm, 
                                fontFamily: row.isHeader ? 'Helvetica, Arial, sans-serif' : cfg.ext_font_msku_family,
                                color: row.isHeader ? cfg.header_color : '#111', 
                                fontWeight: row.isHeader || cfg.ext_font_msku_bold ? 'bold' : 'normal', 
                                textAlign: 'left', verticalAlign: 'middle',
                                wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal',
                                lineHeight: 1.4,
                            }}>
                                {row.msku}
                            </td>
                            <td style={{ 
                                width: qw, minHeight: baseRh, border, padding: '2px 4px', 
                                fontSize: row.isHeader ? '12px' : fq, 
                                fontFamily: row.isHeader ? 'Helvetica, Arial, sans-serif' : cfg.ext_font_qty_family,
                                color: row.isHeader ? cfg.header_color : '#111', 
                                fontWeight: row.isHeader || cfg.ext_font_qty_bold ? 'bold' : 'normal', 
                                textAlign: 'center', verticalAlign: 'middle',
                            }}>
                                {row.qty}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const BoldToggle = ({ label, stateKey }: { label: string; stateKey: keyof LabelConfig }) => {
        const val = cfg[stateKey] as boolean;
        return (
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600">{label}</label>
                <button
                    onClick={() => updateCfg(stateKey, !val)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${val ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${val ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
            </div>
        );
    };

    // ---- SLIDER COMPONENT ----
    const Slider = ({ label, stateKey, min, max, step = 1, unit = 'pt' }: { label: string; stateKey: keyof LabelConfig; min: number; max: number; step?: number; unit?: string; }) => {
        const val = cfg[stateKey] as number;
        return (
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-600">{label}</label>
                    <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">{val}{unit}</span>
                </div>
                <input
                    type="range" min={min} max={max} step={step} value={val}
                    onChange={e => updateCfg(stateKey, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{min}{unit}</span><span>{max}{unit}</span>
                </div>
            </div>
        );
    };

    const FontSelect = ({ label, stateKey }: { label: string; stateKey: keyof LabelConfig }) => {
        const val = cfg[stateKey] as string;
        return (
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">{label}</label>
                <select
                    value={val}
                    onChange={e => updateCfg(stateKey, e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                    {FONT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
        );
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8 rounded-2xl text-white shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                        <FiLayout className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Pengaturan Format Label</h2>
                        <p className="text-blue-100 text-sm mt-1">Konfigurasi kolom, ukuran font, dan border tabel label pengiriman</p>
                    </div>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1 flex-wrap">
                {([
                    { key: 'format', label: 'Format Label', icon: FiLayout },
                    { key: 'standar', label: 'Format Standar', icon: FiSliders },
                    { key: 'extended', label: 'Format Rak & ID', icon: FiSliders },
                    { key: 'bundling', label: 'Format Bundling', icon: FiPackage },
                    { key: 'bundling_2', label: 'Format Bundling 2', icon: FiPackage },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                            ? tab.key === 'bundling_2'
                                ? 'bg-purple-600 text-white shadow-md'
                                : tab.key === 'bundling'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ---- TAB: FORMAT SELECT ---- */}
            {activeTab === 'format' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { 
                            key: 'standar', 
                            title: 'Format Standar', 
                            cols: 2, 
                            desc: 'Hanya menampilkan kolom MSKU dan Qty. Desain bersih dan minimalis.',
                            headers: ['MSKU', 'QTY'],
                            data: ['BAG-DCB-32/A4', '1'],
                            theme: 'blue'
                        },
                        { 
                            key: 'extended', 
                            title: 'Format Rak & ID', 
                            cols: 3, 
                            desc: 'Menambahkan kolom Rak & ID (e.g. A-01-02). Memudahkan picker menemukan lokasi barang.',
                            headers: ['RAK & ID', 'MSKU', 'QTY'],
                            data: ['A-01-02', 'BAG-DCB-32/A4', '1'],
                            theme: 'blue'
                        },
                        { 
                            key: 'bundling', 
                            title: 'Format Bundling', 
                            cols: 4, 
                            desc: 'Memecah SKU bundle menjadi baris satuan. Kolom: JENIS · MODEL · VARIAN · QTY.',
                            headers: ['JENIS', 'MODEL', 'VARIAN', 'QTY'],
                            data: ['PULPEN', 'GP-262', 'BLUE', '10'],
                            badge: 'Bundling 1',
                            theme: 'emerald'
                        },
                        { 
                            key: 'bundling_2', 
                            title: 'Format Bundling 2', 
                            cols: 4, 
                            desc: 'Format Bundling khusus rombak & revisi terpisah. Bebas diubah tanpa mengubah Format Bundling 1.',
                            headers: ['JENIS', 'MODEL', 'VARIAN', 'QTY'],
                            data: ['PULPEN', 'GP-262', 'BLUE', '10'],
                            badge: 'Bundling 2',
                            theme: 'purple'
                        },
                    ].map(opt => {
                        const isSelected = formatMode === opt.key;
                        const isEmerald = opt.theme === 'emerald';
                        const isPurple = opt.theme === 'purple';
                        return (
                            <div key={opt.key}
                                onClick={() => !isSaving && handleSelectFormatMode(opt.key as any)}
                                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all group ${
                                    isSelected
                                        ? isPurple
                                            ? 'border-purple-500 bg-purple-50/50 ring-4 ring-purple-500/10'
                                            : isEmerald
                                            ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/10'
                                            : 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10'
                                        : 'border-gray-200 hover:border-blue-200 bg-white hover:shadow-lg'
                                }`}
                            >
                                {opt.badge && (
                                    <div className={`absolute top-4 right-12 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                        isPurple
                                            ? 'bg-purple-100 text-purple-700'
                                            : isEmerald
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {opt.badge}
                                    </div>
                                )}
                                {isSelected && (
                                    <div className={`absolute top-4 right-4 text-white p-1 rounded-full ${
                                        isPurple ? 'bg-purple-500' : isEmerald ? 'bg-emerald-500' : 'bg-blue-500'
                                    }`}>
                                        <FiCheck className="w-4 h-4" />
                                    </div>
                                )}
                                <h4 className={`font-bold text-lg mb-2 transition-colors ${
                                    isSelected
                                        ? (isPurple ? 'text-purple-700' : isEmerald ? 'text-emerald-700' : 'text-blue-700')
                                        : 'text-gray-900'
                                }`}>
                                    {opt.title}
                                </h4>
                                <p className="text-gray-500 text-sm leading-relaxed mb-4">{opt.desc}</p>
                                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${opt.cols}, 1fr)` }}>
                                        {opt.headers.map(h => (
                                            <div key={h} className={`h-4 rounded ${
                                                isPurple ? 'bg-purple-700' : isEmerald ? 'bg-emerald-700' : 'bg-gray-700'
                                            }`} />
                                        ))}
                                        {opt.data.map((d, i) => (
                                            <div key={i} className={`h-4 rounded ${
                                                isPurple ? 'bg-purple-100' : isEmerald ? 'bg-emerald-100' : 'bg-blue-100'
                                            }`} />
                                        ))}
                                    </div>
                                </div>
                                {opt.key === 'bundling' && (
                                    <p className="text-[10px] text-emerald-600 mt-3 font-medium">⚙️ Atur kolom di tab "Format Bundling"</p>
                                )}
                                {opt.key === 'bundling_2' && (
                                    <p className="text-[10px] text-purple-600 mt-3 font-medium">⚙️ Atur kolom di tab "Format Bundling 2"</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ---- TAB: STANDAR SETTINGS ---- */}
            {activeTab === 'standar' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    {/* Controls */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-3">⚙️ Pengaturan Format Standar</h3>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Lebar Kolom</p>
                            <Slider label="Lebar MSKU" stateKey="std_col_msku" min={100} max={300} />
                            <Slider label="Lebar Qty" stateKey="std_col_qty" min={30} max={100} />
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Tinggi & Font</p>
                            <Slider label="Font MSKU" stateKey="std_font_msku" min={6} max={24} step={0.5} unit="pt" />
                            <div className="grid grid-cols-2 gap-4">
                                <FontSelect label="Jenis Font MSKU" stateKey="std_font_msku_family" />
                                <div className="flex items-end pb-1.5">
                                    <BoldToggle label="Bold MSKU" stateKey="std_font_msku_bold" />
                                </div>
                            </div>
                            <Slider label="Font Qty" stateKey="std_font_qty" min={6} max={24} step={0.5} unit="pt" />
                            <div className="grid grid-cols-2 gap-4">
                                <FontSelect label="Jenis Font Qty" stateKey="std_font_qty_family" />
                                <div className="flex items-end pb-1.5">
                                    <BoldToggle label="Bold Qty" stateKey="std_font_qty_bold" />
                                </div>
                            </div>
                            <Slider label="Tinggi Baris Minimum" stateKey="std_row_height" min={12} max={40} />
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Border & Warna Header</p>
                            <Slider label="Ketebalan Border" stateKey="border_thickness" min={0} max={3} step={0.5} />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Warna BG Header</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={cfg.header_bg} onChange={e => updateCfg('header_bg', e.target.value)} className="h-9 w-16 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                                        <code className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-600">{cfg.header_bg}</code>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Warna Teks Header</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={cfg.header_color} onChange={e => updateCfg('header_color', e.target.value)} className="h-9 w-16 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                                        <code className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-600">{cfg.header_color}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LIVE PREVIEW */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-3">👁 Live Preview — Format Standar</h3>
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 flex flex-col items-center justify-center min-h-[200px] overflow-auto">
                            <div className="overflow-x-auto max-w-full pb-2">
                                <div style={{ width: ptToPx(283), backgroundColor: 'white', padding: '10px 7px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} className="mx-auto border border-gray-200">
                                    <div className="text-[10px] text-gray-400 mb-2 border-b border-gray-200 pb-1 flex justify-between">
                                        <span>Batas Lebar Label Asli (100mm)</span>
                                        <span>283pt</span>
                                    </div>
                                    <StdPreview />
                                    <div className="text-[10px] text-gray-400 mt-2 text-right">
                                        Total Lebar Tabel: {cfg.std_col_msku + cfg.std_col_qty}pt
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-3 items-start">
                            <FiInfo className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">Preview ini adalah simulasi visual. Tampilan asli PDF mungkin sedikit berbeda tergantung konten dan panjang MSKU.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- TAB: EXTENDED SETTINGS ---- */}
            {activeTab === 'extended' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    {/* Controls */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-gray-800">⚙️ Pengaturan Format Rak & ID</h3>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isInterleaveSort ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    SORT MSKU: {isInterleaveSort ? 'ON' : 'OFF'}
                                </span>
                                <button
                                    onClick={() => handleToggleInterleaveSort(!isInterleaveSort)}
                                    disabled={isSaving}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ${isInterleaveSort ? 'bg-blue-600 ring-blue-500' : 'bg-gray-200 ring-gray-100'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isInterleaveSort ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 mb-4">
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                                <b>Fitur Sort MSKU:</b> Jika ON, item yang tidak memiliki lokasi rak akan di-sort berdasarkan MSKU dan disisipkan di antara item ber-Rak sesuai abjad.
                            </p>
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Lebar Kolom</p>
                            <Slider label="Lebar Rak & ID" stateKey="ext_col_rak" min={40} max={150} />
                            <Slider label="Lebar MSKU" stateKey="ext_col_msku" min={80} max={250} />
                            <Slider label="Lebar Qty" stateKey="ext_col_qty" min={30} max={100} />
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Tinggi & Font</p>
                            <Slider label="Font Rak & ID" stateKey="ext_font_rak" min={6} max={24} step={0.5} unit="pt" />
                            <div className="grid grid-cols-2 gap-4">
                                <FontSelect label="Jenis Font Rak & ID" stateKey="ext_font_rak_family" />
                                <div className="flex items-end pb-1.5">
                                    <BoldToggle label="Bold Rak" stateKey="ext_font_rak_bold" />
                                </div>
                            </div>
                            <Slider label="Font MSKU" stateKey="ext_font_msku" min={6} max={24} step={0.5} unit="pt" />
                            <div className="grid grid-cols-2 gap-4">
                                <FontSelect label="Jenis Font MSKU" stateKey="ext_font_msku_family" />
                                <div className="flex items-end pb-1.5">
                                    <BoldToggle label="Bold MSKU" stateKey="ext_font_msku_bold" />
                                </div>
                            </div>
                            <Slider label="Font Qty" stateKey="ext_font_qty" min={6} max={24} step={0.5} unit="pt" />
                            <div className="grid grid-cols-2 gap-4">
                                <FontSelect label="Jenis Font Qty" stateKey="ext_font_qty_family" />
                                <div className="flex items-end pb-1.5">
                                    <BoldToggle label="Bold Qty" stateKey="ext_font_qty_bold" />
                                </div>
                            </div>
                            <Slider label="Tinggi Baris Minimum" stateKey="ext_row_height" min={12} max={40} />
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Border & Warna Header</p>
                            <Slider label="Ketebalan Border" stateKey="border_thickness" min={0} max={3} step={0.5} />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Warna BG Header</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={cfg.header_bg} onChange={e => updateCfg('header_bg', e.target.value)} className="h-9 w-16 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                                        <code className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-600">{cfg.header_bg}</code>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Warna Teks Header</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={cfg.header_color} onChange={e => updateCfg('header_color', e.target.value)} className="h-9 w-16 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                                        <code className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-600">{cfg.header_color}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LIVE PREVIEW */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-3">👁 Live Preview — Format Rak & ID</h3>
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 flex flex-col items-center justify-center min-h-[200px] overflow-auto">
                            <div className="overflow-x-auto max-w-full pb-2">
                                <div style={{ width: ptToPx(283), backgroundColor: 'white', padding: '10px 7px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} className="mx-auto border border-gray-200">
                                    <div className="text-[10px] text-gray-400 mb-2 border-b border-gray-200 pb-1 flex justify-between">
                                        <span>Batas Lebar Label Asli (100mm)</span>
                                        <span>283pt</span>
                                    </div>
                                    <ExtPreview />
                                    <div className="text-[10px] text-gray-400 mt-2 text-right">
                                        Total Lebar Tabel: {cfg.ext_col_rak + cfg.ext_col_msku + cfg.ext_col_qty}pt
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-3 items-start">
                            <FiInfo className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">Preview ini adalah simulasi visual. Tampilan asli PDF mungkin sedikit berbeda tergantung konten dan panjang MSKU.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- TAB: BUNDLING SETTINGS ---- */}
            {activeTab === 'bundling' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-3">⚙️ Pengaturan Format Bundling</h3>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                            <p className="text-[11px] text-emerald-700 leading-relaxed">
                                Format ini menggunakan data dari <b>Database SKU Bundling</b>. SKU bundle (mis. PULPEN-1BOX/GP-262/BLUE) dipecah menjadi baris satuan dengan kolom JENIS, MODEL, VARIAN, dan QTY.
                            </p>
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Lebar Kolom (pt)</p>
                            {[
                                { key: 'col_jenis' as const, label: 'Lebar JENIS', min: 40, max: 120 },
                                { key: 'col_model' as const, label: 'Lebar MODEL', min: 60, max: 180 },
                                { key: 'col_varian' as const, label: 'Lebar VARIAN', min: 30, max: 120 },
                                { key: 'col_qty' as const, label: 'Lebar QTY', min: 25, max: 80 },
                            ].map(s => (
                                <div key={s.key} className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-gray-600">{s.label}</label>
                                        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">{bCfg[s.key]}pt</span>
                                    </div>
                                    <input type="range" min={s.min} max={s.max} step={0.5} value={bCfg[s.key]}
                                        onChange={e => updateBCfg(s.key, parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                    <div className="flex justify-between text-[10px] text-gray-400"><span>{s.min}pt</span><span>{s.max}pt</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Ukuran Font (pt)</p>
                            {[
                                { key: 'font_jenis' as const, label: 'Font JENIS' },
                                { key: 'font_model' as const, label: 'Font MODEL' },
                                { key: 'font_varian' as const, label: 'Font VARIAN' },
                                { key: 'font_qty' as const, label: 'Font QTY' },
                                { key: 'row_height' as const, label: 'Tinggi Baris Min' },
                            ].map(s => (
                                <div key={s.key} className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-gray-600">{s.label}</label>
                                        <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100">{bCfg[s.key]}pt</span>
                                    </div>
                                    <input type="range" min={6} max={s.key === 'row_height' ? 50 : 24} step={0.5} value={bCfg[s.key]}
                                        onChange={e => updateBCfg(s.key, parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                </div>
                            ))}
                        </div>

                        {/* Pilihan Posisi Kolom MODEL: Kiri / Tengah */}
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                            <label className="text-xs font-semibold text-gray-700">Posisi Kolom MODEL</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateBCfg('align_model', 'left')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                                        (bCfg.align_model || 'left') === 'left'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    ⬅️ Rata Kiri
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateBCfg('align_model', 'center')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                                        bCfg.align_model === 'center'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    ↔️ Rata Tengah
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400">Atur perataan teks pada data MODEL (Rata Kiri untuk kerapian nama SKU atau Rata Tengah).</p>
                        </div>
                    </div>
                    {/* Live Preview Bundling */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-3">👁 Live Preview — Format Bundling</h3>
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 flex flex-col items-center justify-center min-h-[200px] overflow-auto">
                            <div className="overflow-x-auto max-w-full pb-2">
                                <div style={{ backgroundColor: 'white', padding: '10px 7px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} className="mx-auto border border-gray-200">
                                    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed',
                                        width: Math.round((bCfg.col_jenis + bCfg.col_model + bCfg.col_varian + bCfg.col_qty) * (350/271.5)) }}>
                                        <tbody>
                                            {/* Baris 0: Header PIC Mandiri (Merger 4 Kolom) */}
                                            <tr style={{ background: cfg.header_bg, color: cfg.header_color }}>
                                                <th colSpan={4} style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '4px 6px', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }}>
                                                    PIC : APRILIA MAULIDA NINGRUM
                                                </th>
                                            </tr>
                                            {/* Baris 1: Header Kolom */}
                                            <tr style={{ background: cfg.header_bg, color: cfg.header_color }}>
                                                <th style={{ width: Math.round(bCfg.col_jenis * (350/271.5)), border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}>
                                                    JENIS
                                                </th>
                                                <th style={{ width: Math.round(bCfg.col_model * (350/271.5)), border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}>
                                                    MODEL
                                                </th>
                                                <th style={{ width: Math.round(bCfg.col_varian * (350/271.5)), border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}>
                                                    VARIAN
                                                </th>
                                                <th style={{ width: Math.round(bCfg.col_qty * (350/271.5)), border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}>
                                                    QTY
                                                </th>
                                            </tr>
                                            {/* Row 1: SKU Reguler (Non-Bundling) Tanpa Varian */}
                                            <tr>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '2px 4px', fontSize: Math.round(bCfg.font_jenis * 1.333), textAlign: 'center', lineHeight: '1.15' }}>
                                                    PENCIL<br />COLOR
                                                </td>
                                                <td colSpan={2} style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 6px', fontSize: Math.round(bCfg.font_model * 1.333), textAlign: (bCfg.align_model || 'left') === 'center' ? 'center' : 'left' }}>
                                                    CP-0133-SH12
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: Math.round(bCfg.font_qty * 1.333), textAlign: 'center', fontWeight: 'bold' }}>
                                                    12
                                                </td>
                                            </tr>
                                            {/* Row 2: SKU Bundling Tanpa Varian (JENIS 2 Baris: MECHANICAL / PENCIL) */}
                                            <tr>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '2px 4px', fontSize: Math.round(bCfg.font_jenis * 1.333), textAlign: 'center', lineHeight: '1.15', fontWeight: 500 }}>
                                                    MECHANICAL<br />PENCIL
                                                </td>
                                                <td colSpan={2} style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 6px', fontSize: Math.round(bCfg.font_model * 1.333), textAlign: (bCfg.align_model || 'left') === 'center' ? 'center' : 'left' }}>
                                                    <span style={{ fontSize: Math.round((bCfg.font_model + 2) * 1.333), fontWeight: 'bold' }}>1BOX</span>/MP-70
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: Math.round(bCfg.font_qty * 1.333), textAlign: 'center', fontWeight: 'bold' }}>
                                                    22
                                                </td>
                                            </tr>
                                            {/* Row 3: SKU Bundling Ada Varian (Model & Varian Terpisah, 1BOX naik +2pt) */}
                                            <tr>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '2px 4px', fontSize: Math.round(bCfg.font_jenis * 1.333), textAlign: 'center' }}>
                                                    PULPEN
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 6px', fontSize: Math.round(bCfg.font_model * 1.333), textAlign: (bCfg.align_model || 'left') === 'center' ? 'center' : 'left' }}>
                                                    <span style={{ fontSize: Math.round((bCfg.font_model + 2) * 1.333), fontWeight: 'bold' }}>1BOX</span>/GP-157
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: Math.round(bCfg.font_varian * 1.333), textAlign: 'center' }}>
                                                    BLACK
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: Math.round(bCfg.font_qty * 1.333), textAlign: 'center', fontWeight: 'bold' }}>
                                                    2
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="text-[10px] text-gray-400 mt-2 text-right">
                                        Total Lebar: {bCfg.col_jenis + bCfg.col_model + bCfg.col_varian + bCfg.col_qty}pt (Auto-fit Presisi Pas ke Margin Kanan Label)
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex gap-3 items-start">
                            <FiInfo className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700 leading-relaxed">
                                Format Bundling membagi semua data SKU ke kolom <b>JENIS</b>, <b>MODEL</b>, <b>VARIAN</b>, dan <b>QTY</b>. Jika SKU tidak memiliki varian warna (contoh: <code>PENCILCOLOR | CP-0133-SH12 | 12</code> atau <code>MECHANICALPENCIL | 1BOX/MP-70 | 22</code>), maka kolom <b>MODEL &amp; VARIAN otomatis digabung</b>. Khusus SKU yang terdaftar di <b>Database SKU Bundling</b>, teks kemasan (<b>1BOX, 1PACK, 1SLOP, 1DRUM</b>) pada kolom MODEL otomatis diperbesar <b>+2pt</b> agar jelas bagi picker gudang.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setBCfg(BUNDLING_DEFAULTS)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                                <FiRefreshCw className="w-4 h-4" />Reset Default
                            </button>
                            <button onClick={() => {
                                    axios.post(`${API_CONFIG.BASE_URL}/settings/label-bundling-config`, bCfg)
                                        .then(() => showToast?.('Pengaturan Format Bundling disimpan!'))
                                        .catch(() => showToast?.('Gagal menyimpan (gunakan nilai default)'));
                                }}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all shadow-md">
                                <FiSave className="w-4 h-4" />Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- TAB: BUNDLING 2 SETTINGS (ISOLATED / EXPERIMENTAL) ---- */}
            {activeTab === 'bundling_2' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-gray-800">⚙️ Pengaturan Format Bundling 2</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wide">
                                Terisolasi / Bebas Rombak
                            </span>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                            <p className="text-[11px] text-purple-700 leading-relaxed">
                                <b>Format Bundling 2:</b> Konfigurasi dan logika ini terpisah 100% dari Format Bundling 1. Anda dapat bebas merevisi, merombak, atau mengubah pengaturan di sini tanpa khawatir merusak Format Bundling 1.
                            </p>
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Lebar Kolom (pt)</p>
                            {[
                                { key: 'col_jenis' as const, label: 'Lebar JENIS', min: 40, max: 120 },
                                { key: 'col_model' as const, label: 'Lebar MODEL', min: 60, max: 180 },
                                { key: 'col_varian' as const, label: 'Lebar VARIAN', min: 30, max: 120 },
                                { key: 'col_qty' as const, label: 'Lebar QTY', min: 25, max: 80 },
                            ].map(s => (
                                <div key={s.key} className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-gray-600">{s.label}</label>
                                        <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100">{b2Cfg[s.key]}pt</span>
                                    </div>
                                    <input type="range" min={s.min} max={s.max} step={0.5} value={b2Cfg[s.key]}
                                        onChange={e => updateB2Cfg(s.key, parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                    <div className="flex justify-between text-[10px] text-gray-400"><span>{s.min}pt</span><span>{s.max}pt</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-5">
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Ukuran Font (pt)</p>
                            {[
                                { key: 'font_jenis' as const, label: 'Font JENIS' },
                                { key: 'font_model' as const, label: 'Font MODEL' },
                                { key: 'font_varian' as const, label: 'Font VARIAN' },
                                { key: 'font_qty' as const, label: 'Font QTY' },
                                { key: 'row_height' as const, label: 'Tinggi Baris Min' },
                            ].map(s => (
                                <div key={s.key} className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-gray-600">{s.label}</label>
                                        <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">{b2Cfg[s.key]}pt</span>
                                    </div>
                                    <input type="range" min={6} max={s.key === 'row_height' ? 50 : 24} step={0.5} value={b2Cfg[s.key]}
                                        onChange={e => updateB2Cfg(s.key, parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                            ))}
                        </div>

                        {/* Pilihan Posisi Kolom MODEL: Kiri / Tengah */}
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                            <label className="text-xs font-semibold text-gray-700">Posisi Kolom MODEL</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateB2Cfg('align_model', 'left')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                                        (b2Cfg.align_model || 'left') === 'left'
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    ⬅️ Rata Kiri
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateB2Cfg('align_model', 'center')}
                                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                                        b2Cfg.align_model === 'center'
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    ↔️ Rata Tengah
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400">Atur perataan teks pada data MODEL (Rata Kiri untuk kerapian nama SKU atau Rata Tengah).</p>
                        </div>
                    </div>
                    {/* Live Preview Bundling 2 */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-3">👁 Live Preview — Format Bundling 2</h3>
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 flex flex-col items-center justify-center min-h-[200px] overflow-auto">
                            <div className="overflow-x-auto max-w-full pb-2">
                                <div style={{ backgroundColor: 'white', padding: '10px 7px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} className="mx-auto border border-gray-200">
                                    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed',
                                        width: Math.round((b2Cfg.col_jenis + b2Cfg.col_model + b2Cfg.col_varian + b2Cfg.col_qty) * (350/271.5)) }}>
                                        <tbody>
                                            {/* Baris 0: Header PIC Mandiri (Merger 4 Kolom) */}
                                            <tr style={{ background: cfg.header_bg, color: cfg.header_color }}>
                                                <th colSpan={4} style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '4px 6px', fontSize: 11, textAlign: 'center', fontWeight: 'bold' }}>
                                                    PIC : APRILIA MAULIDA NINGRUM
                                                </th>
                                            </tr>
                                            {/* Baris 1: Header Kolom */}
                                            <tr style={{ background: cfg.header_bg, color: cfg.header_color }}>
                                                <th style={{ width: Math.round(b2Cfg.col_jenis * (350/271.5)), border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}>
                                                    JENIS
                                                </th>
                                                <th style={{ width: Math.round(b2Cfg.col_model * (350/271.5)), border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}>
                                                    MODEL
                                                </th>
                                                <th style={{ width: Math.round(b2Cfg.col_varian * (350/271.5)), border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}>
                                                    VARIAN
                                                </th>
                                                <th style={{ width: Math.round(b2Cfg.col_qty * (350/271.5)), border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}>
                                                    QTY
                                                </th>
                                            </tr>
                                            {/* Row 1: SKU Reguler (Non-Bundling) Tanpa Varian */}
                                            <tr>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '2px 4px', fontSize: Math.round(b2Cfg.font_jenis * 1.333), textAlign: 'center', lineHeight: '1.15' }}>
                                                    PENCIL<br />COLOR
                                                </td>
                                                <td colSpan={2} style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 6px', fontSize: Math.round(b2Cfg.font_model * 1.333), textAlign: (b2Cfg.align_model || 'left') === 'center' ? 'center' : 'left' }}>
                                                    CP-0133-SH12
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: Math.round(b2Cfg.font_qty * 1.333), textAlign: 'center', fontWeight: 'bold' }}>
                                                    12
                                                </td>
                                            </tr>
                                            {/* Row 2: SKU Bundling Tanpa Varian (JENIS 2 Baris: MECHANICAL / PENCIL) */}
                                            <tr>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '2px 4px', fontSize: Math.round(b2Cfg.font_jenis * 1.333), textAlign: 'center', lineHeight: '1.15', fontWeight: 500 }}>
                                                    MECHANICAL<br />PENCIL
                                                </td>
                                                <td colSpan={2} style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 6px', fontSize: Math.round(b2Cfg.font_model * 1.333), textAlign: (b2Cfg.align_model || 'left') === 'center' ? 'center' : 'left' }}>
                                                    <span style={{ fontSize: Math.round((b2Cfg.font_model + 2) * 1.333), fontWeight: 'bold' }}>1BOX</span>/MP-70
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: Math.round(b2Cfg.font_qty * 1.333), textAlign: 'center', fontWeight: 'bold' }}>
                                                    22
                                                </td>
                                            </tr>
                                            {/* Row 3: SKU Bundling Ada Varian (Model & Varian Terpisah, 1BOX naik +2pt) */}
                                            <tr>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '2px 4px', fontSize: Math.round(b2Cfg.font_jenis * 1.333), textAlign: 'center' }}>
                                                    PULPEN
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 6px', fontSize: Math.round(b2Cfg.font_model * 1.333), textAlign: (b2Cfg.align_model || 'left') === 'center' ? 'center' : 'left' }}>
                                                    <span style={{ fontSize: Math.round((b2Cfg.font_model + 2) * 1.333), fontWeight: 'bold' }}>1BOX</span>/GP-157
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: Math.round(b2Cfg.font_varian * 1.333), textAlign: 'center' }}>
                                                    BLACK
                                                </td>
                                                <td style={{ border: `${Math.max(0.5, cfg.border_thickness)}px solid #111`, padding: '3px 4px', fontSize: Math.round(b2Cfg.font_qty * 1.333), textAlign: 'center', fontWeight: 'bold' }}>
                                                    2
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="text-[10px] text-gray-400 mt-2 text-right">
                                        Total Lebar: {b2Cfg.col_jenis + b2Cfg.col_model + b2Cfg.col_varian + b2Cfg.col_qty}pt (Auto-fit Presisi Pas ke Margin Kanan Label)
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 flex gap-3 items-start">
                            <FiInfo className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-purple-700 leading-relaxed">
                                <b>Format Bundling 2:</b> Konfigurasi dan logika ini terpisah 100% dari Format Bundling 1. Kolom JENIS diformat menjadi 2 baris (misal: <code>MECHANICAL&lt;br/&gt;PENCIL</code>) dengan lebar kolom ramping (default 65pt), sehingga kolom MODEL &amp; VARIAN mendapatkan ruang yang lebih luas.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setB2Cfg(BUNDLING_2_DEFAULTS)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                                <FiRefreshCw className="w-4 h-4" />Reset Default
                            </button>
                            <button onClick={() => {
                                    axios.post(`${API_CONFIG.BASE_URL}/settings/label-bundling-2-config`, b2Cfg)
                                        .then(() => showToast?.('Pengaturan Format Bundling 2 disimpan!'))
                                        .catch(() => showToast?.('Gagal menyimpan (gunakan nilai default)'));
                                }}
                                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-all shadow-md">
                                <FiSave className="w-4 h-4" />Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save / Reset Bar */}
            {activeTab !== 'format' && activeTab !== 'bundling' && activeTab !== 'bundling_2' && (
                <div className="flex justify-between items-center bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        <FiRefreshCw className="w-4 h-4" />
                        Reset ke Default
                    </button>
                    <button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 transition-all shadow-md hover:shadow-lg"
                    >
                        {isSaving ? <FiSettings className="animate-spin w-4 h-4" /> : <FiSave className="w-4 h-4" />}
                        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            )}

            {/* Info note */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex gap-3 items-start">
                <FiInfo className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    <b>Catatan:</b> Pengaturan warna header, ketebalan border, dan lebar kolom berlaku untuk <b>kedua format</b> sekaligus.
                    Setelah menyimpan, <b>restart backend</b> tidak diperlukan — perubahan aktif langsung saat proses label berikutnya.
                </p>
            </div>
        </div>
    );
};

export default AdminLabelSettings;
