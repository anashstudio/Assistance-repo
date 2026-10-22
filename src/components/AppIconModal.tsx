import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, RefreshCw, Check, X, Sparkles } from 'lucide-react';
import { saveCustomAppIcon, resetCustomAppIcon, DEFAULT_ANASH_ICON_SVG } from '../services/appIcon';
import { vibratePhone } from '../services/device';

interface AppIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon: string;
  onIconUpdated: (newIcon: string) => void;
}

const PRESET_ICONS = [
  {
    id: 'anash_default',
    title: 'نشان اختصاصی استودیو آناش (پیش‌فرض)',
    svg: DEFAULT_ANASH_ICON_SVG,
  },
  {
    id: 'cyber_emerald',
    title: 'نشان سایبرپانک زمردی',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="emg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="%2304120e"/><rect x="3" y="3" width="94" height="94" rx="23" fill="none" stroke="url(%23emg)" stroke-width="3"/><path d="M50 16 L80 50 L50 84 L20 50 Z" fill="none" stroke="url(%23emg)" stroke-width="4"/><circle cx="50" cy="50" r="14" fill="url(%23emg)"/></svg>`,
  },
  {
    id: 'gold_luxury',
    title: 'نشان طلایی لوکس آناش',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="gld" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="%23161005"/><rect x="3" y="3" width="94" height="94" rx="23" fill="none" stroke="url(%23gld)" stroke-width="3"/><text x="50" y="65" font-family="sans-serif" font-weight="900" font-size="44" text-anchor="middle" fill="url(%23gld)">A</text></svg>`,
  },
  {
    id: 'neon_purple',
    title: 'نشان نئون ارغوانی',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="prp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23c084fc"/><stop offset="100%" stop-color="%23ec4899"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="%2314051a"/><rect x="3" y="3" width="94" height="94" rx="23" fill="none" stroke="url(%23prp)" stroke-width="3"/><polygon points="50,18 78,74 22,74" fill="none" stroke="url(%23prp)" stroke-width="5"/><circle cx="50" cy="54" r="8" fill="url(%23prp)"/></svg>`,
  },
];

export const AppIconModal: React.FC<AppIconModalProps> = ({
  isOpen,
  onClose,
  currentIcon,
  onIconUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPreview, setSelectedPreview] = useState<string>(currentIcon);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        vibratePhone(40);
        setSelectedPreview(dataUrl);
        await saveCustomAppIcon(dataUrl);
        onIconUpdated(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = async (svg: string) => {
    vibratePhone(25);
    setSelectedPreview(svg);
    await saveCustomAppIcon(svg);
    onIconUpdated(svg);
  };

  const handleReset = async () => {
    vibratePhone(30);
    await resetCustomAppIcon();
    setSelectedPreview(DEFAULT_ANASH_ICON_SVG);
    onIconUpdated(DEFAULT_ANASH_ICON_SVG);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#0c1220] border border-slate-700/80 p-6 space-y-5 shadow-2xl text-xs select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">تغییر و تنظیم آیکون اختصاصی</h3>
              <p className="text-[10px] text-slate-400">آیکون دلخواه خود را بارگذاری کرده یا از نشان‌های آماده انتخاب کنید</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Icon Preview */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-cyan-500 to-indigo-500 shadow-xl shadow-cyan-500/20 shrink-0">
            <img
              src={selectedPreview}
              alt="آیکون فعلی برنامه"
              className="w-full h-full object-cover rounded-[14px] bg-slate-950"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-white block">آیکون فعال در برنامه</span>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              این آیکون در نوار هدر، صفحه قفل و صفحات شناور نمایش داده می‌شود.
            </p>
          </div>
        </div>

        {/* Upload Custom Image Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-98 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>بارگذاری آیکون دلخواه از گالری یا فایل‌های گوشی</span>
          </button>
        </div>

        {/* Preset Styles */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-300 block">یا انتخاب از استایل‌های آماده استودیو آناش:</span>
          <div className="grid grid-cols-2 gap-2.5">
            {PRESET_ICONS.map((preset) => {
              const isSelected = selectedPreview === preset.svg;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.svg)}
                  className={`p-3 rounded-2xl border text-right flex items-center gap-2.5 transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={preset.svg}
                    alt={preset.title}
                    className="w-8 h-8 rounded-xl shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-white block truncate">
                      {preset.title}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] text-cyan-400 flex items-center gap-0.5 mt-0.5">
                        <Check className="w-3 h-3" /> انتخاب شده
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بازنشانی به پیش‌فرض</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            تأیید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
