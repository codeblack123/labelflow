import React, { useState } from "react";
import {
  Activity,
  Search,
  Layers,
  Globe,
  Check,
  ArrowRight,
  X,
  MessageCircle,
  Mail,
  Phone
} from "lucide-react";

interface LandingPageProps {
  onLogin?: () => void;
  onGetStarted?: () => void;
  onContactSales?: () => void;
  onSwitchView?: (view: "landing" | "login") => void;
}

const NAV = [
  { label: "Fitur", href: "#fitur" },
  { label: "Solusi", href: "#solusi" },
  { label: "Harga", href: "#harga" },
  { label: "Sumber Daya", href: "#sumber" },
];

const STATS = [
  { value: "99,9%", label: "Uptime" },
  { value: "10rb+", label: "Order per hari" },
  { value: "24/7", label: "Dukungan" },
];

const PLATFORMS = ["Ginee", "Shopee", "TikTok"];

const FEATURES = [
  {
    icon: Search,
    tone: "bg-blue-50 text-blue-700",
    title: "Ekstraksi Cepat",
    text: "Ambil Order ID dan SKU dari file PDF dan Excel dalam hitungan detik dengan akurasi tinggi.",
  },
  {
    icon: Layers,
    tone: "bg-indigo-50 text-indigo-700",
    title: "Pemrosesan Massal",
    text: "Proses ribuan label sekaligus dengan toolkit Massal Pro yang dirancang khusus untuk volume tinggi.",
  },
  {
    icon: Globe,
    tone: "bg-emerald-50 text-emerald-700",
    title: "Multi-Platform",
    text: "Mendukung Ginee, Shopee, TikTok, dan platform lain dengan penanganan XLSX dan PDF yang spesifik.",
  },
];

const SOLUTIONS = [
  {
    title: "Pengurutan Otomatis",
    text: "Kelompokkan label otomatis per kurir, wilayah, atau SKU agar fulfillment lebih cepat.",
  },
  {
    title: "Sinkronisasi Stok",
    text: "Terhubung dengan WMS Anda untuk memperbarui stok secara real-time saat label dipindai.",
  },
];

const PRICING_POINTS = ["Pemrosesan tanpa batas", "Dukungan khusus", "Integrasi kustom"];

const RESOURCES = [
  { title: "Dokumentasi", text: "Semua yang Anda perlukan untuk mulai memakai API dan toolkit.", href: "#" },
  { title: "Video Tutorial", text: "Panduan langkah demi langkah untuk pemrosesan batch tingkat lanjut.", href: "#" },
];

// Data contoh untuk tampilan produk di hero
const SAMPLE_ROWS = [
  { id: "SPX-000001", sku: "SKU-AAA-01", courier: "SPX" },
  { id: "JNT-000002", sku: "SKU-BBB-02", courier: "J&T" },
  { id: "TTK-000003", sku: "SKU-CCC-03", courier: "JNE" },
];

const SECTION = "px-5 sm:px-8 lg:px-16 py-24";
const H2 = "text-3xl sm:text-4xl font-extrabold tracking-tight";

