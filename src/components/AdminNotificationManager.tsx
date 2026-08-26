import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiBell, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiEye, FiEdit, FiInfo } from 'react-icons/fi';

interface Notification {
    id: string;
    title: string;
    message: string;
    is_active: boolean;
    created_at: string;
}

interface AdminNotificationManagerProps {
    showToast?: (message: string) => void;
}

const AdminNotificationManager: React.FC<AdminNotificationManagerProps> = ({ showToast }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('global_notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            showToast?.('Gagal memuat notifikasi');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('global_notifications')
                    .update({ title, message })
                    .eq('id', editingId);

                if (error) throw error;
                showToast?.('Notifikasi berhasil diperbarui');
            } else {
                // Create new
                const { error } = await supabase
                    .from('global_notifications')
                    .insert([{
                        title,
                        message,
                        is_active: true
                    }]);

                if (error) throw error;
                showToast?.('Notifikasi berhasil dibuat & diaktifkan');
            }

            setIsCreating(false);
            setEditingId(null);
            setTitle('');
            setMessage('');
            fetchNotifications();
        } catch (error) {
            console.error('Error saving notification:', error);
            showToast?.('Gagal menyimpan notifikasi');
        }
    };

    const handleEdit = (notif: Notification) => {
        setEditingId(notif.id);
        setTitle(notif.title);
        setMessage(notif.message);
        setIsCreating(true);
        // Scroll to top or form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingId(null);
        setTitle('');
        setMessage('');
    };

    const toggleStatus = async (notif: Notification) => {
        try {
            const { error } = await supabase
                .from('global_notifications')
                .update({ is_active: !notif.is_active })
                .eq('id', notif.id);

            if (error) throw error;

            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === notif.id ? { ...n, is_active: !n.is_active } : n
            ));

            showToast?.(`Notifikasi ${!notif.is_active ? 'Diaktifkan' : 'Dinonaktifkan'}`);
        } catch (error) {
            console.error('Error toggling status:', error);
            showToast?.('Gagal mengubah status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus notifikasi ini?')) return;

        try {
            const { error } = await supabase
                .from('global_notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev => prev.filter(n => n.id !== id));
            showToast?.('Notifikasi dihapus');
        } catch (error) {
            console.error('Error deleting:', error);
            showToast?.('Gagal menghapus');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Manajemen Notifikasi Global</h3>
                    <p className="text-sm text-gray-500">Buat pengumuman yang akan muncul popup di layar semua user.</p>
                </div>
                <button
                    onClick={() => {
                        if (isCreating) {
                            handleCancel();
                        } else {
                            setIsCreating(true);
                        }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isCreating ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                >
                    {isCreating ? 'Batal' : <><FiPlus /> Buat Baru</>}
                </button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Notifikasi</label>

                            {/* Templates */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {['Maintenance Server', 'Update Sistem', 'Pengumuman Penting', 'Fitur Baru', 'Perbaikan Bug', 'Jadwal Libur'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTitle(t)}
                                        className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-full border border-gray-200 transition-colors"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Contoh: Maintenance Server"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pesan</label>

                            {/* Formatting Toolbar */}
                            <div className="flex gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const textarea = document.querySelector('textarea');
                                        if (textarea) {
                                            const start = textarea.selectionStart;
                                            const end = textarea.selectionEnd;
                                            const selected = message.substring(start, end);
                                            const before = message.substring(0, start);
                                            const after = message.substring(end);
                                            setMessage(`${before}**${selected}**${after}`);
                                        }
                                    }}
                                    className="px-2 py-1 text-xs font-bold border rounded hover:bg-gray-50"
                                    title="Bold"
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const textarea = document.querySelector('textarea');
                                        if (textarea) {
                                            const start = textarea.selectionStart;
                                            const end = textarea.selectionEnd;
                                            const selected = message.substring(start, end);
                                            const before = message.substring(0, start);
                                            const after = message.substring(end);
                                            setMessage(`${before}*${selected}*${after}`);
                                        }
                                    }}
                                    className="px-2 py-1 text-xs italic border rounded hover:bg-gray-50"
                                    title="Italic"
                                >
                                    I
                                </button>
                            </div>

                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-24 font-mono text-sm"
                                placeholder="Tulis pesan pengumuman..."
                                required
                            />
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                                <p className="text-xs text-blue-700 font-medium mb-1 flex items-center gap-1">
                                    <FiInfo className="w-3 h-3" /> Tips Sisipkan Gambar:
                                </p>
                                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                                    <li>Upload gambar ke <b>ImgBB</b> untuk mendapatkan link.</li>
                                    <li>Copy "Direct Link" (akhiran .jpg/.png).</li>
                                    <li>Paste link di baris baru dalam editor.</li>
                                </ul>
                                <a
                                    href="https://imgbb.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    Buka ImgBB <FiToggleRight className="w-3 h-3" />
                                </a>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                *Gunakan tombol <b>B</b> untuk bold dan <i>I</i> untuk italic.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                                {editingId ? 'Update Notifikasi' : 'Terbitkan Sekarang'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Memuat data...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <FiBell className="w-10 h-10 text-gray-300 mb-3" />
                        <p>Belum ada notifikasi dibuat</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">Status</th>
                                <th className="p-4">Judul & Pesan</th>
                                <th className="p-4">Tanggal</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {notifications.map(notif => (
                                <tr key={notif.id} className="hover:bg-gray-50/50">
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleStatus(notif)}
                                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all ${notif.is_active
                                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                                }`}
                                        >
                                            {notif.is_active ? 'AKTIF' : 'NON-AKTIF'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-900">{notif.title}</p>
                                        <p className="text-gray-500 text-sm line-clamp-2">{notif.message}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(notif.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(notif)}
                                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <FiEdit />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(notif.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminNotificationManager;
