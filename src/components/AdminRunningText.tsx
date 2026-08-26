import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiSave, FiAlertCircle, FiClock, FiToggleLeft, FiToggleRight, FiInfo } from 'react-icons/fi';

interface AdminRunningTextProps {
    showToast: (message: string, type?: 'success' | 'error') => void;
}

interface ScheduleDay {
    s1: string;
    s2: string;
}

interface ScheduleConfig {
    [key: string]: ScheduleDay; // keys: '0' to '6'
}

const DAYS_MAP: Record<string, string> = {
    '1': 'Senin',
    '2': 'Selasa',
    '3': 'Rabu',
    '4': 'Kamis',
    '5': 'Jumat',
    '6': 'Sabtu',
    '0': 'Minggu'
};

const AdminRunningText: React.FC<AdminRunningTextProps> = ({ showToast }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [messageTemplate, setMessageTemplate] = useState('');
    const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
        '1': { s1: '15:30', s2: '20:00' },
        '2': { s1: '15:30', s2: '20:00' },
        '3': { s1: '15:30', s2: '20:00' },
        '4': { s1: '15:30', s2: '20:00' },
        '5': { s1: '15:30', s2: '20:00' },
        '6': { s1: '12:00', s2: '16:30' },
        '0': { s1: '15:30', s2: '16:30' }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('running_text_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                if (error.code !== 'PGRST116') {
                    console.error('Error fetching running text settings:', error);
                    showToast('Gagal memuat pengaturan running text', 'error');
                }
            } else if (data) {
                setIsActive(data.is_active);
                setMessageTemplate(data.message_template || '');
                if (data.schedule_config) {
                    setScheduleConfig(data.schedule_config);
                }
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const { error } = await supabase
                .from('running_text_settings')
                .upsert({
                    id: 1,
                    is_active: isActive,
                    message_template: messageTemplate,
                    schedule_config: scheduleConfig,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) throw error;
            showToast('Pengaturan Running Text berhasil disimpan!', 'success');
        } catch (error: any) {
            console.error('Error saving running text settings:', error);
            showToast(error.message || 'Gagal menyimpan pengaturan', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleScheduleChange = (dayKey: string, shift: 's1' | 's2', value: string) => {
        setScheduleConfig(prev => ({
            ...prev,
            [dayKey]: {
                ...prev[dayKey],
                [shift]: value
            }
        }));
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Memuat pengaturan...</div>;
    }

    return (
        <div className="space-y-6 fadeIn pb-8">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white shadow-lg flex items-start gap-4">
                <FiAlertCircle className="w-8 h-8 flex-shrink-0 opacity-80 mt-1" />
                <div>
                    <h2 className="text-xl font-bold mb-1">Pengaturan Running Text Shift</h2>
                    <p className="text-orange-100 text-sm opacity-90 leading-relaxed max-w-3xl">
                        Fitur ini digunakan untuk memberikan instruksi kepada karyawan agar segera melakukan logout ketika shift mereka berakhir.
                        Pesan akan otomatis muncul di seluruh perangkat selama <strong>30 menit sebelum</strong> dan <strong>10 menit sesudah</strong> jam pulang yang Anda tentukan di bawah.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <h3 className="font-bold text-gray-900">Status Running Text</h3>
                            <p className="text-sm text-gray-500">Nyalakan atau matikan fitur ini secara global</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsActive(!isActive)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
                                isActive 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                        >
                            {isActive ? (
                                <><FiToggleRight className="w-5 h-5" /> AKTIF</>
                            ) : (
                                <><FiToggleLeft className="w-5 h-5" /> NONAKTIF</>
                            )}
                        </button>
                    </div>

                    {/* Message Template */}
                    <div className="space-y-2">
                        <label className="block font-bold text-gray-900">Pesan Pengumuman</label>
                        <p className="text-xs text-gray-500">Teks ini akan berjalan di bawah menu header.</p>
                        <textarea
                            value={messageTemplate}
                            onChange={(e) => setMessageTemplate(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none h-24 font-medium text-gray-900"
                            placeholder="Contoh: ⚠️ Waktu shift hampir berakhir! Jangan lupa untuk Logout akun Anda."
                            required
                        />
                    </div>

                    {/* Schedule Config */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <FiClock className="w-5 h-5 text-gray-400" />
                            <h3 className="font-bold text-gray-900">Jadwal Shift Harian</h3>
                        </div>
                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4 flex gap-3 text-sm text-blue-800">
                            <FiInfo className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
                            <p>
                                Atur jam berakhirnya shift untuk setiap hari. Running text otomatis muncul 30 menit sebelum dan 10 menit sesudah jam ini. <br/>
                                <strong>Contoh Override:</strong> Jika ada event khusus di hari Sabtu sehingga pulang jam 20:00, cukup ubah jadwal Sabtu di bawah lalu klik Simpan.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['1', '2', '3', '4', '5', '6', '0'].map((dayKey) => (
                                <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 gap-3">
                                    <div className="font-bold text-gray-700 w-24 flex-shrink-0">
                                        {DAYS_MAP[dayKey]}
                                    </div>
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Shift 1</label>
                                            <input 
                                                type="time" 
                                                value={scheduleConfig[dayKey]?.s1 || ''}
                                                onChange={(e) => handleScheduleChange(dayKey, 's1', e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Shift 2</label>
                                            <input 
                                                type="time" 
                                                value={scheduleConfig[dayKey]?.s2 || ''}
                                                onChange={(e) => handleScheduleChange(dayKey, 's2', e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : <><FiSave className="w-5 h-5" /> Simpan Pengaturan</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminRunningText;
