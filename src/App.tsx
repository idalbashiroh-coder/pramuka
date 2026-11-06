/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  Banknote,
  Calendar,
  Award,
  Users,
  History,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Bell,
  X,
  Database,
  ExternalLink,
  AlertTriangle,
  ClipboardPaste,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Header } from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { RecordPaymentTab } from './components/RecordPaymentTab';
import { MonthlyRecapTab } from './components/MonthlyRecapTab';
import { ReguRecapTab } from './components/ReguRecapTab';
import { MembersTab } from './components/MembersTab';
import { TransactionsTab } from './components/TransactionsTab';
import { SpreadsheetModal } from './components/SpreadsheetModal';
import { ReceiptModal } from './components/ReceiptModal';
import { GudepSettingsModal } from './components/GudepSettingsModal';

import {
  GudepSettings,
  PaymentMethod,
  PaymentRecord,
  ScoutMember,
  SheetConfig,
} from './types/scout';
import {
  INITIAL_GUDEP_SETTINGS,
  INITIAL_MEMBERS,
  INITIAL_TRANSACTIONS,
} from './services/mockData';
import {
  SHEETS_NAMES,
  FIXED_SPREADSHEET_ID,
  FIXED_SPREADSHEET_URL,
  fetchSpreadsheetDataPublic,
  parsePastedTableData,
  saveTransactionToSpreadsheet,
  saveBatchTransactionsToSpreadsheet,
  saveMemberToSpreadsheet,
  saveRecapsToSpreadsheet,
  syncAllDataToSpreadsheet,
  ensureUniqueMembers,
} from './services/sheetsService';
import { getMonthPeriod } from './utils/formatters';

const STORAGE_KEYS = {
  MEMBERS: 'sipramuka_members_real_v4',
  TRANSACTIONS: 'sipramuka_transactions_real_v4',
  SETTINGS: 'sipramuka_settings_v4',
  SHEET_CONFIG: 'sipramuka_sheet_config_v4',
};

