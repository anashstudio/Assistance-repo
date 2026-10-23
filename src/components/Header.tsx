import React from 'react';
import { Lock, Wifi, WifiOff, RefreshCw, Layers, Edit3 } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  onLock: () => void;
  isOnline: boolean;
  onOpenModuleManager: () => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
  activeModulesCount?: number;
  appIcon?: string;
  onOpenIconModal?: () => void;
  onOpenVersionModal?: () => void;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'داشبورد اصلی دستیار',
  messenger: 'پیام‌رسان و گفتگوی خصوصی',
  finance: 'حسابداری و سرشماره‌های بانکی',
  personal: 'بخش شخصی (سلامت، گاوصندوق، عادات)',
  tools: 'جعبه ابزار و امکانات',
  scanner: 'اسکنر متوالی اسناد و تبدیل به PDF',
  app_usage: 'رصد کارکرد برنامه‌ها و عادات',
  vehicle: 'دستیار خودرو و سرویس‌ها',
  health: 'سلامت، داروها و کارت پزشکی',
  vault: 'گاوصندوق رمزها و یادداشت‌ها',
  meetings: 'جلسات کاری و یادداشت‌های صوتی',
  crm: 'شبکه ارتباطات و مناسبت‌ها',
  habits: 'ردیاب عادات و تمرکز پومودورو',
  contacts: 'مخاطبین و افراد',
  sync: 'هاست و همگام‌سازی ابری',
  support: 'پشتیبانی فنی اختصاصی',
  about: 'تنظیمات قالب و مشخصات سازنده',
  library: 'مدیریت کتابخانه و گردش کتاب',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onLock,
  isOnline,
  onOpenModuleManager,
  isSyncing,
  onTriggerSync,
  activeModulesCount,
  appIcon,
  onOpenIconModal,
  onOpenVersionModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0c1220]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 select-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Active Page Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Custom App Icon (Clickable to change icon) */}
          <div
            onClick={onOpenIconModal}
            className="group relative cursor-pointer active:scale-95 transition-transform"
            title="کلیک برای تغییر آیکون برنامه"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-purple-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              {appIcon ? (
                <img
                  src={appIcon}
                  alt="App Icon"
                  className="w-full h-full object-cover rounded-[14px] bg-[#090d16]"
                />
              ) : (
                <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center text-xs font-black text-cyan-400">
                  آناش
                </div>
              )}
            </div>
            {onOpenIconModal && (
              <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <Edit3 className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-white tracking-wide truncate">
                دستیار همراه
              </h1>
              {/* Version badge opens changelog */}
              <button
                onClick={onOpenVersionModal}
                className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-mono border border-cyan-500/30 transition-colors"
                title="مشاهده مشخصات و تغییرات نسخه ۲.۴.۰"
              >
                v2.4.0
              </button>
            </div>
            <p className="text-xs text-slate-400 truncate font-medium">
              {TAB_TITLES[activeTab]}
            </p>
          </div>
        </div>

        {/* Action icons & status */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Module Manager Trigger Button */}
          <button
            onClick={onOpenModuleManager}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all active:scale-95"
            title="مدیریت و فعال/غیرفعال‌سازی ماژول‌ها"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">ماژول‌ها</span>
            {activeModulesCount !== undefined && (
              <span className="px-1 py-0.2 rounded bg-indigo-500/30 text-[9px] font-mono">
                {activeModulesCount}
              </span>
            )}
          </button>

          {/* Online/Offline status badge */}
          <div
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border font-medium transition-colors ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
            title={isOnline ? 'اتصال اینترنت برقرار است' : 'حالت آفلاین (دیتابیس لوکال فعال)'}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden md:inline">آنلاین</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>آفلاین</span>
              </>
            )}
          </div>

          {/* Quick sync button */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all active:scale-95 disabled:opacity-50"
            title="همگام‌سازی سریع با هاست"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Quick lock button */}
          <button
            onClick={onLock}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 transition-all active:scale-95"
            title="قفل فوری اپلیکیشن"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
