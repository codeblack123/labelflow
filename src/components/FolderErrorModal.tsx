import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface FolderErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderName?: string; // "PL" (Folder) or "CONTENT_PL" (Content Check)
}

const FolderErrorModal: React.FC<FolderErrorModalProps> = ({ isOpen, onClose, folderName = "PL" }) => {
    if (!isOpen) return null;

    const isContentError = folderName === 'CONTENT_PL';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center transform scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>

                <div className="mx-auto mb-5 bg-red-50 w-20 h-20 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-4 border-red-100 animate-pulse"></div>
                    <FiAlertTriangle className="w-10 h-10 text-red-500 relative z-10" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">File Ditolak!</h3>

                <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                    {!isContentError ? (
                        <>
                            <p className="text-red-800 font-medium text-sm leading-relaxed">
                                Anda mencoba mengupload file dari folder <span className="font-bold underline">"{folderName}"</span> (Packing List).
                            </p>
                            <p className="text-red-600 text-xs mt-2">
                                Sistem menolak file ini untuk mencegah kesalahan. Mohon upload file <strong>Label PDF</strong> yang benar ("Resi Asli").
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-red-800 font-medium text-sm leading-relaxed">
                                Sistem mendeteksi konten <span className="font-bold underline">"Picking List"</span> di dalam file PDF Anda.
                            </p>
                            <p className="text-red-600 text-xs mt-2">
                                File ini bukan Resi Label Pengiriman. Mohon upload file <strong>Label PDF (Resi Asli)</strong>.
                            </p>
                        </>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    Mengerti, Saya Ganti File
                </button>
            </div>
        </div>
    );
};

export default FolderErrorModal;
