import React, { useState } from 'react';
import { X, Printer, Share2, Copy, Check, Download, ShieldCheck } from 'lucide-react';
import { GudepSettings, PaymentRecord } from '../types/scout';
import { formatRupiah, formatTanggalIndo, formatBulanIndo, terbilang } from '../utils/formatters';
import { TunasKelapaIcon, WosmIcon } from './ScoutIcons';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PaymentRecord | null;
  settings: GudepSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  settings,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  const generateReceiptText = () => {
    let t = `⚜️ *BUKTI PEMBAYARAN IURAN PRAMUKA* ⚜️\n`;
    t += `No. Bukti: *${record.id}*\n`;
    t += `Gugus Depan: ${settings.gudepName}\n`;
    t += `Pangkalan: ${settings.pangkalan}\n`;
    t += `------------------------------------\n`;
    t += `Telah terima dari: *${record.memberName}*\n`;
    t += `Regu: *${record.regu}*\n`;
    t += `Jumlah: *${formatRupiah(record.amount)}*\n`;
    t += `Terbilang: _${terbilang(record.amount)}_\n`;
    t += `Untuk: Iuran Rutin Latihan Minggu ke-${record.weekNumber} (${formatBulanIndo(record.monthPeriod)})\n`;
    t += `Metode: ${record.paymentMethod}\n`;
    t += `Tanggal: ${formatTanggalIndo(record.date)}\n`;
    t += `Pencatat: ${record.loggedBy}\n`;
    t += `------------------------------------\n`;
    t += `_Status: LUNAS & TERCATAT RESMI_ ⚜️`;
    return t;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateReceiptText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200">
        {/* Header bar */}
        <div className="bg-stone-900 px-4 py-3 text-stone-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Tanda Terima Resmi
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="receipt-paper" className="p-6 bg-amber-50/20 text-stone-900 border-b border-stone-200 font-sans">
          {/* Letterhead */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-stone-800">
            <div className="w-12 h-12 rounded-xl bg-amber-900 text-amber-100 flex items-center justify-center shadow-xs">
              <TunasKelapaIcon className="w-8 h-8" />
            </div>

            <div className="text-center flex-1 px-2">
              <div className="text-[10px] font-bold tracking-widest uppercase text-stone-600">
                GERAKAN PRAMUKA INDONESIA
              </div>
              <div className="text-sm font-extrabold text-stone-900 uppercase">
                {settings.gudepName}
              </div>
              <div className="text-[11px] font-medium text-stone-600">
                {settings.pangkalan}
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-violet-900 text-amber-100 flex items-center justify-center shadow-xs">
              <WosmIcon className="w-6 h-6" />
            </div>
          </div>

          {/* Receipt Title */}
          <div className="text-center my-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-950 inline-block border-b border-amber-900 pb-0.5">
              KUITANSI IURAN LATIHAN RUTIN
            </h4>
            <div className="text-[10px] font-mono text-stone-500 mt-1">
              Nomor: {record.id}
            </div>
          </div>

          {/* Receipt Details Fields */}
          <div className="space-y-2 text-xs">
            <div className="flex py-1 border-b border-stone-200">
              <span className="w-32 text-stone-500">Telah Terima Dari</span>
              <span className="font-bold text-stone-900 flex-1">
                : {record.memberName}
              </span>
            </div>

            <div className="flex py-1 border-b border-stone-200">
              <span className="w-32 text-stone-500">Regu / Satuan</span>
              <span className="font-semibold text-amber-900 flex-1">
                : {record.regu}
              </span>
            </div>

            <div className="flex py-1 border-b border-stone-200">
              <span className="w-32 text-stone-500">Uang Sejumlah</span>
              <span className="font-black text-emerald-800 text-sm flex-1 font-mono">
                : {formatRupiah(record.amount)}
              </span>
            </div>

            <div className="flex py-1 border-b border-stone-200 bg-amber-50/60 px-2 rounded">
              <span className="w-32 text-stone-500 italic">Terbilang</span>
              <span className="italic font-medium text-stone-700 flex-1 capitalize">
                : {terbilang(record.amount)}
              </span>
            </div>

            <div className="flex py-1 border-b border-stone-200">
              <span className="w-32 text-stone-500">Untuk Pembayaran</span>
              <span className="text-stone-800 flex-1">
                : Iuran Rutin Minggu ke-{record.weekNumber} ({formatBulanIndo(record.monthPeriod)})
              </span>
            </div>

            <div className="flex py-1 border-b border-stone-200">
              <span className="w-32 text-stone-500">Metode Bayar</span>
              <span className="font-semibold text-stone-800 flex-1">
                : {record.paymentMethod}
              </span>
            </div>

            <div className="flex py-1 border-b border-stone-200">
              <span className="w-32 text-stone-500">Tanggal Transaksi</span>
              <span className="text-stone-800 flex-1">
                : {formatTanggalIndo(record.date)}
              </span>
            </div>
          </div>

          {/* Signatures & Scout Stamp */}
          <div className="flex items-center justify-between pt-5 mt-3 text-center text-xs">
            <div>
              <div className="text-[10px] text-stone-400">Penyetor (Anggota)</div>
              <div className="h-10"></div>
              <div className="font-semibold text-stone-800 underline">
                {record.memberName}
              </div>
            </div>

            {/* Scout Stamp */}
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-800/50 flex flex-col items-center justify-center p-1 text-[9px] text-amber-900 rotate-[-8deg] opacity-80">
              <TunasKelapaIcon className="w-5 h-5 text-amber-800" />
              <span className="font-black">LUNAS</span>
              <span className="text-[7px]">SI-PRAMUKA</span>
            </div>

            <div>
              <div className="text-[10px] text-stone-400">Bendahara Satuan</div>
              <div className="h-10"></div>
              <div className="font-semibold text-stone-800 underline">
                {settings.bendaharaName || record.loggedBy}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-stone-50 flex items-center justify-between gap-2">
          <button
            onClick={handleCopyText}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin Format WA'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kuitansi</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-200 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
