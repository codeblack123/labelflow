import React, { useState, useMemo } from 'react';
import { 
    FiCode, FiPlay, FiTrash2, FiX, FiAlertCircle, FiCheckCircle, 
    FiTable, FiDownload, FiClock, FiFileText, FiCornerDownRight,
    FiSearch, FiDatabase
} from 'react-icons/fi';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { API_CONFIG } from '../constants';

interface SqlEditorProps {
    onClose?: () => void;
    showToast?: (msg: string) => void;
}

const COMMON_TABLES = [
    { name: 'sku_bundling', label: 'SKU Bundling' },
    { name: 'sku_mappings', label: 'SKU Mappings' },
    { name: 'toolkit_feature_locks', label: 'Feature Locks' },
    { name: 'warehouses', label: 'Gudang' },
    { name: 'auth_users', label: 'Users' },
    { name: 'processed_items', label: 'Processed Items' },
    { name: 'sku_categories', label: 'Kategori SKU' },
    { name: 'sku_vip_50k', label: 'VIP 50K' },
    { name: 'app_settings', label: 'App Settings' },
    { name: 'label_process_history', label: 'History' },
];

const QUICK_TEMPLATES = [
    { label: 'SKU Bundling (50)', sql: 'SELECT * FROM sku_bundling LIMIT 50' },
    { label: 'SKU Mappings (50)', sql: 'SELECT * FROM sku_mappings LIMIT 50' },
    { label: 'Hitung Total SKU', sql: 'SELECT count(*) as total_sku FROM sku_mappings' },
    { label: 'Feature Locks', sql: 'SELECT feature_key, is_locked FROM toolkit_feature_locks' },
    { label: 'Daftar Gudang', sql: 'SELECT id, name FROM warehouses' },
    { label: 'History Label Terakhir', sql: 'SELECT id, excel_filename, created_at FROM label_process_history ORDER BY id DESC LIMIT 15' },
];

