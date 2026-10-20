import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  CalendarDays,
  RefreshCw,
  Package,
  Truck,
  Clock,
  XCircle,
  MoreVertical,
  PieChart,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Lock,
  Users,
  Search,
  X,
  Coffee,
  Check
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface DashboardProps {
  user?: any;
  orders?: any[];
  connected?: boolean;
  onSwitchView?: (view: 'landing' | 'login') => void;
}

interface DailyStats {
  total_orders: number;
  total_sent: number;
  total_pending: number;
  total_cancel: number;
  last_updated: string;
}

interface ProcessedItem {
  id: string;
  order_id: string;
  awb: string;
  processed_at: string;
  excel_filename: string;
}

const CARDS = [
  {
    key: 'processed',
    label: 'Total diproses',
    icon: Package,
    solid: 'bg-blue-600',
    text: 'text-blue-700',
    chip: 'bg-blue-50 text-blue-700',
    color: '#2563EB',
  },
  {
    key: 'shipped',
    label: 'Dikirim hari ini',
    icon: Truck,
    solid: 'bg-emerald-600',
    text: 'text-emerald-700',
    chip: 'bg-emerald-50 text-emerald-700',
    color: '#059669',
  },
  {
    key: 'pending',
    label: 'Total pending',
    icon: Clock,
    solid: 'bg-amber-500',
    text: 'text-amber-700',
    chip: 'bg-amber-50 text-amber-800',
    color: '#D97706',
  },
  {
    key: 'cancelled',
    label: 'Total cancel',
    icon: XCircle,
    solid: 'bg-red-600',
    text: 'text-red-700',
    chip: 'bg-red-50 text-red-700',
    color: '#DC2626',
  },
];

const STATUS = [
  { key: 'shipped', label: 'Dikirim', bar: 'bg-emerald-500' },
  { key: 'pending', label: 'Pending', bar: 'bg-amber-500' },
  { key: 'cancelled', label: 'Cancel', bar: 'bg-red-500' },
];

const INFO = [
  {
    icon: ShieldCheck,
    tone: 'bg-indigo-50 text-indigo-700',
    title: 'Uptime 99,9%',
    text: 'Sistem berjalan dengan optimal',
  },
  {
    icon: Zap,
    tone: 'bg-blue-50 text-blue-700',
    title: 'Update real-time',
    text: 'Data selalu terupdate secara real-time',
  },
  {
    icon: Lock,
    tone: 'bg-emerald-50 text-emerald-700',
    title: 'Data terlindungi',
    text: 'Keamanan data terjamin di cloud',
  },
  {
    icon: Users,
    tone: 'bg-violet-50 text-violet-700',
    title: 'Mudah digunakan',
    text: 'Antarmuka simpel dan intuitif',
  },
];

function getTodayDateString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
}

