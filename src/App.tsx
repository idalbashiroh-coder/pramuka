/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
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
import { PopupBlockedModal } from './components/PopupBlockedModal';

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
  googleSignIn,
  initAuth,
  logout,
  getAccessToken,
  ensureAccessToken,
  hasActiveToken,
  setAccessToken,
} from './services/firebaseAuth';
import {
  createScoutSpreadsheet,
  verifySpreadsheet,
  populateSpreadsheetData,
  pullSpreadsheetData,
  appendTransactionToSheet,
  appendTransactionsBatchToSheet,
  updateRecapTabsInSheet,
  ensureSpreadsheetTabs,
  SHEETS_NAMES,
  FIXED_SPREADSHEET_ID,
  FIXED_SPREADSHEET_URL,
} from './services/sheetsService';
import { getMonthPeriod } from './utils/formatters';

const STORAGE_KEYS = {
  MEMBERS: 'sipramuka_members_v1',
  TRANSACTIONS: 'sipramuka_transactions_v2',
  SETTINGS: 'sipramuka_settings_v1',
  SHEET_CONFIG: 'sipramuka_sheet_config_v2',
};

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);

  // Application Data States
  const [members, setMembers] = useState<ScoutMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [transactions, setTransactions] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
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
      lastSyncedAt: null,
      sheetTabs: Object.values(SHEETS_NAMES),
    };
  });

  // UI States
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthPeriod());
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPopupBlockedModalOpen, setIsPopupBlockedModalOpen] = useState(false);
  const [activeReceiptRecord, setActiveReceiptRecord] = useState<PaymentRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Real-time Two-way Auto-Sync States
  const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Synchronization locking refs
  const isPullingRef = useRef(false);
  const isPushingRef = useRef(false);

  // Live state refs to allow comparisons in callbacks without stale closures or re-triggers
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;
  const membersRef = useRef(members);
  membersRef.current = members;

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
    }, 4500);
  }, []);

  // -------------------------------------------------------------
  // TWO-WAY SYNC: 1. Auto-Pull from Google Spreadsheet -> App
  // -------------------------------------------------------------
  const pullUpdatesFromSheet = useCallback(
    async (isSilent = true) => {
      const targetId = FIXED_SPREADSHEET_ID;
      if (isPullingRef.current || isPushingRef.current) {
        return;
      }

      // Only pull if an active token is available; NEVER open popups silently in background
      const token = getAccessToken();
      if (!token) return;

      try {
        isPullingRef.current = true;
        if (!isSilent) setAutoSyncStatus('syncing');

        // Ensure all required tabs exist in the fixed spreadsheet
        await ensureSpreadsheetTabs(token, targetId);

        const pulled = await pullSpreadsheetData(token, targetId);

        let hasNewTransactions = false;
        let hasNewMembers = false;

        // 1. Evaluate Transactions updates (strictly match spreadsheet state, even if empty 0 transactions)
        if (Array.isArray(pulled.transactions)) {
          const currentTx = transactionsRef.current;
          const currentTxKey = currentTx.map((t) => `${t.id}:${t.amount}:${t.date}:${t.weekNumber}`).join(',');
          const pulledTxKey = pulled.transactions.map((t) => `${t.id}:${t.amount}:${t.date}:${t.weekNumber}`).join(',');

          if (currentTxKey !== pulledTxKey || currentTx.length !== pulled.transactions.length) {
            hasNewTransactions = true;
            setTransactions(pulled.transactions);
          }
        }

        // 2. Evaluate Members updates
        if (Array.isArray(pulled.members) && pulled.members.length > 0) {
          const currentMem = membersRef.current;
          const currentMemberKey = currentMem.map((m) => `${m.id}:${m.name}:${m.active}`).join(',');
          const pulledMemberKey = pulled.members.map((m) => `${m.id}:${m.name}:${m.active}`).join(',');

          if (currentMemberKey !== pulledMemberKey || currentMem.length !== pulled.members.length) {
            hasNewMembers = true;
            setMembers(pulled.members);
          }
        }

        // 3. Evaluate Settings updates
        if (pulled.settings && Object.keys(pulled.settings).length > 0) {
          setSettings((prev) => ({ ...prev, ...pulled.settings }));
        }

        setSheetConfig((prev) => ({
          ...prev,
          spreadsheetId: FIXED_SPREADSHEET_ID,
          spreadsheetUrl: FIXED_SPREADSHEET_URL,
          isConnected: true,
          lastSyncedAt: new Date().toISOString(),
        }));

        setAutoSyncStatus('saved');

        if (hasNewTransactions || hasNewMembers) {
          showToast(
            `🔄 Data dari Google Spreadsheet database berhasil dimuat otomatis ke aplikasi!`
          );
        }
      } catch (err) {
        console.warn('Background auto-pull check notice:', err);
      } finally {
        isPullingRef.current = false;
      }
    },
    [showToast]
  );

  // Init Auth on load
  useEffect(() => {
    const unsubscribe = initAuth(
      async (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setAccessToken(token);
          // Always pull latest data immediately from the fixed spreadsheet
          pullUpdatesFromSheet(false);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [pullUpdatesFromSheet]);

  // Background interval polling & window focus listener (active only when logged in)
  useEffect(() => {
    if (getAccessToken()) {
      pullUpdatesFromSheet(true);
    }

    // Check Google Sheets periodically for external edits if user is authenticated
    const interval = setInterval(() => {
      if (getAccessToken()) {
        pullUpdatesFromSheet(true);
      }
    }, 20000);

    // Also check when the user switches tabs back to SI-PRAMUKA
    const handleFocus = () => {
      if (getAccessToken()) {
        pullUpdatesFromSheet(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && getAccessToken()) {
        pullUpdatesFromSheet(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pullUpdatesFromSheet]);

  // -------------------------------------------------------------
  // TWO-WAY SYNC: 2. Auto-Save from App -> Google Spreadsheet
  // -------------------------------------------------------------
  const autoSaveFullToSpreadsheet = useCallback(
    async (
      currentMembers: ScoutMember[],
      currentTransactions: PaymentRecord[],
      currentSettings: GudepSettings
    ) => {
      const targetId = FIXED_SPREADSHEET_ID;

      const token = getAccessToken();
      if (!token) {
        // Saved safely in localStorage; will sync to Sheets once user logs in
        return;
      }

      try {
        isPushingRef.current = true;
        setAutoSyncStatus('syncing');

        await ensureSpreadsheetTabs(token, targetId);
        await populateSpreadsheetData(
          token,
          targetId,
          currentSettings,
          currentMembers,
          currentTransactions
        );

        setSheetConfig((prev) => ({
          ...prev,
          spreadsheetId: FIXED_SPREADSHEET_ID,
          spreadsheetUrl: FIXED_SPREADSHEET_URL,
          isConnected: true,
          lastSyncedAt: new Date().toISOString(),
        }));

        setAutoSyncStatus('saved');
        showToast('💾 Perubahan data otomatis tersimpan ke Google Spreadsheet utama.');
      } catch (err) {
        console.warn('Auto-save to spreadsheet notice:', err);
        setAutoSyncStatus('error');
      } finally {
        isPushingRef.current = false;
      }
    },
    [showToast]
  );

  // Auth Handlers
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setIsPopupBlockedModalOpen(false);
        showToast('🔄 Login berhasil! Menyelaraskan dengan Spreadsheet Database...');
        await pullUpdatesFromSheet(false);
      }
    } catch (err: any) {
      const code = String(err?.code || '').toLowerCase();
      const msg = String(err?.message || '').toLowerCase();
      if (code.includes('popup-blocked') || msg.includes('popup-blocked')) {
        setIsPopupBlockedModalOpen(true);
      } else if (code.includes('popup-closed') || msg.includes('popup-closed')) {
        showToast('ℹ️ Login Google ditutup sebelum selesai.');
      } else if (code.includes('cancelled') || msg.includes('cancelled')) {
        showToast('ℹ️ Permintaan login dibatalkan.');
      } else {
        console.warn('Login notice:', err);
        showToast('⚠️ Login Google belum berhasil: ' + (err.message || ''));
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.warn('Logout notice:', err);
    }
  };

  // Payment Recording Handlers (Auto-Save to Sheets)
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

    // Live Append to Google Spreadsheet database immediately if connected
    const token = getAccessToken();
    if (token) {
      setAutoSyncStatus('syncing');
      try {
        await ensureSpreadsheetTabs(token, FIXED_SPREADSHEET_ID);
        await appendTransactionToSheet(token, FIXED_SPREADSHEET_ID, newRecord);
        // Also refresh recap tabs in Google Sheets
        await updateRecapTabsInSheet(
          token,
          FIXED_SPREADSHEET_ID,
          settings,
          members,
          updatedTransactions
        );

        setSheetConfig((prev) => ({
          ...prev,
          spreadsheetId: FIXED_SPREADSHEET_ID,
          spreadsheetUrl: FIXED_SPREADSHEET_URL,
          isConnected: true,
          lastSyncedAt: new Date().toISOString(),
        }));
        setAutoSyncStatus('saved');
        showToast(`💾 Iuran ${newRecord.memberName} otomatis tersimpan ke Google Spreadsheet.`);
      } catch (err: any) {
        console.warn('Live append warning:', err);
        setAutoSyncStatus('error');
        showToast(`⚠️ Iuran tersimpan lokal. Gagal memperbarui spreadsheet: ${err.message || 'Koneksi terputus'}`);
      }
    } else {
      showToast(`💾 Iuran ${newRecord.memberName} tersimpan di aplikasi. Login Google untuk auto-sync cloud.`);
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

    // Live sync to Google Sheets database if connected
    const token = getAccessToken();
    if (token) {
      setAutoSyncStatus('syncing');
      try {
        await ensureSpreadsheetTabs(token, FIXED_SPREADSHEET_ID);
        await appendTransactionsBatchToSheet(token, FIXED_SPREADSHEET_ID, newRecords);
        await updateRecapTabsInSheet(
          token,
          FIXED_SPREADSHEET_ID,
          settings,
          members,
          updatedTransactions
        );

        setSheetConfig((prev) => ({
          ...prev,
          spreadsheetId: FIXED_SPREADSHEET_ID,
          spreadsheetUrl: FIXED_SPREADSHEET_URL,
          isConnected: true,
          lastSyncedAt: new Date().toISOString(),
        }));
        setAutoSyncStatus('saved');
        showToast(`💾 Setoran rombongan ${reguName} (${newRecords.length} orang) otomatis tersimpan ke Google Spreadsheet.`);
      } catch (err: any) {
        console.warn('Batch append warning:', err);
        setAutoSyncStatus('error');
        showToast(`⚠️ Tersimpan lokal. Gagal memperbarui spreadsheet: ${err.message || 'Koneksi terputus'}`);
      }
    } else {
      showToast(`💾 Setoran rombongan ${reguName} (${newRecords.length} orang) tersimpan di aplikasi. Login Google untuk auto-sync cloud.`);
    }
  };

  // Google Sheets Handlers
  const handleCreateNewSheet = async (title: string) => {
    setIsSyncing(true);
    setAutoSyncStatus('syncing');
    try {
      let token = getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken;
        if (loginRes?.user) setUser(loginRes.user);
      }
      if (!token) return;

      const created = await createScoutSpreadsheet(
        token,
        title,
        settings,
        members,
        transactions
      );

      setSheetConfig({
        spreadsheetId: created.spreadsheetId,
        spreadsheetTitle: created.title,
        spreadsheetUrl: created.spreadsheetUrl,
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
        sheetTabs: Object.values(SHEETS_NAMES),
      });

      setAutoSyncStatus('saved');
      showToast(`✅ Google Spreadsheet "${created.title}" berhasil dibuat dan terhubung otomatis 2-arah!`);
    } catch (err: any) {
      showToast('⚠️ Gagal membuat spreadsheet: ' + (err.message || ''));
      setAutoSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectExistingSheet = async (sheetIdOrUrl: string) => {
    let sheetId = sheetIdOrUrl.trim();
    const match = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      sheetId = match[1];
    }

    setIsSyncing(true);
    setAutoSyncStatus('syncing');
    try {
      let token = getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken;
        if (loginRes?.user) setUser(loginRes.user);
      }
      if (!token) return;

      const verified = await verifySpreadsheet(token, sheetId);

      setSheetConfig({
        spreadsheetId: sheetId,
        spreadsheetTitle: verified.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
        sheetTabs: verified.sheetNames,
      });

      // Immediately pull current data from that sheet and match it 100%
      const pulled = await pullSpreadsheetData(token, sheetId);
      if (Array.isArray(pulled.members) && pulled.members.length > 0) setMembers(pulled.members);
      if (Array.isArray(pulled.transactions)) setTransactions(pulled.transactions);
      if (pulled.settings) setSettings((prev) => ({ ...prev, ...pulled.settings }));

      setAutoSyncStatus('saved');
      showToast(`✅ Terhubung dengan Google Spreadsheet "${verified.title}". Sinkronisasi 2-arah aktif.`);
    } catch (err: any) {
      showToast('⚠️ Gagal menghubungkan spreadsheet: ' + (err.message || ''));
      setAutoSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToSheet = async () => {
    setIsSyncing(true);
    setAutoSyncStatus('syncing');
    try {
      let token = getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken;
        if (loginRes?.user) setUser(loginRes.user);
      }
      if (!token) {
        showToast('⚠️ Silakan Login Google terlebih dahulu.');
        return;
      }
      await ensureSpreadsheetTabs(token, FIXED_SPREADSHEET_ID);
      await populateSpreadsheetData(
        token,
        FIXED_SPREADSHEET_ID,
        settings,
        members,
        transactions
      );
      setSheetConfig((prev) => ({
        ...prev,
        spreadsheetId: FIXED_SPREADSHEET_ID,
        spreadsheetUrl: FIXED_SPREADSHEET_URL,
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
      }));
      setAutoSyncStatus('saved');
      showToast('✅ Seluruh data aplikasi berhasil diperbarui ke Google Spreadsheet database!');
    } catch (err: any) {
      showToast('⚠️ Gagal sinkronisasi: ' + (err.message || ''));
      setAutoSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSheet = async () => {
    setIsSyncing(true);
    setAutoSyncStatus('syncing');
    try {
      let token = getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken;
        if (loginRes?.user) setUser(loginRes.user);
      }
      if (!token) {
        showToast('⚠️ Silakan Login Google terlebih dahulu.');
        return;
      }
      await ensureSpreadsheetTabs(token, FIXED_SPREADSHEET_ID);
      const pulled = await pullSpreadsheetData(token, FIXED_SPREADSHEET_ID);
      if (Array.isArray(pulled.members) && pulled.members.length > 0) {
        setMembers(pulled.members);
      }
      if (Array.isArray(pulled.transactions)) {
        setTransactions(pulled.transactions);
      }
      if (pulled.settings && Object.keys(pulled.settings).length > 0) {
        setSettings((prev) => ({ ...prev, ...pulled.settings }));
      }
      setSheetConfig((prev) => ({
        ...prev,
        spreadsheetId: FIXED_SPREADSHEET_ID,
        spreadsheetUrl: FIXED_SPREADSHEET_URL,
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
      }));
      setAutoSyncStatus('saved');
      showToast(
        `✅ Berhasil memuat data dari Spreadsheet Database (${FIXED_SPREADSHEET_ID.slice(0, 8)}...)! (${pulled.transactions.length} transaksi, ${pulled.members?.length || members.length} anggota)`
      );
    } catch (err: any) {
      console.warn('Pull from sheet notice:', err);
      showToast('⚠️ Gagal memuat data dari spreadsheet: ' + (err.message || ''));
      setAutoSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Member Management Handlers (Auto-Save to Sheets)
  const handleAddMember = async (memberData: Omit<ScoutMember, 'id'>) => {
    const newId = `M-${String(members.length + 1).padStart(3, '0')}`;
    const newMember: ScoutMember = {
      ...memberData,
      id: newId,
    };
    const updated = [...members, newMember];
    setMembers(updated);
    autoSaveFullToSpreadsheet(updated, transactions, settings);
  };

  const handleUpdateMember = async (updatedMember: ScoutMember) => {
    const updated = members.map((m) => (m.id === updatedMember.id ? updatedMember : m));
    setMembers(updated);
    autoSaveFullToSpreadsheet(updated, transactions, settings);
  };

  const handleDeleteMember = async (id: string) => {
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    autoSaveFullToSpreadsheet(updated, transactions, settings);
  };

  const handleDeleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    autoSaveFullToSpreadsheet(members, updated, settings);
  };

  const handleSaveSettings = (newSettings: GudepSettings) => {
    setSettings(newSettings);
    autoSaveFullToSpreadsheet(members, transactions, newSettings);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans">
      {/* Top Notification Toast for Real-time Auto-Sync updates */}
      {syncToastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-bounce-short">
          <div className="bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-500/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                <Bell className="w-3.5 h-3.5" />
              </span>
              <span className="font-medium text-stone-100">{syncToastMessage}</span>
            </div>
            <button
              onClick={() => setSyncToastMessage(null)}
              className="p-1 text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        user={user}
        sheetConfig={sheetConfig}
        settings={settings}
        isSyncing={isSyncing}
        autoSyncStatus={autoSyncStatus}
        onLoginClick={handleLogin}
        onLogoutClick={handleLogout}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onSyncNow={handlePullFromSheet}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Fixed Database Connection Status Banner */}
        {!user && (
          <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-emerald-950 border border-amber-700/60 rounded-2xl p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-amber-200">
                    Database Google Spreadsheet Utama Telah Ditetapkan
                  </span>
                  <span className="text-[10px] bg-emerald-800 text-emerald-200 font-mono px-2 py-0.5 rounded-full border border-emerald-600/50">
                    ID: 1deLLyW5F5l...
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1">
                  Spreadsheet <strong>1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A</strong> telah menjadi database pasti. Masuk dengan akun Google untuk mengaktifkan sinkronisasi otomatis 2-arah.
                </p>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-stone-900 hover:bg-stone-100 font-bold text-xs shadow-sm transition shrink-0 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Login Google Sekarang</span>
            </button>
          </div>
        )}

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
            <span>Rekap Bulanan (Otomatis)</span>
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
            <span>Data Anggota & Regu</span>
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
            <span>Riwayat Transaksi</span>
          </button>

          <button
            onClick={() => setIsSheetModalOpen(true)}
            className="ml-auto hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>{sheetConfig.isConnected ? 'Kelola Spreadsheet' : 'Hubungkan Spreadsheet'}</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            user={user}
            members={members}
            transactions={transactions}
            settings={settings}
            sheetConfig={sheetConfig}
            selectedMonth={selectedMonth}
            isSyncing={isSyncing}
            onNavigateTab={setActiveTab}
            onOpenQuickPay={() => setActiveTab('record')}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            onQuickCreateSheet={() => handleCreateNewSheet(`Iuran Rutin Pramuka - ${settings.pangkalan}`)}
          />
        )}

        {activeTab === 'record' && (
          <RecordPaymentTab
            members={members}
            transactions={transactions}
            settings={settings}
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
            onSelectMonth={setSelectedMonth}
            onSyncSpreadsheet={handlePushToSheet}
          />
        )}

        {activeTab === 'regu' && (
          <ReguRecapTab
            members={members}
            transactions={transactions}
            settings={settings}
            selectedMonth={selectedMonth}
          />
        )}

        {activeTab === 'members' && (
          <MembersTab
            members={members}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
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
            {sheetConfig.isConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Auto-Sync 2-Arah Aktif
              </span>
            )}
          </div>
          <span className="text-stone-400">
            Database Spreadsheet Otomatis & Rekapitulasi Iuran Rutin
          </span>
        </div>
      </footer>

      {/* Modals */}
      <SpreadsheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        user={user}
        sheetConfig={sheetConfig}
        settings={settings}
        members={members}
        transactions={transactions}
        isSyncing={isSyncing}
        hasToken={hasActiveToken()}
        onLoginClick={handleLogin}
        onReauthClick={handleLogin}
        onCreateNewSheet={handleCreateNewSheet}
        onConnectExistingSheet={handleConnectExistingSheet}
        onPushToSheet={handlePushToSheet}
        onPullFromSheet={handlePullFromSheet}
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

      <PopupBlockedModal
        isOpen={isPopupBlockedModalOpen}
        onClose={() => setIsPopupBlockedModalOpen(false)}
        onRetryLogin={handleLogin}
      />
    </div>
  );
}
