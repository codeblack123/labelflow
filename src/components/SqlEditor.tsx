import React, { useState } from 'react';
import { FiCode, FiPlay, FiTrash2, FiX, FiAlertCircle, FiCheckCircle, FiTable, FiDownload } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

interface SqlEditorProps {
    onClose?: () => void;
    showToast?: (msg: string) => void;
}

const SqlEditor: React.FC<SqlEditorProps> = ({ onClose, showToast }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleExecute = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('exec_sql', { sql_query: query });

            if (rpcError) throw rpcError;

            // Check if returned data contains an error (custom handling from Postgres function)
            if (data && !Array.isArray(data) && data.error) {
                setError(data.error);
            } else {
                setResults(data || []);
                showToast?.('Query berhasil dieksekusi');
            }
        } catch (err: any) {
            console.error('[SQL Editor] Error:', err);
            setError(err.message || 'Terjadi kesalahan saat menjalankan query.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        setResults(null);
        setError(null);
    };

    const downloadResults = () => {
        if (!results || results.length === 0) return;
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_results_${new Date().getTime()}.json`;
        a.click();
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-gray-900 text-white p-4 rounded-xl shadow-lg border border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg">
                        <FiCode className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold tracking-tight">SQL Console</h3>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Supabase RPC: exec_sql</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleClear}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="Clear Console"
                    >
                        <FiTrash2 className="w-5 h-5" />
                    </button>
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="relative group">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Contoh: SELECT * FROM processed_items LIMIT 10"
                    className="w-full h-48 bg-gray-900 text-emerald-400 font-mono p-6 rounded-2xl border-2 border-gray-800 focus:border-indigo-500 outline-none transition-all shadow-inner text-sm leading-relaxed"
                    spellCheck={false}
                />
                <button
                    onClick={handleExecute}
                    disabled={loading || !query.trim()}
                    className={`absolute bottom-6 right-6 flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all active:scale-95 ${
                        loading || !query.trim() 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20'
                    }`}
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <FiPlay className="w-4 h-4" />
                    )}
                    RUN QUERY
                </button>
            </div>

            {/* Status & Results */}
            <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {error && (
                    <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-3">
                        <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-800">Query Error</p>
                            <p className="text-xs text-red-600 mt-1 font-mono break-all">{error}</p>
                        </div>
                    </div>
                )}

                {results && (
                    <div className="flex flex-col h-full">
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FiCheckCircle className="text-green-500" />
                                <span className="text-xs font-bold text-gray-700">{results.length} baris dikembalikan</span>
                            </div>
                            <button 
                                onClick={downloadResults}
                                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 bg-white border border-indigo-100 rounded-lg shadow-sm"
                            >
                                <FiDownload className="w-3.5 h-3.5" />
                                DOWNLOAD JSON
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-auto">
                            {results.length > 0 ? (
                                <table className="w-full text-[11px] text-left border-collapse">
                                    <thead className="bg-gray-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-2.5 border-b border-gray-200 text-gray-600 font-black uppercase tracking-widest w-10">#</th>
                                            {Object.keys(results[0]).map(key => (
                                                <th key={key} className="px-4 py-2.5 border-b border-gray-200 text-gray-600 font-black uppercase tracking-widest min-w-[120px]">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {results.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-2 border-b border-gray-100 text-gray-400 font-mono">{idx + 1}</td>
                                                {Object.values(row).map((val: any, vidx) => (
                                                    <td key={vidx} className="px-4 py-2 border-b border-gray-100 text-gray-700 font-mono truncate max-w-[300px]" title={String(val)}>
                                                        {val === null ? <span className="text-gray-300 italic">null</span> : String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <FiTable className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">Query berhasil tapi tidak ada data yang dikembalikan.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!results && !error && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
                        <FiCode className="w-16 h-16 mb-4" />
                        <p className="text-lg font-bold tracking-tight text-gray-500">Silakan jalankan query</p>
                        <p className="text-sm">Hasil akan ditampilkan di sini dalam format tabel.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SqlEditor;
