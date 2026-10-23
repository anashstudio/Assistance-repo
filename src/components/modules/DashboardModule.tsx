import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Lock, 
  Plus, 
  X, 
  ArrowUpLeft, 
  Sparkles,
  MessageSquare,
  Smartphone,
  Car,
  HeartPulse,
  LockKeyhole,
  Briefcase,
  HeartHandshake,
  Target,
  FileScan,
  Wallet,
  Users,
  Layers,
  Settings,
  UserCheck,
  Wrench,
  Library
} from 'lucide-react';
import { ActiveTab, AppModuleConfig, DashboardShortcut } from '../../types';
import { localDB } from '../../services/db';
import { vibratePhone } from '../../services/device';

interface DashboardModuleProps {
  onNavigate: (tab: ActiveTab) => void;
  modules: AppModuleConfig[];
  onOpenModuleManager: () => void;
  onLockApp: () => void;
  totalScreenTimeMinutes?: number;
  storageStats?: any;
  isOnline?: boolean;
}

const DEFAULT_SHORTCUTS: DashboardShortcut[] = [
  { id: 'sc_usage', moduleId: 'app_usage', title: 'کارکرد اپ‌ها و عادات' },
  { id: 'sc_vehicle', moduleId: 'vehicle', title: 'سرویس‌های خودرو' },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  messenger: <MessageSquare className="w-5 h-5" />,
  finance: <Wallet className="w-5 h-5" />,
  personal: <UserCheck className="w-5 h-5" />,
  tools: <Wrench className="w-5 h-5" />,
  library: <Library className="w-5 h-5" />,
  app_usage: <Smartphone className="w-5 h-5" />,
  vehicle: <Car className="w-5 h-5" />,
  health: <HeartPulse className="w-5 h-5" />,
  vault: <LockKeyhole className="w-5 h-5" />,
  meetings: <Briefcase className="w-5 h-5" />,
  crm: <HeartHandshake className="w-5 h-5" />,
  habits: <Target className="w-5 h-5" />,
  scanner: <FileScan className="w-5 h-5" />,
  contacts: <Users className="w-5 h-5" />,
};

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  onNavigate,
  modules,
  onOpenModuleManager,
  onLockApp,
  totalScreenTimeMinutes = 198,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFa, setCurrentDateFa] = useState<string>('');
  const [currentDateEn, setCurrentDateEn] = useState<string>('');
  const [shortcuts, setShortcuts] = useState<DashboardShortcut[]>(DEFAULT_SHORTCUTS);
  const [showAddShortcutModal, setShowAddShortcutModal] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      try {
        setCurrentDateFa(
          new Intl.DateTimeFormat('fa-IR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(now)
        );
      } catch {
        setCurrentDateFa(now.toLocaleDateString('fa-IR'));
      }

      setCurrentDateEn(
        now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localDB.getSetting<DashboardShortcut[]>('app_dashboard_shortcuts', DEFAULT_SHORTCUTS)
      .then(setShortcuts);
  }, []);

  const handleAddShortcut = async (moduleId: ActiveTab) => {
    const targetModule = modules.find((m) => m.id === moduleId);
    if (!targetModule) return;

    vibratePhone(25);
    const newSc: DashboardShortcut = {
      id: 'sc_' + Date.now(),
      moduleId,
      title: targetModule.shortName,
    };

    const updated = [...shortcuts, newSc];
    setShortcuts(updated);
    await localDB.setSetting('app_dashboard_shortcuts', updated);
    setShowAddShortcutModal(false);
  };

  const handleDeleteShortcut = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    vibratePhone(20);
    const updated = shortcuts.filter((s) => s.id !== id);
    setShortcuts(updated);
    await localDB.setSetting('app_dashboard_shortcuts', updated);
  };

  const formatScreenTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} ساعت و ${m} دقیقه`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 pt-2">
      {/* Minimal Zen Clock & Calendar Hero */}
      <div className="relative overflow-hidden p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900/90 via-[#0a0f1d] to-[#070b14] border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Date */}
        <div className="relative z-10 flex items-center gap-2 text-cyan-400 text-xs sm:text-sm font-semibold mb-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span>{currentDateFa}</span>
          <span className="text-slate-600 font-mono text-xs dir-ltr">({currentDateEn})</span>
        </div>

        {/* Big Minimal Digital Clock */}
        <div className="relative z-10 text-5xl sm:text-6xl font-black text-white font-mono tracking-tight my-2 select-none">
          {currentTime}
        </div>

        {/* Screen Time pill */}
        <div
          onClick={() => onNavigate('app_usage')}
          className="relative z-10 mt-3 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs cursor-pointer transition-all active:scale-95"
          title="مشاهده جزئیات کارکرد اپ‌ها و عادات"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>کارکرد صفحه امروز:</span>
          <span className="font-mono font-bold text-cyan-300">{formatScreenTime(totalScreenTimeMinutes)}</span>
        </div>
      </div>

      {/* User Custom Shortcuts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white">میانبرهای من</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddShortcutModal(true)}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all active:scale-95"
            >
              <Plus className="w-3 h-3 text-cyan-400" />
              <span>افزودن میانبر</span>
            </button>
          </div>
        </div>

        {shortcuts.length === 0 ? (
          <div
            onClick={() => setShowAddShortcutModal(true)}
            className="p-8 text-center rounded-3xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/30 text-slate-500 text-xs cursor-pointer transition-colors"
          >
            هنوز میانبری اضافه نکرده‌اید. با کلیک بر روی «افزودن میانبر»، بخش‌های پرکاربرد را به صفحه اصلی بیاورید.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {shortcuts.map((sc) => (
              <div
                key={sc.id}
                onClick={() => onNavigate(sc.moduleId)}
                className="group p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-98 shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    {ICON_MAP[sc.moduleId] || <Layers className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-bold text-white truncate">{sc.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteShortcut(sc.id, e)}
                  className="opacity-20 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                  title="حذف این میانبر"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Shortcut Modal */}
      {showAddShortcutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                انتخاب میانبر برای داشبورد
              </h4>
              <button
                onClick={() => setShowAddShortcutModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {modules
                .filter((m) => m.id !== 'dashboard' && m.isEnabled)
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleAddShortcut(m.id)}
                    className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between transition-colors text-right"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="text-cyan-400">{ICON_MAP[m.id] || <Layers className="w-4 h-4" />}</div>
                      <span className="text-xs font-bold text-white">{m.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">انتخاب</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
