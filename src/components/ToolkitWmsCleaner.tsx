import React, { useState } from 'react';
import { FiCopy, FiTrash2, FiRefreshCw, FiClipboard, FiTool } from 'react-icons/fi';

const ToolkitWmsCleaner: React.FC = () => {
    const [inputData, setInputData] = useState('');
    const [outputData, setOutputData] = useState('');
    const [isCopying, setIsCopying] = useState(false);

    const handleClean = () => {
        const lines = inputData.split(/\n/);
        const cleaned = lines
            .map(line => line.trim().replace(/@/g, ''))
            .filter(line => line.length > 0)
            .join('\n');

        setOutputData(cleaned);
    };

    const handleCopy = async () => {
        if (!outputData) return;
        setIsCopying(true);
        try {
            await navigator.clipboard.writeText(outputData);
            // Internal toast not available here easily, so we just set state
        } catch (err) {
            console.error('Failed to copy!', err);
        }
        setTimeout(() => setIsCopying(false), 2000);
    };

    const handleClear = () => {
        setInputData('');
        setOutputData('');
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Pembersih ID Paket (@)</h3>
                <p className="text-sm text-gray-500 mt-1">Hapus karakter @ dari nomor pesanan atau ID paket dengan cepat.</p>
            </div>

            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Input Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex justify-between">
                            Data Mentah (dengan @)
                            <button
                                onClick={handleClear}
                                className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                            >
                                <FiTrash2 /> Reset
                            </button>
                        </label>
                        <textarea
                            value={inputData}
                            onChange={(e) => setInputData(e.target.value)}
                            className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm leading-relaxed"
                            placeholder="Tempel data di sini...&#10;Contoh:&#10;582732832347227958@&#10;@582724491620943643"
                        ></textarea>
                    </div>

                    {/* Output Area */}
                    <div className="space-y-2 text-left">
                        <label className="text-sm font-bold text-gray-700">Hasil Pembersihan</label>
                        <div className="relative">
                            <textarea
                                value={outputData}
                                readOnly
                                className="w-full h-64 p-4 border border-gray-200 rounded-xl bg-gray-50 font-mono text-sm leading-relaxed"
                                placeholder="Hasil akan muncul di sini..."
                            ></textarea>
                            {outputData && (
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <button
                                        onClick={handleCopy}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isCopying
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        {isCopying ? <><FiClipboard /> Tersalin!</> : <><FiCopy /> Salin Data</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-2">
                    <button
                        onClick={handleClean}
                        disabled={!inputData.trim()}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        <FiRefreshCw className={!inputData.trim() ? "" : "animate-spin-slow"} />
                        Bersihkan Sekarang
                    </button>
                </div>
            </div>

            <div className="p-4 bg-blue-50 border-t border-blue-100 flex items-start gap-3">
                <div className="p-1 container-icon bg-blue-100 rounded text-blue-600 mt-0.5">
                    <FiTool className="w-3 h-3" />
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                    Fitur ini mendeteksi semua karakter "@" baik di depan maupun di belakang angka, dan menghapusnya secara otomatis. Cocok untuk memproses massal ID pesanan dari sistem WMS tertentu.
                </p>
            </div>
        </div>
    );
};

export default ToolkitWmsCleaner;
