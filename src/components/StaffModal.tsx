import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FiX, FiCheck, FiUser, FiMail, FiLock, FiBriefcase } from 'react-icons/fi';

interface StaffModalProps {
    onClose: () => void;
    onSuccess: () => void;
    showToast: (msg: string) => void;
    parentAccount: string; // The username of the logged-in admin
}

const StaffModal: React.FC<StaffModalProps> = ({ onClose, onSuccess, showToast, parentAccount }) => {
    const [emailPrefix, setEmailPrefix] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('Aktif');
    const [department, setDepartment] = useState('Organization');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!emailPrefix || !name || !password) {
            showToast('Harap isi Email, Nama, dan Kata Sandi');
            return;
        }

        const fullUsername = `${emailPrefix.trim().toLowerCase()}@labelflow.com`;
        setLoading(true);

        try {
            // Check if username already exists
            const { data: existingUser } = await supabase
                .from('auth_users')
                .select('username')
                .eq('username', fullUsername)
                .maybeSingle();

            if (existingUser) {
                showToast('Email/Username tersebut sudah terdaftar');
                setLoading(false);
                return;
            }

            // Get parent user's assigned_warehouses
            const { data: parentUser } = await supabase
                .from('auth_users')
                .select('assigned_warehouses')
                .eq('username', parentAccount.toLowerCase())
                .maybeSingle();

            const parentWarehouses = parentUser?.assigned_warehouses || [];

            // Insert new staff account
            const { error } = await supabase
                .from('auth_users')
                .insert([{
                    username: fullUsername,
                    password: password,
                    role: 'staff',
                    parent_account: parentAccount,
                    full_name: name,
                    department: department,
                    status: status,
                    assigned_warehouses: parentWarehouses
                }]);

            if (error) throw error;

            showToast('Staf berhasil dibuat!');
            onSuccess();
        } catch (err: any) {
            console.error(err);
            showToast(`Gagal membuat staf: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">Buat Staf Baru</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition-colors">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto">
                    <form id="staff-form" onSubmit={handleSubmit} className="space-y-5">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><span className="text-red-500">*</span> Email</label>
                                <div className="flex">
                                    <input 
                                        type="text" 
                                        value={emailPrefix}
                                        onChange={e => setEmailPrefix(e.target.value.replace(/\s+/g, ''))}
                                        placeholder="Silakan masukkan"
                                        className="flex-1 min-w-0 px-3 py-2 border border-slate-300 border-r-0 rounded-l-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    />
                                    <div className="bg-slate-100 border border-slate-300 border-l-0 rounded-r-lg px-3 py-2 text-sm text-slate-500 flex items-center font-medium select-none">
                                        @labelflow.com
                                    </div>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><span className="text-red-500">*</span> Kata Sandi</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Silakan masukkan kata sandi"
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    />
                                    <FiLock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                </div>
                            </div>
                            
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><span className="text-red-500">*</span> Nama</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Nama Lengkap"
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    />
                                    <FiUser className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                </div>
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><span className="text-red-500">*</span> Departemen</label>
                                <div className="relative">
                                    <select 
                                        value={department}
                                        onChange={e => setDepartment(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none bg-white"
                                    >
                                        <option value="Organization">Organization</option>
                                        <option value="Packing">Packing</option>
                                        <option value="Logistik">Logistik</option>
                                        <option value="Admin">Admin Data</option>
                                    </select>
                                    <FiBriefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <div className="absolute right-3 top-2.5 pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">Status</label>
                                <div className="relative">
                                    <select 
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none bg-white"
                                    >
                                        <option value="Aktif">Aktif</option>
                                        <option value="Nonaktif">Nonaktif</option>
                                    </select>
                                    <div className="absolute right-3 top-2.5 pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-slate-50">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        type="submit" 
                        form="staff-form"
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Menyimpan...' : 'Konfirmasi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffModal;
