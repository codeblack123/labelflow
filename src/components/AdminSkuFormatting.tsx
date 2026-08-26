import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiType, FiDroplet, FiBold, FiEdit2, FiSave, FiColumns, FiX, FiRefreshCcw } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface ColorRule { id: string; keyword: string; color_code: string; }
interface StyleRule { id: string; keyword: string; font_size: number; is_bold: boolean; }
interface ColumnSetting {
    id: string;
    column_name: string;
    column_width: number;
    font_size: number;
    font_name: string;
    is_bold: boolean;
    text_align: string;
}

interface AdminSkuFormattingProps { showToast?: (message: string) => void; }

const AdminSkuFormatting: React.FC<AdminSkuFormattingProps> = ({ showToast }) => {
    const [activeTab, setActiveTab] = useState<'colors' | 'styles' | 'columns'>('columns');
    const [colors, setColors] = useState<ColorRule[]>([]);
    const [styles, setStyles] = useState<StyleRule[]>([]);
    const [columns, setColumns] = useState<ColumnSetting[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Color Form
    const [newColorKeyword, setNewColorKeyword] = useState('');
    const [newColorCode, setNewColorCode] = useState('#FF0000');

    // Style Form
    const [newStyleKeyword, setNewStyleKeyword] = useState('');
    const [newStyleSize, setNewStyleSize] = useState(16);
    const [newStyleBold, setNewStyleBold] = useState(false);

    // Column Form
    const [newColName, setNewColName] = useState('');
    const [newColWidth, setNewColWidth] = useState(20);
    const [newColFontSize, setNewColFontSize] = useState(16);
    const [newColFontName, setNewColFontName] = useState('Rockwell');
    const [newColBold, setNewColBold] = useState(false);
    const [newColAlign, setNewColAlign] = useState('center');

    // Edit Column
    const [editingColId, setEditingColId] = useState<string | null>(null);
    const [editCol, setEditCol] = useState<Partial<ColumnSetting>>({});

    const [deleteCallback, setDeleteCallback] = useState<(() => void) | null>(null);
    const [deleteItemName, setDeleteItemName] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [resC, resS, resCols] = await Promise.all([
                axios.get(`${API_CONFIG.BASE_URL}/settings/formatting/colors`),
                axios.get(`${API_CONFIG.BASE_URL}/settings/formatting/styles`),
                axios.get(`${API_CONFIG.BASE_URL}/settings/formatting/columns`)
            ]);
            setColors(resC.data);
            setStyles(resS.data);
            setColumns(resCols.data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    // --- Color Handlers ---
    const handleAddColor = async () => {
        if (!newColorKeyword) return;
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/formatting/colors`, { keyword: newColorKeyword, color_code: newColorCode });
            setNewColorKeyword('');
            fetchAll();
            showToast?.('Rule warna ditambahkan');
        } catch (err: any) { alert(err.response?.data?.detail || 'Gagal'); }
    };

    // --- Style Handlers ---
    const handleAddStyle = async () => {
        if (!newStyleKeyword) return;
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/formatting/styles`, { keyword: newStyleKeyword, font_size: newStyleSize, is_bold: newStyleBold });
            setNewStyleKeyword('');
            fetchAll();
            showToast?.('Rule style ditambahkan');
        } catch (err: any) { alert(err.response?.data?.detail || 'Gagal'); }
    };

    // --- Column Handlers ---
    const handleAddColumn = async () => {
        if (!newColName) return;
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/formatting/columns`, {
                column_name: newColName, column_width: newColWidth, font_size: newColFontSize,
                font_name: newColFontName, is_bold: newColBold, text_align: newColAlign
            });
            setNewColName('');
            fetchAll();
            showToast?.('Kolom ditambahkan');
        } catch (err: any) { alert(err.response?.data?.detail || 'Gagal'); }
    };

    const startEditColumn = (col: ColumnSetting) => {
        setEditingColId(col.id);
        setEditCol({ ...col });
    };

    const saveEditColumn = async () => {
        if (!editingColId) return;
        try {
            await axios.put(`${API_CONFIG.BASE_URL}/settings/formatting/columns/${editingColId}`, editCol);
            setEditingColId(null);
            fetchAll();
            showToast?.('Kolom diupdate');
        } catch (err: any) { alert(err.response?.data?.detail || 'Gagal'); }
    };

    const confirmDelete = (name: string, callback: () => void) => { setDeleteItemName(name); setDeleteCallback(() => callback); };

    const handleResetDefault = async () => {
        if (!confirm('Apakah Anda yakin ingin mereset SEMUA pengaturan (Kolom, Warna, Style) ke default bawaan pabrik?')) return;
        setIsLoading(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/formatting/reset`);
            fetchAll();
            showToast?.('Berhasil direset ke default');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Gagal mereset');
        } finally {
            setIsLoading(false);
        }
    };

    // Real-time Preview Engine Hooks
    const previewColumns = columns.map(c => c.id === editingColId ? { ...c, ...editCol } : c) as ColumnSetting[];
    const previewColors = newColorKeyword ? [...colors, { id: 'temp', keyword: newColorKeyword, color_code: newColorCode }] : colors;
    const previewStyles = newStyleKeyword ? [...styles, { id: 'temp', keyword: newStyleKeyword, font_size: newStyleSize, is_bold: newStyleBold }] : styles;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Format Packing List</h2>
                    <p className="text-sm text-gray-500">Atur kolom, pewarnaan, dan style teks di Packing List Excel.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={handleResetDefault} className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 transition-colors mr-2">
                        <FiRefreshCcw className="w-4 h-4" /> Reset Default
                    </button>
                    <button onClick={() => setActiveTab('columns')} className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'columns' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <FiColumns className="w-4 h-4" /> Atur Kolom
                    </button>
                    <button onClick={() => setActiveTab('colors')} className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'colors' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <FiDroplet className="w-4 h-4" /> Warna Teks
                    </button>
                    <button onClick={() => setActiveTab('styles')} className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'styles' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <FiType className="w-4 h-4" /> Style Kata
                    </button>
                </div>
            </div>

            {/* TABS CONTENT BLOCK */}
            <div className="space-y-6">
                {/* COLUMNS TAB */}
                {activeTab === 'columns' && (
                    <div className="space-y-6">
                        {/* Add Column Form */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase"><FiPlus /> Tambah Kolom Baru</h3>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Nama Kolom" className="px-3 py-2 border rounded-lg text-sm" />
                                <input type="number" value={newColWidth} onChange={e => setNewColWidth(Number(e.target.value))} placeholder="Lebar" className="px-3 py-2 border rounded-lg text-sm" />
                                <input type="number" value={newColFontSize} onChange={e => setNewColFontSize(Number(e.target.value))} placeholder="Font Size" className="px-3 py-2 border rounded-lg text-sm" />
                                <input value={newColFontName} onChange={e => setNewColFontName(e.target.value)} placeholder="Font Name" className="px-3 py-2 border rounded-lg text-sm" />
                                <select value={newColAlign} onChange={e => setNewColAlign(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                                    <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                                </select>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newColBold} onChange={e => setNewColBold(e.target.checked)} /> Bold</label>
                                    <button onClick={handleAddColumn} disabled={!newColName} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Simpan</button>
                                </div>
                            </div>
                        </div>

                        {/* Column List Table */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Nama Kolom</th>
                                        <th className="px-4 py-3">Lebar</th>
                                        <th className="px-4 py-3">Font Size</th>
                                        <th className="px-4 py-3">Font Name</th>
                                        <th className="px-4 py-3">Align</th>
                                        <th className="px-4 py-3">Bold</th>
                                        <th className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {columns.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada pengaturan kolom</td></tr> : columns.map(col => (
                                        <tr key={col.id}>
                                            {editingColId === col.id ? (
                                                <>
                                                    <td className="px-4 py-3 font-mono">{col.column_name}</td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-col gap-1 w-24">
                                                            <input type="number" value={editCol.column_width} onChange={e => setEditCol({ ...editCol, column_width: Number(e.target.value) })} className="w-full px-2 py-1 border rounded text-sm" />
                                                            <input type="range" min="5" max="150" step="0.1" value={editCol.column_width || 20} onChange={e => setEditCol({ ...editCol, column_width: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-col gap-1 w-20">
                                                            <input type="number" value={editCol.font_size} onChange={e => setEditCol({ ...editCol, font_size: Number(e.target.value) })} className="w-full px-2 py-1 border rounded text-sm" />
                                                            <input type="range" min="8" max="72" value={editCol.font_size || 16} onChange={e => setEditCol({ ...editCol, font_size: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2"><input value={editCol.font_name} onChange={e => setEditCol({ ...editCol, font_name: e.target.value })} className="w-24 px-2 py-1 border rounded text-sm" /></td>
                                                    <td className="px-4 py-2">
                                                        <select value={editCol.text_align} onChange={e => setEditCol({ ...editCol, text_align: e.target.value })} className="px-2 py-1 border rounded text-sm">
                                                            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-2"><input type="checkbox" checked={editCol.is_bold} onChange={e => setEditCol({ ...editCol, is_bold: e.target.checked })} /></td>
                                                    <td className="px-4 py-2 text-right flex gap-2 justify-end">
                                                        <button onClick={saveEditColumn} className="text-green-600 p-2 hover:bg-green-50 rounded"><FiSave /></button>
                                                        <button onClick={() => setEditingColId(null)} className="text-gray-500 p-2 hover:bg-gray-100 rounded"><FiX /></button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 font-mono font-medium">{col.column_name}</td>
                                                    <td className="px-4 py-3">{col.column_width}</td>
                                                    <td className="px-4 py-3">{col.font_size}</td>
                                                    <td className="px-4 py-3">{col.font_name}</td>
                                                    <td className="px-4 py-3 capitalize">{col.text_align}</td>
                                                    <td className="px-4 py-3">{col.is_bold ? <FiBold className="text-blue-600" /> : '-'}</td>
                                                    <td className="px-4 py-3 text-right flex gap-2 justify-end">
                                                        <button onClick={() => startEditColumn(col)} className="text-blue-500 p-2 hover:bg-blue-50 rounded"><FiEdit2 /></button>
                                                        <button onClick={() => confirmDelete(col.column_name, async () => { await axios.delete(`${API_CONFIG.BASE_URL}/settings/formatting/columns/${col.id}`); fetchAll(); showToast?.('Kolom dihapus'); })} className="text-red-500 p-2 hover:bg-red-50 rounded"><FiTrash2 /></button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* COLORS TAB */}
                {activeTab === 'colors' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase"><FiPlus /> Tambah Rule Warna</h3>
                            <div className="space-y-4">
                                <input value={newColorKeyword} onChange={e => setNewColorKeyword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Kata Kunci (misal: RULEWARNA)" />
                                <div className="flex gap-2 items-center">
                                    <input type="color" value={newColorCode} onChange={e => setNewColorCode(e.target.value)} className="h-10 w-20 border rounded cursor-pointer" />
                                    <span className="text-sm font-mono">{newColorCode}</span>
                                </div>
                                <button onClick={handleAddColor} disabled={!newColorKeyword} className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-sm disabled:opacity-50">Simpan Rule</button>
                            </div>
                        </div>
                        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3">Kata Kunci</th><th className="px-6 py-3">Warna</th><th className="px-6 py-3 text-right">Aksi</th></tr></thead>
                                <tbody className="divide-y">
                                    {colors.length === 0 ? <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Belum ada rule</td></tr> : colors.map(r => (
                                        <tr key={r.id}>
                                            <td className="px-6 py-4 font-mono">{r.keyword}</td>
                                            <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border" style={{ backgroundColor: r.color_code }} /><span style={{ color: r.color_code }} className="font-bold">Sample</span></div></td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => confirmDelete(r.keyword, async () => { await axios.delete(`${API_CONFIG.BASE_URL}/settings/formatting/colors/${r.id}`); fetchAll(); showToast?.('Dihapus'); })} className="text-red-500 p-2 hover:bg-red-50 rounded"><FiTrash2 /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* STYLES TAB */}
                {activeTab === 'styles' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase"><FiPlus /> Tambah Rule Style</h3>
                            <div className="space-y-4">
                                <input value={newStyleKeyword} onChange={e => setNewStyleKeyword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Kata Kunci (misal: 1BOX)" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" value={newStyleSize} onChange={e => setNewStyleSize(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm" placeholder="Font Size" />
                                    <label className="flex items-center gap-2 pt-2"><input type="checkbox" checked={newStyleBold} onChange={e => setNewStyleBold(e.target.checked)} /> <span className="text-sm font-medium"><FiBold /> Bold</span></label>
                                </div>
                                <button onClick={handleAddStyle} disabled={!newStyleKeyword} className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-sm disabled:opacity-50">Simpan Rule</button>
                            </div>
                        </div>
                        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3">Kata Kunci</th><th className="px-6 py-3">Setting</th><th className="px-6 py-3">Preview</th><th className="px-6 py-3 text-right">Aksi</th></tr></thead>
                                <tbody className="divide-y">
                                    {styles.length === 0 ? <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Belum ada rule</td></tr> : styles.map(r => (
                                        <tr key={r.id}>
                                            <td className="px-6 py-4 font-mono">{r.keyword}</td>
                                            <td className="px-6 py-4">Size: {r.font_size}{r.is_bold && ', Bold'}</td>
                                            <td className="px-6 py-4"><span style={{ fontSize: `${Math.max(12, r.font_size * 0.8)}px`, fontWeight: r.is_bold ? 'bold' : 'normal' }}>{r.keyword}</span></td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => confirmDelete(r.keyword, async () => { await axios.delete(`${API_CONFIG.BASE_URL}/settings/formatting/styles/${r.id}`); fetchAll(); showToast?.('Dihapus'); })} className="text-red-500 p-2 hover:bg-red-50 rounded"><FiTrash2 /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Bottom area: Live Preview */}
            <div className="mt-8">
                <LivePreviewPanel columns={previewColumns} colors={previewColors} styles={previewStyles} />
            </div>

            <DeleteConfirmationModal isOpen={!!deleteCallback} onClose={() => setDeleteCallback(null)} onConfirm={() => deleteCallback?.()} itemName={deleteItemName} title="Hapus Rule Formatting" />
        </div>
    );
};

// --- Live Preview Logic ---
const DEFAULT_COLS: Record<string, Partial<ColumnSetting>> = {
    'ID': { column_width: 15, font_size: 16, font_name: 'Rockwell', is_bold: false, text_align: 'center' },
    'SKU': { column_width: 40, font_size: 16, font_name: 'Rockwell', is_bold: false, text_align: 'left' },
    'QTY': { column_width: 16, font_size: 20, font_name: 'Rockwell', is_bold: true, text_align: 'center' },
    'NO. PESANAN': { column_width: 30, font_size: 12, font_name: 'Rockwell', is_bold: false, text_align: 'center' }
};

const LivePreviewPanel = ({ columns, colors, styles }: { columns: ColumnSetting[], colors: ColorRule[], styles: StyleRule[] }) => {
    const getCol = (name: string) => {
        const dbCol = columns.find(c => c.column_name === name);
        return { ...DEFAULT_COLS[name], ...dbCol };
    };

    const idCol = getCol('ID');
    const skuCol = getCol('SKU');
    const qtyCol = getCol('QTY');
    const orderCol = getCol('NO. PESANAN');

    const sampleRow = { id: '', sku: 'B5MHIM-M140/DRKGREY/1BOX', qty: '2', order: '583599856709502393' };

    // 1. Calculate base cell color
    let cellColor = '#000000';
    for (const rule of colors) {
        if (rule.keyword && sampleRow.sku.toUpperCase().includes(rule.keyword.toUpperCase())) {
            cellColor = rule.color_code;
            break; 
        }
    }

    // 2. Apply substring richer styles
    let charStyles: (StyleRule | null)[] = Array(sampleRow.sku.length).fill(null);
    styles.forEach(rule => {
        if (!rule.keyword) return;
        const kw = rule.keyword.toUpperCase();
        const skuUpper = sampleRow.sku.toUpperCase();
        let startIdx = 0;
        while ((startIdx = skuUpper.indexOf(kw, startIdx)) !== -1) {
            for (let i = startIdx; i < startIdx + kw.length; i++) {
                charStyles[i] = rule;
            }
            startIdx += kw.length;
        }
    });

    const richSegments: { text: string, style: StyleRule | null }[] = [];
    if (sampleRow.sku.length > 0) {
        let currentSegment = { text: sampleRow.sku[0], style: charStyles[0] };
        for (let i = 1; i < sampleRow.sku.length; i++) {
            if (charStyles[i] !== currentSegment.style) {
                richSegments.push(currentSegment);
                currentSegment = { text: sampleRow.sku[i], style: charStyles[i] };
            } else {
                currentSegment.text += sampleRow.sku[i];
            }
        }
        richSegments.push(currentSegment);
    }

    const colStyle = (col: any): React.CSSProperties => ({
        fontFamily: col.font_name,
        fontSize: `${col.font_size}pt`,
        fontWeight: col.is_bold ? 'bold' : 'normal',
        textAlign: (col.text_align || 'left') as any
    });

    // Excel cols to CSS px (approx 1 width unit = 7-8 pixels in Excel standard font)
    const ptToPxWidth = (w: number) => `${w * 7}px`;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wide">
                    <FiColumns /> Live Preview Packing List
                </div>
            </div>
            <div className="p-6 overflow-x-auto bg-[#f8f9fa] custom-scrollbar w-full flex justify-center">
                <table className="border-collapse bg-white shadow-sm" style={{ fontFamily: 'Times New Roman' }}>
                    <thead>
                        <tr>
                            <th className="border border-gray-400 bg-[#666] text-white p-2 text-[20px] font-bold text-center" style={{ width: ptToPxWidth(idCol.column_width || 15) }}>ID</th>
                            <th className="border border-gray-400 bg-[#666] text-white p-2 text-[20px] font-bold text-center" style={{ width: ptToPxWidth(skuCol.column_width || 40) }}>SKU</th>
                            <th className="border border-gray-400 bg-[#666] text-white p-2 text-[20px] font-bold text-center" style={{ width: ptToPxWidth(qtyCol.column_width || 15) }}>QTY</th>
                            <th className="border border-gray-400 bg-[#666] text-white p-2 text-[20px] font-bold text-center" style={{ width: ptToPxWidth(orderCol.column_width || 30) }}>NO. PESANAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-400 p-2" style={{ ...colStyle(idCol) }}>{sampleRow.id}</td>
                            <td className="border border-gray-400 p-2 break-words" style={{ ...colStyle(skuCol), color: cellColor }}>
                                {richSegments.map((s, idx) => (
                                    <span key={idx} style={s.style ? { 
                                        fontSize: `${s.style.font_size}pt`, 
                                        fontWeight: s.style.is_bold ? 'bold' : 'normal' 
                                    } : {}}>
                                        {s.text}
                                    </span>
                                ))}
                            </td>
                            <td className="border border-gray-400 p-2" style={{ ...colStyle(qtyCol) }}>{sampleRow.qty}</td>
                            <td className="border border-gray-400 p-2 break-words" style={{ ...colStyle(orderCol) }}>{sampleRow.order}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="bg-amber-50 p-4 border-t border-amber-100 text-sm text-amber-800 leading-relaxed">
                <strong>💡 Info Preview Excel:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Warna font SKU akan memprioritaskan keyword yang Anda tambahkan pertama kali pada daftar rule.</li>
                    <li>Style (Bold & Ukuran Font) di-apply secara presisi di level karakternya (Rich Text), hanya pada kata kunci yang cocok.</li>
                    <li>Preview ini mengukur secara skala rasio, memberikan representasi nyata saat file Excel dicetak/dibuka.</li>
                </ul>
            </div>
        </div>
    );
};


export default AdminSkuFormatting;
