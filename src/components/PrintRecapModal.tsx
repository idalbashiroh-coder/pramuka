import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  X,
  FileSpreadsheet,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { GudepSettings, PaymentRecord, ScoutMember } from '../types/scout';
import { formatRupiah, formatBulanIndo, formatTanggalIndo } from '../utils/formatters';
import { TunasKelapaIcon, WosmIcon } from './ScoutIcons';

interface PrintRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  settings: GudepSettings;
  members: ScoutMember[];
  transactions: PaymentRecord[];
}

export const PrintRecapModal: React.FC<PrintRecapModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  settings,
  members,
  transactions,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Active members
  const activeMembers = useMemo(
    () => members.filter((m) => m.active).sort((a, b) => a.regu.localeCompare(b.regu) || a.name.localeCompare(b.name)),
    [members]
  );

  // Transactions for selected month
  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.monthPeriod === selectedMonth),
    [transactions, selectedMonth]
  );

  // Fee calculation (4 regular meetings expected per month)
  const targetPerMeeting = settings.defaultFeePerMeeting || 5000;
  const targetPerMember = targetPerMeeting * 4;
  const targetTotalMonth = activeMembers.length * targetPerMember;
  const totalCollectedMonth = monthTransactions.reduce((acc, t) => acc + t.amount, 0);
  const complianceRate =
    targetTotalMonth > 0
      ? Math.min(100, Math.round((totalCollectedMonth / targetTotalMonth) * 100))
      : 0;

  // Breakdown for each member
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

  // Aggregate stats
  const totalW1 = memberMatrix.reduce((s, m) => s + m.w1, 0);
  const totalW2 = memberMatrix.reduce((s, m) => s + m.w2, 0);
  const totalW3 = memberMatrix.reduce((s, m) => s + m.w3, 0);
  const totalW4 = memberMatrix.reduce((s, m) => s + m.w4, 0);
  const totalW5 = memberMatrix.reduce((s, m) => s + m.w5, 0);
  const totalKekurangan = memberMatrix.reduce((s, m) => s + m.kekurangan, 0);

  const paidCount = memberMatrix.filter((m) => m.isLunas).length;
  const partialCount = memberMatrix.filter((m) => !m.isLunas && m.totalPaid > 0).length;
  const unpaidCount = memberMatrix.filter((m) => m.totalPaid === 0).length;

  if (!isOpen) return null;

  // Print Action
  const handleTriggerPrint = () => {
    // Attempt standard window.print()
    try {
      window.print();
    } catch (e) {
      console.warn('Direct print invocation error:', e);
    }
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = [
      'No',
      'ID Anggota',
      'Nama Anggota',
      'Regu',
      'Tingkatan',
      'Minggu 1',
      'Minggu 2',
      'Minggu 3',
      'Minggu 4',
      'Minggu 5',
      'Total Terkumpul',
      'Tunggakan/Kekurangan',
      'Status',
    ];

    const rows = memberMatrix.map((item, idx) => [
      idx + 1,
      `"${item.member.id}"`,
      `"${item.member.name}"`,
      `"${item.member.regu}"`,
      `"${item.member.level}"`,
      item.w1,
      item.w2,
      item.w3,
      item.w4,
      item.w5,
      item.totalPaid,
      item.kekurangan,
      `"${item.status}"`,
    ]);

    // Footer summary row
    rows.push([
      '',
      '',
      '"TOTAL KESELURUHAN"',
      '',
      '',
      totalW1,
      totalW2,
      totalW3,
      totalW4,
      totalW5,
      totalCollectedMonth,
      totalKekurangan,
      `"${complianceRate}% Kepatuhan"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekap_Iuran_Pramuka_${selectedMonth}_${settings.pangkalan.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy structured text report
  const handleCopyTextReport = () => {
    let text = `⚜️ *LAPORAN REKAPITULASI IURAN KAS PRAMUKA* ⚜️\n`;
    text += `*${settings.gudepName}*\n`;
    text += `Pangkalan: ${settings.pangkalan}\n`;
    text += `Periode: *${formatBulanIndo(selectedMonth)}*\n`;
    text += `=====================================\n`;
    text += `💰 Total Kas Terkumpul : *${formatRupiah(totalCollectedMonth)}*\n`;
    text += `🎯 Target Kas Bulanan  : ${formatRupiah(targetTotalMonth)}\n`;
    text += `📊 Persentase Kepatuhan: *${complianceRate}%*\n`;
    text += `✅ Anggota Lunas Penuh : ${paidCount} dari ${activeMembers.length} anggota\n`;
    text += `⚠️ Masih Menunggak     : ${partialCount + unpaidCount} anggota\n`;
    text += `=====================================\n\n`;

    text += `*DAFTAR RINCIAN STATUS ANGGOTA:*\n`;
    memberMatrix.forEach((m, idx) => {
      text += `${idx + 1}. ${m.member.name} (${m.member.regu}) - Masuk: ${formatRupiah(m.totalPaid)} | Sisa: ${formatRupiah(m.kekurangan)} [${m.status}]\n`;
    });

    text += `\nMengetahui,\n`;
    text += `Pembina Gudep   : ${settings.pembinaName}\n`;
    text += `Bendahara Gudep : ${settings.bendaharaName}\n`;
    text += `_Dicetak melalui SI-PRAMUKA Web App_`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const todayStr = formatTanggalIndo(new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto">
      {/* Inject print-specific styling so that only the printable sheet is rendered during print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-recap-sheet, #printable-recap-sheet * {
            visibility: visible !important;
          }
          #printable-recap-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-scaleIn">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print bg-stone-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-stone-100 flex items-center gap-2">
                <span>Pratinjau Cetak Rekapitulasi Iuran</span>
                <span className="text-[10px] font-mono bg-stone-800 text-amber-400 px-2 py-0.5 rounded-full border border-stone-700">
                  {formatBulanIndo(selectedMonth)}
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Format resmi surat dan tabel rekapitulasi siap cetak / simpan PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Print Button */}
            <button
              onClick={handleTriggerPrint}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              title="Cetak langsung atau simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang (PDF)</span>
            </button>

            {/* CSV Export Button */}
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-stone-700 font-semibold text-xs flex items-center gap-1.5 transition"
              title="Unduh data dalam format CSV untuk Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>

            {/* Copy Text Button */}
            <button
              onClick={handleCopyTextReport}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-semibold text-xs flex items-center gap-1.5 transition"
              title="Salin rekapitulasi teks untuk WhatsApp"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin WA</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-stone-100 flex justify-center">
          <div
            id="printable-recap-sheet"
            ref={printAreaRef}
            className="bg-white w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-lg rounded-xl border border-stone-300 text-stone-900 font-sans space-y-6"
          >
            {/* KOP SURAT RESMI PRAMUKA */}
            <div className="border-b-4 border-double border-stone-900 pb-3">
              <div className="flex items-center justify-between gap-4">
                {/* Logo Gerakan Pramuka */}
                <div className="w-14 h-14 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center shrink-0 shadow-xs">
                  <TunasKelapaIcon className="w-9 h-9" />
                </div>

                {/* Letterhead Text */}
                <div className="text-center flex-1">
                  <h4 className="text-xs font-bold tracking-widest text-stone-700 uppercase">
                    GERAKAN PRAMUKA INDONESIA
                  </h4>
                  <h2 className="text-base sm:text-lg font-black text-stone-950 uppercase tracking-tight">
                    {settings.gudepName}
                  </h2>
                  <h3 className="text-xs sm:text-sm font-bold text-amber-900 uppercase">
                    PANGKALAN {settings.pangkalan}
                  </h3>
                  <p className="text-[10px] text-stone-600 mt-0.5">
                    Latihan Rutin: {settings.meetingDay} • Sistem Informasi Kas Pramuka (SI-PRAMUKA)
                  </p>
                </div>

                {/* Logo WOSM */}
                <div className="w-12 h-12 rounded-full bg-violet-900 text-amber-100 flex items-center justify-center shrink-0 shadow-xs">
                  <WosmIcon className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Document Title & Period */}
            <div className="text-center space-y-1">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-stone-900 underline underline-offset-4 decoration-amber-700">
                LAPORAN REKAPITULASI IURAN KAS PRAMUKA
              </h3>
              <p className="text-xs font-semibold text-stone-600">
                Periode Bulan: <span className="text-amber-900 font-bold">{formatBulanIndo(selectedMonth)}</span>
              </p>
            </div>

            {/* Executive Financial Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="border border-stone-300 rounded-xl p-2.5 bg-stone-50">
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">
                  Target Kas Bulanan
                </span>
                <span className="text-sm font-bold text-stone-900 block mt-0.5">
                  {formatRupiah(targetTotalMonth)}
                </span>
                <span className="text-[9px] text-stone-500">
                  {activeMembers.length} anggota × 4 latihan
                </span>
              </div>

              <div className="border border-emerald-300 rounded-xl p-2.5 bg-emerald-50/60">
                <span className="text-[10px] text-emerald-800 uppercase font-semibold block">
                  Total Kas Terkumpul
                </span>
                <span className="text-sm font-black text-emerald-900 block mt-0.5">
                  {formatRupiah(totalCollectedMonth)}
                </span>
                <span className="text-[9px] text-emerald-700 font-semibold">
                  Capaian: {complianceRate}%
                </span>
              </div>

              <div className="border border-stone-300 rounded-xl p-2.5 bg-stone-50">
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">
                  Anggota Lunas Penuh
                </span>
                <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                  {paidCount} <span className="text-[10px] font-normal text-stone-500">/ {activeMembers.length}</span>
                </span>
                <span className="text-[9px] text-stone-500">
                  {Math.round((paidCount / (activeMembers.length || 1)) * 100)}% personel
                </span>
              </div>

              <div className="border border-amber-300 rounded-xl p-2.5 bg-amber-50/60">
                <span className="text-[10px] text-amber-900 uppercase font-semibold block">
                  Sisa Tunggakan
                </span>
                <span className="text-sm font-black text-amber-950 block mt-0.5">
                  {formatRupiah(totalKekurangan)}
                </span>
                <span className="text-[9px] text-amber-800 font-medium">
                  {partialCount + unpaidCount} anggota belum lunas
                </span>
              </div>
            </div>

            {/* Rekapitulasi Table */}
            <div className="overflow-x-auto border border-stone-300 rounded-xl">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="bg-stone-800 text-stone-100 uppercase text-[9px] tracking-wider text-center">
                    <th className="py-2 px-2 border-r border-stone-700 w-8">No</th>
                    <th className="py-2 px-2 border-r border-stone-700 text-left">Nama Anggota</th>
                    <th className="py-2 px-2 border-r border-stone-700 text-left w-24">Regu</th>
                    <th className="py-2 px-1 border-r border-stone-700 w-14">M-1</th>
                    <th className="py-2 px-1 border-r border-stone-700 w-14">M-2</th>
                    <th className="py-2 px-1 border-r border-stone-700 w-14">M-3</th>
                    <th className="py-2 px-1 border-r border-stone-700 w-14">M-4</th>
                    <th className="py-2 px-1 border-r border-stone-700 w-14">M-5</th>
                    <th className="py-2 px-2 border-r border-stone-700 text-right w-20">Total</th>
                    <th className="py-2 px-2 border-r border-stone-700 text-right w-20">Sisa</th>
                    <th className="py-2 px-2 w-20">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {memberMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-6 text-center text-stone-400 italic">
                        Tidak ada data anggota aktif pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    memberMatrix.map((item, index) => (
                      <tr
                        key={item.member.id}
                        className={index % 2 === 1 ? 'bg-stone-50/70' : 'bg-white'}
                      >
                        <td className="py-1.5 px-2 text-center text-stone-500 border-r border-stone-200 font-mono text-[10px]">
                          {index + 1}
                        </td>
                        <td className="py-1.5 px-2 border-r border-stone-200 font-semibold text-stone-900">
                          {item.member.name}
                          {item.member.isPinru && (
                            <span className="text-[9px] font-bold text-amber-700 ml-1">
                              (Pinru)
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 border-r border-stone-200 text-stone-700">
                          {item.member.regu}
                        </td>
                        <td className="py-1.5 px-1 text-center border-r border-stone-200 font-mono text-[10px]">
                          {item.w1 > 0 ? formatRupiah(item.w1) : '-'}
                        </td>
                        <td className="py-1.5 px-1 text-center border-r border-stone-200 font-mono text-[10px]">
                          {item.w2 > 0 ? formatRupiah(item.w2) : '-'}
                        </td>
                        <td className="py-1.5 px-1 text-center border-r border-stone-200 font-mono text-[10px]">
                          {item.w3 > 0 ? formatRupiah(item.w3) : '-'}
                        </td>
                        <td className="py-1.5 px-1 text-center border-r border-stone-200 font-mono text-[10px]">
                          {item.w4 > 0 ? formatRupiah(item.w4) : '-'}
                        </td>
                        <td className="py-1.5 px-1 text-center border-r border-stone-200 font-mono text-[10px]">
                          {item.w5 > 0 ? formatRupiah(item.w5) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-stone-200 font-bold text-stone-900 font-mono text-[10px]">
                          {formatRupiah(item.totalPaid)}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-stone-200 font-mono text-[10px] text-rose-700">
                          {item.kekurangan > 0 ? formatRupiah(item.kekurangan) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-center text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                              item.isLunas
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.totalPaid > 0
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-200 text-stone-900 font-bold text-[10px] border-t-2 border-stone-400">
                    <td colSpan={3} className="py-2 px-3 text-right uppercase border-r border-stone-300">
                      Total Kas Masuk
                    </td>
                    <td className="py-2 px-1 text-center border-r border-stone-300 font-mono">
                      {formatRupiah(totalW1)}
                    </td>
                    <td className="py-2 px-1 text-center border-r border-stone-300 font-mono">
                      {formatRupiah(totalW2)}
                    </td>
                    <td className="py-2 px-1 text-center border-r border-stone-300 font-mono">
                      {formatRupiah(totalW3)}
                    </td>
                    <td className="py-2 px-1 text-center border-r border-stone-300 font-mono">
                      {formatRupiah(totalW4)}
                    </td>
                    <td className="py-2 px-1 text-center border-r border-stone-300 font-mono">
                      {formatRupiah(totalW5)}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-stone-300 font-mono font-black text-emerald-900">
                      {formatRupiah(totalCollectedMonth)}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-stone-300 font-mono text-rose-900">
                      {formatRupiah(totalKekurangan)}
                    </td>
                    <td className="py-2 px-2 text-center text-stone-800">
                      {complianceRate}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Official Signatures Section (Lembar Pengesahan) */}
            <div className="pt-4 text-xs">
              <div className="flex justify-between items-start">
                <div className="text-left w-64">
                  <p className="text-stone-500">Mengetahui,</p>
                  <p className="font-bold text-stone-900">Pembina Gugus Depan</p>
                  <div className="h-16 flex items-end">
                    <div className="border-b border-stone-800 w-48"></div>
                  </div>
                  <p className="font-bold text-stone-900 mt-1 uppercase">
                    {settings.pembinaName || '(Nama Pembina)'}
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">
                    NTA / NIP Pembina
                  </p>
                </div>

                <div className="text-right w-64">
                  <p className="text-stone-600">
                    {settings.pangkalan}, {todayStr}
                  </p>
                  <p className="font-bold text-stone-900">Bendahara Gugus Depan</p>
                  <div className="h-16 flex items-end justify-end">
                    <div className="border-b border-stone-800 w-48"></div>
                  </div>
                  <p className="font-bold text-stone-900 mt-1 uppercase">
                    {settings.bendaharaName || '(Nama Bendahara)'}
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">
                    NTA / NIP Bendahara
                  </p>
                </div>
              </div>

              <div className="text-center text-[9px] text-stone-400 mt-6 pt-3 border-t border-stone-200">
                Dokumen ini digenerate secara otomatis oleh SI-PRAMUKA • Sistem Informasi Iuran Kas Gugus Depan Berbasis Google Spreadsheet
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