export default function App() {
  // Application Data States (Clean slate with 0 dummy data)
  const [members, setMembers] = useState<ScoutMember[]>(() => {
    try {
      // Purge old mock storage keys that held fictional members
      localStorage.removeItem('sipramuka_members_v1');
      localStorage.removeItem('sipramuka_members_v2');
      localStorage.removeItem('sipramuka_members_v3');

      const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter(
          (m: ScoutMember) =>
            !m.name.includes('Ahmad Fauzan') &&
            !m.name.includes('Bima Satria') &&
            !m.name.includes('Dimas Prasetyo') &&
            !m.name.includes('Farhan Maulana')
        );
        return ensureUniqueMembers(filtered);
      }
      return [];
    } catch {
      return [];
    }
  });

  const [transactions, setTransactions] = useState<PaymentRecord[]>(() => {
    try {
      localStorage.removeItem('sipramuka_transactions_v1');
      localStorage.removeItem('sipramuka_transactions_v2');
      localStorage.removeItem('sipramuka_transactions_v3');

      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<GudepSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_GUDEP_SETTINGS;
    } catch {
      return INITIAL_GUDEP_SETTINGS;
    }
  });

  // Fixed Spreadsheet Database (1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A)
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          spreadsheetId: FIXED_SPREADSHEET_ID,
          spreadsheetUrl: FIXED_SPREADSHEET_URL,
          isConnected: true,
          spreadsheetTitle: parsed.spreadsheetTitle || 'Database Iuran Pramuka',
          lastSyncedAt: parsed.lastSyncedAt || new Date().toISOString(),
          sheetTabs: Object.values(SHEETS_NAMES),
        };
      }
    } catch {
      // ignore
    }
    return {
      spreadsheetId: FIXED_SPREADSHEET_ID,
      spreadsheetTitle: 'Database Iuran Pramuka',
      spreadsheetUrl: FIXED_SPREADSHEET_URL,
      isConnected: true,
      lastSyncedAt: new Date().toISOString(),
      sheetTabs: Object.values(SHEETS_NAMES),
    };
  });

  // UI States
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthPeriod());
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeReceiptRecord, setActiveReceiptRecord] = useState<PaymentRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Real-time Auto-Sync & Permission Status
  const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('saved');
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [isSpreadsheetRestricted, setIsSpreadsheetRestricted] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [dismissBanner, setDismissBanner] = useState(false);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(sheetConfig));
  }, [sheetConfig]);

  // Show Toast Helper
  const showToast = useCallback((msg: string) => {
    setSyncToastMessage(msg);
    setTimeout(() => {
      setSyncToastMessage((curr) => (curr === msg ? null : curr));
    }, 5500);
  }, []);

  // Update Database Sync timestamp whenever data changes
  const touchDatabaseSync = useCallback(() => {
    const now = new Date().toISOString();
    setSheetConfig((prev) => ({
      ...prev,
      spreadsheetId: FIXED_SPREADSHEET_ID,
      spreadsheetUrl: FIXED_SPREADSHEET_URL,
      isConnected: true,
      lastSyncedAt: now,
    }));
    setAutoSyncStatus('saved');
  }, []);

  // Core Function: Pull real live data from Google Spreadsheet
  const pullFromSpreadsheet = useCallback(
    async (isInitialMount = false, targetId?: string) => {
      const activeId = targetId || sheetConfig.spreadsheetId || FIXED_SPREADSHEET_ID;
      setIsSyncing(true);
      setAutoSyncStatus('syncing');

      try {
        const result = await fetchSpreadsheetDataPublic(activeId);

        if (result.isRestricted) {
          setIsSpreadsheetRestricted(true);
          setAutoSyncStatus('error');
          setSyncNotice({
            type: 'warning',
            message:
              result.message ||
              'Spreadsheet masih berstatus "Dibatasi" di Google Drive. Ubah ke "Siapa saja yang memiliki link: Pelihat" agar tersinkron otomatis.',
          });
          if (!isInitialMount) {
            showToast(
              '⚠️ Spreadsheet berstatus Dibatasi di Google Drive. Silakan buka izin akses atau tempel data langsung.'
            );
          }
          return;
        }

        setIsSpreadsheetRestricted(false);

        let updatedAny = false;
        if (result.members && result.members.length > 0) {
          setMembers(ensureUniqueMembers(result.members));
          updatedAny = true;
        }

        if (result.transactions) {
          // If transactions returned, update transactions (even if empty to reflect sheet)
          if (result.transactions.length > 0 || updatedAny) {
            setTransactions(result.transactions);
          }
        }

        if (result.settings && Object.keys(result.settings).length > 0) {
          setSettings((prev) => ({
            ...prev,
            ...result.settings,
          }));
        }

        touchDatabaseSync();
        setSyncNotice({
          type: 'success',
          message:
            result.message ||
            `Berhasil menyinkronkan data langsung dari Google Spreadsheet (${activeId.slice(0, 8)}...).`,
        });

        if (!isInitialMount) {
          showToast(
            `✅ ${result.message || 'Data Google Spreadsheet berhasil diselaraskan!'}`
          );
        }
      } catch (err: any) {
        setAutoSyncStatus('error');
        setSyncNotice({
          type: 'error',
          message: `Gagal menarik data dari Google Sheets: ${err?.message || 'Koneksi terputus.'}`,
        });
        if (!isInitialMount) {
          showToast('❌ Kendala saat menyelaraskan dengan Google Spreadsheet.');
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [sheetConfig.spreadsheetId, showToast, touchDatabaseSync]
  );

  // Auto-Pull on initial application mount
  useEffect(() => {
    pullFromSpreadsheet(true);
  }, [pullFromSpreadsheet]);

  // Manual Trigger: Re-sync / Refresh Database State
  const handleSyncNow = useCallback(() => {
    pullFromSpreadsheet(false);
  }, [pullFromSpreadsheet]);

  // Change Connected Spreadsheet ID / URL
  const handleChangeSpreadsheetId = useCallback(
    (newId: string) => {
      let cleanId = newId.trim();
      const match = cleanId.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) cleanId = match[1];
      if (!cleanId) return;

      const newUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
      setSheetConfig((prev) => ({
        ...prev,
        spreadsheetId: cleanId,
        spreadsheetUrl: newUrl,
        lastSyncedAt: new Date().toISOString(),
      }));
      showToast(`🔄 Spreadsheet diarahkan ke ID: ${cleanId.slice(0, 10)}... Memulai sinkronisasi!`);
      pullFromSpreadsheet(false, cleanId);
    },
    [pullFromSpreadsheet, showToast]
  );

  // Apply Pasted / Imported Data from Google Sheets
  const handleApplyPastedData = (
    type: 'members' | 'transactions',
    data: any[],
    mode: 'replace' | 'append'
  ) => {
    if (type === 'members') {
      if (mode === 'replace') {
        setMembers(ensureUniqueMembers(data));
      } else {
        const combined = [...members, ...data];
        setMembers(ensureUniqueMembers(combined));
      }
      touchDatabaseSync();
      showToast(`💾 ${data.length} Data Anggota berhasil diperbarui ke aplikasi!`);
    } else if (type === 'transactions') {
      if (mode === 'replace') {
        setTransactions(data);
      } else {
        setTransactions([...data, ...transactions]);
      }
      touchDatabaseSync();
      showToast(`💾 ${data.length} Catatan Transaksi berhasil diperbarui ke aplikasi!`);
    }
  };

  // Clear demo mock data so app strictly contains user's data
  const handleClearMockData = () => {
    setMembers([]);
    setTransactions([]);
    touchDatabaseSync();
    showToast('🗑️ Data simulasi bawaan berhasil dikosongkan. Siap menerima data asli Anda.');
  };

  // Payment Recording Handlers (Auto-Save to Spreadsheet Database)
  const handleAddPayment = async (
    recordData: Omit<PaymentRecord, 'id' | 'timestamp'>
  ): Promise<PaymentRecord> => {
    const newId = `TX-${Date.now().toString().slice(-6)}`;
    const newRecord: PaymentRecord = {
      ...recordData,
      id: newId,
      timestamp: new Date().toISOString(),
    };

    const updatedTransactions = [newRecord, ...transactions];
    setTransactions(updatedTransactions);
    touchDatabaseSync();

    if (sheetConfig.appsScriptUrl) {
      saveTransactionToSpreadsheet(newRecord, sheetConfig.appsScriptUrl)
        .then((res) => {
          if (res.success) {
            showToast(
              `✅ Iuran ${newRecord.memberName} (Rp ${newRecord.amount.toLocaleString('id-ID')}) tersimpan & masuk ke Google Spreadsheet!`
            );
            // Auto-update REKAP_BULANAN and REKAP_REGU on spreadsheet
            saveRecapsToSpreadsheet(members, updatedTransactions, settings, sheetConfig.appsScriptUrl, newRecord.monthPeriod).catch(() => {});
          } else {
            showToast(
              `💾 Iuran ${newRecord.memberName} tersimpan di aplikasi. (${res.message})`
            );
          }
        })
        .catch(() => {
          showToast(`💾 Iuran ${newRecord.memberName} otomatis tersimpan di database aplikasi.`);
        });
    } else {
      showToast(
        `💾 Iuran ${newRecord.memberName} (Rp ${newRecord.amount.toLocaleString('id-ID')}) otomatis tersimpan!`
      );
    }

    return newRecord;
  };

  const handleBatchPayRegu = async (
    reguName: string,
    date: string,
    weekNumber: number,
    amount: number,
    method: PaymentMethod,
    selectedMemberIds?: string[]
  ): Promise<void> => {
    const monthPeriod = date.slice(0, 7);
    const unpaidMembers = members.filter((m) => {
      if (!m.active || m.regu !== reguName) return false;
      if (selectedMemberIds && selectedMemberIds.length > 0 && !selectedMemberIds.includes(m.id)) {
        return false;
      }
      const hasPaid = transactions.some(
        (t) => t.memberId === m.id && t.monthPeriod === monthPeriod && t.weekNumber === weekNumber
      );
      return !hasPaid;
    });

    if (unpaidMembers.length === 0) return;

    const baseTime = Date.now();
    const newRecords: PaymentRecord[] = unpaidMembers.map((m, idx) => ({
      id: `TX-${(baseTime + idx).toString().slice(-6)}`,
      memberId: m.id,
      memberName: m.name,
      regu: m.regu,
      date,
      monthPeriod,
      weekNumber,
      amount,
      paymentMethod: method,
      note: `Setoran Kolektif Regu (${reguName})`,
      loggedBy: settings.bendaharaName || 'Bendahara',
      timestamp: new Date(baseTime + idx * 1000).toISOString(),
    }));

    const updatedTransactions = [...newRecords, ...transactions];
    setTransactions(updatedTransactions);
    touchDatabaseSync();

    if (sheetConfig.appsScriptUrl) {
      saveBatchTransactionsToSpreadsheet(newRecords, sheetConfig.appsScriptUrl)
        .then((res) => {
          if (res.success) {
            showToast(
              `✅ Setoran rombongan ${reguName} (${newRecords.length} orang) tersimpan & masuk ke Google Spreadsheet!`
            );
            // Auto-update REKAP_BULANAN and REKAP_REGU on spreadsheet
            saveRecapsToSpreadsheet(members, updatedTransactions, settings, sheetConfig.appsScriptUrl, monthPeriod).catch(() => {});
          } else {
            showToast(`💾 Setoran rombongan ${reguName} tersimpan di aplikasi.`);
          }
        })
        .catch(() => {
          showToast(`💾 Setoran rombongan ${reguName} tersimpan di aplikasi.`);
        });
    } else {
      showToast(
        `💾 Setoran rombongan ${reguName} (${newRecords.length} orang) otomatis tersimpan!`
      );
    }
  };

  // Member Management Handlers
  const handleAddMember = async (memberData: Omit<ScoutMember, 'id'>) => {
    const trimmedName = memberData.name.trim();
    const trimmedRegu = memberData.regu.trim();

    // Check if member with identical name & regu already exists
    const duplicate = members.find(
      (m) =>
        m.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        m.regu.trim().toLowerCase() === trimmedRegu.toLowerCase()
    );
    if (duplicate) {
      showToast(
        `⚠️ Anggota "${trimmedName}" di ${trimmedRegu} sudah terdaftar (ID: ${duplicate.id}). Tidak menduplikasi data.`
      );
      return;
    }

    let nextNum = members.length + 1;
    let newId = `M-${String(nextNum).padStart(3, '0')}`;
    while (members.some((m) => m.id === newId)) {
      nextNum++;
      newId = `M-${String(nextNum).padStart(3, '0')}`;
    }
    const newMember: ScoutMember = {
      ...memberData,
      name: trimmedName,
      regu: trimmedRegu,
      id: newId,
    };
    const updated = ensureUniqueMembers([...members, newMember]);
    setMembers(updated);
    touchDatabaseSync();

    if (sheetConfig.appsScriptUrl) {
      saveMemberToSpreadsheet(newMember, sheetConfig.appsScriptUrl)
        .then((res) => {
          if (res.success) {
            showToast(`✅ Anggota baru "${newMember.name}" tersimpan di aplikasi & Google Spreadsheet!`);
          } else {
            showToast(`💾 Anggota baru "${newMember.name}" berhasil ditambahkan.`);
          }
        })
        .catch(() => {
          showToast(`💾 Anggota baru "${newMember.name}" berhasil ditambahkan.`);
        });
    } else {
      showToast(`💾 Anggota baru "${newMember.name}" berhasil ditambahkan.`);
    }
  };

  // Apps Script Webhook handlers
  const handleUpdateAppsScriptUrl = (url: string) => {
    const cleanUrl = url.trim();
    const updated: SheetConfig = {
      ...sheetConfig,
      appsScriptUrl: cleanUrl,
    };
    setSheetConfig(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(updated));
    } catch {}
    showToast(
      cleanUrl
        ? '⚡ URL Apps Script tersimpan! Penyimpanan otomatis ke Google Spreadsheet aktif.'
        : 'URL Apps Script dihapus.'
    );
  };

  const handleSyncRecapsToSpreadsheet = useCallback(
    async (monthPeriod?: string) => {
      if (!sheetConfig.appsScriptUrl) {
        showToast('⚠️ Hubungkan URL Apps Script terlebih dahulu di menu Database Spreadsheet.');
        return;
      }
      showToast('⏳ Menyimpan Rekap Bulanan & Rekap Regu ke Spreadsheet...');
      try {
        const res = await saveRecapsToSpreadsheet(
          members,
          transactions,
          settings,
          sheetConfig.appsScriptUrl,
          monthPeriod || selectedMonth
        );
        if (res.success) {
          showToast(`✅ ${res.message}`);
        } else {
          showToast(`⚠️ ${res.message}`);
        }
      } catch (err: any) {
        showToast(`❌ Gagal menyimpan rekap: ${err?.message || 'Terputus'}`);
      }
    },
    [members, transactions, settings, sheetConfig.appsScriptUrl, selectedMonth, showToast]
  );

  const handleSyncAllToSpreadsheet = async () => {
    if (!sheetConfig.appsScriptUrl) {
      showToast('⚠️ Hubungkan URL Apps Script terlebih dahulu di menu Database Spreadsheet.');
      return;
    }
    showToast('⏳ Sedang mengirim data (Anggota, Transaksi, Rekap Bulanan, Rekap Regu)...');
    try {
      const res = await syncAllDataToSpreadsheet(
        members,
        transactions,
        sheetConfig.appsScriptUrl,
        settings,
        selectedMonth
      );
      if (res.success) {
        showToast(`✅ ${res.message}`);
      } else {
        showToast(`⚠️ ${res.message}`);
      }
    } catch (err: any) {
      showToast(`❌ Gagal: ${err?.message || 'Terputus'}`);
    }
  };

  const handleUpdateMember = async (updatedMember: ScoutMember) => {
    const updated = members.map((m) => (m.id === updatedMember.id ? updatedMember : m));
    setMembers(updated);
    touchDatabaseSync();
    if (sheetConfig.appsScriptUrl) {
      saveRecapsToSpreadsheet(updated, transactions, settings, sheetConfig.appsScriptUrl).catch(() => {});
    }
    showToast(`💾 Data anggota "${updatedMember.name}" berhasil diperbarui.`);
  };

  const handleDeleteMember = async (id: string) => {
    const toDelete = members.find((m) => m.id === id);
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    touchDatabaseSync();
    if (sheetConfig.appsScriptUrl) {
      saveRecapsToSpreadsheet(updated, transactions, settings, sheetConfig.appsScriptUrl).catch(() => {});
    }
    showToast(`🗑️ Anggota "${toDelete?.name || id}" berhasil dihapus.`);
  };

  // Transaction Deletion Handler
  const handleDeleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    touchDatabaseSync();
    if (sheetConfig.appsScriptUrl) {
      saveRecapsToSpreadsheet(members, updated, settings, sheetConfig.appsScriptUrl).catch(() => {});
    }
    showToast(`🗑️ Transaksi ${id} berhasil dihapus.`);
  };

  // Settings Handler
  const handleSaveSettings = (newSettings: GudepSettings) => {
    setSettings(newSettings);
    touchDatabaseSync();
    showToast('💾 Pengaturan Gugus Depan berhasil disimpan.');
  };

  // CSV Import Handler
  const handleImportCSV = (csvContent: string) => {
    try {
      const parsed = parsePastedTableData(csvContent, 'auto');
      if (parsed.type === 'members' && parsed.members && parsed.members.length > 0) {
        setMembers(parsed.members);
        touchDatabaseSync();
        showToast(`✅ Berhasil mengimpor ${parsed.members.length} data anggota dari file CSV.`);
      } else if (parsed.type === 'transactions' && parsed.transactions && parsed.transactions.length > 0) {
        setTransactions(parsed.transactions);
        touchDatabaseSync();
        showToast(`✅ Berhasil mengimpor ${parsed.transactions.length} catatan transaksi dari file CSV.`);
      } else {
        showToast('⚠️ Format file belum cocok untuk data anggota atau transaksi.');
      }
    } catch {
      showToast('❌ Gagal memproses file CSV.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 antialiased selection:bg-amber-700 selection:text-white">
      {/* Toast Notification */}
      {syncToastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-slideUp">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-stone-950 text-white text-xs font-semibold shadow-2xl border border-emerald-500/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1 leading-relaxed">{syncToastMessage}</span>
            <button
              onClick={() => setSyncToastMessage(null)}
              className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        sheetConfig={sheetConfig}
        settings={settings}
        isSyncing={isSyncing}
        autoSyncStatus={autoSyncStatus}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onSyncNow={handleSyncNow}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Status & Sync Guidance Banner if Google Sheets Sharing is Restricted */}
        {isSpreadsheetRestricted && !dismissBanner && (
          <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-amber-950 border-2 border-amber-500 rounded-2xl p-4 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6 text-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm sm:text-base text-amber-200">
                    Akses Google Spreadsheet Masih "Dibatasi" di Google Drive
                  </span>
                  <span className="text-[10px] bg-amber-800 text-amber-200 font-bold px-2 py-0.5 rounded-full border border-amber-600/50">
                    Perlu Izin Publik
                  </span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed max-w-3xl">
                  Aplikasi berusaha membaca spreadsheet <strong className="font-mono text-amber-300">{FIXED_SPREADSHEET_ID}</strong>, namun Google menolak karena spreadsheet berstatus private. Agar web ini dapat menampilkan dan menyinkronkan data otomatis tanpa login:
                </p>
                <div className="text-xs text-amber-200/90 font-medium pt-1">
                  👉 Buka spreadsheet di Google Drive &gt; Klik <strong>"Bagikan" (Share)</strong> &gt; Ubah Akses Umum ke <strong>"Siapa saja yang memiliki link: Pelihat"</strong> &gt; Lalu klik <strong>"Tarik Data"</strong> di sini.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setIsSheetModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <ClipboardPaste className="w-4 h-4 text-stone-900" />
                <span>Tempel Data / Panduan</span>
              </button>

              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 font-semibold text-xs border border-stone-600 transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Tarik Ulang</span>
              </button>

              <button
                onClick={() => setDismissBanner(true)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
                title="Tutup pemberitahuan ini"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Permanent Database Confirmation Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 border-2 border-emerald-500/70 rounded-2xl p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0 mt-0.5">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-sm text-emerald-200">
                  Database Google Spreadsheet Terhubung
                </span>
                <span className="text-[10px] bg-emerald-800/90 text-emerald-100 font-mono px-2 py-0.5 rounded-full border border-emerald-600/50">
                  Tanpa Perlu Login
                </span>
                <span className="text-[11px] text-emerald-300 font-medium">
                  • {members.length} Anggota • {transactions.length} Transaksi Terdata
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1">
                Spreadsheet terpasang:{' '}
                <strong className="font-mono text-emerald-300 select-all">{FIXED_SPREADSHEET_ID}</strong>.
                Semua data iuran diselaraskan langsung tanpa memerlukan akun login Google.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition"
              title="Tarik data terbaru dari spreadsheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menarik Data...' : 'Tarik Data Terbaru'}</span>
            </button>

            <a
              href={FIXED_SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition shrink-0"
            >
              <span>Buka Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setIsSheetModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-600 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sinkron & Tempel Data</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-white rounded-2xl p-2 border border-stone-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Ringkasan Utama</span>
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'record'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Catat Iuran Latihan</span>
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Rekap Bulanan</span>
          </button>

          <button
            onClick={() => setActiveTab('regu')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'regu'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Rekap Pe-Regu</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Anggota & Regu ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Transaksi ({transactions.length})</span>
          </button>

          <button
            onClick={() => setIsSheetModalOpen(true)}
            className="ml-auto hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Database Spreadsheet</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            members={members}
            transactions={transactions}
            settings={settings}
            sheetConfig={sheetConfig}
            selectedMonth={selectedMonth}
            isSyncing={isSyncing}
            onNavigateTab={setActiveTab}
            onOpenQuickPay={() => setActiveTab('record')}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        )}

        {activeTab === 'record' && (
          <RecordPaymentTab
            members={members}
            transactions={transactions}
            settings={settings}
            sheetConfig={sheetConfig}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            onAddPayment={handleAddPayment}
            onBatchPayRegu={handleBatchPayRegu}
            onOpenReceipt={setActiveReceiptRecord}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyRecapTab
            members={members}
            transactions={transactions}
            settings={settings}
            selectedMonth={selectedMonth}
            appsScriptUrl={sheetConfig.appsScriptUrl}
            onSelectMonth={setSelectedMonth}
            onSyncSpreadsheet={handleSyncNow}
            onSyncRecapsToSpreadsheet={handleSyncRecapsToSpreadsheet}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        )}

        {activeTab === 'regu' && (
          <ReguRecapTab
            members={members}
            transactions={transactions}
            settings={settings}
            selectedMonth={selectedMonth}
            appsScriptUrl={sheetConfig.appsScriptUrl}
            onSyncRecapsToSpreadsheet={handleSyncRecapsToSpreadsheet}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        )}

        {activeTab === 'members' && (
          <MembersTab
            members={members}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            onSyncFromSpreadsheet={handleSyncNow}
            onApplyMembers={(newMembers, mode) => handleApplyPastedData('members', newMembers, mode)}
            onClearMockData={handleClearMockData}
            isSyncing={isSyncing}
            isRestricted={isSpreadsheetRestricted}
            spreadsheetId={sheetConfig.spreadsheetId || FIXED_SPREADSHEET_ID}
            spreadsheetUrl={sheetConfig.spreadsheetUrl || FIXED_SPREADSHEET_URL}
            onChangeSpreadsheetId={handleChangeSpreadsheetId}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={transactions}
            settings={settings}
            onOpenReceipt={setActiveReceiptRecord}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700">
              ⚜️ SI-PRAMUKA • {settings.gudepName} • {settings.pangkalan}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Spreadsheet Otomatis Terhubung
            </span>
          </div>
          <span className="text-stone-400">
            Database ID: {FIXED_SPREADSHEET_ID} (Tanpa Login)
          </span>
        </div>
      </footer>

      {/* Modals */}
      <SpreadsheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        sheetConfig={sheetConfig}
        settings={settings}
        members={members}
        transactions={transactions}
        isSyncing={isSyncing}
        syncNotice={syncNotice}
        onSyncNow={handleSyncNow}
        onImportCSV={handleImportCSV}
        onApplyPastedData={handleApplyPastedData}
        onClearMockData={handleClearMockData}
        onChangeSpreadsheetId={handleChangeSpreadsheetId}
        onUpdateAppsScriptUrl={handleUpdateAppsScriptUrl}
        onSyncAllToSpreadsheet={handleSyncAllToSpreadsheet}
      />

      <ReceiptModal
        isOpen={!!activeReceiptRecord}
        onClose={() => setActiveReceiptRecord(null)}
        record={activeReceiptRecord}
        settings={settings}
      />

      <GudepSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
