import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const SystemUpdateAdmin: React.FC = () => {
    const [versionCode, setVersionCode] = useState('');
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [downloadLink, setDownloadLink] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        const fetchCurrent = async () => {
            const { data } = await supabase.from('system_updates').select('*').limit(1).single();
            if (data) {
                setVersionCode(data.version_code || '');
                setTitle(data.title || '');
                setInstructions(data.instructions || '');
                setDownloadLink(data.download_link || '');
                setIsActive(data.is_active || false);
            }
        };
        fetchCurrent();
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
                download_link: downloadLink,
                is_active: activeStatus,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                await supabase.from('system_updates').update(payload).eq('id', existing.id);
            } else {
                await supabase.from('system_updates').insert([payload]);
            }
            
            setIsActive(activeStatus);
            setMsg({ type: 'success', text: activeStatus ? 'Update berhasil dipublish (Aktif)!' : 'Update berhasil dinonaktifkan.' });
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
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Manajemen Update Sistem (Pop-Up)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Kirim notifikasi pop-up universal ke seluruh user saat ada pembaruan script main.py.
                    </p>
                </div>
                <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        Status: {isActive ? 'AKTIF' : 'TIDAK AKTIF'}
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

            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Versi Update (misal: v2.0)</label>
                        <input type="text" value={versionCode} onChange={e => setVersionCode(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="v1.0" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Judul Pop-Up</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Update Sistem Wajib" />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Link Download (Google Drive)</label>
                    <input type="url" value={downloadLink} onChange={e => setDownloadLink(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://drive.google.com/..." />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Instruksi Langkah-langkah</label>
                    <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="1. Download... 2. Pindahkan ke..." />
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
