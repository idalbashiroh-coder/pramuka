import React from 'react';
import { ExternalLink, ShieldAlert, X, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PopupBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetryLogin: () => void;
}

export const PopupBlockedModal: React.FC<PopupBlockedModalProps> = ({
  isOpen,
  onClose,
  onRetryLogin,
}) => {
  if (!isOpen) return null;

  const handleOpenInNewTab = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch {
      // Fallback
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/40 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="font-bold text-base">Jendela Login Pop-up Terblokir</h3>
              <p className="text-xs text-amber-100">Peramban Anda memblokir jendela login otomatis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm text-stone-700">
          <p className="text-stone-600 leading-relaxed">
            Peramban (Chrome, Edge, atau Safari) secara bawaan memblokir jendela <em>pop-up</em> login akun Google. Ikuti langkah mudah berikut untuk mengizinkannya:
          </p>

          {/* Steps */}
          <div className="space-y-2.5 bg-amber-50/70 p-4 rounded-xl border border-amber-200/80">
            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-xs font-bold shrink-0 mt-0.5">
                1
              </span>
              <p className="text-xs text-stone-800 leading-snug">
                Lihat <strong>bilah alamat URL (address bar)</strong> di bagian atas peramban Anda.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-xs font-bold shrink-0 mt-0.5">
                2
              </span>
              <p className="text-xs text-stone-800 leading-snug">
                Klik ikon <strong>Pop-up Terblokir</strong> (biasanya berupa ikon jendela kecil dengan tanda silang merah atau ikon gembok izin situs).
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-xs font-bold shrink-0 mt-0.5">
                3
              </span>
              <p className="text-xs text-stone-800 leading-snug">
                Pilih <strong>&quot;Selalu izinkan pop-up dan pengalihan dari situs ini&quot;</strong>, lalu klik <strong>Selesai</strong>.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0 mt-0.5">
                4
              </span>
              <p className="text-xs text-stone-800 leading-snug">
                Klik tombol <strong>Coba Login Lagi</strong> di bawah ini.
              </p>
            </div>
          </div>

          {/* Alternative: Open in new tab */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              <span className="font-semibold text-stone-800 block">Ingin cara lebih cepat?</span>
              Buka aplikasi langsung di tab penuh baru agar terbebas dari pembatasan iframe peramban.
            </div>
            <button
              onClick={handleOpenInNewTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-stone-800 hover:bg-stone-900 text-white transition shrink-0 shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Baru</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl transition"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              setTimeout(() => {
                onRetryLogin();
              }, 100);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Login Lagi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
