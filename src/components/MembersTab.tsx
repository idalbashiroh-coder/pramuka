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
} from 'lucide-react';
import { ScoutLevel, ScoutMember } from '../types/scout';

interface MembersTabProps {
  members: ScoutMember[];
  onAddMember: (member: Omit<ScoutMember, 'id'>) => Promise<void>;
  onUpdateMember: (member: ScoutMember) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const [search, setSearch] = useState('');
  const [filterRegu, setFilterRegu] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);

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
        return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.regu.toLowerCase().includes(q);
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

  const handleDelete = async (member: ScoutMember) => {
    if (window.confirm(`Yakin ingin menghapus data anggota "${member.name}" dari pangkalan? Tindakan ini tidak dapat dibatalkan.`)) {
      await onDeleteMember(member.id);
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
          </div>
          <p className="text-xs text-stone-500">
            Kelola identitas regu, jabatan pemimpin regu (Pinru), dan status keaktifan anggota
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Anggota Baru</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, ID, atau regu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* Filter Regu */}
        <select
          value={filterRegu}
          onChange={(e) => setFilterRegu(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-stone-300 text-xs text-stone-800 bg-stone-50 font-medium"
        >
          <option value="all">Semua Regu ({reguList.length})</option>
          {reguList.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* Filter Satuan */}
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-stone-300 text-xs text-stone-800 bg-stone-50 font-medium"
        >
          <option value="all">Semua Satuan</option>
          <option value="L">Putra (PA)</option>
          <option value="P">Putri (PI)</option>
        </select>
      </div>

      {/* Table of Members */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-900 text-stone-200 uppercase text-[10px] font-bold tracking-wider">
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">ID Anggota</th>
                <th className="p-3">Nama Anggota</th>
                <th className="p-3">Regu</th>
                <th className="p-3">Satuan</th>
                <th className="p-3">Tingkatan</th>
                <th className="p-3">Kontak / WA</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-stone-400">
                    Tidak ada anggota yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-amber-50/20 transition">
                    <td className="p-3 text-center text-stone-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="p-3 font-mono text-stone-500">
                      {m.id}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        {m.name}
                        {m.isPinru && (
                          <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold border border-amber-300">
                            Pinru
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-amber-900">
                      {m.regu}
                    </td>
                    <td className="p-3 text-stone-600">
                      {m.gender === 'L' ? 'Putra' : 'Putri'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-mono">
                        {m.level}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-stone-500">
                      {m.phone || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {m.active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-amber-800 hover:bg-stone-100 transition"
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

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200">
            <div className="bg-stone-900 p-4 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">
                {editingMember ? 'Ubah Data Anggota' : 'Tambah Anggota Pramuka'}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Nama Lengkap Anggota:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bima Satria"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Regu:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Regu Garuda"
                    value={formData.regu}
                    onChange={(e) => setFormData({ ...formData, regu: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Satuan:
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="L">Putra (PA)</option>
                    <option value="P">Putri (PI)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tingkatan:
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Penggalang Ramu">Penggalang Ramu</option>
                    <option value="Penggalang Rakit">Penggalang Rakit</option>
                    <option value="Penggalang Terap">Penggalang Terap</option>
                    <option value="Penegak Bantara">Penegak Bantara</option>
                    <option value="Penegak Laksana">Penegak Laksana</option>
                    <option value="Siaga Mula">Siaga Mula</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    No. WhatsApp / HP:
                  </label>
                  <input
                    type="tel"
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPinru}
                    onChange={(e) => setFormData({ ...formData, isPinru: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-stone-700">Pemimpin Regu (Pinru / Wapinru)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-stone-700">Aktif</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-stone-100">
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
    </div>
  );
};
