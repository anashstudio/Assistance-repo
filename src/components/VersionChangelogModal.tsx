import React from 'react';
import { ShieldCheck, CheckCircle2, Cpu, Smartphone, Database, Zap, X, GitCommit } from 'lucide-react';

interface VersionChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  appIcon: string;
}

export const VersionChangelogModal: React.FC<VersionChangelogModalProps> = ({
  isOpen,
  onClose,
  appIcon,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c1220] border border-slate-700/80 p-6 space-y-5 shadow-2xl text-xs select-none max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-cyan-500 to-indigo-500 shadow-lg shadow-cyan-500/20 shrink-0">
              <img src={appIcon} alt="App Icon" className="w-full h-full object-cover rounded-[14px] bg-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">دستیار همراه هوشمند آناش</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                  v2.4.0 Final
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">نسخه جامع، پایدار و ارگونومیک (Anash Studio Edition)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <Smartphone className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 block">پلتفرم هدف</span>
            <span className="font-bold text-white text-[11px]">اندروید ۱۴ و ۱۵</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <Cpu className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 block">هسته اجرایی</span>
            <span className="font-bold text-white text-[11px]">Capacitor 7.4</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <Database className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 block">پایگاه داده</span>
            <span className="font-bold text-white text-[11px]">IndexedDB محلی</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 block">وضعیت عملکرد</span>
            <span className="font-bold text-white text-[11px]">۱۰۰٪ آفلاین</span>
          </div>
        </div>

        {/* Detailed Changelog */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <GitCommit className="w-4 h-4 text-cyan-400" />
            <span>گزارش تغییرات و تکامل نگارش ۲.۴.۰ (Changelog):</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>انتقال کامل کلیدهای ناوبری به سمت راست (ارگونومی دست راست):</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed pr-5">
                کلیدهای ناوبری به صورت نوار شناور عمودی در سمت راست قرار گرفتند تا ۱۰۰٪ از کلیدهای سیستم عامل گوشی (Back, Home, Recents) جدا شده و هیچ‌گونه تداخل لمسی به وجود نیاید.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>سیستم شخصی‌سازی آیکون و برندینگ استودیو آناش:</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed pr-5">
                آیکون عمومی حذف و نشان لوکس اختصاصی استودیو آناش جایگزین شد. همچنین قابلیت انتخاب هر تصویر دلخواه از گالری گوشی و اعمال در تمام بخش‌ها افزوده شد.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>بازطراحی جذاب صفحه ورود و قفل بیومتریک:</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed pr-5">
                طراحی مجدد صفحه لاگین با ساعت زنده دیجیتال، تقویم شمسی، افکت‌های نوری سایبرپانک و دسترسی سریع به حسگر اثرانگشت.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>شروع تمیز بدون آمارهای غیرواقعی:</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed pr-5">
                کلیه آمارهای پیش‌فرض و تستی برداشته شده و داده‌ها تنها با ورود واقعی کاربر محاسبه می‌شوند.
              </p>
            </div>
          </div>
        </div>

        {/* Creator badge */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block">سازنده و مالک اثر:</span>
            <span className="text-xs font-black text-white">محمدرضا امیریوسفی • استودیو آناش</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">Anashstudio@gmail.com</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
        >
          متوجه شدم
        </button>
      </div>
    </div>
  );
};
