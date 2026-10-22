import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Fingerprint, 
  HardDrive, 
  Download, 
  Upload, 
  CheckCircle2, 
  KeyRound,
  Mail,
  User,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Image as ImageIcon,
  ChevronLeft,
  Info
} from 'lucide-react';
import { SecuritySettings, ThemeConfig, ThemeMode, AccentColor } from '../../types';
import { 
  getSecuritySettings, 
  saveSecuritySettings, 
  hashPin, 
  isBiometricsAvailable 
} from '../../services/biometrics';
import { localDB } from '../../services/db';
import { vibratePhone } from '../../services/device';

interface AboutModuleProps {
  onRefreshStats: () => void;
  themeConfig?: ThemeConfig;
  onUpdateTheme?: (theme: ThemeConfig) => void;
  appIcon?: string;
  onOpenIconModal?: () => void;
  onOpenVersionModal?: () => void;
}

const DEFAULT_THEME: ThemeConfig = {
  mode: 'dark',
  accentColor: 'cyan',
  compactMode: false,
};

export const AboutModule: React.FC<AboutModuleProps> = ({ 
  onRefreshStats,
  themeConfig = DEFAULT_THEME,
  onUpdateTheme,
  appIcon,
  onOpenIconModal,
  onOpenVersionModal,
}) => {
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [hasBiometricSensor, setHasBiometricSensor] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  // Local theme state
  const [theme, setTheme] = useState<ThemeConfig>(themeConfig);

  useEffect(() => {
    getSecuritySettings().then(setSecurity);
    isBiometricsAvailable().then(setHasBiometricSensor);
    localDB.getSetting<ThemeConfig>('app_theme_config', DEFAULT_THEME).then((t) => {
      setTheme(t);
    });
  }, []);

  const handleSelectThemeMode = async (mode: ThemeMode) => {
    vibratePhone(20);
    const updated = { ...theme, mode };
    setTheme(updated);
    await localDB.setSetting('app_theme_config', updated);
    if (onUpdateTheme) onUpdateTheme(updated);
  };

  const handleSelectAccent = async (accentColor: AccentColor) => {
    vibratePhone(20);
    const updated = { ...theme, accentColor };
    setTheme(updated);
    await localDB.setSetting('app_theme_config', updated);
    if (onUpdateTheme) onUpdateTheme(updated);
  };

  const handleToggleBiometrics = async () => {
    if (!security) return;
    vibratePhone(25);
    const updated = { ...security, isBiometricEnabled: !security.isBiometricEnabled };
    setSecurity(updated);
    await saveSecuritySettings(updated);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!security) return;

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinChangeMsg({ success: false, text: 'رمز عبور باید دقیقاً ۶ رقم عدد باشد.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeMsg({ success: false, text: 'تکرار رمز عبور با رمز جدید مطابقت ندارد.' });
      return;
    }

    const newHash = await hashPin(newPin);
    const updated = { ...security, pinHash: newHash };
    await saveSecuritySettings(updated);
    setSecurity(updated);
    setNewPin('');
    setConfirmPin('');
    vibratePhone(40);
    setPinChangeMsg({ success: true, text: 'کد PIN با موفقیت تغییر یافت.' });
    setTimeout(() => {
      setPinChangeMsg(null);
    }, 4000);
  };

  const handleExportBackup = async () => {
    vibratePhone(30);
    const jsonString = await localDB.exportFullBackup();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `companion_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupMsg('فایل پشتیبان با موفقیت دریافت شد.');
    setTimeout(() => setBackupMsg(null), 3000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const ok = await localDB.importBackup(content);
      if (ok) {
        vibratePhone(50);
        setBackupMsg('اطلاعات با موفقیت بازیابی شد.');
        onRefreshStats();
      } else {
        setBackupMsg('خطا در خواندن فایل پشتیبان.');
      }
      setTimeout(() => setBackupMsg(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Creator & Brand Card */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-cyan-500 to-indigo-500 border border-cyan-500/20 shrink-0 shadow-lg shadow-cyan-500/20">
            {appIcon ? (
              <img src={appIcon} alt="App Icon" className="w-full h-full object-cover rounded-[14px] bg-slate-950" />
            ) : (
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <User className="w-6 h-6 text-cyan-400" />
              </div>
            )}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">سازنده و مالک اثر:</span>
            <h3 className="text-base font-black text-white">محمدرضا امیریوسفی • استودیو آناش</h3>
            <a
              href="mailto:Anashstudio@gmail.com"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-0.5 dir-ltr"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Anashstudio@gmail.com</span>
            </a>
          </div>
        </div>

        <button
          onClick={onOpenVersionModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-mono text-xs border border-cyan-500/30 transition-all self-start sm:self-auto"
          title="مشاهده گزارش کامل مشخصات نسخه"
        >
          <Info className="w-3.5 h-3.5" />
          <span>نسخه ۲.۴.۰ جامع</span>
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* App Icon Customizer Section */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">آیکون و لوگوی برنامه</h3>
          </div>
          <button
            onClick={onOpenIconModal}
            className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all active:scale-95"
          >
            تغییر آیکون برنامه
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-cyan-500 to-indigo-500 shrink-0">
            <img src={appIcon} alt="Current Icon" className="w-full h-full object-cover rounded-[14px] bg-slate-950" />
          </div>
          <div className="text-xs text-slate-300">
            <p>می‌توانید هر تصویر دلخواهی را از گالری گوشی بارگذاری کنید تا جایگزین آیکون برنامه شود.</p>
          </div>
        </div>
      </div>

      {/* Theme & Appearance Settings */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Palette className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">تنظیمات قالب و ظاهر برنامه</h3>
        </div>

        {/* Theme Modes */}
        <div className="space-y-1.5">
          <span className="text-xs text-slate-400 font-medium block">حالت نمایش و تم:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'dark', label: 'شبانه تیره', icon: <Moon className="w-3.5 h-3.5" /> },
              { id: 'oled', label: 'آمولد خالص', icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'light', label: 'روز روشن', icon: <Sun className="w-3.5 h-3.5" /> },
              { id: 'cyber', label: 'سایبر نئون', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectThemeMode(t.id as any)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme.mode === t.id
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-1.5 pt-2">
          <span className="text-xs text-slate-400 font-medium block">رنگ شاخص و هایلایت‌ها:</span>
          <div className="flex items-center gap-3">
            {[
              { id: 'cyan', color: '#06b6d4', label: 'فیروزه‌ای' },
              { id: 'indigo', color: '#6366f1', label: 'ایندیگو' },
              { id: 'emerald', color: '#10b981', label: 'زمردی' },
              { id: 'amber', color: '#f59e0b', label: 'کهربایی' },
              { id: 'rose', color: '#f43f5e', label: 'یاقوتی' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectAccent(c.id as any)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  theme.accentColor === c.id
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              >
                {theme.accentColor === c.id && <CheckCircle2 className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Security & PIN Settings */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">امنیت و قفل ورود</h3>
          </div>
        </div>

        {/* Biometrics Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">ورود با بیومتریک (اثر انگشت / چهره)</div>
              <div className="text-[11px] text-slate-400">
                {hasBiometricSensor ? 'سنسور بیومتریک شناسایی شد.' : 'سنسور بیومتریک در دسترس نیست.'}
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!security?.isBiometricEnabled}
              onChange={handleToggleBiometrics}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
          </label>
        </div>

        {/* Change PIN Form */}
        <form onSubmit={handleChangePin} className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            تغییر رمز عبور ۶ رقمی ورود
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">رمز جدید (۶ رقم)</label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr text-xs text-center tracking-widest focus:outline-hidden focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">تکرار رمز جدید</label>
              <input
                type="password"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono dir-ltr text-xs text-center tracking-widest focus:outline-hidden focus:border-cyan-400"
              />
            </div>
          </div>
          {pinChangeMsg && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                pinChangeMsg.success
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{pinChangeMsg.text}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={newPin.length !== 6 || confirmPin.length !== 6}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition-all active:scale-95"
          >
            به‌روزرسانی رمز ورود
          </button>
        </form>
      </div>

      {/* Backup & Restore Data */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">پشتیبان‌گیری پایگاه داده آفلاین</h3>
          </div>
        </div>
        {backupMsg && (
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>{backupMsg}</span>
          </div>
        )}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleExportBackup}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>دانلود پشتیبان (Export)</span>
          </button>
          <label className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>بازیابی پشتیبان (Import)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
