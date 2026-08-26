import React from 'react';
import { FiAlertTriangle, FiX, FiCheckCircle } from 'react-icons/fi';

interface UnmatchedWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    unmatchedExcelCount: number;
    unmatchedPdfCount: number;
    excelAwbs: string[];
    pdfAwbs: string[];
}

const UnmatchedWarningModal: React.FC<UnmatchedWarningModalProps> = ({
    isOpen,
    onClose,
    unmatchedExcelCount,
    unmatchedPdfCount,
    excelAwbs,
    pdfAwbs
}) => {
    if (!isOpen) return null;

    const hasExcelOnly = unmatchedExcelCount > 0 && unmatchedExcelCount < 100;
    const hasPdfOnly = unmatchedPdfCount > 0;

    if (!hasExcelOnly && !hasPdfOnly) return null; // No warnings to show

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all scale-100 p-6 relative border border-amber-100 max-h-[90vh] flex flex-col">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors z-10"
                >
                    <FiX className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6 shrink-0">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50/50">
                        <FiAlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-black text-red-700 uppercase tracking-wide">
                        ⚠️ DATA TIDAK SINKRON!
                    </h3>
                    <p className="text-red-600 mt-2 font-medium text-sm leading-relaxed px-2 bg-red-50 border border-red-100 py-2 rounded-lg">
                        Proses selesai, namun ditemukan selisih data antara Excel dan PDF.<br />
                        <span className="font-bold underline">Dokumen ini tidak valid untuk diserahkan ke Leader!</span>
                    </p>
                </div>

                <div className="overflow-y-auto pr-2 custom-scrollbar shrink min-h-0 mb-6 font-medium">
                    {/* Excel Only List */}
                    {hasExcelOnly && (
                        <div className="bg-amber-50/80 rounded-xl border border-amber-300 mb-4 flex flex-col shadow-sm">
                            <div className="px-4 py-3 border-b border-amber-200 bg-amber-100 rounded-t-xl flex justify-between items-center">
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                                    ❌ EXCEL ONLY ({unmatchedExcelCount}) — ORDER TERLEWAT
                                </span>
                            </div>
                            <div className="p-3">
                                <p className="text-xs text-amber-700 mb-2 font-bold">Order berikut ada di Excel, tapi LABEL PDF-nya TIDAK ADA:</p>
                                <div className="max-h-[150px] overflow-y-auto rounded-lg border border-amber-200 bg-white p-2">
                                    {excelAwbs.slice(0, 50).map((awb, idx) => (
                                        <div key={idx} className="font-mono text-sm text-slate-800 py-1 border-b border-slate-100 last:border-0 pl-1 font-semibold">
                                            {awb}
                                        </div>
                                    ))}
                                    {excelAwbs.length > 50 && (
                                        <div className="text-xs text-center p-1 text-slate-500 italic">
                                            ... dan {excelAwbs.length - 50} lainnya
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PDF Only List */}
                    {hasPdfOnly && (
                        <div className="bg-red-50/80 rounded-xl border border-red-300 mb-4 flex flex-col shadow-sm">
                            <div className="px-4 py-3 border-b border-red-200 bg-red-100 rounded-t-xl flex justify-between items-center">
                                <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
                                    ❌ PDF ONLY ({unmatchedPdfCount}) — LABEL LEBIH / SALAH
                                </span>
                            </div>
                            <div className="p-3">
                                <p className="text-xs text-red-700 mb-2 font-bold">Halaman PDF berikut BUKAN bagian dari order Excel (Label Terbuang):</p>
                                <div className="max-h-[150px] overflow-y-auto rounded-lg border border-red-200 bg-white p-2">
                                    {pdfAwbs.slice(0, 50).map((awb, idx) => (
                                        <div key={idx} className="font-mono text-sm text-slate-800 py-1 border-b border-slate-100 last:border-0 pl-1 font-semibold">
                                            {awb}
                                        </div>
                                    ))}

                                    {pdfAwbs.length > 50 && (
                                        <div className="text-xs text-center p-1 text-slate-400 italic">
                                            ... dan {pdfAwbs.length - 50} lainnya
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-red-200 active:scale-[0.98] flex items-center justify-center gap-2 tracking-wide"
                    >
                        <FiCheckCircle className="w-5 h-5" />
                        SAYA MENGERTI, SAYA AKAN CEK ULANG FILE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnmatchedWarningModal;
