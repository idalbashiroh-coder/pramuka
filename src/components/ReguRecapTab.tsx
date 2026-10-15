import React, { useState, useMemo } from 'react';
import {
  Award,
  Users,
  TrendingUp,
  Share2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { GudepSettings, PaymentRecord, ScoutMember } from '../types/scout';
import { formatRupiah, formatBulanIndo } from '../utils/formatters';
import { TunasKelapaIcon } from './ScoutIcons';

interface ReguRecapTabProps {
  members: ScoutMember[];
  transactions: PaymentRecord[];
  settings: GudepSettings;
  selectedMonth: string;
}

export const ReguRecapTab: React.FC<ReguRecapTabProps> = ({
  members,
  transactions,
  settings,
  selectedMonth,
}) => {
  const [expandedRegu, setExpandedRegu] = useState<string | null>(null);
  const [copiedRegu, setCopiedRegu] = useState<string | null>(null);

  // Filter transactions by month
  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.monthPeriod === selectedMonth),
    [transactions, selectedMonth]
  );

  // Group members and calculate regu stats
  const reguSummaries = useMemo(() => {
    const reguNames = Array.from(new Set(members.map((m) => m.regu)));
    const targetPerMeeting = settings.defaultFeePerMeeting;

    return reguNames.map((regu) => {
      const reguMembers = members.filter((m) => m.regu === regu && m.active);
      const pinru = reguMembers.find((m) => m.isPinru);
      const gender = reguMembers[0]?.gender || 'L';

      // Month stats
      const reguMonthTx = monthTransactions.filter((t) => t.regu === regu);
      const totalMonthCollected = reguMonthTx.reduce((acc, t) => acc + t.amount, 0);
      const targetMonthTotal = reguMembers.length * targetPerMeeting * 4;
      const complianceRate = targetMonthTotal > 0
        ? Math.min(100, Math.round((totalMonthCollected / targetMonthTotal) * 100))
        : 0;

      // Paid member count this month
      const paidMemberIds = new Set(reguMonthTx.map((t) => t.memberId));
      const fullyPaidCount = reguMembers.filter((m) => {
        const memTx = reguMonthTx.filter((t) => t.memberId === m.id);
        const sum = memTx.reduce((acc, t) => acc + t.amount, 0);
        return sum >= targetPerMeeting * 4;
      }).length;

      // All-time accumulated stats
      const reguAllTimeTx = transactions.filter((t) => t.regu === regu);
      const totalAllTime = reguAllTimeTx.reduce((acc, t) => acc + t.amount, 0);

      return {
        regu,
        gender,
        pinruName: pinru ? pinru.name : 'Belum Ditunjuk',
        pinruPhone: pinru?.phone,
        memberCount: reguMembers.length,
        members: reguMembers,
        totalMonthCollected,
        targetMonthTotal,
        complianceRate,
        paidMemberCount: paidMemberIds.size,
        fullyPaidCount,
        unpaidCount: reguMembers.length - paidMemberIds.size,
        totalAllTime,
      };
    }).sort((a, b) => b.complianceRate - a.complianceRate || b.totalMonthCollected - a.totalMonthCollected);
  }, [members, monthTransactions, transactions, settings]);

  // Generate WhatsApp message for a specific Regu Pinru
  const generateReguWAMessage = (item: typeof reguSummaries[0]) => {
    let msg = `⚜️ *REKAP IURAN PRAMUKA - ${item.regu.toUpperCase()}* ⚜️\n`;
    msg += `Pangkalan: ${settings.pangkalan}\n`;
    msg += `Periode: *${formatBulanIndo(selectedMonth)}*\n`;
    msg += `Pemimpin Regu (Pinru): *${item.pinruName}*\n`;
    msg += `--------------------------------------\n`;
    msg += `📊 Capaian Regu: *${item.complianceRate}%*\n`;
    msg += `💰 Terkumpul: *${formatRupiah(item.totalMonthCollected)}* / Target: ${formatRupiah(item.targetMonthTotal)}\n`;
    msg += `👥 Anggota Lunas Penuh: ${item.fullyPaidCount} dari ${item.memberCount} orang\n\n`;

    msg += `*STATUS ANGGOTA REGU:*\n`;
    item.members.forEach((m, idx) => {
      const mTx = monthTransactions.filter((t) => t.memberId === m.id);
      const totalPaid = mTx.reduce((acc, t) => acc + t.amount, 0);
      const target = settings.defaultFeePerMeeting * 4;
      const lunas = totalPaid >= target;

      msg += `${idx + 1}. ${m.name} - ${lunas ? '✅ Lunas (' + formatRupiah(totalPaid) + ')' : '⚠️ Kurang ' + formatRupiah(Math.max(0, target - totalPaid))}\n`;
    });

    msg += `\n_Mohon Pinru mengingatkan rekan regunya pada latihan berikutnya. Salam Pramuka!_`;
    return msg;
  };

  const handleCopyReguWA = (item: typeof reguSummaries[0]) => {
    const text = generateReguWAMessage(item);
    navigator.clipboard.writeText(text);
    setCopiedRegu(item.regu);
    setTimeout(() => setCopiedRegu(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-lg text-stone-900">
              Rekapitulasi Pembayaran Pe-Regu (Patrol)
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            Perbandingan tingkat disiplin iuran antar-regu untuk periode {formatBulanIndo(selectedMonth)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            ⚜️ Total Regu: {reguSummaries.length} Regu
          </span>
        </div>
      </div>

      {/* Regu Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reguSummaries.map((item, idx) => {
          const isTop = idx === 0;
          const isExpanded = expandedRegu === item.regu;

          return (
            <div
              key={item.regu}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md overflow-hidden ${
                isTop ? 'border-amber-400 ring-2 ring-amber-300/40' : 'border-stone-200'
              }`}
            >
              {/* Card Banner */}
              <div
                className={`p-4 flex items-center justify-between ${
                  isTop
                    ? 'bg-gradient-to-r from-amber-800 to-amber-900 text-white'
                    : 'bg-stone-900 text-stone-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      isTop
                        ? 'bg-amber-400 text-amber-950'
                        : idx === 1
                        ? 'bg-stone-300 text-stone-900'
                        : idx === 2
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-1.5">
                      {item.regu}
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-normal bg-white/20">
                        {item.gender === 'L' ? 'Putra' : 'Putri'}
                      </span>
                    </h4>
                    <span className="text-[11px] text-stone-300">
                      Pinru: {item.pinruName}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black">
                    {item.complianceRate}%
                  </span>
                  <div className="text-[10px] text-stone-300">Disiplin</div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Capaian Bulan Ini</span>
                    <span className="font-semibold text-stone-800">
                      {formatRupiah(item.totalMonthCollected)} / {formatRupiah(item.targetMonthTotal)}
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        item.complianceRate >= 80
                          ? 'bg-emerald-500'
                          : item.complianceRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.complianceRate}%` }}
                    />
                  </div>
                </div>

                {/* Micro Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 block">Anggota Lunas</span>
                    <span className="font-bold text-emerald-700">
                      {item.fullyPaidCount} dari {item.memberCount} org
                    </span>
                  </div>
                  <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 block">Akumulasi Kas</span>
                    <span className="font-bold text-stone-800 font-mono">
                      {formatRupiah(item.totalAllTime)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                  <button
                    onClick={() => handleCopyReguWA(item)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1.5 transition"
                    title="Kirim rincian tagihan regu ke Pinru lewat WhatsApp"
                  >
                    {copiedRegu === item.regu ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Tagihan Pinru</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setExpandedRegu(isExpanded ? null : item.regu)}
                    className="py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1 transition"
                  >
                    <span>Rincian</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Accordion Detail Member List */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-stone-200 space-y-1.5 animate-fadeIn">
                    <span className="text-[11px] font-bold text-stone-600 block">
                      Daftar Anggota {item.regu}:
                    </span>
                    {item.members.map((m) => {
                      const mTx = monthTransactions.filter((t) => t.memberId === m.id);
                      const mPaid = mTx.reduce((s, t) => s + t.amount, 0);
                      const isLunas = mPaid >= settings.defaultFeePerMeeting * 4;

                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-stone-50"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-medium text-stone-800 truncate">
                              {m.name}
                            </span>
                            {m.isPinru && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-bold">
                                Pinru
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-mono text-[11px] font-bold shrink-0 ${
                              isLunas ? 'text-emerald-700' : mPaid > 0 ? 'text-amber-700' : 'text-rose-600'
                            }`}
                          >
                            {formatRupiah(mPaid)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparative Matrix Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <h4 className="font-bold text-sm text-stone-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-700" />
            <span>Matriks Evaluasi Kedisiplinan Regu ({formatBulanIndo(selectedMonth)})</span>
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-900 text-stone-200 uppercase text-[10px] font-bold tracking-wider">
                <th className="p-3 text-center w-12">Peringkat</th>
                <th className="p-3">Nama Regu</th>
                <th className="p-3">Satuan</th>
                <th className="p-3">Pemimpin Regu</th>
                <th className="p-3 text-center">Jumlah Anggota</th>
                <th className="p-3 text-right">Target Iuran</th>
                <th className="p-3 text-right">Terkumpul Bulan Ini</th>
                <th className="p-3 text-center">Tingkat Kepatuhan</th>
                <th className="p-3 text-right">Total Akumulasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {reguSummaries.map((r, idx) => (
                <tr key={r.regu} className="hover:bg-amber-50/20 transition">
                  <td className="p-3 text-center font-bold text-stone-600">
                    #{idx + 1}
                  </td>
                  <td className="p-3 font-bold text-stone-900">
                    {r.regu}
                  </td>
                  <td className="p-3 text-stone-500">
                    {r.gender === 'L' ? 'Putra' : 'Putri'}
                  </td>
                  <td className="p-3 text-stone-700">
                    {r.pinruName}
                  </td>
                  <td className="p-3 text-center font-mono">
                    {r.memberCount} orang
                  </td>
                  <td className="p-3 text-right font-mono text-stone-500">
                    {formatRupiah(r.targetMonthTotal)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-stone-900">
                    {formatRupiah(r.totalMonthCollected)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        r.complianceRate >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.complianceRate >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.complianceRate}%
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700">
                    {formatRupiah(r.totalAllTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
