import React, { useState, useRef } from 'react';
import { FiFile, FiUploadCloud, FiTrash2, FiLayers, FiDownload, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
import { API_CONFIG } from '../constants';

interface ToolkitPdfMergerProps {
    showToast?: (message: string) => void;
}

const ToolkitPdfMerger: React.FC<ToolkitPdfMergerProps> = ({ showToast }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [downloadFileName, setDownloadFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
            if (selectedFiles.length < e.target.files.length) {
                alert('Hanya file PDF yang diperbolehkan');
            }
            setFiles(prev => [...prev, ...selectedFiles]);
            setDownloadUrl(null); // reset prev download
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
            if (droppedFiles.length < e.dataTransfer.files.length) {
                alert('Hanya file PDF yang diperbolehkan');
            }
            setFiles(prev => [...prev, ...droppedFiles]);
            setDownloadUrl(null);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            alert('Pilih minimal 2 file PDF untuk digabungkan');
            return;
        }

        setIsProcessing(true);
        setDownloadUrl(null);

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await axios.post(`${API_CONFIG.BASE_URL}/toolkit/merge-pdfs`, formData, {
                responseType: 'blob',
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const contentDisposition = response.headers['content-disposition'];
            let filename = `Merged_Labels_${new Date().getTime()}.pdf`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/);
                if (match && match.length === 2) {
                    filename = match[1];
                }
            }

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            setDownloadUrl(url);
            setDownloadFileName(filename);

            if (showToast) showToast('o" PDF berhasil digabungkan');
        } catch (error: any) {
            console.error('Error merging PDFs:', error);
            let errorMessage = 'Gagal menggabungkan PDF.';
            
            // Try to extract JSON from blob error
            if (error.response && error.response.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const json = JSON.parse(text);
                    errorMessage = json.detail || errorMessage;
                } catch (e) {}
            }
            alert(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                    <FiLayers className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Gabung Label PDF Asli</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Gabungkan 2 atau lebih file PDF label (misal: Tiktok dan Shopee) menjadi 1 file utuh.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kiri: Area Upload */}
                <div className="space-y-4">
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group"
                    >
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FiUploadCloud className="w-8 h-8" />
                        </div>
                        <h3 className="text-gray-900 font-semibold text-lg">Pilih PDF Label</h3>
                        <p className="text-sm text-gray-500 mt-1">Tarik & lepas file PDF ke sini, atau klik untuk mencari.</p>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,application/pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
                        <div className="mt-0.5"><FiLayers className="w-4 h-4 text-blue-600" /></div>
                        <div>
                            <span className="font-semibold block mb-1">Cara Penggunaan:</span>
                            1. Masukkan semua file PDF resi yang ingin digabung.<br/>
                            2. Urutan penggabungan sesuai dengan urutan file di daftar samping.<br/>
                            3. Tekan Proses untuk menggabungkan tanpa mengubah data/kualitas asli.
                        </div>
                    </div>
                </div>

                {/* Kanan: Daftar File & Aksi */}
                <div className="flex flex-col h-full">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
                            <span>Daftar File ({files.length})</span>
                            {files.length > 0 && (
                                <button 
                                    onClick={() => { setFiles([]); setDownloadUrl(null); }}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >
                                    Hapus Semua
                                </button>
                            )}
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[250px]">
                            {files.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                    <FiFile className="w-10 h-10 mb-2 opacity-50" />
                                    <p className="text-sm">Belum ada file PDF</p>
                                </div>
                            ) : (
                                files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 bg-red-50 text-red-500 rounded flex items-center justify-center shrink-0">
                                                <FiFile className="w-4 h-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus file"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <button
                            onClick={handleMerge}
                            disabled={files.length < 2 || isProcessing}
                            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                files.length < 2
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : isProcessing
                                    ? 'bg-blue-100 text-blue-400 cursor-wait'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                            }`}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <FiLayers className="w-5 h-5" />
                                    Proses Gabung PDF
                                </>
                            )}
                        </button>

                        {downloadUrl && (
                            <a
                                href={downloadUrl}
                                download={downloadFileName}
                                className="w-full py-3.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-xl font-bold flex items-center justify-center gap-2 transition-all animate-in zoom-in duration-300"
                            >
                                <FiDownload className="w-5 h-5" />
                                Download Hasil Penggabungan
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToolkitPdfMerger;
