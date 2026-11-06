import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  X,
  ClipboardPaste,
  Upload,
  Trash2,
  AlertTriangle,
  Users,
  Check,
  ShieldCheck,
  Info,
  ArrowRight,
} from 'lucide-react';
import { ScoutMember } from '../types/scout';
import {
  parseDelimitedText,
  parseMembersFromRows,
  FIXED_SPREADSHEET_ID,
  FIXED_SPREADSHEET_URL,
} from '../services/sheetsService';

interface MemberSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: ScoutMember[];
  onApplyMembers: (members: ScoutMember[], mode: 'replace' | 'append') => void;
  onSyncFromSpreadsheet: () => void;
  onClearMockData: () => void;
  isSyncing: boolean;
  isRestricted: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  onChangeSpreadsheetId?: (newId: string) => void;
}

export const MemberSyncModal: React.FC<MemberSyncModalProps> = ({
  isOpen,
  onClose,
  members,
  onApplyMembers,
  onSyncFromSpreadsheet,
  onClearMockData,
  isSyncing,
  isRestricted,
  spreadsheetId = FIXED_SPREADSHEET_ID,
  spreadsheetUrl = FIXED_SPREADSHEET_URL,
  onChangeSpreadsheetId,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'auto' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ScoutMember[] | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [customIdInput, setCustomIdInput] = useState('');
  const [isEditingId, setIsEditingId] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Real-time text analysis when pasting
  const handleTextChange = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }

    try {
      const rows = parseDelimitedText(text);
      const parsed = parseMembersFromRows(rows);
      setParsedPreview(parsed);
    } catch {
      setParsedPreview(null);
    }
  };

  const handleApply = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    onApplyMembers(parsedPreview, applyMode);
    setSuccessMsg(
      `✅ Berhasil menerapkan ${parsedPreview.length} data anggota dari spreadsheet ke aplikasi!`
    );
    setPastedText('');
    setParsedPreview(null);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleTextChange(content);
        setActiveTab('paste');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveCustomId = () => {
    let cleanId = customIdInput.trim();
    // Extract ID if full Google Sheets URL was pasted
    const match = cleanId.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      cleanId = match[1];
    }

    if (cleanId && onChangeSpreadsheetId) {
      onChangeSpreadsheetId(cleanId);
      setIsEditingId(false);
      setCustomIdInput('');
    }
  };

  const isDemo = members.some((m) => m.name.includes('Ahmad Fauzan') || m.name.includes('Bima Satria'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/80 border border-amber-400/40 flex items-center justify-center text-white shrink-0">
              <Users className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Sinkronisasi Data Anggota dari Spreadsheet
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                  Tanpa Perlu Login
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                Sesuaikan daftar anggota di aplikasi agar persis sama dengan Google Spreadsheet Anda
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
          {/* Status Capsule */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-stone-700">Spreadsheet ID:</span>
              <span className="font-mono bg-stone-200 text-stone-800 px-2 py-0.5 rounded select-all break-all">
                {spreadsheetId}
              </span>
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-800 hover:text-amber-900 font-bold underline inline-flex items-center gap-1"
              >
                <span>Buka Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              {onChangeSpreadsheetId && (
                <button
                  onClick={() => setIsEditingId(!isEditingId)}
                  className="text-[11px] text-stone-600 hover:text-stone-900 underline font-medium"
                >
                  {isEditingId ? 'Batal' : 'Ganti ID / Link'}
                </button>
              )}
              {isDemo && (
                <button
                  onClick={onClearMockData}
                  className="text-[11px] text-rose-700 hover:text-rose-900 font-bold px-2 py-0.5 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition"
                  title="Hapus 27 data contoh bawaan"
                >
                  Hapus Data Contoh
                </button>
              )}
            </div>
          </div>

          {/* Edit ID input if opened */}
          {isEditingId && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
              <label className="font-bold text-amber-950">
                Masukkan ID atau Link URL Google Spreadsheet Anda:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customIdInput}
                  onChange={(e) => setCustomIdInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit atau ID spreadsheet"
                  className="flex-1 p-2 border border-stone-300 rounded-lg text-xs bg-white font-mono"
                />
                <button
                  onClick={handleSaveCustomId}
                  className="px-3 py-2 bg-amber-800 text-white rounded-lg font-bold hover:bg-amber-900 transition"
                >
                  Terapkan ID
                </button>
              </div>
            </div>
          )}

          {/* Warning Banner if Google Drive Sharing is restricted */}
          {isRestricted && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-900">
                  Status Izin Google Sheets: Dibatasi (Private) di Google Drive
                </span>
                <p className="text-amber-800 leading-relaxed">
                  Google memblokir pembacaan otomatis dari web ini karena spreadsheet belum diatur menjadi publik.
                  <strong> Solusi Instan:</strong> Gunakan tab <strong>"Salin & Tempel Langsung"</strong> di bawah untuk menyalin data anggota dari spreadsheet ke sini dalam 5 detik!
                </p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Salin & Tempel Langsung (Paling Mudah)</span>
            </button>

            <button
              onClick={() => setActiveTab('auto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'auto'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tarik Otomatis dari Google</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Berkas CSV</span>
            </button>
          </div>

          {/* TAB 1: Salin & Tempel Langsung */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>3 Langkah Mudah Memasukkan Data Anggota Anda:</span>
                </div>
                <ol className="list-decimal list-inside text-stone-600 space-y-0.5 pl-1">
                  <li>Buka spreadsheet Google Anda dan pilih baris daftar anggota.</li>
                  <li>Tekan <strong>Ctrl+C</strong> (Salin).</li>
                  <li>Klik kotak di bawah, tekan <strong>Ctrl+V</strong> (Tempel), lalu klik <strong>Terapkan Data Anggota</strong>.</li>
                </ol>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-stone-700">
                  Tempel Baris / Kolom Tabel dari Google Sheets:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-stone-500 font-medium">Mode:</span>
                  <select
                    value={applyMode}
                    onChange={(e) => setApplyMode(e.target.value as any)}
                    className="px-2 py-1 rounded border border-stone-300 bg-white font-medium text-stone-800 text-xs"
                  >
                    <option value="replace">Gantikan Semua Anggota Saat Ini</option>
                    <option value="append">Tambahkan ke Anggota yang Ada</option>
                  </select>
                </div>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Contoh format yang langsung dikenali:
ID	Nama Anggota	Regu	Jenis Kelamin	Tingkatan	No Kontak
1	Ahmad Rizky	Regu Garuda	Putra	Penggalang Ramu	08123456789
2	Siti Aisyah	Regu Melati	Putri	Penggalang Ramu	08129876543
3	Doni Pratama	Regu Rajawali	Putra	Penggalang Rakit	-"
                rows={6}
                className="w-full p-3 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 focus:border-amber-700"
              />

              {/* Live Preview of parsed members */}
              {parsedPreview && (
                <div className="space-y-2 border border-emerald-300 bg-emerald-50/50 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Terdeteksi {parsedPreview.length} Anggota Pramuka:</span>
                    </span>

                    <button
                      onClick={handleApply}
                      disabled={parsedPreview.length === 0}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
                    >
                      Terapkan {parsedPreview.length} Data Anggota ke Aplikasi
                    </button>
                  </div>

                  {/* Preview table */}
                  <div className="max-h-48 overflow-y-auto overflow-x-auto border border-emerald-200 rounded-lg bg-white">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-stone-100 text-stone-700 sticky top-0 font-bold border-b border-stone-200">
                        <tr>
                          <th className="p-2">ID</th>
                          <th className="p-2">Nama</th>
                          <th className="p-2">Regu</th>
                          <th className="p-2">JK</th>
                          <th className="p-2">Tingkatan</th>
                          <th className="p-2">No HP</th>
                          <th className="p-2">Pinru</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {parsedPreview.map((m, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="p-1.5 font-mono text-stone-500">{m.id}</td>
                            <td className="p-1.5 font-bold text-stone-900">{m.name}</td>
                            <td className="p-1.5 text-amber-900 font-semibold">{m.regu}</td>
                            <td className="p-1.5">{m.gender === 'L' ? 'Putra' : 'Putri'}</td>
                            <td className="p-1.5">{m.level}</td>
                            <td className="p-1.5">{m.phone || '-'}</td>
                            <td className="p-1.5">{m.isPinru ? 'Ya' : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Tarik Otomatis dari Google */}
          {activeTab === 'auto' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="font-bold text-sm text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                  <span>Agar Google Mengizinkan Penarikan Otomatis (Tanpa Login):</span>
                </div>
                <p className="text-stone-700 leading-relaxed">
                  Google memblokir pembacaan otomatis dari web eksternal jika spreadsheet masih berstatus "Dibatasi". Anda cukup mengubah izin akses umum spreadsheet menjadi publik:
                </p>

                <ol className="list-decimal list-inside text-stone-700 space-y-1 pl-1">
                  <li>
                    Buka spreadsheet:{' '}
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-800 font-bold underline inline-flex items-center gap-1"
                    >
                      <span>Buka Google Sheets</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Di kanan atas, klik tombol <strong>"Bagikan" (Share)</strong>.</li>
                  <li>Pada <strong>"Akses umum"</strong>, ubah dari <strong>"Dibatasi"</strong> menjadi <strong>"Siapa saja yang memiliki link"</strong> dengan peran <strong>"Pelihat"</strong>.</li>
                  <li>Klik <strong>Selesai</strong>.</li>
                </ol>
              </div>

              <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <div>
                  <div className="font-bold text-stone-900">Tarik Data dari Spreadsheet Sekarang</div>
                  <div className="text-stone-500 text-[11px]">
                    Sistem akan otomatis memindai lembar DATA_ANGGOTA, Sheet1, atau Anggota
                  </div>
                </div>
                <button
                  onClick={onSyncFromSpreadsheet}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menghubungkan...' : 'Tarik Data Terbaru'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Unggah Berkas CSV */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-3">
                <Upload className="w-8 h-8 text-amber-700 mx-auto" />
                <div>
                  <div className="font-bold text-stone-800">Unggah Berkas CSV dari Google Spreadsheet</div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Di Google Spreadsheet, klik <em>File &gt; Download &gt; Comma-separated values (.csv)</em>
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shadow-sm transition inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Pilih Berkas CSV / TSV</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs">
          <div className="text-stone-500">
            Anggota saat ini di aplikasi: <strong>{members.length} orang</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
