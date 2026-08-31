import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiList, FiSearch, FiCheck, FiX, FiDatabase, FiUpload, FiDownload } from 'react-icons/fi';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { API_CONFIG } from '../constants';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface SkuVipItem {
    id: string;
    sku: string;
}

interface SkuOption {
    id: string; // SKU ID or Category ID
    sku: string;
    source: 'database' | 'grouping';
}

interface AdminSkuVip10kProps {
    showToast?: (message: string) => void;
}

const AdminSkuVip10k: React.FC<AdminSkuVip10kProps> = ({ showToast }) => {
    const [SkuVipList, setSkuVipList] = useState<SkuVipItem[]>([]);
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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    useEffect(() => {
        fetchSkuVipList();
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

    const totalPages = Math.ceil(SkuVipList.length / itemsPerPage);
    const paginatedList = SkuVipList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when data or itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [SkuVipList.length, itemsPerPage]);

    const fetchSkuVipList = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/settings/sku-vip-10k`);
            const sorted = [...(res.data || [])].sort((a: SkuVipItem, b: SkuVipItem) => 
                a.sku.localeCompare(b.sku)
            );
            setSkuVipList(sorted);

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
        let hasUnselected = false;

        for (const opt of filteredOptions) {
            if (!selectedSkus.has(opt.sku)) {
                hasUnselected = true;
                break;
            }
        }

        if (hasUnselected) {
            filteredOptions.forEach(opt => next.add(opt.sku));
        } else {
            filteredOptions.forEach(opt => next.delete(opt.sku));
        }

        setSelectedSkus(next);
    };

    const handleSaveSelection = async () => {
        if (selectedSkus.size === 0) return;
        setIsSaving(true);
        try {
            const promises = Array.from(selectedSkus).map(sku =>
                axios.post(`${API_CONFIG.BASE_URL}/settings/sku-vip-10k`, { sku })
                    .catch(err => console.warn(`Failed to add ${sku}`, err))
            );
            await Promise.all(promises);

            if (showToast) showToast(`✓ ${selectedSkus.size} SKU ditambahkan ke list SKU VIP (>10K)`);
            setIsModalOpen(false);
            setSelectedSkus(new Set());
            fetchSkuVipList();
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
                await axios.post(`${API_CONFIG.BASE_URL}/settings/sku-vip-10k/bulk-delete`, { ids });
                if (showToast) showToast(`✓ ${ids.length} SKU berhasil dihapus`);
            } else {
                await axios.delete(`${API_CONFIG.BASE_URL}/settings/sku-vip-10k/${encodeURIComponent(deleteCandidate)}`);
                if (showToast) showToast('✓ SKU dihapus dari prioritas');
            }
            setSelectedSkusMain(new Set());
            fetchSkuVipList();
        } catch (err) {
            alert('Gagal menghapus');
        } finally {
            setDeleteCandidate(null);
            setIsBulkDeleting(false);
        }
    };

    const toggleSelectAllMain = () => {
        if (selectedSkusMain.size === SkuVipList.length) {
            setSelectedSkusMain(new Set());
        } else {
            setSelectedSkusMain(new Set(SkuVipList.map(item => item.sku)));
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
            const response = await axios.post(`${API_CONFIG.BASE_URL}/settings/sku-vip-10k/export`, 
                { ids }, 
                { responseType: 'blob' }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Export_SKU_SKU VIP (>10K)_${new Date().getTime()}.xlsx`);
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
            const response = await axios.post(`${API_CONFIG.BASE_URL}/settings/sku-vip-10k/export`, 
                { ids: [] }, 
                { responseType: 'blob' }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Export_ALL_SKU_SKU VIP (>10K)_${new Date().getTime()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Gagal mengekspor data');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const wsData = [
            ['MSKU'],
            ['CONTOH-SKU-1'],
            ['CONTOH-SKU-2'],
            ['CONTOH-SKU-3']
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        ws['!cols'] = [{ wch: 20 }];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Template SKU VIP 10K');
        XLSX.writeFile(wb, 'Template_Import_SKU_VIP_10K.xlsx');
    };

    const handleImport = async (file: File) => {
        setIsImporting(true);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', file);

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 95) progress = 95;
            setUploadProgress(Math.floor(progress));
        }, 300);

        try {
            const res = await axios.post(`${API_CONFIG.BASE_URL}/settings/import-sku-vip-10k`, formData);
            clearInterval(progressInterval);
            setUploadProgress(100);
            if (showToast) showToast(`✓ Import Sukses: ${res.data.count} SKU ditambahkan`);
            fetchSkuVipList();
        } catch (err: any) {
            clearInterval(progressInterval);
            alert(err.response?.data?.detail || 'Gagal import');
            setUploadProgress(0);
        } finally {
            clearInterval(progressInterval);
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
                        <FiList className="w-5 h-5 text-amber-600" /> Data SKU VIP (&gt;10K)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                        Daftar SKU bernilai tinggi (&gt;10.000) untuk keperluan filter Orderan Kilat.
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Download Template Button */}
                    <button
                        onClick={handleDownloadTemplate}
                        className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        title="Download Template Excel"
                    >
                        <FiDownload className="w-4 h-4" /> Template
                    </button>
                    
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
                        className="px-5 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <FiPlus className="w-4 h-4" /> Tambah SKU
                    </button>
                </div>
            </div>

            {selectedSkusMain.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-2 duration-300">
                    <span className="text-sm font-medium text-amber-800">
                        {selectedSkusMain.size} item terpilih
                    </span>
                    <div className="h-4 w-px bg-amber-300 mx-1"></div>
                    <button
                        onClick={handleExportSelected}
                        disabled={isExporting}
                        className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                        <FiUpload className="w-3.5 h-3.5 rotate-180" /> {isExporting ? 'Exporting...' : 'Export Excel'}
                    </button>
                    <button
                        onClick={() => {
                            setIsBulkDeleting(true);
                            setDeleteCandidate('multiple');
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
                title={isBulkDeleting ? 'Hapus Terpilih' : 'Hapus SKU VIP (>10K)'}
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
                                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                        checked={SkuVipList.length > 0 && selectedSkusMain.size === SkuVipList.length}
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
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                            ) : SkuVipList.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <FiDatabase className="w-10 h-10 mb-2 opacity-20" />
                                            <p>List SKU VIP (&gt;10K) masih kosong.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedList.map((item, idx) => (
                                    <tr 
                                        key={item.id} 
                                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedSkusMain.has(item.sku) ? 'bg-amber-50/50' : ''}`}
                                        onClick={() => toggleSelectOneMain(item.sku)}
                                    >
                                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                checked={selectedSkusMain.has(item.sku)}
                                                onChange={() => toggleSelectOneMain(item.sku)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                        <td className="px-6 py-4 font-medium font-mono text-gray-900">{item.sku}</td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setDeleteCandidate(item.sku)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                title="Hapus dari SKU VIP (>10K)"
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

                {/* Pagination Controls */}
                {SkuVipList.length > 0 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Tampilkan:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="text-sm border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                            >
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                                <option value={500}>500</option>
                            </select>
                            <span className="text-sm text-gray-600 ml-2">Total: {SkuVipList.length} SKU</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                            >
                                Sebelumnya
                            </button>
                            <span className="text-sm text-gray-600 px-2 font-medium">
                                Halaman {currentPage} dari {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
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
                                <h3 className="text-lg font-bold text-gray-900">Pilih SKU untuk VIP (&gt;10K)</h3>
                                <p className="text-xs text-gray-500">Pilih SKU dari database untuk dimasukkan ke list SKU VIP (&gt;10K).</p>
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
                                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
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
                                    className="text-amber-600 font-semibold hover:underline"
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
                                                    ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                                                    : 'bg-white border-gray-200 hover:border-amber-300 hover:bg-gray-50'}
                                            `}
                                        >
                                            <div className={`
                                                w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors
                                                ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-gray-300'}
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
                                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:bg-amber-300 flex items-center gap-2"
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

export default AdminSkuVip10k;
