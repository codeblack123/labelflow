import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiList, FiCheck, FiX, FiDatabase, FiLayout, FiUpload } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface LabelPriorityItem {
    id: string;
    format_type: string;
    keyword: string;
}

interface AdminLabelPriorityProps {
    showToast?: (message: string) => void;
}

const AdminLabelPriority: React.FC<AdminLabelPriorityProps> = ({ showToast }) => {
    const [priorityList, setPriorityList] = useState<LabelPriorityItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'rak_id' | 'standar'>('rak_id');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Import State
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Delete Modal
    const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);


    useEffect(() => {
        setSelectedIds(new Set());
        fetchPriorityList();
    }, [activeTab]);

    const fetchPriorityList = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/label-priority-bottom?format_type=${activeTab}`);
            // Sort A-Z by keyword so B entries always appear before Z entries
            const sorted = [...(res.data || [])].sort((a: LabelPriorityItem, b: LabelPriorityItem) =>
                a.keyword.localeCompare(b.keyword)
            );
            setPriorityList(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveNew = async () => {
        if (!newKeyword.trim()) return;
        setIsSaving(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/settings/label-priority-bottom`, {
                format_type: activeTab,
                keyword: newKeyword.trim().toUpperCase()
            });

            if (showToast) showToast(`✓ Berhasil ditambahkan`);
            setIsModalOpen(false);
            setNewKeyword('');
            fetchPriorityList();
        } catch (err) {
            alert('Gagal menyimpan data');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteCandidate && selectedIds.size === 0) return;
        
        try {
            if (isBulkDeleting) {
                const ids = Array.from(selectedIds);
                await axios.post(`${API_CONFIG.BASE_URL}/settings/label-priority-bottom/bulk-delete`, { ids });
                if (showToast) showToast(`✓ ${ids.length} data berhasil dihapus`);
            } else {
                await axios.delete(`${API_CONFIG.BASE_URL}/settings/label-priority-bottom/${deleteCandidate}`);
                if (showToast) showToast('✓ Dihapus dari prioritas');
            }
            setSelectedIds(new Set());
            fetchPriorityList();
        } catch (err) {
            alert('Gagal menghapus');
        } finally {
            setDeleteCandidate(null);
            setIsBulkDeleting(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === priorityList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(priorityList.map(item => item.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleExportSelected = async () => {
        setIsExporting(true);
        try {
            const ids = Array.from(selectedIds);
            const response = await axios.post(`${API_CONFIG.BASE_URL}/settings/label-priority-bottom/export`, 
                { ids }, 
                { responseType: 'blob' }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Export_Label_Priority_${activeTab}_${new Date().getTime()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Gagal mengekspor data');
        } finally {
            setIsExporting(false);
        }
    };


    const handleImport = async (file: File) => {
        setIsImporting(true);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('format_type', activeTab);

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/settings/import-label-priority-bottom`, formData, {
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    const percent = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(percent > 95 ? 95 : percent);
                }
            });
            setUploadProgress(100);
            if (showToast) showToast(`✓ Import Sukses: ${res.data.count} data ditambahkan`);
            fetchPriorityList();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Gagal import');
            setUploadProgress(0);
        } finally {
            setIsImporting(false);
            setImportFile(null);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    return (
        <div className="h-[700px] animate-in fade-in duration-300 flex flex-col space-y-6">

            {/* Header / Actions */}
            <div className="flex flex-col bg-white p-6 rounded-xl border border-gray-200 shadow-sm gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FiLayout className="w-5 h-5" /> Urutan Akhir Label (Bottom Priority)
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                            Data yang dimasukkan di sini akan selalu diletakkan di <strong>urutan paling bawah</strong> pada cetak Label PDF.
                            Urutannya antar data di bawah akan tetap mempertahankan pengurutan aslinya.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/* Import Button */}
                        <label className={`cursor-pointer px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm relative overflow-hidden ${isImporting ? 'bg-gray-100 cursor-wait' : ''}`}>
                            {isImporting && (
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-green-100 transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            )}
                            <FiUpload className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">
                                {isImporting ? `Importing ${uploadProgress}%` : 'Import Excel'}
                            </span>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleImport(e.target.files[0]);
                                    e.target.value = '';
                                }}
                                disabled={isImporting}
                            />
                        </label>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <FiPlus className="w-4 h-4" /> Tambah Data
                        </button>
                    </div>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in slide-in-from-top-2 duration-300">
                        <span className="text-sm font-medium text-blue-700">
                            {selectedIds.size} item terpilih
                        </span>
                        <div className="h-4 w-px bg-blue-200 mx-1"></div>
                        <button
                            onClick={handleExportSelected}
                            disabled={isExporting}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                            <FiUpload className="w-3.5 h-3.5 rotate-180" /> {isExporting ? 'Exporting...' : 'Export Excel'}
                        </button>
                        <button
                            onClick={() => {
                                setIsBulkDeleting(true);
                                setDeleteCandidate('multiple'); // dummy for modal
                            }}
                            className="text-sm font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                            <FiTrash2 className="w-3.5 h-3.5" /> Hapus Terpilih
                        </button>
                    </div>
                )}


                <div className="flex gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('rak_id')}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'rak_id' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Format Rak & ID
                        {activeTab === 'rak_id' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('standar')}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'standar' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Format Standar
                        {activeTab === 'standar' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                    </button>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={!!deleteCandidate}
                onClose={() => {
                    setDeleteCandidate(null);
                    setIsBulkDeleting(false);
                }}
                onConfirm={handleDelete}
                title={isBulkDeleting ? 'Hapus Terpilih' : 'Hapus Prioritas'}
                itemName={isBulkDeleting ? `${selectedIds.size} data yang dipilih` : 'data ini'}
            />


            {/* List Table */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-12">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={priorityList.length > 0 && selectedIds.size === priorityList.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-16">No</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">
                                    {activeTab === 'rak_id' ? 'Keyword Rak & ID' : 'Keyword MSKU'}
                                </th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Aksi</th>
                            </tr>

                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                            ) : priorityList.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <FiDatabase className="w-10 h-10 mb-2 opacity-20" />
                                            <p>List kosong. Data label akan diurutkan secara normal.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                priorityList.map((item, idx) => (
                                    <tr 
                                        key={item.id} 
                                        className={`hover:bg-gray-50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => toggleSelectOne(item.id)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelectOne(item.id)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono">{idx + 1}</td>
                                        <td className="px-6 py-4 font-medium font-mono text-gray-900">{item.keyword}</td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setDeleteCandidate(item.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))

                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah Data */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Tambah Data Urutan Akhir</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {activeTab === 'rak_id' ? 'Masukkan Rak & ID' : 'Masukkan MSKU'}
                                </label>
                                <input
                                    type="text"
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    placeholder={activeTab === 'rak_id' ? 'Cth: Z-IA-01-01' : 'Cth: BALLON-BLN'}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveNew();
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Anda dapat memasukkan awalan (prefix) atau teks lengkap.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveNew}
                                disabled={isSaving || !newKeyword.trim()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300 flex items-center gap-2"
                            >
                                {isSaving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLabelPriority;
