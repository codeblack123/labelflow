import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../constants';
import { FiAlertCircle, FiDownload } from 'react-icons/fi';

const BackendHealthCheck: React.FC = () => {
    const [isBackendAlive, setIsBackendAlive] = useState<boolean>(true);
    const [isChecking, setIsChecking] = useState<boolean>(true);

    useEffect(() => {
        const checkBackend = async () => {
            try {
                // Ping the root endpoint to check if backend is running
                await axios.get(API_CONFIG.BASE_URL + '/', { timeout: 3000 });
                setIsBackendAlive(true);
            } catch (error) {
                setIsBackendAlive(false);
            } finally {
                setIsChecking(false);
            }
        };

        // Check initially
        checkBackend();

        // Then check every 10 seconds
        const interval = setInterval(checkBackend, 10000);
        return () => clearInterval(interval);
    }, []);

    if (isChecking || isBackendAlive) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 text-center border border-red-500/30">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiAlertCircle className="w-8 h-8" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                    Backend Lokal Tidak Berjalan
                </h2>
                
                <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                    Aplikasi ini membutuhkan backend lokal untuk memproses file PDF dan Excel. 
                    Silakan jalankan <strong>start.bat</strong> pada folder backend di komputer Anda.
                </p>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-6 text-left text-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Cara Mengatasi:</h3>
                    <ol className="list-decimal list-inside text-slate-600 dark:text-slate-400 space-y-1">
                        <li>Buka folder Shipping Label Customizer di PC Anda.</li>
                        <li>Pastikan sudah menjalankan <strong>install.bat</strong> (hanya sekali).</li>
                        <li>Klik dua kali pada <strong>start.bat</strong>.</li>
                        <li>Biarkan jendela terminal warna hitam tetap terbuka.</li>
                        <li>Halaman ini akan otomatis hilang jika backend sudah aktif.</li>
                    </ol>
                </div>

                <div className="flex justify-center gap-3">
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BackendHealthCheck;
