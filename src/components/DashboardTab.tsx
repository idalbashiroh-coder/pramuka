import React from 'react';
import { User } from 'firebase/auth';
import {
  Wallet,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
  QrCode,
  Banknote,
  Share2,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { GudepSettings, PaymentRecord, ScoutMember, SheetConfig } from '../types/scout';
import { formatRupiah, formatBulanIndo } from '../utils/formatters';
import { TunasKelapaIcon } from './ScoutIcons';

interface DashboardTabProps {
  user: User | null;
  members: ScoutMember[];
  transactions: PaymentRecord[];
  settings: GudepSettings;
  sheetConfig: SheetConfig;
  selectedMonth: string;
  isSyncing: boolean;
  onNavigateTab: (tabId: string) => void;
  onOpenQuickPay: () => void;
  onOpenSheetModal: () => void;
  onQuickCreateSheet: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  user,
  members,
  transactions,
  settings,
  sheetConfig,
  selectedMonth,
  isSyncing,
  onNavigateTab,
  onOpenQuickPay,
  onOpenSheetModal,
  onQuickCreateSheet,
}) => {
  // Calculations
  const activeMembers = members.filter((m) => m.active);
  const totalAllTime = transactions.reduce((acc, t) => acc + t.amount, 0);

  // Current selected month
  const monthTransactions = transactions.filter((t) => t.monthPeriod === selectedMonth);
  const totalMonth = monthTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Target for the month: activeMembers * defaultFee * 4 latihan
  const targetMonth = activeMembers.length * settings.defaultFeePerMeeting * 4;
  const complianceMonth = targetMonth > 0 ? Math.min(100, Math.round((totalMonth / targetMonth) * 100)) : 0;

  // Members who paid in this month
  const paidMemberIds = new Set(monthTransactions.map((t) => t.memberId));
  const paidCount = paidMemberIds.size;
  const unpaidCount = Math.max(0, activeMembers.length - paidCount);

  // Group by Regu
  const reguStats = React.useMemo(() => {
    const map = new Map<string, { total: number; count: number; membersTotal: number }>();
    members.forEach((m) => {
      const existing = map.get(m.regu) || { total: 0, count: 0, membersTotal: 0 };
      existing.membersTotal += 1;
      map.set(m.regu, existing);
    });

    monthTransactions.forEach((t) => {
      const existing = map.get(t.regu);
      if (existing) {
        existing.total += t.amount;
        existing.count += 1;
      }
    });

    return Array.from(map.entries())
      .map(([regu, data]) => {
        const reguTarget = data.membersTotal * settings.defaultFeePerMeeting * 4;
        const rate = reguTarget > 0 ? Math.min(100, Math.round((data.total / reguTarget) * 100)) : 0;
        return {
          regu,
          total: data.total,
          membersTotal: data.membersTotal,
          target: reguTarget,
          complianceRate: rate,
        };
      })
      .sort((a, b) => b.complianceRate - a.complianceRate || b.total - a.total);
  }, [members, monthTransactions, settings]);

  const topRegu = reguStats[0] || null;

  // Payment methods breakdown
  const methodStats = React.useMemo(() => {
    let tunai = 0;
    let qris = 0;
    let transfer = 0;
    monthTransactions.forEach((t) => {
      if (t.paymentMethod === 'Tunai') tunai += t.amount;
      else if (t.paymentMethod === 'QRIS') qris += t.amount;
      else transfer += t.amount;
    });
    return { tunai, qris, transfer };
  }, [monthTransactions]);

  return (
    <div className="space-y-6">
      {/* Google Login Done, But Sheet Not Yet Connected Callout */}
      {user && !sheetConfig.isConnected && (
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 rounded-2xl p-4 sm:p-5 text-white border-2 border-emerald-500/70 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-white">
                  Akun Google Anda ({user.email}) Siap Dihubungkan!
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/30">
                  Tinggal 1 Klik
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Anda sudah login Gmail. Klik tombol di samping untuk otomatis membuat file Google Spreadsheet di Drive Anda sehingga data iuran rutin & rekapan langsung tersimpan ke cloud.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onQuickCreateSheet}
              disabled={isSyncing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSyncing ? 'Sedang Membuat di Drive...' : 'Buat Spreadsheet di Drive (1-Klik)'}</span>
            </button>
            <button
              onClick={onOpenSheetModal}
              className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-600 transition"
              title="Pilihan Lainnya"
            >
              Opsi
            </button>
          </div>
        </div>
      )}

      {/* Welcome & Quick Action Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 p-6 text-white shadow-xl border border-amber-700/50">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <TunasKelapaIcon className="w-72 h-72 text-amber-100" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-700/60 border border-amber-500/40 text-amber-200 text-xs font-semibold mb-3">
            <span>⚜️ Pangkalan: {settings.pangkalan}</span>
            <span>•</span>
            <span>{settings.gudepName}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Iuran Rutin Latihan Pramuka
          </h2>
          <p className="text-amber-100/90 text-sm sm:text-base mb-6 leading-relaxed">
            Kelola pemasukan iuran mingguan anggota, pantau kedisiplinan per-regu, dan otomatisasi rekapitulasi bulanan yang terhubung langsung dengan Google Spreadsheet.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenQuickPay}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-300 hover:to-amber-400 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Banknote className="w-4 h-4" />
              <span>Catat Iuran Latihan Hari Ini</span>
            </button>

            <button
              onClick={() => onNavigateTab('monthly')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-stone-900/60 hover:bg-stone-900/90 text-amber-100 border border-amber-600/50 transition"
            >
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>Lihat Rekap {formatBulanIndo(selectedMonth)}</span>
            </button>

            <button
              onClick={() => onNavigateTab('regu')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-stone-900/60 hover:bg-stone-900/90 text-amber-100 border border-amber-600/50 transition"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Peringkat Regu Terdisiplin</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Terkumpul Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Iuran {formatBulanIndo(selectedMonth)}
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 mb-1">
            {formatRupiah(totalMonth)}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Target: {formatRupiah(targetMonth)}</span>
            <span className="font-bold text-amber-700">{complianceMonth}%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-stone-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-amber-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${complianceMonth}%` }}
            />
          </div>
        </div>

        {/* Total Akumulasi Kas */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Total Kas Terkumpul
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 mb-1">
            {formatRupiah(totalAllTime)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-2">
            <span className="font-semibold text-emerald-700">{transactions.length} kali</span>
            <span>transaksi tercatat sejak awal</span>
          </div>
        </div>

        {/* Kepatuhan Bayar Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
              Kepatuhan Anggota
            </span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 mb-1">
            {paidCount} / {activeMembers.length}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-500 mt-2">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {paidCount} Bayar
            </span>
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {unpaidCount} Belum
            </span>
          </div>
        </div>

        {/* Regu Paling Disiplin */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-800">
              Regu Terdisiplin
            </span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-black text-stone-900 truncate mb-1">
            {topRegu ? topRegu.regu : 'Belum Ada'}
          </div>
          <div className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span className="text-purple-700 font-semibold">
              {topRegu ? `${topRegu.complianceRate}% Disiplin` : '-'}
            </span>
            <span className="font-mono text-stone-600">
              {topRegu ? formatRupiah(topRegu.total) : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Leaderboard Regu & Quick Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Rekapan Per Regu Bulan Ini */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <span>Performa Kedisiplinan Iuran Pe-Regu</span>
                <span className="text-xs font-normal text-stone-500">
                  ({formatBulanIndo(selectedMonth)})
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Peringkat regu berdasarkan persentase iuran latihan rutin terkumpul
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('regu')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline"
            >
              Lihat Rincian <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {reguStats.map((item, idx) => (
              <div
                key={item.regu}
                className="p-3.5 rounded-xl border border-stone-100 hover:border-amber-200 bg-stone-50/50 hover:bg-amber-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                        : idx === 1
                        ? 'bg-stone-300 text-stone-800'
                        : idx === 2
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                      {item.regu}
                      <span className="text-[11px] font-normal text-stone-500">
                        ({item.membersTotal} anggota)
                      </span>
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      <span>Terkumpul: <strong className="text-stone-800">{formatRupiah(item.total)}</strong></span>
                      <span>•</span>
                      <span>Target: {formatRupiah(item.target)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-48">
                  <div className="flex-1 bg-stone-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${
                        item.complianceRate >= 80
                          ? 'bg-emerald-500'
                          : item.complianceRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.complianceRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-stone-700 w-12 text-right">
                    {item.complianceRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kolom 3: Status Google Spreadsheet & Metode Pembayaran */}
        <div className="space-y-6">
          {/* Spreadsheet Database Integration Card */}
          <div className="bg-gradient-to-br from-emerald-950 via-stone-900 to-emerald-900 rounded-2xl p-5 text-white shadow-md border border-emerald-700/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Database Spreadsheet Resmi
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Database Utama Aktif
              </span>
            </div>

            <p className="text-xs text-stone-300 mb-3 leading-relaxed">
              Tersambung langsung dengan spreadsheet permanen:
              <span className="block mt-1 font-mono text-[11px] text-amber-300 bg-stone-950/60 p-1.5 rounded-lg border border-emerald-800/60 truncate">
                1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A
              </span>
            </p>
            <p className="text-[11px] text-stone-400 mb-4 leading-relaxed">
              Semua pencatatan iuran, anggota, dan rekapan langsung tersimpan ke spreadsheet ini secara otomatis, dan data di sheet langsung tampil di aplikasi.
            </p>

            <div className="flex flex-col gap-2">
              <a
                href={sheetConfig.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <span>Buka Spreadsheet di Google Sheets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={onOpenSheetModal}
                className="w-full py-1.5 px-3 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-emerald-200 text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Kelola Status & Sinkronisasi</span>
              </button>
            </div>
          </div>

          {/* Metode Pembayaran Breakdown */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
            <h4 className="font-bold text-stone-900 text-sm">
              Metode Pembayaran ({formatBulanIndo(selectedMonth)})
            </h4>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="text-[11px] font-semibold text-stone-500 mb-1 flex items-center justify-center gap-1">
                  <Banknote className="w-3 h-3 text-amber-700" /> Tunai
                </div>
                <div className="font-bold text-stone-900 text-xs truncate">
                  {formatRupiah(methodStats.tunai)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="text-[11px] font-semibold text-stone-500 mb-1 flex items-center justify-center gap-1">
                  <QrCode className="w-3 h-3 text-blue-700" /> QRIS
                </div>
                <div className="font-bold text-stone-900 text-xs truncate">
                  {formatRupiah(methodStats.qris)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="text-[11px] font-semibold text-stone-500 mb-1 flex items-center justify-center gap-1">
                  <Share2 className="w-3 h-3 text-emerald-700" /> Transfer
                </div>
                <div className="font-bold text-stone-900 text-xs truncate">
                  {formatRupiah(methodStats.transfer)}
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => onNavigateTab('transactions')}
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 hover:underline"
              >
                Lihat Semua Riwayat Transaksi →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
