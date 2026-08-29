import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { API_CONFIG } from '../constants';
import { FiUploadCloud, FiCheckCircle, FiRefreshCw, FiFileText, FiHardDrive, FiClock, FiAlertTriangle, FiInfo } from 'react-icons/fi';

export const SystemUpdateAdmin: React.FC = () => {
    const [versionCode, setVersionCode] = useState('');
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [downloadLink, setDownloadLink] = useState('');
    const [downloadLinkBat, setDownloadLinkBat] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Local Backend Inspector state
    const [localBackend, setLocalBackend] = useState<{
        version_code?: string;
        file_mtime?: string;
        file_path?: string;
        file_size?: number;
        status?: string;
    } | null>(null);
    const [isCheckingLocal, setIsCheckingLocal] = useState(false);

    const checkLocalBackend = async () => {
        setIsCheckingLocal(true);
        try {
            const urls = [API_CONFIG.BASE_URL, 'http://127.0.0.1:8001', 'http://localhost:8001'];
            let foundData: any = null;

            for (const baseUrl of urls) {
                if (foundData) break;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    const res = await fetch(`${baseUrl}/backend-version`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        foundData = await res.json();
                        foundData.is_old = false;
                        break;
                    } else {
                        // Check if root endpoint works (old main.py running)
                        const rootCtrl = new AbortController();
                        const rootTimeout = setTimeout(() => rootCtrl.abort(), 2000);
                        const rootRes = await fetch(`${baseUrl}/`, { signal: rootCtrl.signal });
                        clearTimeout(rootTimeout);
                        if (rootRes.ok) {
                            const rootJson = await rootRes.json();
                            foundData = {
                                version_code: rootJson.version_code || 'Versi Lama',
                                file_path: 'Server masih memuat script lama (Silakan restart start_app.py)',
                                is_old: true,
                                status: 'ok'
                            };
                            break;
                        }
                    }
                } catch (err) {
                    // try next url
                }
            }

            setLocalBackend(foundData);
        } catch (e) {
            setLocalBackend(null);
        } finally {
            setIsCheckingLocal(false);
        }
    };

    useEffect(() => {
        const fetchCurrent = async () => {
            const { data } = await supabase.from('system_updates').select('*').limit(1).single();
            if (data) {
                setVersionCode(data.version_code || '');
                setTitle(data.title || '');
                setInstructions(data.instructions || '');
                
                // Parse split links
                const links = (data.download_link || '').split('|||');
                setDownloadLink(links[0] || '');
                if (links.length > 1) {
                    setDownloadLinkBat(links[1]);
                } else {
                    setDownloadLinkBat('');
                }
                
                setIsActive(data.is_active || false);
            }
        };
        fetchCurrent();
        checkLocalBackend();
    }, []);

    const handleSave = async (activeStatus: boolean) => {
        setLoading(true);
        setMsg(null);
        try {
            // Check if row exists
            const { data: existing } = await supabase.from('system_updates').select('id').limit(1).single();
            
            const payload = {
                version_code: versionCode,
                title,
                instructions,
                download_link: `${downloadLink}|||${downloadLinkBat}`,
                is_active: activeStatus,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                await supabase.from('system_updates').update(payload).eq('id', existing.id);
            } else {
                await supabase.from('system_updates').insert([payload]);
            }
            
            setIsActive(activeStatus);
            setMsg({ type: 'success', text: activeStatus ? 'Update berhasil dipublish (Aktif)! Seluruh user yang belum update akan menerima pop-up.' : 'Update berhasil dinonaktifkan.' });
        } catch (err: any) {
            setMsg({ type: 'error', text: 'Gagal menyimpan konfigurasi update.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="border-b border-gray-200 px-6 py-5 flex items-center justify-between bg-gray-50">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FiUploadCloud className="w-5 h-5 text-blue-600" />
                        Manajemen Update Sistem (Pop-Up)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Kirim notifikasi pop-up universal ke seluruh user saat ada pembaruan script main.py.
                    </p>
                </div>
                <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        Status: {isActive ? 'AKTIF (POP-UP MUNCUL)' : 'TIDAK AKTIF'}
                    </span>
                </div>
            </div>

            {msg && (
                <div className={`px-6 py-3 border-b ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{msg.text}</span>
                    </div>
                </div>
            )}

            {/* Local Backend Detector Card */}
            <div className="p-6 bg-slate-50/70 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FiHardDrive className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800">Deteksi Backend Lokal (main.py di Komputer Ini)</h3>
                                <button 
                                    onClick={checkLocalBackend}
                                    disabled={isCheckingLocal}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                                    title="Cek ulang koneksi server lokal"
                                >
                                    <FiRefreshCw className={`w-3 h-3 ${isCheckingLocal ? 'animate-spin' : ''}`} />
                                    Cek Status
                                </button>
                            </div>
                            {localBackend ? (
                                <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                                    <p className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-700">Versi Terdeteksi:</span> 
                                        <span className="bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded font-bold">{localBackend.version_code || 'Tidak ada versi'}</span>
                                        {versionCode && localBackend.version_code === versionCode && (
                                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                                                <FiCheckCircle className="w-3.5 h-3.5" /> Sudah Sesuai Target Update
                                            </span>
                                        )}
                                    </p>
                                    <p className="flex items-center gap-1 text-slate-500 font-mono truncate max-w-xl">
                                        <FiFileText className="w-3 h-3 flex-shrink-0" /> {localBackend.file_path || 'Lokasi main.py'}
                                    </p>
                                    {localBackend.file_mtime && (
                                        <p className="flex items-center gap-1 text-slate-400 text-[11px]">
                                            <FiClock className="w-3 h-3 flex-shrink-0" /> Terakhir Dimodifikasi: {new Date(localBackend.file_mtime).toLocaleString('id-ID')}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                                    <FiAlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> Server backend lokal (port 8001) sedang tidak aktif atau tidak terjangkau.
                                </p>
                            )}
                        </div>
                    </div>

                    {localBackend?.version_code && (
                        <button
                            type="button"
                            onClick={() => {
                                setVersionCode(localBackend.version_code || '');
                                if (!title) setTitle(`Pembaruan Sistem ${localBackend.version_code}`);
                            }}
                            className="text-xs px-3 py-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg font-bold shadow-xs transition-colors self-end sm:self-center"
                        >
                            Gunakan Versi Backend Ini ({localBackend.version_code})
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Versi Target Update (misal: v2.5.0)</label>
                        <input type="text" value={versionCode} onChange={e => setVersionCode(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm font-semibold" placeholder="v2.5.0" />
                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                            <FiInfo className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> Saat user memperbarui main.py ke versi ini, pop-up akan <strong>otomatis tertutup sendiri</strong>.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Judul Pop-Up</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Pembaruan Sistem Wajib" />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">1. Link Script update_backend.bat</label>
                        <input type="url" value={downloadLinkBat} onChange={e => setDownloadLinkBat(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://drive.google.com/..." />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">2. Link File main.py</label>
                        <input type="url" value={downloadLink} onChange={e => setDownloadLink(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://drive.google.com/..." />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Instruksi Langkah-langkah</label>
                    <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="1. Download file main.py terbaru... 2. Jalankan update_backend.bat... 3. Restart server backend" />
                </div>

                <div className="pt-4 flex gap-3">
                    <button onClick={() => handleSave(true)} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors">
                        {loading ? 'Menyimpan...' : 'Publish Update (Aktifkan Pop-Up)'}
                    </button>
                    <button onClick={() => handleSave(false)} disabled={loading} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2.5 rounded-lg transition-colors">
                        Nonaktifkan Pop-Up
                    </button>
                </div>
            </div>
        </div>
    );
};
