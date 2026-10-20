import React, { useState, useEffect } from "react";
import {
  Activity,
  ArrowLeft,
  Zap,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  X,
  HelpCircle,
  MessageCircle,
  Phone,
  Mail
} from "lucide-react";
import { supabase } from "../supabaseClient";

const HIGHLIGHTS = [
  { icon: Zap, color: "text-emerald-300", text: "Pemisahan label berkecepatan tinggi" },
  { icon: ShieldCheck, color: "text-blue-300", text: "Akses terenkripsi & aman" },
  { icon: RefreshCw, color: "text-amber-300", text: "Sinkronisasi database Supabase real-time" },
];

const INPUT =
  "w-full h-[50px] px-4 rounded-xl border border-slate-300 bg-white text-[15.5px] font-medium text-slate-900 placeholder:text-slate-400 " +
  "focus:outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-700/15 transition-all";

interface LoginPageProps {
  onLogin?: (user: any) => void;
  onSubmit?: (data: { identifier: string; password: string; remember: boolean }) => Promise<void>;
  onBack?: () => void;
  onForgot?: () => void;
  onContactAdmin?: () => void;
  onSwitchView?: (view: "landing" | "login") => void;
}

export default function LoginPage({
  onLogin,
  onSubmit,
  onBack = () => {},
  onForgot,
  onContactAdmin,
  onSwitchView
}: LoginPageProps) {
  const [useEmail, setUseEmail] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Load saved credentials on mount (Preserving existing remember-me logic)
  useEffect(() => {
    const saved = localStorage.getItem("remember_me_creds");
    if (saved) {
      try {
        const { u, p } = JSON.parse(saved);
        setIdentifier(u || "");
        setPassword(p || "");
        setRemember(true);
        if (u && u.includes("@") && !u.endsWith("@labelflow.com")) {
          setUseEmail(true);
        }
      } catch (e) {
        console.error("Failed to parse saved creds", e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError(`Isi ${useEmail ? "email" : "username"} dan kata sandi terlebih dahulu.`);
      return;
    }
    setLoading(true);
    setError("");

    try {
      // 1. If parent passes onSubmit prop, use it
      if (onSubmit) {
        await onSubmit({ identifier: identifier.trim(), password, remember });
        return;
      }

      // 2. Otherwise run the full existing Supabase login logic without changing any rules
      const cleanInput = identifier.toLowerCase().trim();
      const withDomain = cleanInput.includes("@") ? cleanInput : `${cleanInput}@labelflow.com`;
      const withoutDomain = cleanInput.replace("@labelflow.com", "");

      // Check against auth_users table
      const { data, error: dbError } = await supabase
        .from("auth_users")
        .select("*")
        .or(`username.eq.${cleanInput},username.eq.${withDomain},username.eq.${withoutDomain}`)
        .eq("password", password)
        .maybeSingle();

      if (dbError) {
        console.error("[LoginPage] Supabase query error:", dbError);
        if (dbError.code === "42501" || dbError.message?.includes("permission denied")) {
          throw new Error(
            "Izin akses database Supabase terblokir (Permission Denied/RLS). Silakan hubungi administrator."
          );
        }
        throw new Error(dbError.message || "Terjadi kesalahan saat memverifikasi akun.");
      }

      if (!data) {
        throw new Error("Username atau kata sandi tidak valid. Silakan periksa kembali data Anda.");
      }

      if (data.status && data.status.toLowerCase() === "nonaktif") {
        throw new Error("Akun Anda dinonaktifkan. Silakan hubungi administrator.");
      }

      // Handle Remember Me persistence
      if (remember) {
        localStorage.setItem("remember_me_creds", JSON.stringify({ u: identifier, p: password }));
      } else {
        localStorage.removeItem("remember_me_creds");
      }

      // Callback to parent App
      if (onLogin) {
        onLogin(data);
      }
    } catch (err: any) {
      setError(err?.message || "Login gagal. Periksa data Anda lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotClick = () => {
    if (onForgot) {
      onForgot();
    } else {
      setShowForgotModal(true);
    }
  };

  const handleContactAdminClick = () => {
    if (onContactAdmin) {
      onContactAdmin();
    } else {
      setShowAdminModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-slate-900 relative">
      {/* Panel kiri */}
      <aside className="w-full lg:w-1/2 bg-[#0B1224] text-white px-6 sm:px-12 lg:px-[72px] py-14 flex flex-col justify-between gap-12">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-[11px] bg-blue-700 grid place-items-center shadow-md">
            <Activity size={22} className="text-white" aria-hidden="true" />
          </span>
          <div>
            <div className="text-xl font-extrabold leading-tight">Label Flow</div>
            <div className="text-xs font-semibold tracking-widest text-blue-300">ENTERPRISE SUITE</div>
          </div>
        </div>

        <div>
          <h2 className="max-w-[460px] mb-4 text-3xl lg:text-[42px] font-extrabold leading-[1.12] tracking-tight">
            Workspace presisi untuk otomatisasi label shipping.
          </h2>
          <p className="max-w-[440px] mb-9 text-[16.5px] leading-relaxed text-slate-300">
            Sederhanakan pembuatan SKU kustom, format cetak resi, hingga filter order otomatis dengan cepat dan akurat.
          </p>
          <ul className="max-w-[460px] flex flex-col gap-3.5">
            {HIGHLIGHTS.map(({ icon: Icon, color, text }) => (
              <li
                key={text}
                className="flex items-center gap-4 px-[18px] py-4 rounded-[14px] border border-[#243252] bg-[#111B33] shadow-sm"
              >
                <Icon size={22} className={`${color} shrink-0`} aria-hidden="true" />
                <span className="font-semibold text-[15.5px]">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13.5px] text-slate-400">Sistem aktif · v2.4</p>
      </aside>

      {/* Panel kanan */}
      <main className="w-full lg:w-1/2 px-6 sm:px-12 lg:px-[72px] py-14 flex items-center justify-center bg-white">
        <div className="w-full max-w-[420px]">
          <button
            type="button"
            onClick={onBack}
            className="mb-10 inline-flex items-center gap-2 text-[14.5px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={18} aria-hidden="true" /> Kembali ke Beranda
          </button>

          <h1 className="mb-2.5 text-[34px] font-extrabold tracking-tight text-slate-900">
            Masuk ke akun Anda
          </h1>
          <p className="mb-8 text-base leading-relaxed text-slate-600">
            Masukkan {useEmail ? "email" : "username"} dan kata sandi untuk mengakses dashboard manajemen.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="identifier" className="text-sm font-semibold text-slate-900">
                {useEmail ? "Email" : "Username"}
              </label>
              <button
                type="button"
                onClick={() => {
                  setUseEmail((v) => !v);
                  setError("");
                }}
                className="text-[13.5px] font-semibold text-blue-700 hover:underline"
              >
                {useEmail ? "Ganti ke username" : "Ganti ke email"}
              </button>
            </div>
            <input
              id="identifier"
              type={useEmail ? "email" : "text"}
              autoComplete={useEmail ? "email" : "username"}
              placeholder={useEmail ? "nama@perusahaan.com" : "Masukkan username"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`${INPUT} mb-[22px]`}
            />

            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="text-sm font-semibold text-slate-900">
                Kata sandi
              </label>
              <button
                type="button"
                onClick={handleForgotClick}
                className="text-[13.5px] font-semibold text-blue-700 hover:underline"
              >
                Lupa kata sandi?
              </button>
            </div>
            <div className="relative mb-5">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>

            <label className="mb-7 flex items-center gap-2.5 min-h-[44px] text-[14.5px] text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-[18px] h-[18px] accent-blue-700 rounded cursor-pointer"
              />
              Ingat akun saya di perangkat ini
            </label>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-in fade-in"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-base inline-flex items-center justify-center gap-2.5 transition-colors shadow-md shadow-blue-700/20"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" aria-hidden="true" /> Memproses…
                </>
              ) : (
                "Masuk ke Akun"
              )}
            </button>
          </form>

          <p className="mt-8 pt-6 border-t border-slate-200 text-center text-[14.5px] text-slate-600">
            Butuh akses akun?{" "}
            <button
              type="button"
              onClick={handleContactAdminClick}
              className="font-bold text-blue-700 hover:underline"
            >
              Hubungi Admin
            </button>
          </p>
        </div>
      </main>

      {/* Floating Bottom Nav Pill Switcher (Home / Login) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0E172B]/95 backdrop-blur-md p-1.5 rounded-full border border-slate-700/60 shadow-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            if (onSwitchView) onSwitchView("landing");
            else onBack();
          }}
          className="px-5 py-2 rounded-full text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          Home
        </button>
        <button
          type="button"
          className="px-5 py-2 rounded-full text-xs sm:text-sm font-bold bg-white text-slate-950 shadow-md transition-all cursor-default"
        >
          Login
        </button>
      </div>

      {/* Lupa Kata Sandi Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <HelpCircle size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Reset Kata Sandi</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Untuk keamanan akun warehouse, reset kata sandi dikelola langsung oleh Administrator IT atau Supervisor Anda. Silakan hubungi admin tim Anda untuk pembaruan kata sandi.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-700 text-white font-semibold text-sm hover:bg-blue-800 transition-colors"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Hubungi Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 relative">
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Kontak Administrator IT</h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Silakan hubungi administrator sistem untuk pendaftaran akun operator baru, aktivasi akun, atau kendala hak akses:
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                <Mail size={18} className="text-blue-600 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Email Admin</span>
                  <span className="font-semibold text-slate-800">admin@labelflow.com</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                <Phone size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Helpdesk Internal</span>
                  <span className="font-semibold text-slate-800">Ekstensi 104 / WhatsApp Support</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAdminModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
