import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiUser, FiPlus, FiTrash2, FiEdit, FiShield, FiUserCheck, FiX, FiCheck, FiKey, FiPower } from 'react-icons/fi';

interface User {
    id: string;
    username: string;
    role: string;
    full_name: string;
    password?: string;
    created_at?: string;
    last_seen?: string;
    is_online?: boolean;
    force_logout?: boolean;
    parent_account?: string;
    department?: string;
    status?: string;
}

interface AdminUserManagerProps {
    showToast?: (message: string) => void;
}

const AdminUserManager: React.FC<AdminUserManagerProps> = ({ showToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchUser, setSearchUser] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('staff');

    useEffect(() => {
        fetchUsers();

        // Subscribe to real-time changes on auth_users
        const channel = supabase.channel('admin-usermanager-all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auth_users' }, () => {
                fetchUsers(); // Refresh when anyone goes online/offline or is updated
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('auth_users')
                .select('*')
                .order('role', { ascending: true })
                .order('parent_account', { ascending: true })
                .order('username', { ascending: true });

            if (error) throw error;
            
            // Custom sort to ensure developer -> main -> staff
            const sortedData = (data || []).sort((a, b) => {
                const roleOrder: any = { developer: 1, main: 2, staff: 3 };
                return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
            });
            
            setUsers(sortedData);
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast?.('Gagal memuat data user');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchUser.toLowerCase()) || 
                              (u.full_name && u.full_name.toLowerCase().includes(searchUser.toLowerCase()));
        const matchesRole = filterRole === 'all' || u.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingUser) {
                // Update existing
                const updateData: any = {
                    username: username.toLowerCase().trim(),
                    full_name: fullName,
                    role
                };

                // Only update password if provided
                if (password.trim()) {
                    updateData.password = password;
                }

                console.log('[UserManager] Updating user:', editingUser.id, updateData);
                const { error, data } = await supabase
                    .from('auth_users')
                    .update(updateData)
                    .eq('id', editingUser.id)
                    .select();

                if (error) throw error;
                
                // Cascade update parent_account for staff if username changed
                if (editingUser.username !== updateData.username) {
                    await supabase
                        .from('auth_users')
                        .update({ parent_account: updateData.username })
                        .eq('parent_account', editingUser.username);
                        
                    // Cascade update tenant_id in history
                    await supabase
                        .from('label_process_history')
                        .update({ tenant_id: updateData.username })
                        .eq('tenant_id', editingUser.username);
                }

                console.log('[UserManager] Update success:', data);
                showToast?.('✅ User berhasil diperbarui');
            } else {
                // Create new
                const insertData = {
                    username: username.toLowerCase().trim(),
                    password,
                    full_name: fullName,
                    role
                };

                console.log('[UserManager] Inserting user:', insertData);
                const { error, data } = await supabase
                    .from('auth_users')
                    .insert([insertData])
                    .select();

                if (error) throw error;
                console.log('[UserManager] Insert success:', data);
                showToast?.('✅ User berhasil ditambahkan');
            }

            resetForm();
            await fetchUsers();
        } catch (error: any) {
            console.error('[UserManager] Error saving user:', error);
            showToast?.(`❌ Gagal menyimpan: ${error.message || 'Error tidak diketahui'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setUsername(user.username);
        setFullName(user.full_name || '');
        setRole(user.role);
        setPassword(''); // Don't show password, leave empty to keep existing
        setIsCreating(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, username: string) => {
        if (!confirm(`Yakin ingin menghapus user "${username}"?`)) return;

        try {
            const { error } = await supabase
                .from('auth_users')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setUsers(prev => prev.filter(u => u.id !== id));
            showToast?.('✅ User berhasil dihapus');
        } catch (error: any) {
            console.error('[UserManager] Error deleting user:', error);
            showToast?.(`❌ Gagal menghapus: ${error.message}`);
        }
    };

    const handleForceLogout = async (id: string, username: string) => {
        if (!confirm(`Yakin ingin mengeluarkan user "${username}" secara paksa?`)) return;

        try {
            const { error } = await supabase
                .from('auth_users')
                .update({ force_logout: true })
                .eq('id', id);

            if (error) throw error;
            showToast?.(`✅ Perintah Force Logout dikirim ke ${username}`);
        } catch (error: any) {
            console.error('[UserManager] Error force logout:', error);
            showToast?.(`❌ Gagal: ${error.message}`);
        }
    };

    const resetForm = () => {
        setIsCreating(false);
        setEditingUser(null);
        setUsername('');
        setPassword('');
        setFullName('');
        setRole('staff');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Manajemen User</h3>
                    <p className="text-sm text-gray-500">Tambah, edit, atau hapus akses akun aplikasi (Tabel auth_users).</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchUsers}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Segarkan Data"
                    >
                        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            if (isCreating) resetForm();
                            else setIsCreating(true);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isCreating ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {isCreating ? 'Batal' : <><FiPlus /> Tambah User</>}
                    </button>
                </div>
            </div>

            {/* Create/Edit Form */}
            {isCreating && (
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Contoh: staff01"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                <div className="relative">
                                    <FiUserCheck className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Nama Asli Staff"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingUser ? 'Ganti Password (Kosongkan jika tetap)' : 'Password'}
                                </label>
                                <div className="relative">
                                    <FiKey className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="••••••••"
                                        required={!editingUser}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role / Hak Akses</label>
                                <div className="relative">
                                    <FiShield className="absolute left-3 top-3 text-gray-400" />
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                                    >
                                        <option value="staff">Staff (Standar)</option>
                                        <option value="admin">Admin (Akses Penuh)</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                            >
                                <FiCheck /> {editingUser ? 'Update User' : 'Simpan User'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        placeholder="Cari username atau nama..." 
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchUser && (
                        <button 
                            onClick={() => setSearchUser('')}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <div className="sm:w-48 flex gap-2">
                    <select 
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none bg-white transition-all cursor-pointer flex-1"
                    >
                        <option value="all">Semua Tipe Akun</option>
                        <option value="main">Main Account (Utama)</option>
                        <option value="staff">Staff (Sub-Akun)</option>
                        <option value="developer">Developer</option>
                    </select>
                    <button
                        onClick={() => {
                            setSearchUser('');
                            setFilterRole('all');
                        }}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                        title="Reset Filter & Pencarian"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* User List Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Memuat data user...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <FiUser className="w-10 h-10 text-gray-300 mb-3" />
                        <p>{searchUser || filterRole !== 'all' ? 'Tidak ada user yang cocok dengan pencarian' : 'Belum ada user terdaftar'}</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">User Info</th>
                                <th className="p-4">Username</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50/50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                                {user.username.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{user.full_name}</p>
                                                <p className="text-xs text-gray-400">ID: {user.id.substring(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-gray-700">{user.username}</div>
                                        {user.role === 'staff' && user.parent_account && (
                                            <div className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                                Sub-akun dari: <span className="text-indigo-500">{user.parent_account}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border uppercase ${user.role === 'main'
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            : user.role === 'developer'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                            {user.role === 'main' ? 'MAIN ACCOUNT' : user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {(() => {
                                            const isOnline = user.is_online && user.last_seen && (new Date().getTime() - new Date(user.last_seen).getTime() < 3 * 60 * 1000);
                                            
                                            // Format relative time if offline
                                            let lastSeenText = 'Belum pernah login';
                                            if (user.last_seen) {
                                                const diffMins = Math.floor((new Date().getTime() - new Date(user.last_seen).getTime()) / 60000);
                                                if (diffMins < 60) lastSeenText = `${diffMins} mnt yg lalu`;
                                                else if (diffMins < 1440) lastSeenText = `${Math.floor(diffMins / 60)} jam yg lalu`;
                                                else lastSeenText = `${Math.floor(diffMins / 1440)} hari yg lalu`;
                                            }

                                            return (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                                        <span className={`text-xs font-bold ${isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                            {isOnline ? 'Online' : 'Offline'}
                                                        </span>
                                                    </div>
                                                    {!isOnline && (
                                                        <span className="text-[10px] text-gray-400">Aktif: {lastSeenText}</span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleForceLogout(user.id, user.username)}
                                                className="p-2 text-orange-500 hover:text-white hover:bg-orange-500 rounded-lg transition-colors border border-transparent hover:border-orange-600"
                                                title="Logout Paksa"
                                            >
                                                <FiPower className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <FiEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id, user.username)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all scale-100">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiTrash2 className="w-8 h-8 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Akun?</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Anda yakin ingin menghapus akun <span className="font-bold text-slate-700">{userToDelete.username}</span>? Data yang terhapus tidak dapat dikembalikan.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center"
                                >
                                    {loading ? 'Menghapus...' : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserManager;
