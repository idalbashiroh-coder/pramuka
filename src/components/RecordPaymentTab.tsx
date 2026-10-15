import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Filter,
  Search,
  Users,
  QrCode,
  FileText,
  Sparkles,
  AlertCircle,
  Plus,
  Send,
  X,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GudepSettings, PaymentMethod, PaymentRecord, ScoutMember } from '../types/scout';
import { formatRupiah, formatTanggalIndo, formatBulanIndo } from '../utils/formatters';

interface RecordPaymentTabProps {
  members: ScoutMember[];
  transactions: PaymentRecord[];
  settings: GudepSettings;
  onAddPayment: (record: Omit<PaymentRecord, 'id' | 'timestamp'>) => Promise<PaymentRecord>;
  onBatchPayRegu: (
    reguName: string,
    date: string,
    weekNumber: number,
    amount: number,
    method: PaymentMethod,
    selectedMemberIds?: string[]
  ) => Promise<void>;
  onOpenReceipt: (transaction: PaymentRecord) => void;
}

export const RecordPaymentTab: React.FC<RecordPaymentTabProps> = ({
  members,
  transactions,
  settings,
  onAddPayment,
  onBatchPayRegu,
  onOpenReceipt,
}) => {
  // Practice session state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  
  // Calculate default week of month (1..5)
  const calculateWeekNumber = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    return Math.min(5, Math.ceil(day / 7));
  };

  const [weekNumber, setWeekNumber] = useState<number>(calculateWeekNumber(selectedDate));
  const [selectedReguFilter, setSelectedReguFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [customAmount, setCustomAmount] = useState<number>(settings.defaultFeePerMeeting);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  // In-App Modal state for "Bayar 1 Regu Sekaligus"
  const [batchModalRegu, setBatchModalRegu] = useState<string | null>(null);
  const [batchModalAmount, setBatchModalAmount] = useState<number>(settings.defaultFeePerMeeting);
  const [batchModalMethod, setBatchModalMethod] = useState<PaymentMethod>('Tunai');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Month period derived from date: YYYY-MM
  const monthPeriod = selectedDate.slice(0, 7);

  // Get distinct list of regus
  const reguList = Array.from(new Set(members.map((m) => m.regu)));

  // Filter members
  const filteredMembers = members.filter((m) => {
    if (!m.active) return false;
    if (selectedReguFilter !== 'all' && m.regu !== selectedReguFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.regu.toLowerCase().includes(q);
    }
    return true;
  });

  // Check which members have paid for this specific date / week
  const paidMap = React.useMemo(() => {
    const map = new Map<string, PaymentRecord>();
    transactions.forEach((t) => {
      if (t.monthPeriod === monthPeriod && t.weekNumber === weekNumber) {
        map.set(t.memberId, t);
      }
    });
    return map;
  }, [transactions, monthPeriod, weekNumber]);

  // Handle single payment
  const handleSinglePayment = async (member: ScoutMember, amountToPay: number) => {
    setIsSubmitting(member.id);
    try {
      const record = await onAddPayment({
        memberId: member.id,
        memberName: member.name,
        regu: member.regu,
        date: selectedDate,
        monthPeriod,
        weekNumber,
        amount: amountToPay,
        paymentMethod,
        note: `Iuran Rutin Latihan Minggu ${weekNumber}`,
        loggedBy: settings.bendaharaName || 'Bendahara',
      });

      // Open receipt automatically
      onOpenReceipt(record);
    } catch (err) {
      console.warn('Payment recording notice:', err);
    } finally {
      setIsSubmitting(null);
    }
  };

  // Open batch modal for a specific regu
  const handleOpenBatchModal = (reguName: string) => {
    setBatchModalRegu(reguName);
    setBatchModalAmount(customAmount || settings.defaultFeePerMeeting);
    setBatchModalMethod(paymentMethod);
    setBatchError(null);
    const unpaid = members.filter(
      (m) => m.active && m.regu === reguName && !paidMap.has(m.id)
    );
    setSelectedMemberIds(unpaid.map((m) => m.id));
  };

  // Switch regu inside modal
  const handleSwitchModalRegu = (newRegu: string) => {
    setBatchModalRegu(newRegu);
    setBatchError(null);
    const unpaid = members.filter(
      (m) => m.active && m.regu === newRegu && !paidMap.has(m.id)
    );
    setSelectedMemberIds(unpaid.map((m) => m.id));
  };

  // Toggle individual member in batch modal
  const handleToggleMemberSelect = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  // Select all unpaid in current modal regu
  const handleSelectAllInModal = () => {
    const unpaid = members.filter(
      (m) => m.active && m.regu === batchModalRegu && !paidMap.has(m.id)
    );
    setSelectedMemberIds(unpaid.map((m) => m.id));
  };

  // Deselect all
  const handleDeselectAllInModal = () => {
    setSelectedMemberIds([]);
  };

  // Execute batch payment from the modal
  const handleConfirmBatchPayment = async () => {
    if (!batchModalRegu) return;

    if (selectedMemberIds.length === 0) {
      setBatchError('Silakan centang minimal 1 anggota yang akan disetorkan iurannya.');
      return;
    }

    setIsSubmitting(`batch-${batchModalRegu}`);
    setBatchError(null);
    try {
      await onBatchPayRegu(
        batchModalRegu,
        selectedDate,
        weekNumber,
        batchModalAmount,
        batchModalMethod,
        selectedMemberIds
      );

      // Trigger celebration confetti
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#ca8a04', '#15803d', '#dc2626', '#1e40af'],
      });

      setBatchModalRegu(null);
    } catch (err: any) {
      console.warn('Batch payment notice:', err);
      setBatchError(err?.message || 'Gagal memproses setoran regu.');
    } finally {
      setIsSubmitting(null);
    }
  };

  const totalMembersFiltered = filteredMembers.length;
  const paidMembersCount = filteredMembers.filter((m) => paidMap.has(m.id)).length;
  const isAllPaid = totalMembersFiltered > 0 && paidMembersCount === totalMembersFiltered;

  // Unpaid members in currently selected regu
  const unpaidMembersInSelectedRegu = React.useMemo(() => {
    if (selectedReguFilter === 'all') return [];
    return members.filter(
      (m) => m.active && m.regu === selectedReguFilter && !paidMap.has(m.id)
    );
  }, [members, selectedReguFilter, paidMap]);

  // Unpaid members in modal's target regu
  const unpaidMembersInModalRegu = React.useMemo(() => {
    if (!batchModalRegu) return [];
    return members.filter(
      (m) => m.active && m.regu === batchModalRegu && !paidMap.has(m.id)
    );
  }, [members, batchModalRegu, paidMap]);

  const batchModalTotal = selectedMemberIds.length * batchModalAmount;

  return (
    <div className="space-y-6">
      {/* Session Controls Card */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-amber-700" />
              <span>Pencatatan Iuran Latihan Rutin</span>
            </h3>
            <p className="text-xs text-stone-500">
              Pilih tanggal latihan & catat iuran tunai atau non-tunai secara cepat per-regu
            </p>
          </div>

          {/* Quick Session Stats & Batch Pay Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200/60 text-xs">
              <span className="text-stone-600 font-medium">Status Minggu Ke-{weekNumber}:</span>
              <span className="font-bold text-amber-900">
                {paidMembersCount} / {totalMembersFiltered} Lunas
              </span>
              {isAllPaid && (
                <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-3 h-3" /> 100%
                </span>
              )}
            </div>

            {/* Quick Batch Trigger Button */}
            <button
              onClick={() => {
                const targetRegu =
                  selectedReguFilter !== 'all'
                    ? selectedReguFilter
                    : reguList.find((r) =>
                        members.some((m) => m.active && m.regu === r && !paidMap.has(m.id))
                      ) || reguList[0];
                if (targetRegu) handleOpenBatchModal(targetRegu);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              title="Bayar sekaligus untuk seluruh anggota regu yang belum lunas"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Bayar 1 Regu Sekaligus</span>
            </button>
          </div>
        </div>

        {/* Input Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tanggal Latihan */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tanggal Latihan:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setWeekNumber(calculateWeekNumber(e.target.value));
              }}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 font-medium"
            />
          </div>

          {/* Minggu Ke */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Minggu Latihan:
            </label>
            <select
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 font-medium"
            >
              <option value={1}>Minggu 1 (Awal Bulan)</option>
              <option value={2}>Minggu 2</option>
              <option value={3}>Minggu 3</option>
              <option value={4}>Minggu 4</option>
              <option value={5}>Minggu 5 (Akhir Bulan)</option>
            </select>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Metode Pembayaran:
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['Tunai', 'QRIS', 'Transfer'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    paymentMethod === m
                      ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Nominal Iuran Standar */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nominal Default:
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="1000"
                value={customAmount}
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 font-bold"
              />
              <span className="text-[10px] text-stone-500 font-mono whitespace-nowrap">
                / orang
              </span>
            </div>
          </div>
        </div>

        {/* Filter Regu & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {/* Regu Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedReguFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedReguFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Semua Regu ({members.filter((m) => m.active).length})
            </button>
            {reguList.map((r) => {
              const membersInThisRegu = members.filter((m) => m.active && m.regu === r);
              const paidInThisRegu = membersInThisRegu.filter((m) => paidMap.has(m.id)).length;
              const isReguFull = membersInThisRegu.length > 0 && paidInThisRegu === membersInThisRegu.length;

              return (
                <button
                  key={r}
                  onClick={() => setSelectedReguFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    selectedReguFilter === r
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <span>{r}</span>
                  <span className={`text-[10px] px-1 rounded font-mono ${
                    isReguFull ? 'bg-emerald-600 text-white font-bold' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {paidInThisRegu}/{membersInThisRegu.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64 ml-auto">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama anggota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Regu Quick Action Banner when single Regu is selected */}
      {selectedReguFilter !== 'all' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              ⚜️
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <span>Setoran Kolektif {selectedReguFilter}</span>
                <span className="text-xs font-normal text-stone-500">
                  (Diserahkan oleh Pemimpin Regu / Pinru)
                </span>
              </h4>
              <p className="text-xs text-stone-600">
                {unpaidMembersInSelectedRegu.length > 0 ? (
                  <>
                    Terdapat <strong>{unpaidMembersInSelectedRegu.length} anggota</strong> yang belum lunas pada Minggu ke-{weekNumber}.
                  </>
                ) : (
                  <span className="text-emerald-700 font-semibold">
                    Semua anggota {selectedReguFilter} sudah lunas 100% pada latihan ini!
                  </span>
                )}
              </p>
            </div>
          </div>

          {unpaidMembersInSelectedRegu.length > 0 ? (
            <button
              onClick={() => handleOpenBatchModal(selectedReguFilter)}
              disabled={isSubmitting?.startsWith('batch-')}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>
                Bayar 1 Regu Sekaligus ({unpaidMembersInSelectedRegu.length} Orang • {formatRupiah(unpaidMembersInSelectedRegu.length * customAmount)})
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shrink-0">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>100% Regu Lunas</span>
            </div>
          )}
        </div>
      )}

      {/* Members Payment List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-700" />
            <span>Daftar Anggota Latihan ({filteredMembers.length} Personel)</span>
          </div>
          <span className="text-xs text-stone-500">
            {formatTanggalIndo(selectedDate)}
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              Tidak ada anggota yang cocok dengan pencarian / filter.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const payment = paidMap.get(member.id);
              const isPaid = !!payment;
              const isPendingThisMember = isSubmitting === member.id;

              return (
                <div
                  key={member.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isPaid ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 'hover:bg-amber-50/20'
                  }`}
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {member.gender === 'L' ? 'PA' : 'PI'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900 text-sm">
                          {member.name}
                        </span>
                        {member.isPinru && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 border border-amber-400/30">
                            Pinru / Wapinru
                          </span>
                        )}
                        <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded font-mono">
                          {member.level}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span className="font-medium text-amber-800">{member.regu}</span>
                        <span>•</span>
                        <span>ID: {member.id}</span>
                        {member.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{member.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Status & Action Buttons */}
                  <div className="flex items-center gap-2 sm:self-center ml-12 sm:ml-0">
                    {isPaid ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Lunas: {formatRupiah(payment.amount)}</span>
                          </span>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            Metode: {payment.paymentMethod} • {payment.loggedBy}
                          </div>
                        </div>

                        <button
                          onClick={() => onOpenReceipt(payment)}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-amber-900 hover:border-amber-400 bg-white transition shadow-xs"
                          title="Lihat Kuitansi Digital"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {/* 1-Click Pay Default Fee */}
                        <button
                          onClick={() => handleSinglePayment(member, customAmount)}
                          disabled={isPendingThisMember}
                          className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs hover:shadow transition disabled:opacity-50"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Bayar {formatRupiah(customAmount)} ({paymentMethod})</span>
                        </button>

                        {/* Custom Quick Amounts */}
                        <button
                          onClick={() => handleSinglePayment(member, customAmount * 2)}
                          disabled={isPendingThisMember}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
                          title="Bayar 2 minggu sekaligus"
                        >
                          2x ({formatRupiah(customAmount * 2)})
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL: Bayar 1 Regu Sekaligus */}
      {batchModalRegu && (
        <div className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-scaleIn space-y-4 my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-lg shadow-md shrink-0">
                  ⚜️
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">
                    Setoran Kolektif 1 Regu Sekaligus
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pencatatan langsung iuran rombongan dari Pinru / Bendahara Regu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalRegu(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notice */}
            {batchError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            {/* Target Regu Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Pilih Regu yang Menyetorkan:
              </label>
              <select
                value={batchModalRegu}
                onChange={(e) => handleSwitchModalRegu(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 bg-stone-50 focus:ring-2 focus:ring-emerald-500"
              >
                {reguList.map((r) => {
                  const unpaidCount = members.filter(
                    (m) => m.active && m.regu === r && !paidMap.has(m.id)
                  ).length;
                  return (
                    <option key={r} value={r}>
                      {r} ({unpaidCount} anggota belum lunas)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Session Info Bar */}
            <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-stone-500 block text-[10px]">Tanggal Latihan:</span>
                <span className="font-bold text-stone-800">{formatTanggalIndo(selectedDate)}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Minggu Latihan:</span>
                <span className="font-bold text-amber-800">
                  Minggu Ke-{weekNumber} ({formatBulanIndo(monthPeriod)})
                </span>
              </div>
            </div>

            {/* Unpaid Members List with Checkboxes */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-700">
                    Pilih Anggota yang Menyetor:
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                    {selectedMemberIds.length} dari {unpaidMembersInModalRegu.length} dipilih
                  </span>
                </div>

                {unpaidMembersInModalRegu.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllInModal}
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllInModal}
                      className="text-stone-500 font-semibold hover:underline"
                    >
                      Batal Pilih
                    </button>
                  </div>
                )}
              </div>

              {unpaidMembersInModalRegu.length > 0 ? (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-2 max-h-44 overflow-y-auto space-y-1.5">
                  {unpaidMembersInModalRegu.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        onClick={() => handleToggleMemberSelect(m.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                            : 'bg-white border-stone-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 accent-emerald-700 pointer-events-none"
                          />
                          <div>
                            <span className="font-bold text-xs text-stone-900 block">
                              {m.name}
                              {m.isPinru && (
                                <span className="text-[9px] text-amber-700 font-bold ml-1.5 bg-amber-100 px-1.5 py-0.2 rounded">
                                  Pinru
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              ID: {m.id} • {m.level}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold font-mono text-stone-800">
                          {formatRupiah(batchModalAmount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <div className="text-xs text-emerald-800 font-semibold">
                    🎉 Semua anggota <strong>{batchModalRegu}</strong> sudah lunas untuk Minggu ke-{weekNumber}!
                  </div>
                  {/* Switch to another regu that still has unpaid members */}
                  {reguList.filter(
                    (r) => r !== batchModalRegu && members.some((m) => m.active && m.regu === r && !paidMap.has(m.id))
                  ).length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-stone-500 block mb-1">
                        Pilih regu lain yang belum lunas:
                      </span>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {reguList
                          .filter(
                            (r) =>
                              r !== batchModalRegu &&
                              members.some((m) => m.active && m.regu === r && !paidMap.has(m.id))
                          )
                          .map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleSwitchModalRegu(r)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[10px] hover:bg-emerald-600 transition"
                            >
                              {r}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nominal and Method Controls */}
            {unpaidMembersInModalRegu.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Nominal per anggota */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nominal per Anggota:
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={batchModalAmount}
                    onChange={(e) => setBatchModalAmount(Math.max(1000, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 bg-stone-50 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Metode Bayar */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Metode Setoran:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Tunai', 'QRIS', 'Transfer'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setBatchModalMethod(m)}
                        className={`py-1 text-[11px] font-semibold rounded-lg border transition ${
                          batchModalMethod === m
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Total Summary Callout */}
            {unpaidMembersInModalRegu.length > 0 && (
              <div className="bg-emerald-950 text-emerald-100 rounded-2xl p-3.5 flex items-center justify-between border border-emerald-700 shadow-sm">
                <div>
                  <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">
                    Total Disetorkan ({selectedMemberIds.length} Anggota):
                  </span>
                  <span className="text-xl font-black font-mono text-white">
                    {formatRupiah(batchModalTotal)}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-800 text-emerald-200 font-bold text-xs border border-emerald-600">
                  {batchModalMethod}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setBatchModalRegu(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmBatchPayment}
                disabled={
                  selectedMemberIds.length === 0 ||
                  isSubmitting?.startsWith('batch-')
                }
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md transition disabled:opacity-50"
              >
                {isSubmitting?.startsWith('batch-') ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Menyimpan ke Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>
                      Konfirmasi Bayar ({selectedMemberIds.length} Orang • {formatRupiah(batchModalTotal)})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