export default function LandingPage({
  onLogin = () => {},
  onGetStarted,
  onContactSales,
  onSwitchView,
}: LandingPageProps) {
  const [lang, setLang] = useState<"ID" | "EN">("ID");
  const [showSalesModal, setShowSalesModal] = useState(false);

  // Seamless handler so both onLogin and onGetStarted work identical
  const handleAuth = () => {
    if (onLogin && onLogin !== noop) {
      onLogin();
    } else if (onGetStarted) {
      onGetStarted();
    } else {
      onLogin();
    }
  };

  const handleSalesClick = () => {
    if (onContactSales) {
      onContactSales();
    } else {
      setShowSalesModal(true);
    }
  };

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace("#", "");
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-slate-900 bg-white min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="min-h-[72px] px-5 sm:px-8 lg:px-16 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            <a href="#" className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-[10px] bg-blue-700 text-white grid place-items-center shadow-sm">
                <Activity size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Label Flow</span>
            </a>
            <nav className="flex flex-wrap gap-7 text-[15px] font-medium text-slate-700">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={(e) => scrollTo(e, n.href)}
                  className="hover:text-blue-700 transition-colors"
                >
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === "ID" ? "EN" : "ID"))}
              className="h-11 px-3.5 rounded-[10px] border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title="Ganti Bahasa"
            >
              {lang}
            </button>
            <button
              type="button"
              onClick={handleAuth}
              className="h-11 px-5 rounded-[10px] bg-slate-900 text-white text-[15px] font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              Masuk
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#0B1224] text-white px-5 sm:px-8 lg:px-16 py-24 flex flex-wrap items-center gap-16">
        <div className="flex-1 basis-[460px] max-w-[620px]">
          <span className="inline-block px-3.5 py-1.5 rounded-full border border-slate-700 text-[13px] font-semibold tracking-wide text-blue-300">
            LOGISTIK GENERASI BERIKUTNYA
          </span>
          <h1 className="mt-6 mb-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-[-0.03em]">
            Label pengiriman beres. Stok terkendali.
          </h1>
          <p className="mb-9 max-w-[520px] text-lg leading-relaxed text-slate-300">
            Ekstrak Order ID dan SKU dari PDF dan Excel, kelompokkan label per kurir, dan kurangi kesalahan pengiriman di gudang Anda.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <button
              type="button"
              onClick={handleAuth}
              className="h-[52px] px-7 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base inline-flex items-center gap-2.5 transition-colors shadow-lg shadow-blue-900/30"
            >
              Mulai Sekarang <ArrowRight size={18} aria-hidden="true" />
            </button>
            <a
              href="#fitur"
              onClick={(e) => scrollTo(e, "#fitur")}
              className="h-[52px] px-7 rounded-xl border border-slate-600 text-slate-200 hover:bg-white/5 font-semibold text-base inline-flex items-center transition-colors"
            >
              Lihat Fitur
            </a>
          </div>
          <dl className="mt-14 pt-7 border-t border-slate-800 flex flex-wrap gap-x-12 gap-y-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <dd className="text-3xl font-extrabold text-white">{s.value}</dd>
                <dt className="mt-0.5 text-sm text-slate-400">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Tampilan produk contoh */}
        <div
          className="flex-1 basis-[420px] max-w-[560px] rounded-[18px] border border-[#243252] bg-[#111B33] p-[22px] shadow-2xl"
          aria-label="Contoh tampilan batch label"
        >
          <div className="flex items-center justify-between mb-[18px]">
            <span className="font-bold text-[15px] text-slate-200">Batch label · contoh</span>
            <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              Selesai
            </span>
          </div>
          <div className="grid grid-cols-[1.4fr_1.2fr_0.8fr] gap-2.5 px-1 pb-2.5 border-b border-[#243252] text-xs font-semibold text-slate-400">
            <span>ORDER ID</span>
            <span>SKU</span>
            <span>KURIR</span>
          </div>
          {SAMPLE_ROWS.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1.4fr_1.2fr_0.8fr] gap-2.5 px-1 py-3 border-b border-[#1B2745] text-sm"
            >
              <span className="font-mono text-slate-200">{r.id}</span>
              <span className="text-slate-300">{r.sku}</span>
              <span className="text-blue-300 font-semibold">{r.courier}</span>
            </div>
          ))}
          <div className="mt-5 h-2 rounded-full bg-[#1B2745] overflow-hidden">
            <div className="h-2 w-[72%] rounded-full bg-blue-500 transition-all duration-1000" />
          </div>
          <p className="mt-2.5 text-[13px] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Mengelompokkan label per kurir…
          </p>
        </div>
      </section>

      {/* Platform */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-8 lg:px-16 py-6 flex flex-wrap items-center justify-center gap-x-9 gap-y-3 text-[15px] text-slate-600">
        <span className="font-medium">Mendukung label dari</span>
        {PLATFORMS.map((p) => (
          <b key={p} className="text-lg text-slate-700 font-bold">
            {p}
          </b>
        ))}
        <span>dan lainnya</span>
      </div>

      {/* Fitur */}
      <section id="fitur" className={SECTION}>
        <h2 className={`${H2} text-center mb-3 text-slate-900`}>Kenapa memilih Label Flow?</h2>
        <p className="mx-auto mb-14 max-w-[520px] text-center text-[17px] leading-relaxed text-slate-600">
          Dirancang untuk tim gudang yang memproses ribuan label setiap hari.
        </p>
        <div className="mx-auto max-w-[1200px] grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {FEATURES.map(({ icon: Icon, tone, title, text }) => (
            <article
              key={title}
              className="rounded-[18px] border border-slate-200 bg-white p-8 hover:shadow-lg hover:border-slate-300 transition-all duration-200"
            >
              <span className={`w-12 h-12 rounded-xl grid place-items-center ${tone}`}>
                <Icon size={24} aria-hidden="true" />
              </span>
              <h3 className="mt-[22px] mb-2.5 text-xl font-bold text-slate-900">{title}</h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Solusi */}
      <section id="solusi" className={`${SECTION} bg-slate-50 border-y border-slate-200`}>
        <h2 className={`${H2} text-center mb-12 text-slate-900`}>Solusi Terintegrasi</h2>
        <ol className="mx-auto max-w-[1000px] grid gap-10 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {SOLUTIONS.map((s, i) => (
            <li key={s.title} className="flex gap-[18px]">
              <span className="shrink-0 w-11 h-11 rounded-full bg-blue-700 text-white font-bold grid place-items-center shadow-md">
                {i + 1}
              </span>
              <div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="text-[15.5px] leading-relaxed text-slate-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Harga */}
      <section id="harga" className={SECTION}>
        <h2 className={`${H2} text-center mb-12 text-slate-900`}>Harga Fleksibel</h2>
        <div className="mx-auto max-w-[440px] rounded-[22px] border-2 border-blue-700 p-10 shadow-[0_20px_50px_-24px_rgba(29,78,216,0.35)] bg-white">
          <p className="text-sm font-bold tracking-wider text-slate-600 uppercase">ENTERPRISE</p>
          <p className="mt-2 mb-6 text-5xl font-extrabold tracking-tight text-blue-700">Custom</p>
          <ul className="mb-8 flex flex-col gap-3.5 text-base text-slate-700">
            {PRICING_POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <Check size={20} strokeWidth={2.5} className="text-blue-700 shrink-0" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleSalesClick}
            className="w-full h-[52px] rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-base transition-colors shadow-md shadow-blue-700/20"
          >
            Hubungi Sales
          </button>
        </div>
      </section>

      {/* Sumber daya */}
      <section id="sumber" className={`${SECTION} bg-[#0B1224] text-white`}>
        <h2 className={`${H2} text-center mb-11`}>Belajar &amp; Sumber Daya</h2>
        <div className="mx-auto max-w-[820px] grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {RESOURCES.map((r) => (
            <a
              key={r.title}
              href={r.href}
              className="block rounded-2xl border border-[#243252] bg-[#111B33] hover:border-blue-500 p-7 transition-all duration-200 group"
            >
              <div className="mb-2 text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                {r.title}
              </div>
              <p className="text-[15px] leading-relaxed text-slate-300">{r.text}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-8 text-center text-sm text-slate-600 border-t border-slate-200 bg-white">
        © 2026 Label Flow Warehouse Solutions. Hak cipta dilindungi.
      </footer>

      {/* Floating Bottom Nav Pill Switcher (Home / Login) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0E172B]/95 backdrop-blur-md p-1.5 rounded-full border border-slate-700/60 shadow-2xl flex items-center gap-1">
        <button
          type="button"
          className="px-5 py-2 rounded-full text-xs sm:text-sm font-bold bg-white text-slate-950 shadow-md transition-all cursor-default"
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => {
            if (onSwitchView) onSwitchView("login");
            else handleAuth();
          }}
          className="px-5 py-2 rounded-full text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          Login
        </button>
      </div>

      {/* Contact Sales Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 relative">
            <button
              onClick={() => setShowSalesModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hubungi Tim Sales</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Dapatkan konsultasi khusus dan demo sistem Label Flow Enterprise untuk kebutuhan gudang Anda.
            </p>
            <div className="space-y-3">
              <a
                href="mailto:sales@labelflow.com?subject=Inquiry%20Enterprise%20Label%20Flow"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-800 transition-colors"
              >
                <Mail size={18} className="text-blue-600" />
                <div className="text-left">
                  <div className="text-xs text-slate-500">Email Kami</div>
                  <div className="text-sm font-semibold">sales@labelflow.com</div>
                </div>
              </a>
              <a
                href="https://wa.me/6281234567890?text=Halo%20tim%20Label%20Flow,%20saya%20tertarik%20dengan%20paket%20Enterprise."
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-800 transition-colors"
              >
                <Phone size={18} className="text-emerald-600" />
                <div className="text-left">
                  <div className="text-xs text-slate-500">WhatsApp Sales Hotline</div>
                  <div className="text-sm font-semibold">+62 812-3456-7890</div>
                </div>
              </a>
            </div>
            <button
              type="button"
              onClick={() => setShowSalesModal(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const noop = () => {};
