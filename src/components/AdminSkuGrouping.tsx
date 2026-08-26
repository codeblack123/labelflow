import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiBox, FiUpload, FiX, FiSearch, FiLayers } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface GroupingMember {
    id: string; // Member ID
    sku: string;
    category_id: string;
    category_name: string;
}

interface AdminSkuGroupingProps {
    showToast?: (message: string) => void;
}

const AdminSkuGrouping: React.FC<AdminSkuGroupingProps> = ({ showToast }) => {
    // List State
    const [members, setMembers] = useState<GroupingMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Search
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredMembers, setFilteredMembers] = useState<GroupingMember[]>([]);

    // Delete Modal
    const [deleteCandidate, setDeleteCandidate] = useState<{ id: string, name: string } | null>(null);

    // Add State
    const [inputId, setInputId] = useState('');
    const [inputSku, setInputSku] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Import State
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        fetchGroupingList();
    }, []);

    useEffect(() => {
        setFilteredMembers(
            members.filter(m =>
                (m.category_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [members, searchTerm]);

    const fetchGroupingList = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/grouping-list`);
            setMembers(res.data);
        } catch (err) {
            console.error('Failed fetch grouping list', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!inputId.trim() || !inputSku.trim()) return;
        setIsAdding(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/grouping-list`, {
                category_name: inputId,
                sku: inputSku
            });
            setInputId('');
            setInputSku('');
            fetchGroupingList();
            if (showToast) showToast('✓ Data berhasil ditambahkan');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Gagal menambahkan data');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteCandidate) return;
        try {
            await axios.delete(`${API_CONFIG.BASE_URL}/settings/grouping-list/${deleteCandidate.id}`);
            fetchGroupingList();
            if (showToast) showToast('✓ Data dihapus');
        } catch (err) {
            alert('Gagal menghapus data');
        } finally {
            setDeleteCandidate(null);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;
        setIsImporting(true);
        setImportStatus(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', importFile);

        const timer = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 95) return prev;
                return prev + (prev < 80 ? 10 : 2);
            });
        }, 500);

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/settings/import-grouping-data`, formData, {
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    const percent = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(percent > 95 ? 95 : percent);
                }
            });

            clearInterval(timer);
            setUploadProgress(100);
            await new Promise(r => setTimeout(r, 600));

            setImportStatus({ type: 'success', message: `Import Sukses: ${res.data.count} baris diproses.` });
            if (showToast) showToast(`✓ Import Sukses: ${res.data.count} data`);
            setImportFile(null);
            fetchGroupingList();
        } catch (e: any) {
            clearInterval(timer);
            setUploadProgress(0);
            const detail = e.response?.data?.detail || 'Gagal mengimport file.';
            setImportStatus({ type: 'error', message: detail });
        } finally {
            setIsImporting(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px] animate-in fade-in duration-300">
            {/* Left Col: Add & Import */}
            <div className="lg:col-span-4 space-y-6">

                {/* Add New Form */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FiPlus className="w-4 h-4" /> Tambah Manual
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">ID (Grouping/Category)</label>
                            <input
                                value={inputId}
                                onChange={(e) => setInputId(e.target.value)}
                                placeholder="Contoh: BOX A"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">SKU Member</label>
                            <input
                                value={inputSku}
                                onChange={(e) => setInputSku(e.target.value)}
                                placeholder="Contoh: ITEM-XYZ"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={!inputId || !inputSku || isAdding}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 text-sm font-medium flex items-center justify-center gap-2"
                        >
                            {isAdding ? 'Menyimpan...' : (
                                <>Simpan Data <FiPlus /></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Import Selection */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FiUpload className="w-4 h-4" /> Import Excel
                    </h3>

                    <div className="bg-blue-50/50 rounded-lg border border-blue-100 border-dashed p-4">
                        <p className="text-xs text-blue-800 mb-3">
                            Format Excel: Kolom A = <strong>ID</strong>, Kolom B = <strong>SKU</strong>
                        </p>

                        {!importFile ? (
                            <label className="block w-full text-center py-3 px-3 bg-white border border-blue-200 rounded text-xs text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors">
                                Pilih File Excel (.xlsx)
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={e => {
                                        if (e.target.files?.[0]) {
                                            setImportFile(e.target.files[0]);
                                            setImportStatus(null);
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs bg-white p-2 rounded border border-blue-200 shadow-sm">
                                    <span className="truncate max-w-[180px] font-medium text-gray-700">{importFile.name}</span>
                                    <button onClick={() => setImportFile(null)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"><FiX /></button>
                                </div>
                                <button
                                    onClick={handleImport}
                                    disabled={isImporting}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:bg-blue-300 shadow-sm"
                                >
                                    {isImporting ? `Proses (${uploadProgress}%)` : 'Upload Sekarang'}
                                </button>
                            </div>
                        )}

                        {importStatus && (
                            <div className={`mt-3 p-2 rounded text-xs border ${importStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {importStatus.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Col: Table */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Daftar Grouping / Packing</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Total: {filteredMembers.length} data</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari ID atau SKU..."
                                className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none w-56 transition-all"
                            />
                        </div>
                        <button
                            onClick={fetchGroupingList}
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-all"
                            title="Refresh"
                        >
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm ring-1 ring-black ring-opacity-5">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase bg-gray-50 w-48">ID Grouping</th>
                                <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase bg-gray-50">SKU Member</th>
                                <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase text-right bg-gray-50 w-24">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48"></div></td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                ))
                            ) : filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <FiLayers className="w-10 h-10 mb-2 opacity-20" />
                                            <p>Belum ada data grouping</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers
                                    .map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-50/50 group transition-colors">
                                            <td className="px-6 py-3 text-gray-900 font-bold text-sm">
                                                {item.category_name}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium text-gray-900">{item.sku}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setDeleteCandidate({ id: item.id, name: item.sku })}
                                                    className="p-1 px-2 text-red-600 bg-red-50 hover:bg-red-100 rounded text-xs transition-colors"
                                                    title="Hapus"
                                                >
                                                    Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={!!deleteCandidate}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={handleDelete}
                itemName={deleteCandidate?.name}
            />
        </div>
    );
};

export default AdminSkuGrouping;
