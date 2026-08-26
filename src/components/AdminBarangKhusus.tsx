import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiList, FiSearch, FiCheck, FiX, FiDatabase, FiUpload } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface BarangKhususItem {
    id: string;
    sku: string;
}

interface SkuOption {
    id: string; // SKU ID or Category ID
    sku: string;
    source: 'database' | 'grouping';
}

interface AdminBarangKhususProps {
    showToast?: (message: string) => void;
}

const AdminBarangKhusus: React.FC<AdminBarangKhususProps> = ({ showToast }) => {
    const [barangKhususList, setBarangKhususList] = useState<BarangKhususItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
    const [filteredOptions, setFilteredOptions] = useState<SkuOption[]>([]); // ALL matching
    const [renderedOptions, setRenderedOptions] = useState<SkuOption[]>([]); // Visible subset
    const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Delete Modal
    const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Main Selection State
    const [selectedSkusMain, setSelectedSkusMain] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);


    // Import State
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        fetchBarangKhususList();
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            fetchAllSkuOptions();
        }
    }, [isModalOpen]);

    useEffect(() => {
        let allFiltered: SkuOption[] = [];
        if (!searchTerm) {
            allFiltered = skuOptions;
        } else {
            const lower = searchTerm.toLowerCase();
            allFiltered = skuOptions.filter(opt =>
                (opt.sku || '').toLowerCase().includes(lower)
            );
        }
        setFilteredOptions(allFiltered);
        setRenderedOptions(allFiltered.slice(0, 50));
    }, [searchTerm, skuOptions]);

    const fetchBarangKhususList = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/barang-khusus`);
            const sorted = [...(res.data || [])].sort((a: BarangKhususItem, b: BarangKhususItem) => 
                a.sku.localeCompare(b.sku)
            );
            setBarangKhususList(sorted);

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllSkuOptions = async () => {
        try {
            // Fetch Database SKUs
            const resDb = await axios.get(`${API_CONFIG.BASE_URL}/settings/sku-mappings`);
            const dbOptions: SkuOption[] = resDb.data.map((item: any) => ({
                id: item.id,
                sku: item.sku,
                source: 'database'
            }));

            // We can also fetch Grouping members if needed, but usually Database SKU covers valid SKUs.
            // Let's stick to Database SKU for now to avoid duplicates, or merge them.
            // User: "bisa diambil dari menu Database SKU atau menu Grouping"
            // Let's try to fetch grouping list too and merge unique SKUs
            const resGroup = await axios.get(`${API_CONFIG.BASE_URL}/settings/grouping-list`);
            const groupOptions: SkuOption[] = resGroup.data.map((item: any) => ({
                id: item.id,
                sku: item.sku,
                source: 'grouping'
            }));

            // Merge unique by SKU
            const seen = new Set<string>();
            const merged: SkuOption[] = [];

            [...dbOptions, ...groupOptions].forEach(opt => {
                const key = opt.sku.toUpperCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    merged.push(opt);
                }
            });

            setSkuOptions(merged);
            // Initial filter update handled by useEffect
        } catch (err) {
            console.error('Failed to fetch options', err);
        }
    };

    const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setIsModalOpen(false);
        }
    };

    const toggleSelection = (sku: string) => {
        const next = new Set(selectedSkus);
        if (next.has(sku)) {
            next.delete(sku);
        } else {
            next.add(sku);
        }
        setSelectedSkus(next);
    };

    const handleSelectAllFiltered = () => {
        const next = new Set(selectedSkus);
        // Select ALL filtered options (not just rendered)
        let hasUnselected = false;

        // Check if all are already selected
        for (const opt of filteredOptions) {
            if (!selectedSkus.has(opt.sku)) {
                hasUnselected = true;
                break;
            }
        }

        if (hasUnselected) {
            // Select all
            filteredOptions.forEach(opt => next.add(opt.sku));
        } else {
            // Unselect all (toggle off)
            filteredOptions.forEach(opt => next.delete(opt.sku));
        }

        setSelectedSkus(next);
    };

    const handleSaveSelection = async () => {
        if (selectedSkus.size === 0) return;
        setIsSaving(true);
        try {
            // Process individually (or bulk endpoint if created, implementation plan said POST individual)
            // But we can do Promise.all
            const promises = Array.from(selectedSkus).map(sku =>
                axios.post(`${API_CONFIG.BASE_URL}/settings/barang-khusus`, { sku })
                    .catch(err => console.warn(`Failed to add ${sku}`, err)) // Ignore duplicates
            );
            await Promise.all(promises);

            if (showToast) showToast(`✓ ${selectedSkus.size} SKU ditambahkan ke urutan bawah`);
            setIsModalOpen(false);
            setSelectedSkus(new Set());
            fetchBarangKhususList();
        } catch (err) {
            alert('Gagal menyimpan data');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteCandidate && selectedSkusMain.size === 0) return;
        try {
            if (isBulkDeleting) {
                const ids = Array.from(selectedSkusMain);
                await axios.post(`${API_CONFIG.BASE_URL}/settings/barang-khusus/bulk-delete`, { ids });
                if (showToast) showToast(`✓ ${ids.length} SKU berhasil dihapus`);
            } else {
                await axios.delete(`${API_CONFIG.BASE_URL}/settings/barang-khusus/${encodeURIComponent(deleteCandidate)}`);
                if (showToast) showToast('✓ SKU dihapus dari prioritas');
            }
            setSelectedSkusMain(new Set());
            fetchBarangKhususList();
        } catch (err) {
            alert('Gagal menghapus');
        } finally {
            setDeleteCandidate(null);
            setIsBulkDeleting(false);
        }
    };

    const toggleSelectAllMain = () => {
        if (selectedSkusMain.size === barangKhususList.length) {
            setSelectedSkusMain(new Set());
        } else {
            setSelectedSkusMain(new Set(barangKhususList.map(item => item.sku)));
        }
    };

    const toggleSelectOneMain = (sku: string) => {
        const next = new Set(selectedSkusMain);
        if (next.has(sku)) {
            next.delete(sku);
        } else {
            next.add(sku);
        }
        setSelectedSkusMain(next);
    };

    const handleExportSelected = async () => {
        setIsExporting(true);
        try {
            const ids = Array.from(selectedSkusMain);
            const response = await axios.post(`${API_CONFIG.BASE_URL}/settings/barang-khusus/export`, 
                { ids }, 
                { responseType: 'blob' }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Export_SKU_Barang Khusus_${new Date().getTime()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Gagal mengekspor data');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportAll = async () => {
        setIsExporting(true);
        try {
            // Mengirim empty array untuk mengexport semua data (atau logic dari backend akan ambil get_priority_bottom)
            const response = await axios.post(`${API_CONFIG.BASE_URL}/settings/barang-khusus/export`, 
                { ids: [] }, 
                { responseType: 'blob' }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Export_ALL_SKU_Barang Khusus_${new Date().getTime()}.xlsx`);
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

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/settings/import-barang-khusus`, formData, {
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    const percent = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(percent > 95 ? 95 : percent); // Hold at 95% until response
                }
            });
            setUploadProgress(100);
            if (showToast) showToast(`✓ Import Sukses: ${res.data.count} SKU ditambahkan`);
            fetchBarangKhususList();
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
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FiList className="w-5 h-5" /> Data Barang Khusus
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                        Daftar SKU khusus untuk keperluan validasi.
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
                                // Reset value to allow re-upload same file if needed
                                e.target.value = '';
                            }}
                            disabled={isImporting}
                        />
                    </label>

                    {/* Export All Button */}
                    <button
                        onClick={handleExportAll}
                        disabled={isExporting}
                        className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <FiUpload className="w-4 h-4 rotate-180" /> {isExporting ? 'Exporting...' : 'Export Excel'}
                    </button>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <FiPlus className="w-4 h-4" /> Tambah SKU
                        </button>
                    </div>
                </div>

                {selectedSkusMain.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in slide-in-from-top-2 duration-300">
                        <span className="text-sm font-medium text-blue-700">
                            {selectedSkusMain.size} item terpilih
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


            <DeleteConfirmationModal
                isOpen={!!deleteCandidate}
                onClose={() => {
                    setDeleteCandidate(null);
                    setIsBulkDeleting(false);
                }}
                onConfirm={handleDelete}
                title={isBulkDeleting ? 'Hapus Terpilih' : 'Hapus Prioritas'}
                itemName={isBulkDeleting ? `${selectedSkusMain.size} SKU yang dipilih` : (deleteCandidate || '')}
            />


            {/* List Table */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={barangKhususList.length > 0 && selectedSkusMain.size === barangKhususList.length}
                                        onChange={toggleSelectAllMain}
                                    />
                                </th>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-16">No</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">SKU</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Aksi</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                            ) : barangKhususList.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <FiDatabase className="w-10 h-10 mb-2 opacity-20" />
                                            <p>List kosong. Semua SKU diurutkan normal (A-Z).</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                barangKhususList.map((item, idx) => (
                                    <tr 
                                        key={item.id} 
                                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedSkusMain.has(item.sku) ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => toggleSelectOneMain(item.sku)}
                                    >
                                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedSkusMain.has(item.sku)}
                                                onChange={() => toggleSelectOneMain(item.sku)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono">{idx + 1}</td>
                                        <td className="px-6 py-4 font-medium font-mono text-gray-900">{item.sku}</td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setDeleteCandidate(item.sku)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                title="Hapus dari Bottom Barang Khusus"
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

            {/* Modal Select SKU */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={handleWrapperClick}
                >
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Pilih SKU untuk Urutan Akhir</h3>
                                <p className="text-xs text-gray-500">Pilih SKU dari database untuk dimasukkan ke list prioritas bawah.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Search & Filter */}
                        <div className="p-4 border-b border-gray-100 space-y-3">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Cari SKU..."
                                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    autoFocus
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <FiX className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>Menampilkan {renderedOptions.length} dari {filteredOptions.length} opsi</span>
                                <button
                                    onClick={handleSelectAllFiltered}
                                    className="text-blue-600 font-semibold hover:underline"
                                >
                                    {filteredOptions.every(o => selectedSkus.has(o.sku)) && filteredOptions.length > 0
                                        ? 'Batalkan Pilihan (Unselect All)'
                                        : 'Pilih Semua (Termasuk yang tidak tampil)'}
                                </button>
                            </div>
                        </div>

                        {/* List Options */}
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {renderedOptions.map(opt => {
                                    const isSelected = selectedSkus.has(opt.sku);
                                    return (
                                        <div
                                            key={opt.sku}
                                            onClick={() => toggleSelection(opt.sku)}
                                            className={`
                                                flex items-center p-3 rounded-lg cursor-pointer border transition-all select-none
                                                ${isSelected
                                                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                                    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                                            `}
                                        >
                                            <div className={`
                                                w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors
                                                ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'}
                                            `}>
                                                {isSelected && <FiCheck className="w-3 h-3" />}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="font-mono text-sm font-medium truncate text-gray-800" title={opt.sku}>{opt.sku}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{opt.source}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {renderedOptions.length === 0 && (
                                <div className="col-span-full text-center py-10 text-gray-400">Tidak ada SKU ditemukan</div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">
                                {selectedSkus.size} SKU dipilih
                            </span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveSelection}
                                    disabled={isSaving || selectedSkus.size === 0}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:bg-blue-300 flex items-center gap-2"
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Pilihan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBarangKhusus;
