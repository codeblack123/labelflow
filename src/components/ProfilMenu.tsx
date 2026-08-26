import React, { useState, useRef, useEffect } from 'react';
import { FiUser, FiLogOut, FiChevronDown, FiSettings } from 'react-icons/fi';

interface ProfilMenuProps {
    user: {
        username: string;
        role: string;
        full_name?: string;
    } | null;
    onLogout: () => void;
    onMenuSelect: (menu: string) => void;
}

const ProfilMenu: React.FC<ProfilMenuProps> = ({ user, onLogout, onMenuSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!user) return null;

    return (
        <div className="relative z-50 ml-auto" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 px-2 py-1 rounded-xl transition-colors hover:bg-slate-800/60"
            >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-blue-600/30">
                    <FiUser className="w-4 h-4" />
                </div>
                <div className="hidden md:flex flex-col items-start leading-none">
                    <span className="text-xs font-bold text-white uppercase tracking-tight">{user.full_name || user.username}</span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{user.role}</span>
                </div>
                <FiChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0'}}>
                    <div className="px-4 py-3 md:hidden" style={{borderBottom: '1px solid #f1f5f9', background: '#f8fafc'}}>
                        <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name || user.username}</p>
                        <p className="text-xs text-slate-500 truncate">{user.role}</p>
                    </div>

                    <div className="px-4 py-2.5 hidden md:block" style={{borderBottom: '1px solid #f1f5f9', background: '#f8fafc'}}>
                        <p className="text-xs font-semibold text-slate-900 truncate">{user.full_name || user.username}</p>
                        <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user.role}</p>
                    </div>

                    <div className="py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onMenuSelect('profil');
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                            <FiUser className="w-4 h-4 text-slate-400" />
                            Profil Saya
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onMenuSelect('settings');
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                            <FiSettings className="w-4 h-4 text-slate-400" />
                            Pengaturan
                        </button>
                    </div>

                    <div style={{borderTop: '1px solid #f1f5f9'}}>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onLogout();
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                        >
                            <FiLogOut className="w-4 h-4" />
                            Keluar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilMenu;
