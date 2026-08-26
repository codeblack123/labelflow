import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import StaffModal from './StaffModal';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';

interface AdminStaffManagerProps {
    showToast: (msg: string) => void;
    user: any;
}

const AdminStaffManager: React.FC<AdminStaffManagerProps> = ({ showToast, user }) => {
    const [staffs, setStaffs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');

    const fetchStaffs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('auth_users')
                .select('*')
                .eq('parent_account', user.username)
                .eq('role', 'staff')
                .order('id', { ascending: false });

            if (error) throw error;
            setStaffs(data || []);
        } catch (err: any) {
            console.error('Error fetching staffs:', err);
            showToast('Gagal memuat data staf');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.username) {
            fetchStaffs();
        }
    }, [user]);

    const handleDelete = async (staffId: string, username: string) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus akses staf ${username}?`)) return;

        try {
            const { error } = await supabase
                .from('auth_users')
                .delete()
                .eq('id', staffId)
                .eq('parent_account', user.username); // Ensure they can only delete their own staff

            if (error) throw error;
            
            showToast('Staf berhasil dihapus');
            fetchStaffs();
        } catch (err: any) {
            console.error('Error deleting staff:', err);
            showToast('Gagal menghapus staf');
        }
    };

    const filteredStaffs = staffs.filter(s => 
        s.username?.toLowerCase().includes(search.toLowerCase()) || 
        s.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl border border-indigo-700/50 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-indigo-300 shadow-xl flex-shrink-0">
                            <FiUsers className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight">Manajemen Staf & Sub-Akun</h2>
                            <p className="text-indigo-200 text-sm mt-1">Kelola akses staf untuk tenant organisasi Anda</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <input 
                        type="text" 
                        placeholder="Cari berdasarkan Email/Nama..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <FiSearch className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={fetchStaffs}
                        className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors"
                        title="Refresh"
                    >
                        <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <FiPlus className="w-4 h-4" />
                        Buat Staf
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Departemen</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Operasi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">Memuat data...</td>
                                </tr>
                            ) : filteredStaffs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada data staf ditemukan</td>
                                </tr>
                            ) : (
                                filteredStaffs.map((staff) => (
                                    <tr key={staff.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 text-sm font-medium text-indigo-600">{staff.username}</td>
                                        <td className="p-4 text-sm text-slate-700">{staff.full_name || '-'}</td>
                                        <td className="p-4 text-sm text-slate-600">{staff.department || 'Organization'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                staff.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'Aktif' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {staff.status || 'Aktif'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => alert('Fitur edit staf sedang dikembangkan.')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Staf">
                                                    <FiEdit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(staff.id, staff.username)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus Akses">
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end text-xs text-slate-500">
                    Total {filteredStaffs.length} Staf
                </div>
            </div>

            {showModal && (
                <StaffModal 
                    onClose={() => setShowModal(false)} 
                    onSuccess={() => {
                        setShowModal(false);
                        fetchStaffs();
                    }}
                    showToast={showToast}
                    parentAccount={user.username}
                />
            )}
        </div>
    );
};

export default AdminStaffManager;