const SqlEditor: React.FC<SqlEditorProps> = ({ onClose, showToast }) => {
    const [query, setQuery] = useState('SELECT * FROM sku_bundling LIMIT 50');
    const [results, setResults] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [filterText, setFilterText] = useState('');

    const handleExecute = async (queryToRun?: string) => {
        const sqlText = (typeof queryToRun === 'string' ? queryToRun : query).trim();
        if (!sqlText) return;
        
        // Bersihkan titik koma di akhir query agar kompatibel dengan RPC Supabase
        const cleanSql = sqlText.replace(/;+$/, '').trim();

        setLoading(true);
        setError(null);
        setResults(null);
        setStatusMessage(null);
        setFilterText('');
        const startTime = performance.now();

        try {
            let executedViaBackend = false;
            // 1. Coba lewat backend Python endpoint
            try {
                const res = await axios.post(`${API_CONFIG.BASE_URL}/admin/execute-sql`, {
                    sql: cleanSql
                });
                if (res.data) {
                    executedViaBackend = true;
                    const elapsed = Math.round(performance.now() - startTime);
                    setExecutionTime(elapsed);

                    if (res.data.success) {
                        let rows = Array.isArray(res.data.data) ? res.data.data : [];
                        if (rows.length > 0 && typeof rows[0] === 'string') {
                            try {
                                const parsed = JSON.parse(rows[0]);
                                if (Array.isArray(parsed)) rows = parsed;
                            } catch {}
                        }
                        setResults(rows);
                        setStatusMessage(res.data.message || `Query berhasil (${rows.length} baris)`);
                        showToast?.(`✓ Query selesai (${elapsed}ms)`);
                    } else {
                        setError(res.data.error || 'Eksekusi query gagal.');
                    }
                }
            } catch (backendErr: any) {
                const errDetail = backendErr?.response?.data?.detail || backendErr?.response?.data?.error;
                if (errDetail) {
                    setError(errDetail);
                    return;
                }
            }

            // 2. Direct Supabase RPC fallback jika backend belum running
            if (!executedViaBackend) {
                const { data, error: rpcError } = await supabase.rpc('exec_sql', { sql_query: cleanSql });
                const elapsed = Math.round(performance.now() - startTime);
                setExecutionTime(elapsed);

                if (rpcError) throw rpcError;

                if (data && !Array.isArray(data) && (data as any).error) {
                    setError((data as any).error);
                } else {
                    let rows: any[] = [];
                    if (Array.isArray(data)) {
                        if (data.length > 0 && typeof data[0] === 'string') {
                            try {
                                const parsed = JSON.parse(data[0]);
                                rows = Array.isArray(parsed) ? parsed : [parsed];
                            } catch {
                                rows = data;
                            }
                        } else {
                            rows = data;
                        }
                    } else if (data && typeof data === 'object') {
                        rows = [data];
                    }
                    setResults(rows);
                    setStatusMessage(`Query selesai (${rows.length} baris)`);
                    showToast?.(`✓ Query selesai (${elapsed}ms)`);
                }
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
        setExecutionTime(null);
        setStatusMessage(null);
        setFilterText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleExecute();
        }
    };

    const handleSelectTable = (tblName: string, action: 'select' | 'count') => {
        const sql = action === 'select' 
            ? `SELECT * FROM ${tblName} LIMIT 50` 
            : `SELECT count(*) as total_rows FROM ${tblName}`;
        setQuery(sql);
        handleExecute(sql);
    };

    // Filter results locally
    const filteredResults = useMemo(() => {
        if (!results) return null;
        if (!filterText.trim()) return results;
        const q = filterText.toLowerCase();
        return results.filter(row => 
            Object.values(row).some(v => 
                v !== null && v !== undefined && String(v).toLowerCase().includes(q)
            )
        );
    }, [results, filterText]);

    const downloadResults = (format: 'json' | 'csv') => {
        const exportData = filteredResults || results;
        if (!exportData || exportData.length === 0) return;
        
        let blob: Blob;
        let filename: string;
        const timestamp = new Date().getTime();

        if (format === 'json') {
            blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            filename = `sql_results_${timestamp}.json`;
        } else {
            // CSV
            const headers = Object.keys(exportData[0]);
            const csvRows = [
                headers.join(','),
                ...exportData.map(row => 
                    headers.map(h => {
                        const val = row[h];
                        if (val === null || val === undefined) return '';
                        const str = String(val).replace(/"/g, '""');
                        return `"${str}"`;
                    }).join(',')
                )
            ];
            blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            filename = `sql_results_${timestamp}.csv`;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-300">
            {/* Toolbar Header */}
            <div className="flex items-center justify-between bg-gray-900 text-white p-4 rounded-2xl shadow-xl border border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                        <FiCode className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base tracking-tight">SQL Console &amp; Database Editor</h3>
                            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Live Database
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            Jalankan query SQL langsung ke Supabase PostgreSQL (SELECT, INSERT, UPDATE, DDL).
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleClear}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-all flex items-center gap-1.5 border border-gray-700"
                        title="Kosongkan Editor"
                    >
                        <FiTrash2 className="w-3.5 h-3.5" />
                        Clear
                    </button>
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Table Quick Browser */}
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                        <FiDatabase className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tabel Database Cepat:</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Klik tabel untuk SELECT 50 baris</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {COMMON_TABLES.map(t => (
                        <div key={t.name} className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow-xs text-xs">
                            <button
                                onClick={() => handleSelectTable(t.name, 'select')}
                                className="px-2.5 py-1 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 font-medium transition-colors border-r border-gray-200"
                                title={`SELECT * FROM ${t.name} LIMIT 50`}
                            >
                                {t.label}
                            </button>
                            <button
                                onClick={() => handleSelectTable(t.name, 'count')}
                                className="px-1.5 py-1 bg-gray-50 hover:bg-amber-50 text-gray-400 hover:text-amber-700 transition-colors text-[10px]"
                                title={`COUNT(*) FROM ${t.name}`}
                            >
                                #
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Templates Bar */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-gray-500 font-bold flex items-center gap-1">
                    <FiCornerDownRight className="w-3.5 h-3.5 text-indigo-500" />
                    Template Cepat:
                </span>
                {QUICK_TEMPLATES.map(t => (
                    <button
                        key={t.label}
                        onClick={() => {
                            setQuery(t.sql);
                            handleExecute(t.sql);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-lg font-medium transition-all shadow-sm"
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Editor Textarea Area */}
            <div className="relative group">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik query SQL di sini (contoh: SELECT * FROM sku_bundling LIMIT 20)"
                    className="w-full h-36 bg-gray-950 text-emerald-400 font-mono p-4 rounded-2xl border-2 border-gray-800 focus:border-indigo-500 outline-none transition-all shadow-inner text-sm leading-relaxed"
                    spellCheck={false}
                />
                <div className="absolute bottom-3 left-4 text-[10px] text-gray-500 font-mono hidden sm:block">
                    Tip: Tekan <span className="text-gray-300 font-bold bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">Ctrl + Enter</span> untuk eksekusi cepat
                </div>
                <button
                    onClick={() => handleExecute()}
                    disabled={loading || !query.trim()}
                    className={`absolute bottom-3 right-4 flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm shadow-xl transition-all active:scale-95 ${
                        loading || !query.trim() 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/30'
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
            <div className="flex-1 flex flex-col min-h-[350px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {error && (
                    <div className="p-4 bg-red-50 border-b border-red-200 flex items-start gap-3">
                        <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-900">Query Error</p>
                            <p className="text-xs text-red-700 mt-1 font-mono break-all leading-relaxed whitespace-pre-wrap">{error}</p>
                        </div>
                    </div>
                )}

                {results !== null && (
                    <div className="flex flex-col h-full">
                        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                                    <FiCheckCircle className="text-emerald-500 w-4 h-4" />
                                    <span>{results.length} baris data</span>
                                </div>
                                {executionTime !== null && (
                                    <div className="flex items-center gap-1 text-[11px] font-mono text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded">
                                        <FiClock className="w-3 h-3 text-gray-400" />
                                        <span>{executionTime}ms</span>
                                    </div>
                                )}
                                {statusMessage && (
                                    <span className="text-xs text-gray-500 hidden sm:inline">
                                        • {statusMessage}
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {results.length > 0 && (
                                    <div className="relative">
                                        <FiSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={filterText}
                                            onChange={e => setFilterText(e.target.value)}
                                            placeholder="Cari di hasil..."
                                            className="pl-8 pr-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 w-36 sm:w-48"
                                        />
                                    </div>
                                )}
                                {results.length > 0 && (
                                    <>
                                        <button 
                                            onClick={() => downloadResults('csv')}
                                            className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 transition-colors px-2.5 py-1 rounded-lg shadow-sm"
                                        >
                                            <FiFileText className="w-3.5 h-3.5 text-emerald-600" />
                                            CSV
                                        </button>
                                        <button 
                                            onClick={() => downloadResults('json')}
                                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 transition-colors px-2.5 py-1 rounded-lg shadow-sm"
                                        >
                                            <FiDownload className="w-3.5 h-3.5 text-indigo-600" />
                                            JSON
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto max-h-[480px]">
                            {filteredResults && filteredResults.length > 0 ? (
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-2.5 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider w-12 text-center">#</th>
                                            {Object.keys(filteredResults[0] || {}).map(key => (
                                                <th key={key} className="px-4 py-2.5 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider min-w-[130px]">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-mono">
                                        {filteredResults.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                                                <td className="px-4 py-2 border-b border-gray-100 text-gray-400 text-center">{idx + 1}</td>
                                                {Object.values(row).map((val: any, vidx) => (
                                                    <td key={vidx} className="px-4 py-2 border-b border-gray-100 text-gray-800 truncate max-w-[320px]" title={String(val)}>
                                                        {val === null ? (
                                                            <span className="text-gray-300 italic">null</span>
                                                        ) : typeof val === 'object' ? (
                                                            JSON.stringify(val)
                                                        ) : (
                                                            String(val)
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : results.length > 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <FiSearch className="w-10 h-10 mb-2 opacity-30 text-gray-400" />
                                    <p className="text-xs text-gray-500 font-medium">Tidak ada data yang cocok dengan pencarian "{filterText}"</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <FiTable className="w-12 h-12 mb-3 opacity-30 text-gray-400" />
                                    <p className="text-sm font-semibold text-gray-600">Query berhasil dieksekusi</p>
                                    <p className="text-xs text-gray-400 mt-1">Tidak ada baris data yang dikembalikan.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {results === null && !error && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
                        <FiCode className="w-14 h-14 mb-3 text-gray-300" />
                        <p className="text-base font-bold tracking-tight text-gray-600">SQL Ready</p>
                        <p className="text-xs text-gray-400 mt-1">Tulis perintah SQL atau pilih tabel / template di atas, lalu klik RUN QUERY.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SqlEditor;
