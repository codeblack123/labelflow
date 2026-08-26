import React, { useState } from 'react';
import { FiUser, FiLock, FiCheck, FiAlertCircle, FiSave, FiLogOut } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

interface ProfilProps {
    user: {
        id: string;
        username: string;
        role: string;
        full_name?: string;
    } | null;
    showToast: (message: string) => void;
    onLogout: () => void;
}

const Profil: React.FC<ProfilProps> = ({ user, showToast, onLogout }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!user) return null;

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showToast('❌ Password baru tidak cocok');
            return;
        }

        if (newPassword.length < 4) {
            showToast('❌ Password minimal 4 karakter');
            return;
        }

        setLoading(true);
        try {
            // Check old password first
            const { data: checkData, error: checkError } = await supabase
                .from('auth_users')
                .select('password')
                .eq('id', user.id)
                .single();

            if (checkError || !checkData || checkData.password !== oldPassword) {
                showToast('❌ Password lama salah');
                setLoading(false);
                return;
            }

            // Update password
            const { error: updateError } = await supabase
                .from('auth_users')
                .update({ password: newPassword })
                .eq('id', user.id);

            if (updateError) throw updateError;

            showToast('✅ Password berhasil diperbarui');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);
            showToast(`❌ Gagal memperbarui password: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex items-start gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-200">
                    <FiUser className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Profil Pengguna</h2>
                    <p className="text-blue-500 text-sm font-medium mt-0.5">Informasi akun dan keamanan</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* User Info Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <FiUser className="w-24 h-24" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Informasi Akun</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Nama Lengkap</label>
                                <p className="font-semibold text-gray-900">{user.full_name || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Username</label>
                                <p className="font-medium text-gray-700">{user.username}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Role / Jabatan</label>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase uppercase">
                                    {user.role}
                                </span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold transition-all border border-red-100 active:scale-95"
                            >
                                <FiLogOut className="w-4 h-4" />
                                Keluar dari Akun
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 flex items-start gap-3">
                        <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 leading-relaxed">
                            <p className="font-bold mb-1">Catatan Keamanan</p>
                            Jangan pernah membagikan password Anda kepada siapapun. Gunakan setidaknya 8 karakter dengan kombinasi huruf dan angka.
                        </div>
                    </div>
                </div>

                {/* Password Change Card */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <FiLock className="text-blue-600" />
                                Ganti Password
                            </h3>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handlePasswordChange} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        Password Lama
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiLock className="text-gray-400 w-4 h-4" />
                                        </div>
                                        <input
                                            type="password"
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                                            placeholder="Masukkan password saat ini"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Password Baru</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiLock className="text-gray-400 w-4 h-4" />
                                            </div>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                                                placeholder="Password baru"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Konfirmasi Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiCheck className="text-gray-400 w-4 h-4" />
                                            </div>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                                                placeholder="Ulangi password baru"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="w-4 h-4" />
                                                Simpan Perubahan
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profil;
