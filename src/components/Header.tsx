import React from 'react';
import { User } from 'firebase/auth';
import { FileSpreadsheet, RefreshCw, Settings, ExternalLink, ShieldCheck, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TunasKelapaIcon, WosmIcon } from './ScoutIcons';
import { GudepSettings, SheetConfig } from '../types/scout';

interface HeaderProps {
  user: User | null;
  sheetConfig: SheetConfig;
  settings: GudepSettings;
  isSyncing: boolean;
  autoSyncStatus?: 'idle' | 'syncing' | 'saved' | 'error';
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onOpenSheetModal: () => void;
  onOpenSettingsModal: () => void;
  onSyncNow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  sheetConfig,
  settings,
  isSyncing,
  autoSyncStatus = 'idle',
  onLoginClick,
  onLogoutClick,
  onOpenSheetModal,
  onOpenSettingsModal,
  onSyncNow,
}) => {
  return (
    <header className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 text-amber-50 shadow-lg border-b-4 border-amber-600 sticky top-0 z-30">
      {/* Top Banner Ribbon */}
      <div className="bg-amber-800/80 px-4 py-1 text-xs text-amber-200 border-b border-amber-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-700 text-white shadow-xs">
            GERAKAN PRAMUKA INDONESIA
          </span>
          <span className="hidden sm:inline font-medium text-amber-100">
            {settings.gudepName} • {settings.pangkalan}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="hidden md:inline text-amber-300">
            Iuran Rutin: Rp {settings.defaultFeePerMeeting.toLocaleString('id-ID')} / latihan
          </span>
          <span className="text-amber-200/90 font-mono">
            {settings.meetingDay}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md border-2 border-amber-400">
              <TunasKelapaIcon className="w-8 h-8 text-amber-100 drop-shadow" />
              <div className="absolute -bottom-1 -right-1 bg-violet-700 text-amber-100 rounded-full p-0.5 border border-amber-300 shadow">
                <WosmIcon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                  SI-PRAMUKA
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-400/30">
                  Iuran & Rekap
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                Aplikasi Rekapitulasi Iuran Rutin Bulanan & Pe-Regu
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSettingsModal}
            className="md:hidden p-2 rounded-lg bg-amber-900/60 text-amber-200 hover:text-white hover:bg-amber-800 transition"
            title="Pengaturan Gudep"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Spreadsheet Connection */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          {/* Spreadsheet Status Capsule */}
          <div className="flex items-center gap-1 bg-stone-900/90 rounded-lg p-1 border border-amber-700/50 shadow-inner">
            {sheetConfig.isConnected ? (
              <div className="flex items-center gap-2 px-2.5 py-1 text-xs">
                <span className="flex h-2.5 w-2.5 relative">
                  {autoSyncStatus === 'syncing' || isSyncing ? (
                    <span className="animate-spin inline-flex h-full w-full rounded-full border-2 border-cyan-400 border-t-transparent"></span>
                  ) : (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </>
                  )}
                </span>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="max-w-[120px] sm:max-w-[160px] truncate">
                        {sheetConfig.spreadsheetTitle || 'Terkoneksi Sheets'}
                      </span>
                    </span>
                    <span className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-emerald-900/80 text-emerald-200 font-mono border border-emerald-700/50">
                      Auto-Sync 2-Arah
                    </span>
                  </div>
                  <span className="text-[9px] text-stone-400">
                    {autoSyncStatus === 'syncing' || isSyncing
                      ? 'Menyelaraskan data...'
                      : sheetConfig.lastSyncedAt
                      ? `Sync: ${new Date(sheetConfig.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                      : 'Auto-Sync Aktif'}
                  </span>
                </div>

                <div className="flex items-center gap-1 ml-1 border-l border-stone-700 pl-2">
                  <button
                    onClick={onSyncNow}
                    disabled={isSyncing || autoSyncStatus === 'syncing'}
                    className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-emerald-300 transition"
                    title="Segarkan data: Ambil & tarik data terbaru dari Google Spreadsheet"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || autoSyncStatus === 'syncing' ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>

                  {sheetConfig.spreadsheetUrl && (
                    <a
                      href={sheetConfig.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-blue-300 transition"
                      title="Buka Spreadsheet di Google Sheets"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={onOpenSheetModal}
                    className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 font-medium transition"
                  >
                    Atur
                  </button>
                </div>
              </div>
            ) : user ? (
              <button
                onClick={onOpenSheetModal}
                className="flex items-center gap-2 px-3 py-1 text-xs text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/60 rounded-md transition group"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
                <span className="font-bold text-white">Hubungkan Spreadsheet</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-700 text-[10px] text-white font-bold">
                  1-Klik
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenSheetModal}
                className="flex items-center gap-2 px-2.5 py-1 text-xs text-amber-200 hover:text-white transition group"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                <span className="font-medium">Hubungkan Google Sheets</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-800/80 text-[10px] text-amber-300 font-mono">
                  + Drive
                </span>
              </button>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettingsModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 border border-amber-700/50 transition"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Pengaturan</span>
          </button>

          {/* Google Auth Button / User Profile */}
          {user ? (
            <div className="flex items-center gap-2 bg-stone-900/80 border border-amber-800/60 rounded-lg pl-2 pr-1 py-1">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-6 h-6 rounded-full border border-amber-400"
                />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs text-amber-100 max-w-[100px] sm:max-w-[120px] truncate">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <button
                onClick={onLogoutClick}
                className="text-[10px] text-stone-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-stone-800 transition"
                title="Keluar dari akun Google"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-stone-800 hover:bg-stone-100 font-medium text-xs shadow-sm border border-stone-200 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Login Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
