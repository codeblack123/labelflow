import React, { useState } from 'react';
import { 
    FiActivity, 
    FiArrowLeft, 
    FiLock, 
    FiUser, 
    FiCheck, 
    FiEye, 
    FiEyeOff, 
    FiShield, 
    FiZap, 
    FiStar,
    FiCheckCircle,
    FiHelpCircle
} from 'react-icons/fi';
import { supabase } from '../supabaseClient';

interface LoginPageProps {
    onLogin: (user: any) => void;
    onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState(false);

    // Load saved credentials on mount
    React.useEffect(() => {
        const saved = localStorage.getItem('remember_me_creds');
        if (saved) {
            try {
                const { u, p } = JSON.parse(saved);
                setEmail(u || '');
                setPassword(p || '');
                setRememberMe(true);
            } catch (e) {
                console.error('Failed to parse saved creds', e);
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Check against auth_users table
            const { data, error } = await supabase
                .from('auth_users')
                .select('*')
                .eq('username', email.toLowerCase().trim())
                .eq('password', password)
                .maybeSingle();

            if (error || !data) {
                throw new Error('Username atau password tidak valid. Silakan periksa kembali data Anda.');
            }

            // Handle Remember Me
            if (rememberMe) {
                localStorage.setItem('remember_me_creds', JSON.stringify({ u: email, p: password }));
            } else {
                localStorage.removeItem('remember_me_creds');
            }

            // Success
            onLogin(data);
        } catch (err: any) {
            setError(err.message || 'Login gagal. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden font-sans select-none">
            {/* Custom CSS fix for browser input autofill background */}
            <style>{`
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-text-fill-color: #ffffff !important;
                    -webkit-box-shadow: 0 0 0px 1000px #090d16 inset !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>

            {/* Background Decorative Ambient Lighting Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

            {/* Outer Container Card */}
            <div className="w-full max-w-5xl bg-slate-900/70 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-slate-800/80 shadow-2xl shadow-blue-950/50 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12 my-auto">
                
                {/* Left Panel: Hero Banner (Desktop only) */}
                <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 xl:p-10 bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-indigo-950/30 border-r border-slate-800/60 relative">
                    {/* Header Logo */}
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl shadow-inner text-blue-400">
                                <FiActivity className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-blue-300 bg-clip-text text-transparent tracking-tight">
                                    Label Customizer
                                </h1>
                                <span className="text-[10px] font-semibold text-blue-400/90 tracking-wider uppercase">
                                    Enterprise Suite
                                </span>
                            </div>
                        </div>

                        <div className="mt-10 space-y-4">
                            <h2 className="text-2xl font-extrabold text-white leading-snug tracking-tight">
                                Workspace Presisi & Otomatisasi Label Shipping
                            </h2>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Sederhanakan pembuatan kustom SKU, format cetak resi, hingga otomasi filter order dengan cepat dan akurat.
                            </p>
                        </div>
                    </div>

                    {/* Features Badges */}
                    <div className="space-y-3 my-8">
                        <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                            <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-400">
                                <FiZap className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium text-slate-300">High-Speed Label Splitting</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                            <div className="p-2 bg-blue-500/15 rounded-lg text-blue-400">
                                <FiShield className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium text-slate-300">Akses Terenkripsi & Aman</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                            <div className="p-2 bg-amber-500/15 rounded-lg text-amber-400">
                                <FiStar className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium text-slate-300">Real-time Sync Database Supabase</span>
                        </div>
                    </div>

                    {/* Footer System Info */}
                    <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>System Active • v2.4</span>
                        </div>
                        <span className="font-mono text-slate-400">Protected</span>
                    </div>
                </div>

                {/* Right Panel: Main Login Form (Fully Mobile Responsive) */}
                <div className="lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-between bg-slate-900/90 min-h-[500px] sm:min-h-[550px]">
                    
                    {/* Top Action Bar */}
                    <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
                        {/* Back Button */}
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700/60 transition-all active:scale-95 shadow-sm"
                        >
                            <FiArrowLeft className="w-4 h-4" />
                            <span>Kembali ke Beranda</span>
                        </button>

                        {/* Brand Logo Header (Displayed on Mobile & Tablet) */}
                        <div className="flex lg:hidden items-center gap-2">
                            <div className="p-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
                                <FiActivity className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-white tracking-tight">Label Customizer</span>
                        </div>
                    </div>

                    {/* Form Container */}
                    <div className="w-full max-w-md mx-auto my-auto py-2">
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Masuk ke Akun Anda
                            </h2>
                            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
                                Masukkan username dan kata sandi untuk mengakses dashboard manajemen.
                            </p>
                        </div>

                        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                            {/* Error Alert Box */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200">
                                    <div className="p-1 bg-red-500/20 rounded-lg text-red-400 shrink-0 mt-0.5">
                                        <FiShield className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-semibold text-red-200 block mb-0.5">Gagal Masuk</span>
                                        {error}
                                    </div>
                                </div>
                            )}

                            {/* Username Input */}
                            <div>
                                <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                    Username / Pengguna
                                </label>
                                <div className="relative rounded-xl">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <FiUser className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="text"
                                        autoComplete="username"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition-all outline-none"
                                        placeholder="Masukkan username Anda"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Kata Sandi
                                    </label>
                                    <a 
                                        href="#" 
                                        onClick={(e) => { e.preventDefault(); alert('Silakan hubungi administrator sistem untuk reset akun/password.'); }}
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        Lupa kata sandi?
                                    </a>
                                </div>
                                <div className="relative rounded-xl">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <FiLock className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-11 py-3 bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition-all outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                                        title={showPassword ? "Sembunyikan Kata Sandi" : "Tampilkan Kata Sandi"}
                                    >
                                        {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me Checkbox */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950/90 border-slate-700 group-hover:border-slate-500'}`}>
                                        {rememberMe && <FiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                    <input
                                        id="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
                                        Ingat akun saya di perangkat ini
                                    </span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Memverifikasi...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Masuk ke Akun</span>
                                            <FiCheckCircle className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Bottom Support Link */}
                    <div className="mt-6 pt-4 border-t border-slate-800/60 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                        <FiHelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Membutuhkan akses akun?</span>
                        <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); alert('Kontak support: Hubungi Administrator IT.'); }} 
                            className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors"
                        >
                            Hubungi Admin
                        </a>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LoginPage;


