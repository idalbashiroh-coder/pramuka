import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  ArrowDownToLine,
  ArrowUpToLine,
  Download,
  Key,
  ShieldAlert,
} from 'lucide-react';
import { SheetConfig, GudepSettings, ScoutMember, PaymentRecord } from '../types/scout';
import { formatGoogleErrorMessage } from '../services/sheetsService';

interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  sheetConfig: SheetConfig;
  settings: GudepSettings;
  members: ScoutMember[];
  transactions: PaymentRecord[];
  isSyncing: boolean;
  hasToken: boolean;
  onLoginClick: () => void;
  onReauthClick: () => void;
  onCreateNewSheet: (title: string) => Promise<void>;
  onConnectExistingSheet: (sheetIdOrUrl: string) => Promise<void>;
  onPushToSheet: () => Promise<void>;
  onPullFromSheet: () => Promise<void>;
}

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  isOpen,
  onClose,
  user,
  sheetConfig,
  settings,
  members,
  transactions,
  isSyncing,
  hasToken,
  onLoginClick,
  onReauthClick,
  onCreateNewSheet,
  onConnectExistingSheet,
  onPushToSheet,
  onPullFromSheet,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'connect'>('create');
  const [sheetTitle, setSheetTitle] = useState(
    `Iuran Rutin Pramuka - ${settings.pangkalan}`
  );
  const [existingInput, setExistingInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onCreateNewSheet(sheetTitle);
      setSuccessMessage('Berhasil membuat dan menghubungkan Google Spreadsheet di Google Drive Anda!');
    } catch (err: any) {
      console.warn('Create sheet notice:', err);
      setErrorMessage(err.message || 'Gagal membuat spreadsheet.');
    }
  };

  const handleConnect = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!existingInput.trim()) {
      setErrorMessage('Harap masukkan Spreadsheet ID atau tautan Google Sheets.');
      return;
    }
    try {
      await onConnectExistingSheet(existingInput.trim());
      setSuccessMessage('Berhasil terhubung dengan Google Spreadsheet!');
    } catch (err: any) {
      console.warn('Connect sheet notice:', err);
      setErrorMessage(err.message || 'Gagal menghubungkan spreadsheet.');
    }
  };

  const handlePush = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onPushToSheet();
      setSuccessMessage('Data aplikasi berhasil disinkronkan ke Google Spreadsheet!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal sinkronisasi data.');
    }
  };

  const handlePull = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onPullFromSheet();
      setSuccessMessage('Berhasil memuat data terbaru dari Google Spreadsheet!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menarik data dari spreadsheet.');
    }
  };

  // Export CSV fallback
  const handleDownloadCSV = () => {
    let csv = 'ID Transaksi,Tanggal,Periode Bulan,Minggu,ID Anggota,Nama Anggota,Regu,Nominal,Metode,Pencatat,Catatan\n';
    transactions.forEach((t) => {
      csv += `"${t.id}","${t.date}","${t.monthPeriod}","Minggu ${t.weekNumber}","${t.memberId}","${t.memberName}","${t.regu}",${t.amount},"${t.paymentMethod}","${t.loggedBy}","${t.note || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_iuran_pramuka_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-stone-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-400/40 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Database Google Spreadsheet
              </h3>
              <p className="text-xs text-emerald-200/80">
                Penyimpanan cloud otomatis langsung ke Google Drive & Sheets Anda
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
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="font-medium leading-relaxed">{errorMessage}</div>
              </div>
              <div className="pt-2 border-t border-rose-200 flex items-center gap-2">
                <button
                  onClick={onReauthClick}
                  className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Beri Izin Google Sheets Sekarang</span>
                </button>
                <span className="text-[11px] text-rose-700">
                  (Pastikan centang izin Google Drive/Sheets pada jendela Google)
                </span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Connection Status Overview */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Status Koneksi Akun & Database
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                <span className="text-[10px] text-stone-400 block mb-0.5">Akun Google (Gmail):</span>
                {user ? (
                  <div className="flex items-center gap-1.5 text-stone-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate">{user.email || user.displayName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Belum Login</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                <span className="text-[10px] text-stone-400 block mb-0.5">Database Google Spreadsheet:</span>
                {sheetConfig.isConnected ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold truncate">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{sheetConfig.spreadsheetTitle}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Belum Dibuat / Dihubungkan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* If Not Authenticated */}
          {!user ? (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
              <Database className="w-8 h-8 text-amber-700 mx-auto" />
              <div>
                <h4 className="font-bold text-stone-900 text-sm">
                  Login Akun Google Diperlukan
                </h4>
                <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                  Untuk membuat atau membaca Google Spreadsheet di Google Drive, Anda perlu masuk dengan akun Google terlebih dahulu.
                </p>
              </div>
              <button
                onClick={onLoginClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-stone-800 border border-stone-300 shadow-sm hover:bg-stone-100 font-semibold text-xs transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Masuk dengan Google</span>
              </button>
            </div>
          ) : (
            <>
              {/* Permanent Fixed Database Panel */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-stone-50 border-2 border-emerald-500/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Database className="w-5 h-5 text-emerald-200" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-stone-900 text-sm">
                          Database Spreadsheet Utama (Resmi)
                        </h4>
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                          Permanen
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        Spreadsheet ini ditetapkan sebagai database pasti. Tidak perlu membuat spreadsheet baru lagi.
                      </p>
                      <div className="mt-2 font-mono text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-800 break-all select-all">
                        ID: <strong>1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A</strong>
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://docs.google.com/spreadsheets/d/1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A/edit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition shrink-0"
                  >
                    <span>Buka Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {sheetConfig.lastSyncedAt && (
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Terakhir disinkronkan: {new Date(sheetConfig.lastSyncedAt).toLocaleString('id-ID')}</span>
                  </div>
                )}

                {/* Primary Sync Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={handlePull}
                    disabled={isSyncing}
                    className="py-3 px-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
                  >
                    <ArrowDownToLine className="w-4 h-4 text-emerald-300" />
                    <span>{isSyncing ? 'Menarik Data...' : 'Tarik Data dari Spreadsheet (Pull)'}</span>
                  </button>

                  <button
                    onClick={handlePush}
                    disabled={isSyncing}
                    className="py-3 px-3.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
                  >
                    <ArrowUpToLine className="w-4 h-4 text-emerald-700" />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Kirim Seluruh Data ke Sheet (Push)'}</span>
                  </button>
                </div>
              </div>

              {/* 5 Tabs Structure Overview */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-700">
                  Struktur Lembar Kerja (Tabs) di Database:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-stone-700">
                  <span className="p-2 rounded-lg bg-stone-100 border border-stone-200">
                    📄 DATA_ANGGOTA
                  </span>
                  <span className="p-2 rounded-lg bg-stone-100 border border-stone-200">
                    📄 TRANSAKSI_IURAN
                  </span>
                  <span className="p-2 rounded-lg bg-stone-100 border border-stone-200">
                    📊 REKAP_BULANAN
                  </span>
                  <span className="p-2 rounded-lg bg-stone-100 border border-stone-200">
                    ⚜️ REKAP_REGU
                  </span>
                  <span className="p-2 rounded-lg bg-stone-100 border border-stone-200">
                    ⚙️ PENGATURAN_GUDEP
                  </span>
                </div>
              </div>

              {/* Optional Custom Sheet Connection (Collapsed by default) */}
              <div className="pt-2 border-t border-stone-200">
                <details className="text-xs text-stone-600">
                  <summary className="font-semibold text-stone-700 hover:text-stone-900 cursor-pointer select-none">
                    Opsi Lanjutan: Sambungkan Spreadsheet Lain (Opsional)
                  </summary>
                  <div className="mt-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <p className="text-stone-600 text-[11px]">
                      Jika ingin mengganti sementara ke file spreadsheet lain, masukkan ID atau URL Google Sheets di bawah:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Spreadsheet ID atau URL..."
                        value={existingInput}
                        onChange={(e) => setExistingInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-mono"
                      />
                      <button
                        onClick={handleConnect}
                        disabled={isSyncing}
                        className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white font-bold text-xs shrink-0"
                      >
                        Hubungkan
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </>
          )}

          {/* Backup / Export CSV Option */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
            <span className="text-stone-500">
              Opsi alternatif backup lokal:
            </span>
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
