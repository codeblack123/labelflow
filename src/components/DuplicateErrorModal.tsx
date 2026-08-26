import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface DuplicateItem {
    order_id: string;
    awb?: string;
    date_processed: string;
}

interface DuplicateErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    duplicateCount: number;
    duplicates: DuplicateItem[];
}

const DuplicateErrorModal: React.FC<DuplicateErrorModalProps> = ({ isOpen, onClose, duplicateCount, duplicates }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all scale-100 p-6 relative border border-red-100">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50/50">
                        <FiAlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                        Proses Dibatalkan
                    </h3>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed px-4">
                        Ditemukan <span className="font-bold text-red-600">{duplicateCount} pesanan</span> yang sudah pernah diproses sebelumnya.
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Untuk menjaga keakuratan data harian, sistem tidak mengizinkan pemrosesan data ganda.
                    </p>
                </div>

                {/* Duplicate List */}
                <div className="bg-red-50/50 rounded-xl border border-red-100 mb-6 flex flex-col max-h-[200px]">
                    <div className="px-4 py-3 border-b border-red-100 bg-red-50 rounded-t-xl">
                        <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                            Daftar Duplikat Terdeteksi
                        </span>
                    </div>
                    <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-red-200">
                        {duplicates.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center px-3 py-2 text-sm hover:bg-red-100/50 rounded-lg group transition-colors">
                                <span className="font-mono font-medium text-slate-700">
                                    {item.order_id || item.awb || 'Unknown ID'}
                                </span>
                                <span className="text-xs text-slate-400 group-hover:text-red-500 transition-colors">
                                    Diproses: {new Date(item.date_processed).toLocaleDateString('id-ID')}
                                </span>
                            </div>
                        ))}
                        {duplicates.length < duplicateCount && (
                            <div className="px-3 py-2 text-center text-xs text-slate-400 italic">
                                ... dan {duplicateCount - duplicates.length} lainnya
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                    >
                        Dimengerti, Saya Akan Cek File
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateErrorModal;
