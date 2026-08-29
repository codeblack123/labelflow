import React from 'react';
import { FiAlertTriangle, FiX, FiRefreshCw, FiTrash2, FiInfo } from 'react-icons/fi';

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
    onForceReProcess?: () => Promise<void> | void;
    isProcessing?: boolean;
}

const DuplicateErrorModal: React.FC<DuplicateErrorModalProps> = ({
    isOpen,
    onClose,
    duplicateCount,
    duplicates,
    onForceReProcess,
    isProcessing = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all scale-100 p-6 relative border border-amber-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    disabled={isProcessing}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                    <FiX className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-5">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-3 ring-8 ring-amber-50/60 text-amber-500">
                        <FiAlertTriangle className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                        Terdeteksi Data Sudah Pernah Diproses
                    </h3>
                    <p className="text-slate-500 mt-1.5 text-xs sm:text-sm leading-relaxed px-2">
                        Ditemukan <span className="font-bold text-amber-600">{duplicateCount} pesanan</span> yang sudah tercatat di database sistem sebelumnya.
                    </p>
                </div>

                {/* Duplicate List */}
                <div className="bg-amber-50/50 rounded-xl border border-amber-200/80 mb-4 flex flex-col max-h-[190px]">
                    <div className="px-4 py-2.5 border-b border-amber-200/80 bg-amber-100/50 rounded-t-xl flex justify-between items-center">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                            Daftar Nomor Pesanan Duplikat
                        </span>
                        <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                            {duplicateCount} item
                        </span>
                    </div>
                    <div className="overflow-y-auto p-2 divide-y divide-amber-100/60 font-mono text-xs">
                        {duplicates.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center px-3 py-2 hover:bg-amber-100/40 rounded-lg group transition-colors">
                                <span className="font-semibold text-slate-700">
                                    {item.order_id || item.awb || 'Unknown ID'}
                                </span>
                                <span className="text-[10px] text-slate-400 group-hover:text-amber-700 transition-colors font-sans">
                                    {item.date_processed ? `Diproses: ${new Date(item.date_processed).toLocaleDateString('id-ID')}` : 'Tercatat di sistem'}
                                </span>
                            </div>
                        ))}
                        {duplicates.length < duplicateCount && (
                            <div className="px-3 py-2 text-center text-[11px] text-slate-400 italic font-sans">
                                ... dan {duplicateCount - duplicates.length} pesanan lainnya
                            </div>
                        )}
                    </div>
                </div>

                {/* Helpful Note */}
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 mb-5 flex gap-2.5 items-start">
                    <FiInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] text-blue-800 leading-relaxed">
                        <strong>Solusi:</strong> Jika riwayat sebelumnya sudah pernah Anda hapus atau Anda memang ingin mencetak ulang file ini, klik <strong>"Hapus Duplikat & Proses Ulang"</strong> di bawah.
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5">
                    {onForceReProcess && (
                        <button
                            type="button"
                            onClick={onForceReProcess}
                            disabled={isProcessing}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99]"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                            {isProcessing ? 'Sedang Membersihkan & Memproses...' : 'Hapus Duplikat & Proses Ulang Sekarang'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-semibold text-xs transition-colors"
                    >
                        Batal / Ganti File Lain
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateErrorModal;
