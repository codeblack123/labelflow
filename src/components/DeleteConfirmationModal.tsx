import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    itemName?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Konfirmasi Hapus",
    message = "Apakah Anda yakin ingin menghapus data ini?",
    itemName
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden transform transition-all animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Close Button */}
                <div className="relative bg-gradient-to-br from-red-500 to-rose-600 p-8 text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    >
                        <FiX className="w-4 h-4" />
                    </button>

                    {/* Icon with Animation */}
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
                        <FiAlertTriangle className="w-10 h-10 text-white animate-pulse" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                    <p className="text-sm text-red-100">Tindakan ini tidak dapat dibatalkan</p>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    <p className="text-gray-600 mb-4">{message}</p>

                    {itemName && (
                        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-2">
                            <p className="text-sm text-gray-500 mb-1">Data yang akan dihapus:</p>
                            <p className="font-semibold text-gray-900 break-all">{itemName}</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="grid grid-cols-2 gap-3 p-6 pt-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Batal
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-200 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                    >
                        Ya, Hapus
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
