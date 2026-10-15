import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Share2,
  Filter,
  Copy,
  Printer,
  FileSpreadsheet,
  Check,
  Search,
} from 'lucide-react';
import { GudepSettings, PaymentRecord, ScoutMember } from '../types/scout';
import { formatRupiah, formatBulanIndo } from '../utils/formatters';
import { TunasKelapaIcon } from './ScoutIcons';
import { PrintRecapModal } from './PrintRecapModal';

interface MonthlyRecapTabProps {
  members: ScoutMember[];
  transactions: PaymentRecord[];
  settings: GudepSettings;
  selectedMonth: string;
  onSelectMonth: (monthPeriod: string) => void;
  onSyncSpreadsheet: () => void;
}

export const MonthlyRecapTab: React.FC<MonthlyRecapTabProps> = ({
  members,
  transactions,
  settings,
  selectedMonth,
  onSelectMonth,
  onSyncSpreadsheet,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [filterRegu, setFilterRegu] = useState<string>('all');
  const [searchMember, setSearchMember] = useState<string>('');
  const [copiedWA, setCopiedWA] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Available months from transactions and recent 6 months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.monthPeriod));
    
    // Ensure current month and previous few months exist
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(mStr);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Active members
  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);
  const reguList = useMemo(() => Array.from(new Set(members.map((m) => m.regu))), [members]);

  // Transactions for selected month
  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.monthPeriod === selectedMonth),
    [transactions, selectedMonth]
  );

  // Expected 4 meetings per month
  const targetPerMember = settings.defaultFeePerMeeting * 4;
  const targetTotalMonth = activeMembers.length * targetPerMember;
  const totalCollectedMonth = monthTransactions.reduce((acc, t) => acc + t.amount, 0);
  const complianceRate = targetTotalMonth > 0 ? Math.min(100, Math.round((totalCollectedMonth / targetTotalMonth) * 100)) : 0;

  // Member monthly breakdown matrix
  const memberMatrix = useMemo(() => {
    return activeMembers.map((member) => {
      const memberTx = monthTransactions.filter((t) => t.memberId === member.id);
      
      const w1 = memberTx.filter((t) => t.weekNumber === 1).reduce((s, t) => s + t.amount, 0);
      const w2 = memberTx.filter((t) => t.weekNumber === 2).reduce((s, t) => s + t.amount, 0);
      const w3 = memberTx.filter((t) => t.weekNumber === 3).reduce((s, t) => s + t.amount, 0);
      const w4 = memberTx.filter((t) => t.weekNumber === 4).reduce((s, t) => s + t.amount, 0);
      const w5 = memberTx.filter((t) => t.weekNumber === 5).reduce((s, t) => s + t.amount, 0);

      const totalPaid = w1 + w2 + w3 + w4 + w5;
      const isLunas = totalPaid >= targetPerMember;
      const kekurangan = Math.max(0, targetPerMember - totalPaid);

      return {
        member,
        w1,
        w2,
        w3,
        w4,
        w5,
        totalPaid,
        isLunas,
        kekurangan,
        status: isLunas ? 'Lunas' : totalPaid > 0 ? 'Sebagian' : 'Belum Bayar',
      };
    });
  }, [activeMembers, monthTransactions, targetPerMember]);

  // Filtered rows
  const filteredMatrix = useMemo(() => {
    return memberMatrix.filter((item) => {
      if (filterStatus === 'paid' && !item.isLunas) return false;
      if (filterStatus === 'unpaid' && item.isLunas) return false;
      if (filterRegu !== 'all' && item.member.regu !== filterRegu) return false;
      if (searchMember.trim()) {
        const q = searchMember.toLowerCase();
        return item.member.name.toLowerCase().includes(q) || item.member.regu.toLowerCase().includes(q);
      }
      return true;
    });
  }, [memberMatrix, filterStatus, filterRegu, searchMember]);

  const paidCount = memberMatrix.filter((m) => m.isLunas).length;
  const partialCount = memberMatrix.filter((m) => !m.isLunas && m.totalPaid > 0).length;
  const unpaidCount = memberMatrix.filter((m) => m.totalPaid === 0).length;

  // Generate WhatsApp Recap text
  const generateWAText = () => {
    let text = `⚜️ *REKAPITULASI IURAN RUTIN PRAMUKA* ⚜️\n`;
    text += `*${settings.gudepName}*\n`;
    text += `Pangkalan: ${settings.pangkalan}\n`;
    text += `Periode: *${formatBulanIndo(selectedMonth)}*\n`;
    text += `--------------------------------------\n`;
    text += `💰 Total Kas Terkumpul: *${formatRupiah(totalCollectedMonth)}*\n`;
    text += `🎯 Target Kas Bulanan: ${formatRupiah(targetTotalMonth)}\n`;
    text += `📊 Kepatuhan: *${complianceRate}%*\n`;
    text += `✅ Lunas Penuh: ${paidCount} anggota\n`;
    text += `⚠️ Belum Lunas / Menunggak: ${unpaidCount + partialCount} anggota\n\n`;
    
    text += `*RINCIAN ANGGOTA MENUNGGAK:*\n`;
    const unpaidList = memberMatrix.filter((m) => !m.isLunas);
    if (unpaidList.length === 0) {
      text += `_Alhamdulillah, seluruh anggota telah Lunas 100%!_\n`;
    } else {
      unpaidList.forEach((m, idx) => {
        text += `${idx + 1}. ${m.member.name} (${m.member.regu}) - Kurang: ${formatRupiah(m.kekurangan)}\n`;
      });
    }

    text += `\nBendahara: ${settings.bendaharaName}\n`;
    text += `Pembina: ${settings.pembinaName}\n`;
    text += `_Dicatat otomatis melalui SI-PRAMUKA Spreadsheet Database_`;
    return text;
  };

  const handleCopyWA = () => {
    navigator.clipboard.writeText(generateWAText());
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Month Selector & Action Bar */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-lg text-stone-900">
              Rekapitulasi Pembayaran Bulanan
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            Perhitungan otomatis per-minggu, evaluasi target, dan daftar penunggak iuran
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 bg-stone-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                Periode: {formatBulanIndo(m)}
              </option>
            ))}
          </select>

          {/* Copy WhatsApp Broadcast */}
          <button
            onClick={handleCopyWA}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs transition"
            title="Salin rekap bulanan ke format WhatsApp siap kirim"
          >
            {copiedWA ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWA ? 'Tersalin!' : 'Salin Laporan WA'}</span>
          </button>

          {/* Cetak Rekapan */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Terkumpul */}
        <div className="bg-gradient-to-br from-amber-900 to-stone-900 text-white p-5 rounded-2xl shadow-sm border border-amber-700/40">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Total Iuran Terkumpul
          </span>
          <div className="text-2xl font-black mt-1 text-white">
            {formatRupiah(totalCollectedMonth)}
          </div>
          <div className="text-xs text-amber-200/80 mt-1">
            Dari target: {formatRupiah(targetTotalMonth)}
          </div>
        </div>

        {/* Persentase Capaian */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Capaian Target Bulanan
          </span>
          <div className="text-2xl font-black mt-1 text-stone-900">
            {complianceRate}%
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full ${
                complianceRate >= 80 ? 'bg-emerald-600' : complianceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>

        {/* Anggota Lunas */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Anggota Lunas Penuh (4 Minggu)
          </span>
          <div className="text-2xl font-black mt-1 text-emerald-700">
            {paidCount} <span className="text-sm font-normal text-stone-500">/ {activeMembers.length}</span>
          </div>
          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Memenuhi target iuran 4 latihan</span>
          </div>
        </div>

        {/* Anggota Menunggak */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
            Masih Menunggak
          </span>
          <div className="text-2xl font-black mt-1 text-rose-700">
            {unpaidCount + partialCount} <span className="text-sm font-normal text-stone-500">anggota</span>
          </div>
          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>{unpaidCount} belum bayar sama sekali</span>
          </div>
        </div>
      </div>

      {/* Matrix Table: Breakdown Per Minggu */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 bg-stone-50/80 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterStatus === 'all'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Semua ({memberMatrix.length})
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterStatus === 'paid'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Lunas ({paidCount})
            </button>
            <button
              onClick={() => setFilterStatus('unpaid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterStatus === 'unpaid'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Menunggak ({unpaidCount + partialCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Regu */}
            <select
              value={filterRegu}
              onChange={(e) => setFilterRegu(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs text-stone-800 bg-white font-medium"
            >
              <option value="all">Semua Regu</option>
              {reguList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-stone-300 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* The Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-amber-950 text-amber-100 font-bold uppercase text-[10px] tracking-wider border-b border-amber-900">
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">Nama Anggota</th>
                <th className="p-3">Regu</th>
                <th className="p-3 text-center">Minggu 1</th>
                <th className="p-3 text-center">Minggu 2</th>
                <th className="p-3 text-center">Minggu 3</th>
                <th className="p-3 text-center">Minggu 4</th>
                <th className="p-3 text-right">Total Bayar</th>
                <th className="p-3 text-right">Kekurangan</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-stone-400">
                    Tidak ada data anggota pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((item, idx) => {
                  return (
                    <tr
                      key={item.member.id}
                      className={`hover:bg-amber-50/30 transition ${
                        item.isLunas ? '' : 'bg-rose-50/20'
                      }`}
                    >
                      <td className="p-3 text-center text-stone-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-stone-900 flex items-center gap-1.5">
                          {item.member.name}
                          {item.member.isPinru && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 px-1 rounded font-semibold">
                              Pinru
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          ID: {item.member.id}
                        </div>
                      </td>
                      <td className="p-3 text-amber-900 font-semibold">
                        {item.member.regu}
                      </td>

                      {/* Weeks */}
                      <td className="p-3 text-center">
                        {item.w1 > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {formatRupiah(item.w1)}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {item.w2 > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {formatRupiah(item.w2)}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {item.w3 > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {formatRupiah(item.w3)}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {item.w4 > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {formatRupiah(item.w4)}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="p-3 text-right font-bold text-stone-900 font-mono">
                        {formatRupiah(item.totalPaid)}
                      </td>

                      {/* Kekurangan */}
                      <td className="p-3 text-right font-mono font-semibold">
                        {item.kekurangan > 0 ? (
                          <span className="text-rose-600">
                            {formatRupiah(item.kekurangan)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Rp 0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isLunas
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.totalPaid > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {item.isLunas ? 'Lunas' : item.totalPaid > 0 ? 'Sebagian' : 'Menunggak'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-stone-100 font-bold text-stone-900 border-t-2 border-stone-300">
                <td colSpan={3} className="p-3 text-right uppercase text-[11px]">
                  Total Terkumpul:
                </td>
                <td colSpan={4} className="p-3 text-center font-mono text-emerald-700">
                  {formatRupiah(totalCollectedMonth)}
                </td>
                <td className="p-3 text-right font-mono">
                  {formatRupiah(totalCollectedMonth)}
                </td>
                <td className="p-3 text-right font-mono text-rose-600">
                  {formatRupiah(Math.max(0, targetTotalMonth - totalCollectedMonth))}
                </td>
                <td className="p-3 text-center font-bold text-amber-900">
                  {complianceRate}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Scout Print & Export Preview Modal */}
      <PrintRecapModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        selectedMonth={selectedMonth}
        settings={settings}
        members={members}
        transactions={transactions}
      />
    </div>
  );
};
