import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  X,
  Database,
  Download,
  Copy,
  Upload,
  Check,
  Table,
  ClipboardPaste,
  Trash2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Zap,
  Send,
  Code,
  CheckCheck,
} from 'lucide-react';
import { SheetConfig, GudepSettings, ScoutMember, PaymentRecord } from '../types/scout';
import {
  FIXED_SPREADSHEET_ID,
  FIXED_SPREADSHEET_URL,
  SHEETS_NAMES,
  parsePastedTableData,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  testAppsScriptConnection,
  saveRecapsToSpreadsheet,
  syncAllDataToSpreadsheet,
} from '../services/sheetsService';
import { formatRupiah, formatBulanIndo } from '../utils/formatters';

interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetConfig: SheetConfig;
  settings: GudepSettings;
  members: ScoutMember[];
  transactions: PaymentRecord[];
  isSyncing: boolean;
  syncNotice?: { type: 'success' | 'warning' | 'error' | 'info'; message: string } | null;
  onSyncNow: () => void;
  onImportCSV?: (csvContent: string) => void;
  onApplyPastedData?: (
    type: 'members' | 'transactions',
    data: any[],
    mode: 'replace' | 'append'
  ) => void;
  onClearMockData?: () => void;
  onChangeSpreadsheetId?: (newId: string) => void;
  onUpdateAppsScriptUrl?: (url: string) => void;
  onSyncAllToSpreadsheet?: () => Promise<void>;
}

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  isOpen,
  onClose,
  sheetConfig,
  settings,
  members,
  transactions,
  isSyncing,
  syncNotice,
  onSyncNow,
  onImportCSV,
  onApplyPastedData,
  onClearMockData,
  onChangeSpreadsheetId,
  onUpdateAppsScriptUrl,
  onSyncAllToSpreadsheet,
}) => {
  const currentSpreadsheetId = sheetConfig.spreadsheetId || FIXED_SPREADSHEET_ID;
  const currentSpreadsheetUrl = sheetConfig.spreadsheetUrl || FIXED_SPREADSHEET_URL;
  const [isEditingId, setIsEditingId] = useState(false);
  const [newIdInput, setNewIdInput] = useState('');
  const [activeTab, setActiveTab] = useState<string>(SHEETS_NAMES.TRANSACTIONS);
  const [copied, setCopied] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState<'preview' | 'autosave' | 'paste' | 'guide'>('autosave');

  // Auto-Save Webhook State
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState(sheetConfig.appsScriptUrl || '');
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<string | null>(null);

  // Paste Tool State
  const [pastedText, setPastedText] = useState('');
  const [pasteTarget, setPasteTarget] = useState<'auto' | 'members' | 'transactions'>('auto');
  const [pasteMode, setPasteMode] = useState<'replace' | 'append'>('replace');
  const [pastePreview, setPastePreview] = useState<{
    type: 'members' | 'transactions' | 'unknown';
    count: number;
    message: string;
    members?: ScoutMember[];
    transactions?: PaymentRecord[];
  } | null>(null);

  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isSavingRecapTab, setIsSavingRecapTab] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle live paste analysis
  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setPastePreview(null);
      return;
    }
    const result = parsePastedTableData(text, pasteTarget);
    setPastePreview(result);
  };

  const handleApplyPaste = () => {
    if (!pastePreview || pastePreview.count === 0 || !onApplyPastedData) return;

    if (pastePreview.type === 'members' && pastePreview.members) {
      onApplyPastedData('members', pastePreview.members, pasteMode);
      setImportNotice(`✅ Berhasil menerapkan ${pastePreview.count} data anggota ke aplikasi!`);
      setPastedText('');
      setPastePreview(null);
      setTimeout(() => setImportNotice(null), 4000);
    } else if (pastePreview.type === 'transactions' && pastePreview.transactions) {
      onApplyPastedData('transactions', pastePreview.transactions, pasteMode);
      setImportNotice(`✅ Berhasil menerapkan ${pastePreview.count} riwayat transaksi ke aplikasi!`);
      setPastedText('');
      setPastePreview(null);
      setTimeout(() => setImportNotice(null), 4000);
    }
  };

  const handleSaveAppsScriptUrl = () => {
    if (onUpdateAppsScriptUrl) {
      onUpdateAppsScriptUrl(appsScriptUrlInput.trim());
    }
  };

  const handleTestConnection = async () => {
    if (!appsScriptUrlInput.trim()) {
      setScriptTestResult({
        success: false,
        message: 'Masukkan URL Web App Apps Script terlebih dahulu.',
      });
      return;
    }
    setIsTestingScript(true);
    setScriptTestResult(null);
    try {
      const res = await testAppsScriptConnection(appsScriptUrlInput.trim());
      setScriptTestResult(res);
      if (res.success && onUpdateAppsScriptUrl) {
        onUpdateAppsScriptUrl(appsScriptUrlInput.trim());
      }
    } catch (err: any) {
      setScriptTestResult({
        success: false,
        message: `Gagal menguji koneksi: ${err?.message || 'Koneksi ditolak'}`,
      });
    } finally {
      setIsTestingScript(false);
    }
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 3000);
  };

  const handleSyncAllNow = async () => {
    const url = appsScriptUrlInput.trim() || sheetConfig.appsScriptUrl;
    if (!url) {
      setSyncAllResult('⚠️ Harap masukkan URL Apps Script Web App terlebih dahulu.');
      return;
    }
    setIsSyncingAll(true);
    setSyncAllResult(null);
    try {
      const res = await syncAllDataToSpreadsheet(members, transactions, url, settings);
      setSyncAllResult(res.message);
    } catch (err: any) {
      setSyncAllResult(`❌ Gagal: ${err?.message || 'Terputus'}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncCurrentRecap = async () => {
    const url = appsScriptUrlInput.trim() || sheetConfig.appsScriptUrl;
    if (!url) {
      setImportNotice('⚠️ Masukkan URL Apps Script terlebih dahulu di tab Simpan Otomatis.');
      return;
    }
    setIsSavingRecapTab(true);
    try {
      const res = await saveRecapsToSpreadsheet(members, transactions, settings, url);
      setImportNotice(`✅ ${res.message}`);
      setTimeout(() => setImportNotice(null), 4000);
    } catch (err: any) {
      setImportNotice(`❌ Gagal menyimpan rekap: ${err?.message || 'Terputus'}`);
    } finally {
      setIsSavingRecapTab(false);
    }
  };

  // Compute stats for recap tabs
  const activeMembers = members.filter((m) => m.active);
  const monthMap = new Map<string, { total: number; count: number; members: Set<string> }>();
  transactions.forEach((t) => {
    const existing = monthMap.get(t.monthPeriod) || { total: 0, count: 0, members: new Set<string>() };
    existing.total += t.amount;
    existing.count += 1;
    existing.members.add(t.memberId);
    monthMap.set(t.monthPeriod, existing);
  });

  const reguMap = new Map<string, { total: number; count: number; membersCount: number }>();
  members.forEach((m) => {
    const existing = reguMap.get(m.regu) || { total: 0, count: 0, membersCount: 0 };
    existing.membersCount += 1;
    reguMap.set(m.regu, existing);
  });
  transactions.forEach((t) => {
    const existing = reguMap.get(t.regu);
    if (existing) {
      existing.total += t.amount;
      existing.count += 1;
    }
  });

  // Export CSV
  const handleDownloadCSV = () => {
    let csv = '\uFEFF';
    csv += 'ID Transaksi,Tanggal,Periode Bulan,Minggu,ID Anggota,Nama Anggota,Regu,Nominal,Metode,Dicatat Oleh,Catatan\n';
    transactions.forEach((t) => {
      csv += `"${t.id}","${t.date}","${t.monthPeriod}","Minggu ${t.weekNumber}","${t.memberId}","${t.memberName}","${t.regu}",${t.amount},"${t.paymentMethod}","${t.loggedBy}","${t.note || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_iuran_pramuka_${FIXED_SPREADSHEET_ID.slice(0, 8)}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy current tab content to clipboard (TSV format so it can be pasted directly into Google Sheets)
  const handleCopyCurrentTab = () => {
    let text = '';
    if (activeTab === SHEETS_NAMES.TRANSACTIONS) {
      text += 'ID Transaksi\tTanggal\tPeriode Bulan\tMinggu Ke\tID Anggota\tNama Anggota\tRegu\tNominal (Rp)\tMetode\tDicatat Oleh\tCatatan\n';
      transactions.forEach((t) => {
        text += `${t.id}\t${t.date}\t${t.monthPeriod}\tMinggu ${t.weekNumber}\t${t.memberId}\t${t.memberName}\t${t.regu}\t${t.amount}\t${t.paymentMethod}\t${t.loggedBy}\t${t.note || '-'}\n`;
      });
    } else if (activeTab === SHEETS_NAMES.MEMBERS) {
      text += 'ID Anggota\tNama Anggota\tRegu\tJenis Kelamin\tTingkatan\tNo Kontak/WA\tStatus Pinru\tStatus Aktif\n';
      members.forEach((m) => {
        text += `${m.id}\t${m.name}\t${m.regu}\t${m.gender === 'L' ? 'Putra' : 'Putri'}\t${m.level}\t${m.phone || '-'}\t${m.isPinru ? 'Pinru/Wapinru' : 'Anggota'}\t${m.active ? 'Aktif' : 'Non-Aktif'}\n`;
      });
    } else if (activeTab === SHEETS_NAMES.MONTHLY_RECAP) {
      text += 'Periode Bulan\tTotal Terkumpul (Rp)\tTarget Iuran (Rp)\tPersentase Capaian (%)\tJumlah Transaksi\tAnggota Bayar\n';
      Array.from(monthMap.entries()).forEach(([period, data]) => {
        const target = activeMembers.length * settings.defaultFeePerMeeting * 4;
        const pct = target > 0 ? Math.min(100, Math.round((data.total / target) * 100)) : 0;
        text += `${period}\t${data.total}\t${target}\t${pct}%\t${data.count}\t${data.members.size}\n`;
      });
    } else if (activeTab === SHEETS_NAMES.REGU_RECAP) {
      text += 'Nama Regu\tJumlah Anggota\tTotal Iuran Terkumpul (Rp)\tTarget Iuran (Rp)\tKedisiplinan (%)\n';
      Array.from(reguMap.entries()).forEach(([regu, data]) => {
        const target = data.membersCount * settings.defaultFeePerMeeting * 4;
        const pct = target > 0 ? Math.min(100, Math.round((data.total / target) * 100)) : 0;
        text += `${regu}\t${data.membersCount}\t${data.total}\t${target}\t${pct}%\n`;
      });
    } else {
      text += 'Parameter\tNilai\n';
      text += `Nama Gugus Depan\t${settings.gudepName}\n`;
      text += `Pangkalan / Sekolah\t${settings.pangkalan}\n`;
      text += `Nominal Iuran Rutin\t${settings.defaultFeePerMeeting}\n`;
      text += `Jadwal Latihan\t${settings.meetingDay}\n`;
      text += `Pembina Satuan\t${settings.pembinaName}\n`;
      text += `Bendahara Satuan\t${settings.bendaharaName}\n`;
      text += `Database Spreadsheet ID\t${FIXED_SPREADSHEET_ID}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (onImportCSV) {
          onImportCSV(content);
        }
        handlePastedTextChange(content);
        setActiveActionTab('paste');
        setImportNotice('File spreadsheet berhasil dibaca. Silakan periksa pratinjau dan terapkan.');
        setTimeout(() => setImportNotice(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/80 border border-emerald-400/40 flex items-center justify-center text-white shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Database Google Spreadsheet
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                  Tanpa Perlu Login
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Sinkronisasi data langsung dengan Google Spreadsheet ({members.length} Anggota, {transactions.length} Transaksi)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Permanent Active Database Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-stone-50 to-amber-50/50 border-2 border-emerald-500/70 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Database className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-stone-900 text-sm">
                      ID Spreadsheet:
                    </span>
                    <span className="font-mono text-xs bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded font-semibold select-all break-all">
                      {currentSpreadsheetId}
                    </span>
                    {onChangeSpreadsheetId && (
                      <button
                        onClick={() => setIsEditingId(!isEditingId)}
                        className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold underline"
                      >
                        {isEditingId ? 'Batal' : 'Ganti ID / Link'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-1">
                    Database iuran langsung tersinkronkan tanpa memerlukan akun login Google apa pun di aplikasi ini.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <a
                  href={currentSpreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <span>Buka Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                  title="Tarik data terbaru dari Google Spreadsheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menarik Data...' : 'Tarik Data dari Spreadsheet'}</span>
                </button>
              </div>
            </div>

            {/* Input to change Spreadsheet ID */}
            {isEditingId && (
              <div className="p-3 rounded-xl bg-white border border-emerald-300 text-xs space-y-2">
                <label className="font-bold text-stone-800">
                  Ganti ID atau Tautan Google Spreadsheet:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newIdInput}
                    onChange={(e) => setNewIdInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit atau ID spreadsheet"
                    className="flex-1 p-2 border border-stone-300 rounded-lg text-xs bg-stone-50 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (newIdInput.trim() && onChangeSpreadsheetId) {
                        onChangeSpreadsheetId(newIdInput.trim());
                        setIsEditingId(false);
                        setNewIdInput('');
                      }
                    }}
                    className="px-3.5 py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-600 transition"
                  >
                    Simpan & Sinkronkan
                  </button>
                </div>
              </div>
            )}

            {/* Live Sync Notice if any */}
            {syncNotice && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                  syncNotice.type === 'success'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : syncNotice.type === 'warning'
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : 'bg-rose-100 text-rose-950 border-rose-300'
                }`}
              >
                {syncNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div>{syncNotice.message}</div>
                  {syncNotice.type === 'warning' && (
                    <div className="text-[11px] font-normal text-amber-900 mt-1">
                      💡 <em>Tips:</em> Buka spreadsheet Anda, klik tombol <strong>Bagikan</strong> di pojok kanan atas, lalu ubah <strong>Akses umum</strong> menjadi <strong>"Siapa saja yang memiliki link: Pelihat"</strong>, atau gunakan tab <strong>"Tempel Data dari Spreadsheet"</strong> di bawah.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-emerald-200/60 text-xs text-stone-600">
              <div className="flex items-center gap-1.5 font-medium text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Status: <strong>Tersinkron Otomatis (Tanpa Login)</strong>
                </span>
              </div>
              <div className="font-mono text-[11px] text-stone-500">
                Terakhir update:{' '}
                {sheetConfig.lastSyncedAt
                  ? new Date(sheetConfig.lastSyncedAt).toLocaleString('id-ID')
                  : 'Aktif'}
              </div>
            </div>
          </div>

          {importNotice && (
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{importNotice}</span>
            </div>
          )}

          {/* Sub-nav: Simpan Otomatis | Pratinjau Lembar Kerja | Tempel Data | Panduan */}
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveActionTab('autosave')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeActionTab === 'autosave'
                  ? 'bg-amber-900 text-amber-50 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Simpan Otomatis ke Sheets</span>
              {sheetConfig.appsScriptUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveActionTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeActionTab === 'preview'
                  ? 'bg-emerald-900 text-emerald-50 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Pratinjau Lembar Kerja</span>
            </button>

            <button
              onClick={() => setActiveActionTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeActionTab === 'paste'
                  ? 'bg-emerald-900 text-emerald-50 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Tempel / Impor Data</span>
            </button>

            <button
              onClick={() => setActiveActionTab('guide')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeActionTab === 'guide'
                  ? 'bg-emerald-900 text-emerald-50 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Panduan Izin Google Sheets</span>
            </button>
          </div>

          {/* TAB 0: Auto-Save Webhook (Google Apps Script) */}
          {activeActionTab === 'autosave' && (
            <div className="space-y-4 text-xs">
              {/* Feature Intro Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950 via-stone-900 to-emerald-950 border-2 border-amber-500/70 text-white shadow-sm space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-amber-200">
                      Simpan Otomatis ke Google Spreadsheet (Realtime Dua Arah)
                    </h4>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Setiap kali pembayaran iuran dicatat atau data anggota ditambahkan melalui aplikasi, data akan langsung tersimpan ke Google Spreadsheet secara realtime tanpa memerlukan login pop-up Google!
                    </p>
                  </div>
                </div>
              </div>

              {/* Status & URL Input Card */}
              <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-800 text-sm">Status Sinkronisasi Tulis:</span>
                    {sheetConfig.appsScriptUrl ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Aktif Terhubung
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        Belum Terhubung (Tersimpan di Aplikasi)
                      </span>
                    )}
                  </div>

                  {sheetConfig.appsScriptUrl && (
                    <button
                      onClick={() => {
                        setAppsScriptUrlInput('');
                        if (onUpdateAppsScriptUrl) onUpdateAppsScriptUrl('');
                      }}
                      className="text-stone-500 hover:text-rose-600 text-[11px] font-semibold underline"
                    >
                      Putuskan / Hapus URL
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 block">
                    URL Web App Google Apps Script:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      type="url"
                      value={appsScriptUrlInput}
                      onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="flex-1 p-2.5 border border-stone-300 rounded-xl text-xs font-mono bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleTestConnection}
                        disabled={isTestingScript || !appsScriptUrlInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingScript ? 'animate-spin' : ''}`} />
                        <span>{isTestingScript ? 'Menguji...' : 'Uji & Simpan URL'}</span>
                      </button>

                      <button
                        onClick={handleSaveAppsScriptUrl}
                        disabled={!appsScriptUrlInput.trim()}
                        className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white font-semibold transition"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connection Test Result */}
                {scriptTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                      scriptTestResult.success
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                        : 'bg-rose-50 text-rose-950 border-rose-300'
                    }`}
                  >
                    {scriptTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{scriptTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Bulk Sync Existing Data */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-stone-50 border border-emerald-300/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-emerald-700" />
                    <span>Kirim Seluruh Data Saat Ini ke Spreadsheet</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Kirim sekaligus {members.length} data anggota, {transactions.length} riwayat transaksi, Rekapitulasi Bulanan, dan Rekapitulasi Pe-Regu ke lembar <code className="font-mono bg-white px-1 py-0.5 rounded border border-stone-200">DATA_ANGGOTA</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-stone-200">TRANSAKSI_IURAN</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-stone-200">REKAP_BULANAN</code>, dan <code className="font-mono bg-white px-1 py-0.5 rounded border border-stone-200">REKAP_REGU</code> di Google Spreadsheet Anda.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={handleSyncAllNow}
                    disabled={isSyncingAll}
                    className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-pulse' : ''}`} />
                    <span>{isSyncingAll ? 'Mengirim Data...' : 'Kirim Sekarang'}</span>
                  </button>
                </div>
              </div>

              {syncAllResult && (
                <div className="p-3 rounded-xl bg-stone-900 text-stone-100 text-xs font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{syncAllResult}</span>
                </div>
              )}

              {/* Step-by-Step 1-Minute Guide */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-100 pb-2">
                  <h4 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Panduan Pasang Apps Script Web App (Hanya Butuh 1 Menit)</span>
                  </h4>
                  <button
                    onClick={handleCopyScriptCode}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                  >
                    {codeCopied ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-white" />
                        <span>Kode Berhasil Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-white" />
                        <span>Salin Seluruh Kode Apps Script</span>
                      </>
                    )}
                  </button>
                </div>

                <ol className="space-y-2 list-decimal list-inside text-stone-700 leading-relaxed font-sans">
                  <li>
                    Buka Google Spreadsheet Anda:{' '}
                    <a
                      href={FIXED_SPREADSHEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-bold underline inline-flex items-center gap-1"
                    >
                      <span>Buka Spreadsheet ({FIXED_SPREADSHEET_ID.slice(0, 10)}...)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Di menu atas Google Spreadsheet, klik <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Hapus semua kode bawaan di layar, lalu klik tombol <strong className="text-amber-800">"Salin Seluruh Kode Apps Script"</strong> di atas dan <strong>Tempel (Paste / Ctrl+V)</strong>.
                  </li>
                  <li>
                    Klik tombol <strong>Simpan (ikon Disket)</strong> di bilah atas Apps Script.
                  </li>
                  <li>
                    Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas &gt; pilih <strong>Penerapan baru (New deployment)</strong>.
                  </li>
                  <li>
                    Klik ikon <strong>Roda Gigi</strong> di samping "Pilih jenis", pilih <strong>Aplikasi Web (Web app)</strong>.
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950 font-mono">
                      • Jalankan sebagai (Execute as): <strong>Saya (Me)</strong><br />
                      • Siapa yang memiliki akses (Who has access): <strong>Siapa saja (Anyone)</strong>
                    </div>
                  </li>
                  <li>
                    Klik <strong>Terapkan (Deploy)</strong>. Jika diminta izin oleh Google, klik "Beri izin" (Izinkan).
                  </li>
                  <li>
                    Salin <strong>URL Aplikasi Web</strong> yang muncul (berakhiran <code className="bg-stone-200 px-1 rounded">/exec</code>), lalu tempel di kotak URL di atas dan klik <strong>Uji & Simpan URL</strong>!
                  </li>
                </ol>

                {/* Collapsible/Viewable Code Preview */}
                <div className="mt-3 border border-stone-200 rounded-xl overflow-hidden">
                  <div className="bg-stone-900 text-stone-300 px-3 py-2 flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kode Google Apps Script Si-Pramuka (Template Siap Pakai)</span>
                    </span>
                    <button
                      onClick={handleCopyScriptCode}
                      className="text-amber-400 hover:text-amber-300 font-bold underline"
                    >
                      {codeCopied ? 'Tersalin!' : 'Salin Kode'}
                    </button>
                  </div>
                  <pre className="max-h-48 overflow-y-auto p-3 text-[10px] font-mono bg-stone-950 text-stone-300 select-all leading-tight">
                    {GOOGLE_APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Preview Tables */}
          {activeActionTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-emerald-700" />
                  <span>Lembar Kerja (Sheet Tabs) di Aplikasi</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCurrentTab}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium flex items-center gap-1 border border-stone-300 transition"
                    title="Salin seluruh baris tabel ini untuk ditempel ke Google Sheets"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-600" />
                        <span>Salin Tabel (TSV)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadCSV}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-1 border border-emerald-300 transition"
                    title="Unduh seluruh catatan transaksi dalam format CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh CSV</span>
                  </button>

                  {(activeTab === SHEETS_NAMES.MONTHLY_RECAP || activeTab === SHEETS_NAMES.REGU_RECAP) && (
                    <button
                      onClick={handleSyncCurrentRecap}
                      disabled={isSavingRecapTab}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                      title="Kirim dan perbarui lembar rekap ini langsung ke Google Spreadsheet"
                    >
                      <Send className={`w-3.5 h-3.5 ${isSavingRecapTab ? 'animate-pulse' : ''}`} />
                      <span>{isSavingRecapTab ? 'Menyimpan...' : 'Simpan Rekap ke Sheets'}</span>
                    </button>
                  )}

                  {onClearMockData && (
                    <button
                      onClick={onClearMockData}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1 border border-rose-200 transition"
                      title="Hapus data contoh/simulasi agar hanya berisi data asli Anda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan Data Simulasi</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-stone-200 text-xs scrollbar-none">
                <button
                  onClick={() => setActiveTab(SHEETS_NAMES.TRANSACTIONS)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === SHEETS_NAMES.TRANSACTIONS
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Transaksi Iuran ({transactions.length})
                </button>
                <button
                  onClick={() => setActiveTab(SHEETS_NAMES.MEMBERS)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === SHEETS_NAMES.MEMBERS
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Data Anggota ({members.length})
                </button>
                <button
                  onClick={() => setActiveTab(SHEETS_NAMES.MONTHLY_RECAP)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === SHEETS_NAMES.MONTHLY_RECAP
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Rekap Bulanan
                </button>
                <button
                  onClick={() => setActiveTab(SHEETS_NAMES.REGU_RECAP)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === SHEETS_NAMES.REGU_RECAP
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Rekap Regu
                </button>
                <button
                  onClick={() => setActiveTab(SHEETS_NAMES.SETTINGS)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === SHEETS_NAMES.SETTINGS
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Pengaturan Gudep
                </button>
              </div>

              {/* Table Data Preview */}
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="max-h-72 overflow-y-auto overflow-x-auto text-xs">
                  {activeTab === SHEETS_NAMES.TRANSACTIONS && (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-stone-100 text-stone-700 font-bold sticky top-0 border-b border-stone-200">
                        <tr>
                          <th className="p-2.5">ID</th>
                          <th className="p-2.5">Tanggal</th>
                          <th className="p-2.5">Bulan</th>
                          <th className="p-2.5">Minggu</th>
                          <th className="p-2.5">Nama Anggota</th>
                          <th className="p-2.5">Regu</th>
                          <th className="p-2.5 text-right">Nominal</th>
                          <th className="p-2.5">Metode</th>
                          <th className="p-2.5">Pencatat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-stone-400 font-sans">
                              Belum ada catatan transaksi iuran. Gunakan tombol "Tarik Data dari Spreadsheet" atau "Tempel / Impor Data".
                            </td>
                          </tr>
                        ) : (
                          transactions.slice(0, 50).map((t) => (
                            <tr key={t.id} className="hover:bg-stone-50">
                              <td className="p-2 font-bold text-amber-900">{t.id}</td>
                              <td className="p-2">{t.date}</td>
                              <td className="p-2">{t.monthPeriod}</td>
                              <td className="p-2">Minggu {t.weekNumber}</td>
                              <td className="p-2 font-sans font-medium text-stone-900">{t.memberName}</td>
                              <td className="p-2 font-sans">{t.regu}</td>
                              <td className="p-2 text-right font-bold text-emerald-800">
                                {formatRupiah(t.amount)}
                              </td>
                              <td className="p-2 font-sans">{t.paymentMethod}</td>
                              <td className="p-2 font-sans text-stone-500">{t.loggedBy}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTab === SHEETS_NAMES.MEMBERS && (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-stone-100 text-stone-700 font-bold sticky top-0 border-b border-stone-200">
                        <tr>
                          <th className="p-2.5">ID</th>
                          <th className="p-2.5">Nama Anggota</th>
                          <th className="p-2.5">Regu</th>
                          <th className="p-2.5">JK</th>
                          <th className="p-2.5">Tingkatan</th>
                          <th className="p-2.5">No Kontak</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                        {members.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-stone-400 font-sans">
                              Belum ada data anggota. Tempel atau impor data anggota dari Google Sheets.
                            </td>
                          </tr>
                        ) : (
                          members.map((m, idx) => (
                            <tr key={`${m.id}-${idx}`} className="hover:bg-stone-50">
                              <td className="p-2 font-bold text-stone-900">{m.id}</td>
                              <td className="p-2 font-sans font-medium text-stone-900">
                                {m.name} {m.isPinru && <span className="text-[10px] text-amber-700 font-bold">(Pinru)</span>}
                              </td>
                              <td className="p-2 font-sans">{m.regu}</td>
                              <td className="p-2 font-sans">{m.gender === 'L' ? 'Putra' : 'Putri'}</td>
                              <td className="p-2 font-sans">{m.level}</td>
                              <td className="p-2">{m.phone || '-'}</td>
                              <td className="p-2 font-sans">
                                {m.active ? (
                                  <span className="text-emerald-700 font-bold">Aktif</span>
                                ) : (
                                  <span className="text-stone-400">Non-Aktif</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTab === SHEETS_NAMES.MONTHLY_RECAP && (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-stone-100 text-stone-700 font-bold sticky top-0 border-b border-stone-200">
                        <tr>
                          <th className="p-2.5">Periode Bulan</th>
                          <th className="p-2.5 text-right">Terkumpul (Rp)</th>
                          <th className="p-2.5 text-right">Target (Rp)</th>
                          <th className="p-2.5 text-right">Capaian (%)</th>
                          <th className="p-2.5 text-right">Jumlah Tx</th>
                          <th className="p-2.5 text-right">Anggota Bayar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-[11px]">
                        {Array.from(monthMap.entries()).map(([period, data]) => {
                          const target = activeMembers.length * settings.defaultFeePerMeeting * 4;
                          const pct = target > 0 ? Math.min(100, Math.round((data.total / target) * 100)) : 0;
                          return (
                            <tr key={period} className="hover:bg-stone-50">
                              <td className="p-2 font-bold text-stone-900">{formatBulanIndo(period)}</td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-800">
                                {formatRupiah(data.total)}
                              </td>
                              <td className="p-2 text-right font-mono text-stone-600">
                                {formatRupiah(target)}
                              </td>
                              <td className="p-2 text-right font-bold text-amber-700">{pct}%</td>
                              <td className="p-2 text-right font-mono">{data.count}</td>
                              <td className="p-2 text-right font-mono">
                                {data.members.size} / {activeMembers.length}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {activeTab === SHEETS_NAMES.REGU_RECAP && (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-stone-100 text-stone-700 font-bold sticky top-0 border-b border-stone-200">
                        <tr>
                          <th className="p-2.5">Nama Regu</th>
                          <th className="p-2.5 text-right">Jumlah Anggota</th>
                          <th className="p-2.5 text-right">Terkumpul (Rp)</th>
                          <th className="p-2.5 text-right">Target Estimasi</th>
                          <th className="p-2.5 text-right">Kedisiplinan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-[11px]">
                        {Array.from(reguMap.entries()).map(([regu, data]) => {
                          const target = data.membersCount * settings.defaultFeePerMeeting * 4;
                          const pct = target > 0 ? Math.min(100, Math.round((data.total / target) * 100)) : 0;
                          return (
                            <tr key={regu} className="hover:bg-stone-50">
                              <td className="p-2 font-bold text-stone-900">{regu}</td>
                              <td className="p-2 text-right font-mono">{data.membersCount} orang</td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-800">
                                {formatRupiah(data.total)}
                              </td>
                              <td className="p-2 text-right font-mono text-stone-600">
                                {formatRupiah(target)}
                              </td>
                              <td className="p-2 text-right font-bold text-amber-700">{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {activeTab === SHEETS_NAMES.SETTINGS && (
                    <div className="p-4 space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 p-2 bg-stone-50 rounded">
                        <span className="font-bold text-stone-700">Nama Gugus Depan:</span>
                        <span className="text-stone-900">{settings.gudepName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2 bg-stone-50 rounded">
                        <span className="font-bold text-stone-700">Pangkalan / Sekolah:</span>
                        <span className="text-stone-900">{settings.pangkalan}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2 bg-stone-50 rounded">
                        <span className="font-bold text-stone-700">Tarif Iuran Rutin:</span>
                        <span className="text-stone-900 font-bold text-emerald-800">
                          {formatRupiah(settings.defaultFeePerMeeting)} / latihan
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2 bg-stone-50 rounded">
                        <span className="font-bold text-stone-700">Hari & Jadwal Latihan:</span>
                        <span className="text-stone-900">{settings.meetingDay}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2 bg-stone-50 rounded">
                        <span className="font-bold text-stone-700">Pembina Satuan:</span>
                        <span className="text-stone-900">{settings.pembinaName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2 bg-stone-50 rounded">
                        <span className="font-bold text-stone-700">Bendahara Satuan:</span>
                        <span className="text-stone-900">{settings.bendaharaName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Paste / Import Direct Tool */}
          {activeActionTab === 'paste' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ClipboardPaste className="w-4 h-4 text-amber-700" />
                  <span>Salin & Tempel Langsung dari Google Spreadsheet (100% Cepat & Akurat)</span>
                </div>
                <p>
                  Jika Anda memiliki tabel anggota atau iuran di Google Sheets, Anda cukup memilih sel di Google Sheets (Ctrl+C), lalu tempel (Ctrl+V) di kotak di bawah ini. Aplikasi akan mengenali nama, regu, jenis kelamin, atau riwayat transaksi secara otomatis!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-stone-700">Jenis Data:</label>
                  <select
                    value={pasteTarget}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setPasteTarget(val);
                      if (pastedText) {
                        setPastePreview(parsePastedTableData(pastedText, val));
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white font-medium text-stone-800"
                  >
                    <option value="auto">Deteksi Otomatis</option>
                    <option value="members">Data Anggota</option>
                    <option value="transactions">Riwayat Transaksi Iuran</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="font-bold text-stone-700">Mode Simpan:</label>
                  <select
                    value={pasteMode}
                    onChange={(e) => setPasteMode(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white font-medium text-stone-800"
                  >
                    <option value="replace">Gantikan Data Saat Ini (Timpa)</option>
                    <option value="append">Tambahkan ke Data Yang Sudah Ada</option>
                  </select>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold border border-stone-300 flex items-center gap-1 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah File CSV</span>
                  </button>
                </div>
              </div>

              {/* Textarea for pasting */}
              <textarea
                value={pastedText}
                onChange={(e) => handlePastedTextChange(e.target.value)}
                placeholder="Tempel (Ctrl+V) tabel dari Google Spreadsheet di sini... Contoh:
ID	Nama Anggota	Regu	Jenis Kelamin
M-001	Ahmad Pratama	Regu Garuda	Putra
M-002	Siti Fatimah	Regu Melati	Putri"
                rows={7}
                className="w-full p-3 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />

              {/* Paste Preview Box */}
              {pastePreview && (
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{pastePreview.message}</span>
                    </span>
                    <button
                      onClick={handleApplyPaste}
                      disabled={pastePreview.count === 0}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                    >
                      Terapkan {pastePreview.count} Data ke Aplikasi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Guide */}
          {activeActionTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
                <div className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <span>Cara Mengaktifkan Sinkronisasi Otomatis Google Spreadsheet (Tanpa Perlu Login)</span>
                </div>
                <p className="text-stone-700 leading-relaxed">
                  Aplikasi ini dirancang untuk membaca database Google Spreadsheet secara langsung tanpa memerlukan izin akun Google OAuth login yang rumit atau pop-up yang sering terblokir browser.
                </p>
              </div>

              <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-stone-900 text-sm">
                  3 Langkah Mudah (Hanya Perlu Dilakukan Sekali):
                </h4>

                <ol className="space-y-2.5 list-decimal list-inside text-stone-700 leading-relaxed font-sans">
                  <li className="pl-1">
                    Buka spreadsheet Anda di Google Drive:{' '}
                    <a
                      href={FIXED_SPREADSHEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-bold underline inline-flex items-center gap-1"
                    >
                      <span>Buka Spreadsheet ({FIXED_SPREADSHEET_ID.slice(0, 10)}...)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li className="pl-1">
                    Di pojok kanan atas Google Spreadsheet, klik tombol biru <strong>"Bagikan" (Share)</strong>.
                  </li>
                  <li className="pl-1">
                    Pada bagian <strong>"Akses umum" (General access)</strong>, ubah status dari <strong>"Dibatasi"</strong> menjadi <strong>"Siapa saja yang memiliki link"</strong> dengan peran <strong>"Pelihat" (Viewer)</strong> atau <strong>"Editor"</strong>.
                  </li>
                  <li className="pl-1">
                    Klik <strong>Selesai (Done)</strong>, lalu kembali ke aplikasi ini dan klik tombol <strong>"Tarik Data dari Spreadsheet"</strong>!
                  </li>
                </ol>

                <div className="mt-3 p-3 bg-stone-100 rounded-lg text-stone-600 text-[11px]">
                  💡 <em>Catatan:</em> Setelah akses umum diatur ke "Siapa saja yang memiliki link", data di aplikasi ini akan otomatis menarik nama anggota dan transaksi dari spreadsheet setiap kali halaman dimuat atau tombol sinkronisasi ditekan.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="text-[11px] text-stone-500 font-mono">
            ID: {FIXED_SPREADSHEET_ID}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