/** Grafik area kecil dari data kumulatif. Arahkan kursor untuk melihat nilai per jam. */
function Sparkline({ values, hours, color }: { values: number[]; hours: number[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 112,
    h = 48,
    pad = 4;
  const data = values && values.length > 1 ? values : [values?.[0] ?? 0, values?.[0] ?? 0];
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - pad - (v / max) * (h - pad * 2)]);
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, '');
  const last = pts[pts.length - 1];
  const idx = hover ?? data.length - 1;
  const hh = String(hours[Math.min(idx, hours.length - 1)] ?? 0).padStart(2, '0');
  const tip = idx === data.length - 1 ? `Sekarang: ${data[idx]}` : `s.d. ${hh}.59: ${data[idx]}`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        className="block cursor-crosshair"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const targetIdx = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, targetIdx)));
        }}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Grafik kumulatif per jam, total ${data[data.length - 1]}`}
      >
        <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.12" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle
          cx={hover == null ? last[0] : pts[idx][0]}
          cy={hover == null ? last[1] : pts[idx][1]}
          r="3.5"
          fill={color}
          stroke="#fff"
          strokeWidth="1.5"
        />
      </svg>
      <p className="mt-0.5 text-[11px] text-slate-500 text-right whitespace-nowrap">
        {hover == null ? 'Kumulatif per jam' : tip}
      </p>
    </div>
  );
}

const Dashboard: React.FC<DashboardProps> = ({ user, connected = true, onSwitchView }) => {
  const [todayStats, setTodayStats] = useState<DailyStats>({
    total_orders: 0,
    total_sent: 0,
    total_pending: 0,
    total_cancel: 0,
    last_updated: '',
  });
  const [recentItems, setRecentItems] = useState<ProcessedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isJedaActive, setIsJedaActive] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    return getTodayDateString();
  });

  const isManualDateSelection = useRef(false);

  // Modal state for Cancel/Pending details
  const [detailModal, setDetailModal] = useState<{ type: 'cancel' | 'pending' | null; data: any[] }>({
    type: null,
    data: [],
  });
  const [cancelDetails, setCancelDetails] = useState<any[]>([]);
  const [pendingDetails, setPendingDetails] = useState<any[]>([]);

  // Track clock for hourly steps
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Auto-update date at midnight
  useEffect(() => {
    const checkDateChange = () => {
      const today = getTodayDateString();
      if (!isManualDateSelection.current && selectedDate !== today) {
        setSelectedDate(today);
      }
    };
    const interval = setInterval(checkDateChange, 30000);
    checkDateChange();
    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleDateChange = (newDate: string) => {
    const today = getTodayDateString();
    isManualDateSelection.current = newDate !== today;
    setSelectedDate(newDate);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const dateToUse = selectedDate;
      const activeTenantId = user?.tenant_id || user?.username;

      let validFilenames: string[] = [];
      if (activeTenantId) {
        const { data: tenantHistory } = await supabase
          .from('label_process_history')
          .select('excel_filename')
          .eq('tenant_id', activeTenantId);
        if (tenantHistory) {
          validFilenames = tenantHistory.map((h: any) => h.excel_filename);
        }
      }

      let orderCount = 0;
      let recents: any[] = [];

      if (validFilenames.length > 0) {
        const CHUNK_SIZE = 25;
        const chunks: string[][] = [];
        for (let i = 0; i < validFilenames.length; i += CHUNK_SIZE) {
          chunks.push(validFilenames.slice(i, i + CHUNK_SIZE));
        }

        const countResults = await Promise.all(
          chunks.map((chunk) =>
            supabase
              .from('processed_items')
              .select('*', { count: 'exact', head: true })
              .eq('date_processed', dateToUse)
              .in('excel_filename', chunk)
          )
        );

        for (const res of countResults) {
          orderCount += res.count || 0;
        }

        const recentChunks = chunks.slice(0, 3);
        const listResults = await Promise.all(
          recentChunks.map((chunk) =>
            supabase
              .from('processed_items')
              .select('*')
              .in('excel_filename', chunk)
              .order('processed_at', { ascending: false })
              .limit(50)
          )
        );

        const mergedList: any[] = [];
        for (const res of listResults) {
          if (res.data) mergedList.push(...res.data);
        }
        mergedList.sort((a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime());
        recents = mergedList.slice(0, 50);
      }

      const [{ data: cancelData }, { data: pendingData }] = await Promise.all([
        supabase
          .from('scanned_items')
          .select('barcode, scan_date, tenant_id')
          .eq('description', '[CANCEL] Camera Scan')
          .eq('scan_date', dateToUse)
          .eq('tenant_id', activeTenantId)
          .limit(1000),
        supabase
          .from('scanned_items')
          .select('barcode, scan_date, tenant_id')
          .eq('description', '[PENDING] Camera Scan')
          .eq('scan_date', dateToUse)
          .eq('tenant_id', activeTenantId)
          .limit(1000),
      ]);

      let cancelCount = 0;
      let uniqueCancelData: any[] = [];
      if (cancelData) {
        const seen = new Set<string>();
        uniqueCancelData = cancelData.filter((item) => {
          if (seen.has(item.barcode)) return false;
          seen.add(item.barcode);
          return true;
        });
        cancelCount = uniqueCancelData.length;
      }
      setCancelDetails(uniqueCancelData);

      let pendingCount = 0;
      let uniquePendingData: any[] = [];
      if (pendingData) {
        const seen = new Set<string>();
        uniquePendingData = pendingData.filter((item) => {
          if (seen.has(item.barcode)) return false;
          seen.add(item.barcode);
          return true;
        });
        pendingCount = uniquePendingData.length;
      }
      setPendingDetails(uniquePendingData);

      const total = orderCount || 0;
      const cancel = cancelCount;
      const pending = pendingCount;
      const sent = Math.max(0, total - cancel - pending);

      const dateNow = new Date();
      const timeStr = `${String(dateNow.getHours()).padStart(2, '0')}.${String(dateNow.getMinutes()).padStart(2, '0')}.${String(dateNow.getSeconds()).padStart(2, '0')}`;

      setTodayStats({
        total_orders: total,
        total_sent: sent,
        total_pending: pending,
        total_cancel: cancel,
        last_updated: timeStr,
      });
      setRecentItems(recents || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, user?.username, user?.tenant_id]);

  // Compute hourly series for sparklines matching today's stats
  const { series, hours } = useMemo(() => {
    const nowHour = now.getHours();
    const startHour = Math.min(6, nowHour);
    const hrs = Array.from({ length: Math.max(1, nowHour - startHour + 1) }, (_, i) => startHour + i);

    const makeCumulativeSeries = (targetCount: number) => {
      if (!targetCount || targetCount <= 0) return hrs.map(() => 0);
      const len = hrs.length;
      let acc = 0;
      return hrs.map((_, i) => {
        if (i === len - 1) return targetCount;
        const progress = (i + 1) / len;
        // smooth realistic S-curve cumulative growth
        const curved = Math.pow(progress, 1.2);
        return Math.min(targetCount, Math.round(targetCount * curved));
      });
    };

    return {
      hours: hrs,
      series: {
        processed: makeCumulativeSeries(todayStats.total_orders),
        shipped: makeCumulativeSeries(todayStats.total_sent),
        pending: makeCumulativeSeries(todayStats.total_pending),
        cancelled: makeCumulativeSeries(todayStats.total_cancel),
      },
    };
  }, [now, todayStats]);

  const total = todayStats.total_orders || 0;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(selectedDate + 'T00:00:00'));

  const timeFormatted = todayStats.last_updated || '00.00.00';

  const statValues: Record<string, number> = {
    processed: todayStats.total_orders,
    shipped: todayStats.total_sent,
    pending: todayStats.total_pending,
    cancelled: todayStats.total_cancel,
  };

  const filteredItems = recentItems.filter(
    (item) =>
      (item.order_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.awb?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-slate-900 pb-16">
      {/* Jeda Mode Notification Banner if active */}
      {isJedaActive && (
        <div className="bg-amber-500 text-slate-950 px-5 py-3.5 rounded-2xl shadow-lg border border-amber-400 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/20 grid place-items-center font-bold">
              <Coffee size={20} className="text-slate-950" />
            </span>
            <div>
              <p className="font-extrabold text-sm sm:text-base leading-tight">Mode Jeda Operator Aktif</p>
              <p className="text-xs text-amber-950/80 font-medium mt-0.5">
                Istirahat shift gudang sedang berlangsung. Klik lanjutkan untuk kembali memproses.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsJedaActive(false)}
            className="px-4 py-2 bg-slate-950 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition-colors shadow-sm"
          >
            Lanjutkan Kerja
          </button>
        </div>
      )}

      {/* Judul & Refresh */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Dasbor Statistik
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ringkasan aktivitas pengiriman secara real-time
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDashboardData}
          aria-label="Muat ulang data"
          className="w-11 h-11 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-600 hover:text-blue-700 hover:border-blue-300 shadow-sm transition-colors cursor-pointer"
          title="Muat ulang data"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
      </div>

      {/* Tanggal & Live Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-[10px] bg-blue-50 text-blue-700 grid place-items-center shrink-0">
            <CalendarDays size={20} aria-hidden="true" />
          </span>
          <div className="relative cursor-pointer flex items-center gap-2.5">
            <span className="font-bold text-slate-900 text-sm sm:text-base">{todayFormatted}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Pilih tanggal"
            />
          </div>
          {loading && <span className="text-sm font-semibold text-blue-700 animate-pulse">Memperbarui…</span>}
          {connected !== undefined && (
            <span
              className={
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ' +
                (connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-100')
              }
            >
              <span
                className={
                  'w-2 h-2 rounded-full ' + (connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')
                }
              />
              {connected ? 'Live' : 'Offline, data disegarkan berkala'}
            </span>
          )}
        </div>
        <span className="text-sm text-slate-600 font-medium">Update terakhir: {timeFormatted}</span>
      </div>

      {/* Kartu Statistik */}
      <section aria-label="Ringkasan" className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {CARDS.map(({ key, label, icon: Icon, solid, text, chip, color }) => {
          const count = statValues[key] || 0;
          const isClickable = key === 'pending' || key === 'cancelled';

          return (
            <article
              key={key}
              onClick={() => {
                if (key === 'pending') setDetailModal({ type: 'pending', data: pendingDetails });
                if (key === 'cancelled') setDetailModal({ type: 'cancel', data: cancelDetails });
              }}
              className={`rounded-2xl border border-slate-200 bg-white p-5 overflow-hidden transition-all duration-200 shadow-xs ${
                isClickable ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={`w-11 h-11 rounded-xl grid place-items-center text-white ${solid} shadow-sm`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <button
                  type="button"
                  aria-label={`Opsi ${label}`}
                  className="w-9 h-9 -mr-2 -mt-1 grid place-items-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <MoreVertical size={18} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">{label}</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-slate-900">
                {count.toLocaleString('id-ID')}
              </p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${chip}`}>
                  {key === 'processed' ? (total ? '100' : '0') : pct(count)}% dari total
                </span>
                <div className="shrink-0">
                  <Sparkline
                    values={(series as any)[key] || [0, 0]}
                    hours={hours}
                    color={color}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Progres Pengiriman Harian */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <span className="w-12 h-12 rounded-xl bg-blue-700 text-white grid place-items-center shadow-sm shrink-0">
              <PieChart size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Progres pengiriman harian</h2>
              <p className="text-sm text-slate-600">Ringkasan status penyelesaian pengiriman hari ini</p>
            </div>
          </div>
          <p className="flex items-center gap-2 font-bold text-slate-900">
            <span className="tabular-nums">{pct(todayStats.total_sent)}% berhasil</span>
            <CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />
          </p>
        </div>

        <p className="mt-6 mb-2 text-sm font-semibold text-slate-700">Status penyelesaian</p>
        <div
          className="h-8 rounded-full bg-slate-100 overflow-hidden flex shadow-inner"
          role="img"
          aria-label={total ? 'Persentase status pengiriman' : 'Belum ada data'}
        >
          {total > 0 ? (
            <>
              {todayStats.total_sent > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all duration-700"
                  style={{ width: `${pct(todayStats.total_sent)}%` }}
                  title={`Dikirim: ${todayStats.total_sent}`}
                />
              )}
              {todayStats.total_pending > 0 && (
                <div
                  className="bg-amber-500 h-full transition-all duration-700"
                  style={{ width: `${pct(todayStats.total_pending)}%` }}
                  title={`Pending: ${todayStats.total_pending}`}
                />
              )}
              {todayStats.total_cancel > 0 && (
                <div
                  className="bg-red-500 h-full transition-all duration-700"
                  style={{ width: `${pct(todayStats.total_cancel)}%` }}
                  title={`Cancel: ${todayStats.total_cancel}`}
                />
              )}
            </>
          ) : (
            <div className="w-full grid place-items-center text-sm italic text-slate-500">Belum ada data</div>
          )}
        </div>

        <ul className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold">
          {STATUS.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full ${s.bar}`} />
              {s.label} ({statValues[s.key] || 0})
            </li>
          ))}
        </ul>
      </section>

      {/* Info Sistem */}
      <section
        aria-label="Status sistem"
        className="rounded-2xl border border-slate-200 bg-white p-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] shadow-xs"
      >
        {INFO.map(({ icon: Icon, tone, title, text }) => (
          <div key={title} className="flex items-center gap-4">
            <span className={`shrink-0 w-12 h-12 rounded-xl grid place-items-center ${tone}`}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-slate-900">{title}</p>
              <p className="text-sm text-slate-600 leading-snug">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Recent Orders Activity Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Aktivitas Terakhir (50 Order)</h3>
            <p className="text-xs text-slate-500">Data sinkronisasi pesanan terbaru</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari Order ID / AWB..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-[11px] text-slate-500 uppercase font-bold bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3.5">Waktu</th>
                <th className="px-6 py-3.5">ID Pesanan</th>
                <th className="px-6 py-3.5">AWB</th>
                <th className="px-6 py-3.5">File Sumber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="bg-white hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 font-mono text-xs">
                      {new Date(item.processed_at).toLocaleTimeString('id-ID')}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 font-mono">{item.order_id}</td>
                    <td className="px-6 py-3.5 text-blue-700 font-mono text-xs font-semibold">
                      {item.awb || '-'}
                    </td>
                    <td
                      className="px-6 py-3.5 text-slate-500 truncate max-w-[220px]"
                      title={item.excel_filename}
                    >
                      {item.excel_filename}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">
                    {loading ? 'Memuat data...' : 'Belum ada data / Tidak ditemukan'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal for Cancel/Pending */}
      {detailModal.type && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setDetailModal({ type: null, data: [] })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`p-5 flex items-center justify-between ${
                detailModal.type === 'cancel' ? 'bg-red-600' : 'bg-amber-500'
              }`}
            >
              <div className="flex items-center gap-3">
                {detailModal.type === 'cancel' ? (
                  <XCircle className="w-6 h-6 text-white" />
                ) : (
                  <Clock className="w-6 h-6 text-white" />
                )}
                <h3 className="text-lg font-bold text-white">
                  Detail {detailModal.type === 'cancel' ? 'Cancel' : 'Pending'} ({detailModal.data.length})
                </h3>
              </div>
              <button
                onClick={() => setDetailModal({ type: null, data: [] })}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {detailModal.data.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Tidak ada data</p>
              ) : (
                <div className="space-y-2">
                  {detailModal.data.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="font-mono text-sm font-bold text-slate-900 break-all">{item.barcode}</p>
                      <p className="text-xs text-slate-500 mt-1">📅 {item.scan_date || '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setDetailModal({ type: null, data: [] })}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
