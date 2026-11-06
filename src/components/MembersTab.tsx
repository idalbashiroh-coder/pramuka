import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  X,
  Save,
  FileSpreadsheet,
  RefreshCw,
  ClipboardPaste,
  AlertTriangle,
  Sparkles,
  Check,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { ScoutLevel, ScoutMember } from '../types/scout';
import { MemberSyncModal } from './MemberSyncModal';
import {
  parseDelimitedText,
  parseMembersFromRows,
  FIXED_SPREADSHEET_ID,
  FIXED_SPREADSHEET_URL,
} from '../services/sheetsService';

interface MembersTabProps {
  members: ScoutMember[];
  onAddMember: (member: Omit<ScoutMember, 'id'>) => Promise<void>;
  onUpdateMember: (member: ScoutMember) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
  onSyncFromSpreadsheet?: () => void;
  onApplyMembers?: (members: ScoutMember[], mode: 'replace' | 'append') => void;
  onClearMockData?: () => void;
  isSyncing?: boolean;
  isRestricted?: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  onChangeSpreadsheetId?: (newId: string) => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onSyncFromSpreadsheet,
  onApplyMembers,
  onClearMockData,
  isSyncing = false,
  isRestricted = false,
  spreadsheetId = FIXED_SPREADSHEET_ID,
  spreadsheetUrl = FIXED_SPREADSHEET_URL,
  onChangeSpreadsheetId,
}) => {
  const [search, setSearch] = useState('');
  const [filterRegu, setFilterRegu] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<ScoutMember | null>(null);

  // Quick inline paste state when members list is empty
  const [inlinePastedText, setInlinePastedText] = useState('');
  const [inlineParsed, setInlineParsed] = useState<ScoutMember[] | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    regu: 'Regu Garuda',
    gender: 'L' as 'L' | 'P',
    level: 'Penggalang Ramu' as ScoutLevel,
    phone: '',
    isPinru: false,
    active: true,
  });

  const reguList = useMemo(() => Array.from(new Set(members.map((m) => m.regu))), [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (filterRegu !== 'all' && m.regu !== filterRegu) return false;
      if (filterGender !== 'all' && m.gender !== filterGender) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.regu.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, filterRegu, filterGender, search]);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      regu: reguList[0] || 'Regu Garuda',
      gender: 'L',
      level: 'Penggalang Ramu',
      phone: '',
      isPinru: false,
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: ScoutMember) => {
    setEditingMember(m);
    setFormData({
      name: m.name,
      regu: m.regu,
      gender: m.gender,
      level: m.level,
      phone: m.phone || '',
      isPinru: !!m.isPinru,
      active: m.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingMember) {
      await onUpdateMember({
        ...editingMember,
        ...formData,
      });
    } else {
      await onAddMember(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (member: ScoutMember) => {
    setConfirmDeleteMember(member);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteMember) {
      await onDeleteMember(confirmDeleteMember.id);
      setConfirmDeleteMember(null);
    }
  };

  // Inline Quick Paste change handler
  const handleInlineChange = (text: string) => {
    setInlinePastedText(text);
    if (!text.trim()) {
      setInlineParsed(null);
      return;
    }
    try {
      const rows = parseDelimitedText(text);
      const parsed = parseMembersFromRows(rows);
      setInlineParsed(parsed);
    } catch {
      setInlineParsed(null);
    }
  };

  const handleApplyInline = () => {
    if (inlineParsed && inlineParsed.length > 0 && onApplyMembers) {
      onApplyMembers(inlineParsed, 'replace');
      setInlinePastedText('');
      setInlineParsed(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-lg text-stone-900">
              Data Anggota & Regu Pramuka
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
              {members.length} Anggota Terdata
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Data resmi pangkalan disinkronkan dengan Google Spreadsheet ({spreadsheetId})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            title="Sinkronkan atau tempel data dari Google Spreadsheet"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Impor / Tempel dari Spreadsheet</span>
          </button>

          {onSyncFromSpreadsheet && (
            <button
              onClick={onSyncFromSpreadsheet}
              disabled={isSyncing}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 border border-stone-300 shadow-xs transition disabled:opacity-50"
              title="Tarik data terbaru langsung dari spreadsheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-700' : ''}`} />
              <span>{isSyncing ? 'Menarik...' : 'Tarik dari Sheets'}</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Manual</span>
          </button>
        </div>
      </div>

      {/* When Members is 0: Interactive Direct Spreadsheet Input Area */}
      {members.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-amber-400 p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-stone-900">
                  Data Dummy Telah Dihapus • Siap Menggunakan Data dari Spreadsheet Anda
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                  Daftar anggota saat ini sudah bersih dari data contoh. Sekarang masukkan data anggota pramuka asli Anda dari spreadsheet <strong className="font-mono text-amber-900">{spreadsheetId}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <span>Buka Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {onSyncFromSpreadsheet && (
                <button
                  onClick={onSyncFromSpreadsheet}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menarik...' : 'Tarik Otomatis'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Paste Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4 text-amber-800" />
                <span>Salin & Tempel Langsung dari Google Spreadsheet (Ctrl+C lalu Ctrl+V di sini):</span>
              </label>
              <span className="text-[11px] text-stone-500">
                Kolom dikenali: No/ID, Nama, Regu, Jenis Kelamin, Tingkatan, No HP
              </span>
            </div>

            <textarea
              value={inlinePastedText}
              onChange={(e) => handleInlineChange(e.target.value)}
              placeholder="Buka Google Sheets Anda > Pilih kolom anggota > Tekan Ctrl+C > Tempel di kotak ini (Ctrl+V)...
Contoh:
No	Nama Anggota	Regu	Jenis Kelamin
1	Muhammad Rizky	Regu Garuda	Putra
2	Aisyah Zahra	Regu Melati	Putri"
              rows={4}
              className="w-full p-3 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-700 bg-stone-50"
            />

            {inlineParsed && inlineParsed.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  <span>Terdeteksi {inlineParsed.length} anggota dari data yang ditempel!</span>
                </div>
                <button
                  onClick={handleApplyInline}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Terapkan {inlineParsed.length} Anggota ke Aplikasi
                </button>
              </div>
            )}
          </div>

          {/* Guide for automated sync */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Ingin Penarikan Otomatis Langsung Setiap Saat?</span>
            </div>
            <p className="text-stone-700 leading-relaxed text-[11px]">
              Cukup buka spreadsheet Google Anda, klik tombol <strong>"Bagikan" (Share)</strong> di kanan atas, lalu ubah <strong>"Akses umum"</strong> dari <em>Dibatasi</em> menjadi <strong>"Siapa saja yang memiliki link: Pelihat"</strong>. Setelah itu, klik tombol <strong>"Tarik dari Sheets"</strong> di atas.
            </p>
          </div>
        </div>
      )}

      {/* Filter Toolbar (Only shown if members exist) */}
      {members.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama anggota, ID, atau regu..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-700 focus:border-amber-700 bg-stone-50"
            />
          </div>

          {/* Filter Regu */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={filterRegu}
              onChange={(e) => setFilterRegu(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-stone-300 text-xs bg-stone-50 font-medium text-stone-700"
            >
              <option value="all">Semua Regu ({members.length})</option>
              {reguList.map((r) => (
                <option key={r} value={r}>
                  {r} ({members.filter((m) => m.regu === r).length})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Gender */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-stone-300 text-xs bg-stone-50 font-medium text-stone-700"
            >
              <option value="all">Semua Jenis Kelamin</option>
              <option value="L">Putra (L)</option>
              <option value="P">Putri (P)</option>
            </select>
          </div>
        </div>
      )}

      {/* Members Table */}
      {members.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-900 text-stone-200 uppercase text-[10px] font-bold tracking-wider">
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3">ID Anggota</th>
                  <th className="p-3">Nama Anggota</th>
                  <th className="p-3">Regu</th>
                  <th className="p-3 text-center">Gender</th>
                  <th className="p-3">Tingkatan</th>
                  <th className="p-3">Kontak / WA</th>
                  <th className="p-3 text-center">Jabatan</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-stone-400">
                      Tidak ada anggota yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m, idx) => (
                    <tr key={`${m.id}-${idx}`} className="hover:bg-amber-50/20 transition">
                      <td className="p-3 text-center text-stone-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-mono text-stone-500 font-semibold">
                        {m.id}
                      </td>
                      <td className="p-3 font-bold text-stone-900">
                        <div className="flex items-center gap-1.5">
                          <span>{m.name}</span>
                          {m.isPinru && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Pinru
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-amber-900">
                        {m.regu}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.gender === 'L'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {m.gender === 'L' ? 'Putra' : 'Putri'}
                        </span>
                      </td>
                      <td className="p-3 text-stone-700">{m.level}</td>
                      <td className="p-3 text-stone-600 font-mono text-[11px]">
                        {m.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-400" />
                            {m.phone}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {m.isPinru ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <Shield className="w-3 h-3" />
                            Pinru/Wapinru
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">Anggota</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {m.active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Non-Aktif
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-800 hover:bg-stone-100 transition"
                            title="Ubah Anggota"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(m)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus Anggota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Single Member */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900">
                {editingMember ? 'Ubah Data Anggota Pramuka' : 'Tambah Anggota Pramuka Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Lengkap Anggota *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Muhammad Ihsan"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Regu *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.regu}
                    onChange={(e) => setFormData({ ...formData, regu: e.target.value })}
                    placeholder="Contoh: Regu Garuda"
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })
                    }
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-700 bg-white"
                  >
                    <option value="L">Putra (L)</option>
                    <option value="P">Putri (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Tingkatan Penggalang
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value as ScoutLevel })
                    }
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-700 bg-white"
                  >
                    <option value="Penggalang Ramu">Penggalang Ramu</option>
                    <option value="Penggalang Rakit">Penggalang Rakit</option>
                    <option value="Penggalang Terap">Penggalang Terap</option>
                    <option value="Siaga Tata">Siaga</option>
                    <option value="Penegak Bantara">Penegak Bantara</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    No Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={formData.isPinru}
                    onChange={(e) => setFormData({ ...formData, isPinru: e.target.checked })}
                    className="rounded text-amber-800 focus:ring-amber-700 h-4 w-4"
                  />
                  <span>Pemimpin Regu (Pinru / Wapinru)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded text-amber-800 focus:ring-amber-700 h-4 w-4"
                  />
                  <span>Status Aktif di Gudep</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Anggota */}
      {confirmDeleteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-stone-900 text-base">Hapus Data Anggota?</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong>{confirmDeleteMember.name}</strong> ({confirmDeleteMember.regu}) dari pangkalan? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setConfirmDeleteMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
              >
                Ya, Hapus Anggota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Member Sync & Paste Modal */}
      <MemberSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        members={members}
        onApplyMembers={(newMembers, mode) => {
          if (onApplyMembers) {
            onApplyMembers(newMembers, mode);
          }
        }}
        onSyncFromSpreadsheet={onSyncFromSpreadsheet || (() => {})}
        onClearMockData={onClearMockData || (() => {})}
        isSyncing={isSyncing}
        isRestricted={isRestricted}
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={spreadsheetUrl}
        onChangeSpreadsheetId={onChangeSpreadsheetId}
      />
    </div>
  );
};
