import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  FileText,
  Trash2,
  Calendar,
  Banknote,
  QrCode,
  Share2,
} from 'lucide-react';
import { PaymentRecord, GudepSettings } from '../types/scout';
import { formatRupiah, formatTanggalIndo, formatBulanIndo } from '../utils/formatters';

interface TransactionsTabProps {
  transactions: PaymentRecord[];
  settings: GudepSettings;
  onOpenReceipt: (tx: PaymentRecord) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  settings,
  onOpenReceipt,
  onDeleteTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterRegu, setFilterRegu] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');

  const monthList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.monthPeriod));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const reguList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.regu));
    return Array.from(set).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterMonth !== 'all' && t.monthPeriod !== filterMonth) return false;
      if (filterRegu !== 'all' && t.regu !== filterRegu) return false;
      if (filterMethod !== 'all' && t.paymentMethod !== filterMethod) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.memberName.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.regu.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, filterMonth, filterRegu, filterMethod, search]);

  const totalFilteredAmount = useMemo(
    () => filteredTransactions.reduce((acc, t) => acc + t.amount, 0),
    [filteredTransactions]
  );

  const [confirmDeleteTx, setConfirmDeleteTx] = useState<PaymentRecord | null>(null);

  const handleDelete = (tx: PaymentRecord) => {
    setConfirmDeleteTx(tx);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteTx) {
      await onDeleteTransaction(confirmDeleteTx.id);
      setConfirmDeleteTx(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-lg text-stone-900">
              Riwayat Transaksi Iuran Latihan
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            Daftar lengkap seluruh pembayaran yang masuk ke kas pramuka
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 text-xs">
          <span className="text-stone-600 font-medium">Total Terfilter:</span>
          <span className="font-bold text-amber-950 font-mono text-sm">
            {formatRupiah(totalFilteredAmount)}
          </span>
          <span className="text-stone-400">({filteredTransactions.length} transaksi)</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* Periode */}
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs bg-stone-50 font-medium"
        >
          <option value="all">Semua Periode Bulan</option>
          {monthList.map((m) => (
            <option key={m} value={m}>
              {formatBulanIndo(m)}
            </option>
          ))}
        </select>

        {/* Regu */}
        <select
          value={filterRegu}
          onChange={(e) => setFilterRegu(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs bg-stone-50 font-medium"
        >
          <option value="all">Semua Regu</option>
          {reguList.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* Metode */}
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs bg-stone-50 font-medium"
        >
          <option value="all">Semua Metode Bayar</option>
          <option value="Tunai">Tunai</option>
          <option value="QRIS">QRIS</option>
          <option value="Transfer">Transfer</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-900 text-stone-200 uppercase text-[10px] font-bold tracking-wider">
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">ID Transaksi</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Minggu Ke</th>
                <th className="p-3">Nama Anggota</th>
                <th className="p-3">Regu</th>
                <th className="p-3 text-right">Nominal</th>
                <th className="p-3 text-center">Metode</th>
                <th className="p-3">Pencatat</th>
                <th className="p-3 text-center">Kuitansi</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-stone-400">
                    Tidak ada riwayat transaksi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={`${tx.id}-${idx}`} className="hover:bg-amber-50/20 transition">
                    <td className="p-3 text-center text-stone-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="p-3 font-mono text-stone-500 font-semibold">
                      {tx.id}
                    </td>
                    <td className="p-3 text-stone-700 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px]">
                        Minggu {tx.weekNumber}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-stone-900">
                      {tx.memberName}
                    </td>
                    <td className="p-3 font-semibold text-amber-900">
                      {tx.regu}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-stone-900">
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {tx.paymentMethod === 'Tunai' ? (
                          <Banknote className="w-3 h-3 text-amber-700" />
                        ) : tx.paymentMethod === 'QRIS' ? (
                          <QrCode className="w-3 h-3 text-blue-700" />
                        ) : (
                          <Share2 className="w-3 h-3 text-emerald-700" />
                        )}
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 text-stone-500 text-[11px]">
                      {tx.loggedBy}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onOpenReceipt(tx)}
                        className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-amber-900 hover:border-amber-400 transition"
                        title="Buka Kuitansi"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDelete(tx)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Transaksi */}
      {confirmDeleteTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-stone-900 text-base">Hapus Catatan Iuran?</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus transaksi <strong>{confirmDeleteTx.id}</strong> atas nama{' '}
                  <strong>{confirmDeleteTx.memberName}</strong> ({formatRupiah(confirmDeleteTx.amount)})?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setConfirmDeleteTx(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
              >
                Ya, Hapus Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
