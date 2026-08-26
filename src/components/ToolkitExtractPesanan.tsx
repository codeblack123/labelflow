import React, { useState } from 'react';
import { FiCopy, FiCheck, FiPackage } from 'react-icons/fi';

const ToolkitExtractPesanan: React.FC = () => {
    const [pastedData, setPastedData] = useState('');
    const [extractedOrders, setExtractedOrders] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);

    const handleProcess = () => {
        if (!pastedData.trim()) {
            alert('Silakan paste data terlebih dahulu!');
            return;
        }

        // Split by newlines
        const lines = pastedData.trim().split('\n');

        // Keywords that indicate a header row
        const headerKeywords = ['no. pesanan', 'no pesanan', 'order id', 'order number', 'nomor pesanan', 'kurir', 'awb', 'toko'];

        // Extract order numbers (first column)
        const orders: string[] = [];

        lines.forEach(line => {
            if (!line.trim()) return;

            const lineLower = line.toLowerCase();

            // Skip if any header keyword found in the line
            if (headerKeywords.some(kw => lineLower.includes(kw))) return;

            // Split by tab first, then by comma
            const columns = line.split('\t').length > 1
                ? line.split('\t')
                : line.split(',');

            // Get first column (order number)
            const orderNumber = columns[0]?.trim().replace(/^["']|["']$/g, ''); // strip surrounding quotes

            // Accept: at least 8 characters, either pure digits or alphanumeric (Ginee format)
            // Reject: too short values or values that look like dates/times
            if (
                orderNumber &&
                orderNumber.length >= 8 &&
                /^[a-zA-Z0-9\-_]+$/.test(orderNumber) &&
                !/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(orderNumber) // skip date formats
            ) {
                orders.push(orderNumber);
            }
        });

        if (orders.length === 0) {
            alert('Tidak ada nomor pesanan yang berhasil diekstrak.\n\nPastikan:\n1. Data sudah di-paste dengan benar\n2. Kolom pertama berisi No. Pesanan\n3. Data dicopy langsung dari tabel Ginee');
        }

        setExtractedOrders(orders);
    };

    const handleCopy = () => {
        if (extractedOrders.length === 0) {
            alert('Tidak ada data untuk dicopy!');
            return;
        }

        // Join with newlines for easy pasting
        const text = extractedOrders.join('\n');

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleClear = () => {
        setPastedData('');
        setExtractedOrders([]);
        setCopied(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiPackage className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Extract Pesanan</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Ambil nomor pesanan dari data Ginee</p>
                    </div>
                </div>
                {(pastedData || extractedOrders.length > 0) && (
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-semibold bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cara Penggunaan:
                </h3>
                <ol className="text-sm text-blue-800 space-y-1 ml-6 list-decimal">
                    <li>Copy data dari web Ginee (termasuk header)</li>
                    <li>Paste data di area di bawah ini</li>
                    <li>Klik tombol "Proses Data"</li>
                    <li>Nomor pesanan akan muncul dan bisa di-copy</li>
                </ol>
            </div>

            {/* Input Area */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 text-sm">1. Paste Data dari Ginee</h3>
                </div>
                <div className="p-4">
                    <textarea
                        value={pastedData}
                        onChange={(e) => setPastedData(e.target.value)}
                        placeholder={"Paste data dari Ginee di sini...\n\nContoh format tab-separated:\nNo. Pesanan\tKurir\tAWB\tToko\n582450570995074067\tJ&T Express\tJX7105865570\tJoyko.id\n\nContoh format comma-separated:\nNo. Pesanan, Kurir, AWB\n582450570995074067, J&T, JX7105865570"}
                        className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="mt-3">
                        <p className="text-xs text-gray-500">
                            {pastedData.split('\n').filter(l => l.trim()).length} baris data
                        </p>
                    </div>
                </div>
            </div>

            {/* Process Button */}
            <button
                onClick={handleProcess}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Proses Data
            </button>

            {/* Results */}
            {extractedOrders.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-green-900 text-sm">2. Hasil Extract - Nomor Pesanan</h3>
                            <p className="text-xs text-green-700 mt-0.5">{extractedOrders.length} pesanan ditemukan</p>
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${copied
                                ? 'bg-green-600 text-white'
                                : 'bg-white hover:bg-green-100 text-green-700 border border-green-300'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <FiCheck className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <FiCopy className="w-4 h-4" />
                                    Copy Semua
                                </>
                            )}
                        </button>
                    </div>
                    <div className="p-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <div className="space-y-1 font-mono text-sm">
                                {extractedOrders.map((order, idx) => (
                                    <div key={idx} className="flex items-center gap-2 py-1">
                                        <span className="text-gray-400 text-xs w-8">{idx + 1}.</span>
                                        <span className="text-gray-900">{order}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolkitExtractPesanan;
