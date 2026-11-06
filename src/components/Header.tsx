import React from 'react';
import { FileSpreadsheet, RefreshCw, Settings, ExternalLink, CheckCircle2 } from 'lucide-react';
import { TunasKelapaIcon, WosmIcon } from './ScoutIcons';
import { GudepSettings, SheetConfig } from '../types/scout';

interface HeaderProps {
  sheetConfig: SheetConfig;
  settings: GudepSettings;
  isSyncing: boolean;
  autoSyncStatus?: 'idle' | 'syncing' | 'saved' | 'error';
  onOpenSheetModal: () => void;
  onOpenSettingsModal: () => void;
  onSyncNow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sheetConfig,
  settings,
  isSyncing,
  autoSyncStatus = 'idle',
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

        {/* Action Controls & Permanent Spreadsheet Database (No Login Required) */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          {/* Spreadsheet Status Capsule */}
          <div className="flex items-center gap-1.5 bg-stone-900/95 rounded-xl p-1.5 border border-emerald-500/40 shadow-inner">
            <div className="flex items-center gap-2 px-2.5 py-1 text-xs">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                {autoSyncStatus === 'syncing' || isSyncing ? (
                  <span className="animate-spin inline-flex h-full w-full rounded-full border-2 border-emerald-400 border-t-transparent"></span>
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
                    <span className="max-w-[130px] sm:max-w-[170px] truncate" title="1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A">
                      Database Spreadsheet
                    </span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 font-medium border border-emerald-700/50">
                    Otomatis Sinkron
                  </span>
                </div>
                <span className="text-[9px] text-stone-400 font-mono">
                  {autoSyncStatus === 'syncing' || isSyncing
                    ? 'Menyelaraskan data...'
                    : sheetConfig.lastSyncedAt
                    ? `Sync: ${new Date(sheetConfig.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (Tanpa Login)`
                    : 'Sinkronisasi Aktif (Tanpa Login)'}
                </span>
              </div>

              <div className="flex items-center gap-1 ml-1 border-l border-stone-700 pl-2">
                <button
                  onClick={onSyncNow}
                  disabled={isSyncing || autoSyncStatus === 'syncing'}
                  className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-emerald-300 transition"
                  title="Segarkan / Selaraskan Ulang Database Spreadsheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || autoSyncStatus === 'syncing' ? 'animate-spin text-emerald-400' : ''}`} />
                </button>

                {sheetConfig.spreadsheetUrl && (
                  <a
                    href={sheetConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-stone-800 text-stone-300 hover:text-emerald-300 transition"
                    title="Buka Spreadsheet di Google Sheets (Tab Baru)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={onOpenSheetModal}
                  className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 font-semibold transition flex items-center gap-1"
                >
                  <span>Detail Sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettingsModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 border border-amber-700/50 transition shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Pengaturan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
