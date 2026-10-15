import React, { useState } from 'react';
import { Settings, X, Save, ShieldCheck } from 'lucide-react';
import { GudepSettings } from '../types/scout';

interface GudepSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GudepSettings;
  onSaveSettings: (newSettings: GudepSettings) => void;
}

export const GudepSettingsModal: React.FC<GudepSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<GudepSettings>(settings);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200">
        <div className="bg-stone-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h4 className="font-bold text-sm text-white">
              Pengaturan Gugus Depan & Iuran Rutin
            </h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Nomor & Nama Gugus Depan:
            </label>
            <input
              type="text"
              required
              value={formData.gudepName}
              onChange={(e) => setFormData({ ...formData, gudepName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder="Gugus Depan 04.015 - 04.016"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Pangkalan / Nama Sekolah / Satuan:
            </label>
            <input
              type="text"
              required
              value={formData.pangkalan}
              onChange={(e) => setFormData({ ...formData, pangkalan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder="SMP Negeri 1 Nusantara"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Nominal Iuran Rutin (Rp):
              </label>
              <input
                type="number"
                step="500"
                min="0"
                required
                value={formData.defaultFeePerMeeting}
                onChange={(e) => setFormData({ ...formData, defaultFeePerMeeting: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-stone-400">per pertemuan latihan</span>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Jadwal Latihan Rutin:
              </label>
              <input
                type="text"
                required
                value={formData.meetingDay}
                onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="Setiap Sabtu (15.00 - 17.00)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Nama Pembina Satuan:
              </label>
              <input
                type="text"
                value={formData.pembinaName}
                onChange={(e) => setFormData({ ...formData, pembinaName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Nama Bendahara Pasukan:
              </label>
              <input
                type="text"
                value={formData.bendaharaName}
                onChange={(e) => setFormData({ ...formData, bendaharaName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
