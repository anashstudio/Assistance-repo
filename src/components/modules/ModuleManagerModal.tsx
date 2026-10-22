import React, { useState } from 'react';
import { 
  Layers, 
  X, 
  Check, 
  Sparkles, 
  Car, 
  HeartPulse, 
  LockKeyhole, 
  Briefcase, 
  HeartHandshake, 
  Target, 
  Compass, 
  FileScan, 
  Wallet, 
  Users, 
  CloudCog, 
  Headphones, 
  ShieldCheck,
  Search,
  RotateCcw,
  MessageSquare,
  Smartphone,
  UserCheck,
  Wrench
} from 'lucide-react';
import { AppModuleConfig, ActiveTab } from '../../types';
import { vibratePhone } from '../../services/device';

interface ModuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  modules: AppModuleConfig[];
  onToggleModule: (id: ActiveTab) => void;
  onResetDefaults: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
  Car: <Car className="w-5 h-5" />,
  HeartPulse: <HeartPulse className="w-5 h-5" />,
  LockKeyhole: <LockKeyhole className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  HeartHandshake: <HeartHandshake className="w-5 h-5" />,
  Target: <Target className="w-5 h-5" />,
  FileScan: <FileScan className="w-5 h-5" />,
  Wallet: <Wallet className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  CloudCog: <CloudCog className="w-5 h-5" />,
  Headphones: <Headphones className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />,
  UserCheck: <UserCheck className="w-5 h-5" />,
  Wrench: <Wrench className="w-5 h-5" />,
};

export const ModuleManagerModal: React.FC<ModuleManagerModalProps> = ({
  isOpen,
  onClose,
  modules,
  onToggleModule,
  onResetDefaults,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'همه ماژول‌ها' },
    { id: 'خودرو و سفر', label: 'خودرو و سفر' },
    { id: 'سلامت و محرمانه', label: 'سلامت و محرمانه' },
    { id: 'بهره‌وری و کار', label: 'بهره‌وری و جلسات' },
    { id: 'ابزار و مالی', label: 'ابزار و تنظیمات' },
  ];

  const filteredModules = modules.filter((m) => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch = 
      m.name.includes(searchQuery) || 
      m.description.includes(searchQuery) ||
      m.shortName.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const enabledCount = modules.filter((m) => m.isEnabled).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">مدیریت و فعال‌سازی ماژول‌های دستیار</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  {enabledCount} از {modules.length} فعال
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                هر امکانی را که نیاز دارید فعال و امکانات اضافی را مخفی کنید.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="px-5 pt-3 pb-2 space-y-2.5 bg-slate-950/40 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="جستجوی قابلیت یا ماژول مورد نظر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-medium shrink-0 transition-all ${
                  selectedCategory === c.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modules List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {filteredModules.map((mod) => (
            <div
              key={mod.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                mod.isEnabled
                  ? 'bg-slate-900/90 border-slate-700/80'
                  : 'bg-slate-950/40 border-slate-800/40 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    mod.isEnabled
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {ICON_MAP[mod.iconName] || <Layers className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {mod.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {mod.shortName}
                    </span>
                    {mod.isCore && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        پایه سیستم
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {mod.description}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="shrink-0 flex items-center">
                {mod.isCore ? (
                  <span className="text-[10px] text-slate-500 font-medium px-2">همیشه فعال</span>
                ) : (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mod.isEnabled}
                      onChange={() => {
                        vibratePhone(25);
                        onToggleModule(mod.id);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => {
              vibratePhone(30);
              onResetDefaults();
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازنشانی پیش‌فرض</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-cyan-600/20"
          >
            اعمال و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
