import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiSearch, FiUpload, FiDownload, FiInfo, FiFileText } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface BulkySku {
    id: string;
    sku: string;
}

interface AdminSkuBulkyProps {
    showToast?: (message: string) => void;
    isActive?: boolean;
}

const AdminSkuBulky: React.FC<AdminSkuBulkyProps> = ({ showToast, isActive }) => {
    const [bulkySkus, setBulkySkus] = useState<BulkySku[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newSku, setNewSku] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState<{ id: string, sku: string } | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        fetchBulkySkus();
    }, []);

    // Re-fetch when tab becomes active
    useEffect(() => {
        if (isActive) {
            fetchBulkySkus();
        }
    }, [isActive]);

    const fetchBulkySkus = async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const url = `${API_CONFIG.BASE_URL}/settings/bulky-skus`;
            console.log('[AdminSkuBulky] HMR Trigger - Fetching from:', url);
            const res = await axios.get(url);
            console.log('[AdminSkuBulky] Response:', res.status, res.data);
            setBulkySkus(res.data || []);
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message || 'Unknown error';
            console.error('[AdminSkuBulky] Fetch error:', detail);
            setFetchError(`Gagal mengambil data: ${detail} (URL: ${API_CONFIG.BASE_URL}/settings/bulky-skus)`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newSku) return;
        setIsSaving(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/bulky-skus`, { sku: newSku });
            setNewSku('');
            if (showToast) showToast('✓ SKU Bulky berhasil ditambah');
            fetchBulkySkus();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Gagal menambah SKU');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteCandidate) return;
        try {
            await axios.delete(`${API_CONFIG.BASE_URL}/settings/bulky-skus/${encodeURIComponent(deleteCandidate.sku)}`);
            if (showToast) showToast('✓ SKU dihapus');
            fetchBulkySkus();
        } catch (err) {
            alert('Gagal menghapus SKU');
        } finally {
            setDeleteCandidate(null);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setIsImporting(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/settings/import-bulky-skus`, formData);
            if (showToast) showToast(`✓ Berhasil mengimport ${res.data.count} SKU`);
            fetchBulkySkus();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Gagal mengimport file');
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    const filteredSkus = bulkySkus.filter(s =>
        s.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FiInfo className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Daftar SKU Bulky (Barang Besar)</h2>
                            <p className="text-sm text-gray-500">SKU di daftar ini akan dihitung dengan beban lebih besar saat split V.4</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchBulkySkus}
                        disabled={isLoading}
                        className="px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                    >
                        <FiSearch className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {fetchError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <strong>⚠️ Error:</strong> {fetchError}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={newSku}
                                onChange={(e) => setNewSku(e.target.value.toUpperCase())}
                                placeholder="Masukkan SKU Baru..."
                                className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={!newSku || isSaving}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiPlus />}
                            Tambah
                        </button>
                    </div>

                    <div className="flex justify-end gap-2">
                        <label className="cursor-pointer px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm transition-colors">
                            <FiUpload className="w-4 h-4" />
                            Import Excel
                            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImport} disabled={isImporting} />
                        </label>
                    </div>
                </div>

                <div className="relative mb-4">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari SKU di list..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                    />
                </div>

                <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-gray-700">SKU</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400 italic">Memuat data...</td></tr>
                            ) : filteredSkus.length === 0 ? (
                                <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400 italic">Tidak ada SKU Bulky</td></tr>
                            ) : filteredSkus.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900 font-mono">{item.sku}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setDeleteCandidate({ id: item.id, sku: item.sku })}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={!!deleteCandidate}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={handleDelete}
                itemName={deleteCandidate?.sku || ''}
                title="Hapus SKU Bulky"
            />
        </div>
    );
};

export default AdminSkuBulky;
