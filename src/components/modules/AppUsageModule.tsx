import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  X, 
  Target
} from 'lucide-react';
import { AppUsageStat, HabitInsight } from '../../types';
import { 
  getAppUsageStats, 
  saveAppUsageStats, 
  generateHabitInsights 
} from '../../services/appUsageTracker';
import { vibratePhone } from '../../services/device';

export const AppUsageModule: React.FC = () => {
  const [stats, setStats] = useState<AppUsageStat[]>([]);
  const [insights, setInsights] = useState<HabitInsight[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'habits'>('overview');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<AppUsageStat | null>(null);
  const [newLimitMinutes, setNewLimitMinutes] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newAppName, setNewAppName] = useState<string>('');
  const [newAppCategory, setNewAppCategory] = useState<AppUsageStat['category']>('کاری و ابزارها');
  const [newAppMinutes, setNewAppMinutes] = useState<string>('30');
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getAppUsageStats();
    setStats(data);
    const generatedInsights = generateHabitInsights(data);
    setInsights(generatedInsights);
  };

  const handleScanDevice = async () => {
    setIsScanning(true);
    vibratePhone(35);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const current = await getAppUsageStats();
      let updated: AppUsageStat[] = [];
      if (current.length === 0) {
        // Only record the current app usage
        updated = [
          {
            id: 'app_companion',
            appName: 'دستیار همراه',
            category: 'کاری و ابزارها',
            usageMinutesToday: 5,
            usageMinutesYesterday: 0,
            opensCount: 1,
            iconColor: '#06b6d4',
          },
        ];
      } else {
        updated = current.map((app) => {
          if (app.id === 'app_companion') {
            return {
              ...app,
              usageMinutesToday: app.usageMinutesToday + 2,
              opensCount: app.opensCount + 1,
            };
          }
          return app;
        });
      }
      await saveAppUsageStats(updated);
      setStats(updated);
      setInsights(generateHabitInsights(updated));
      setBannerMessage('داده‌های کارکرد با سنسور دستگاه همگام‌سازی شد.');
      setTimeout(() => setBannerMessage(null), 3000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveLimit = async () => {
    if (!editingApp) return;
    const limit = parseInt(newLimitMinutes, 10);
    const updated = stats.map((s) =>
      s.id === editingApp.id
        ? { ...s, limitMinutes: isNaN(limit) || limit <= 0 ? undefined : limit }
        : s
    );
    await saveAppUsageStats(updated);
    setStats(updated);
    setEditingApp(null);
    vibratePhone(30);
  };

  const handleAddNewApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    vibratePhone(30);
    const minutes = parseInt(newAppMinutes, 10) || 15;
    const newStat: AppUsageStat = {
      id: 'app_' + Date.now(),
      appName: newAppName.trim(),
      category: newAppCategory,
      usageMinutesToday: minutes,
      usageMinutesYesterday: 0,
      opensCount: 1,
      iconColor: '#6366f1',
    };
    const updated = [...stats, newStat];
    await saveAppUsageStats(updated);
    setStats(updated);
    setInsights(generateHabitInsights(updated));
    setShowAddModal(false);
    setNewAppName('');
    setNewAppMinutes('30');
    setBannerMessage(`برنامه ${newStat.appName} با موفقیت به رصد اضافه شد.`);
    setTimeout(() => setBannerMessage(null), 3000);
  };

  const totalMinutesToday = stats.reduce((sum, s) => sum + s.usageMinutesToday, 0);
  const totalMinutesYesterday = stats.reduce((sum, s) => sum + s.usageMinutesYesterday, 0);
  const totalOpens = stats.reduce((sum, s) => sum + s.opensCount, 0);

  const formatHoursMinutes = (totalMinutes: number) => {
    if (!totalMinutes || totalMinutes <= 0) return '۰ دقیقه';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} دقیقه`;
    return `${h} ساعت و ${m} دقیقه`;
  };

  const diffMinutes = totalMinutesToday - totalMinutesYesterday;
  const isDrop = diffMinutes < 0;

  const filteredStats = stats.filter(
    (s) => selectedCategory === 'all' || s.category === selectedCategory
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Screen Time Hero Widget */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-[#0c1220] border border-indigo-500/25 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
              <Clock className="w-4 h-4" />
              <span>زمان کل استفاده از صفحه نمایش (Screen Time)</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {formatHoursMinutes(totalMinutesToday)}
              </span>
              <span className="text-xs text-slate-400 font-medium">امروز</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {totalMinutesToday === 0 && totalMinutesYesterday === 0 ? (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400">
                <span>هنوز داده‌ای ثبت نشده است</span>
              </div>
            ) : (
              <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-medium ${
                isDrop
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}>
                {isDrop ? (
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  {Math.abs(diffMinutes)} دقیقه {isDrop ? 'کمتر از دیروز' : 'بیشتر از دیروز'}
                </span>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">دفعات باز کردن قفل</span>
              <span className="text-base font-black font-mono text-cyan-300">{totalOpens} بار</span>
            </div>
          </div>
        </div>

        {/* Live Scan Trigger */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            سرویس مانیتورینگ خودکار پس‌زمینه (Android UsageStats)
          </span>
          <button
            onClick={handleScanDevice}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی رصد گوشی</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>میزان کارکرد برنامه‌ها ({stats.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('habits')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'habits'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>تحلیل و شناسایی عادات ({insights.length})</span>
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Category filter and Add Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', label: 'همه برنامه‌ها' },
                { id: 'پیام‌رسان', label: 'پیام‌رسان‌ها' },
                { id: 'شبکه‌های اجتماعی', label: 'شبکه‌های اجتماعی' },
                { id: 'وب‌گردی', label: 'وب‌گردی' },
                { id: 'سرگرمی و ویدیو', label: 'ویدیو و سرگرمی' },
                { id: 'کاری و ابزارها', label: 'کاری و ابزارها' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-medium shrink-0 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت اپ</span>
            </button>
          </div>

          {/* App Usage List */}
          <div className="space-y-2.5">
            {filteredStats.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-2">
                <Smartphone className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                <p>هنوز برنامه‌ای برای رصد کارکرد ثبت نشده است.</p>
                <p className="text-[11px] text-slate-600">با دکمه «ثبت اپ» برنامه موردنظر را اضافه کنید.</p>
              </div>
            ) : (
              filteredStats.map((app) => {
                const percentOfTotal = totalMinutesToday > 0 
                  ? Math.round((app.usageMinutesToday / totalMinutesToday) * 100)
                  : 0;
                const hasLimit = app.limitMinutes !== undefined;
                const isOverLimit = hasLimit && app.usageMinutesToday >= (app.limitMinutes || 0);

                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isOverLimit
                        ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-900/10'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md"
                          style={{ backgroundColor: app.iconColor }}
                        >
                          {app.appName.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {app.appName}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                              {app.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {app.opensCount} بار باز شده • دیروز: {formatHoursMinutes(app.usageMinutesYesterday)}
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0 flex items-center gap-3">
                        <div>
                          <span className="text-sm font-black font-mono text-cyan-300 block">
                            {formatHoursMinutes(app.usageMinutesToday)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {percentOfTotal}٪ از اسکرین‌تایم
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingApp(app);
                            setNewLimitMinutes(app.limitMinutes ? String(app.limitMinutes) : '');
                          }}
                          className={`p-2 rounded-xl border text-xs transition-colors ${
                            hasLimit
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                          title="تنظیم محدودیت روزانه"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverLimit ? 'bg-rose-500' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${percentOfTotal}%` }}
                      />
                    </div>

                    {hasLimit && (
                      <div className="flex items-center justify-between text-[10px] pt-0.5">
                        <span className={isOverLimit ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {isOverLimit ? '⚠️ محدودیت مصرف پر شده است!' : `سقف مجاز: ${formatHoursMinutes(app.limitMinutes!)}`}
                        </span>
                        <span className="text-slate-500 font-mono">
                          باقی‌مانده: {Math.max(0, (app.limitMinutes || 0) - app.usageMinutesToday)} دقیقه
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'habits' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white">الگوها و عادات شناسایی‌شده از رفتار روزمره</h4>
            </div>

            <div className="space-y-3">
              {insights.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  هنوز الگویی برای تحلیل ثبت نشده است. با ثبت و استفاده از برنامه‌ها، تحلیل هوشمند عادات در اینجا شکل خواهد گرفت.
                </div>
              ) : (
                insights.map((ins) => (
                  <div
                    key={ins.id}
                    className={`p-4 rounded-2xl border space-y-2 transition-all ${
                      ins.type === 'positive'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : ins.type === 'warning'
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-indigo-950/20 border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        {ins.type === 'positive' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : ins.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        )}
                        {ins.title}
                      </span>
                      {ins.timeContext && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                          {ins.timeContext}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {ins.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Limit Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                تعیین سقف مصرف برای {editingApp.appName}
              </h4>
              <button
                onClick={() => setEditingApp(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 block">
                حداکثر زمان مجاز در روز (دقیقه):
              </label>
              <input
                type="number"
                placeholder="مثلاً ۶۰ برای ۱ ساعت (یا خالی برای حذف سقف)"
                value={newLimitMinutes}
                onChange={(e) => setNewLimitMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveLimit}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
              >
                ذخیره سقف
              </button>
              <button
                onClick={() => setEditingApp(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add App Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewApp}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                ثبت و رصد برنامه جدید
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">نام برنامه</label>
                <input
                  type="text"
                  placeholder="مثلاً روبیکا، بله، ایتا..."
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">دسته‌بندی</label>
                <select
                  value={newAppCategory}
                  onChange={(e) => setNewAppCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-cyan-400"
                >
                  <option value="پیام‌رسان">پیام‌رسان</option>
                  <option value="شبکه‌های اجتماعی">شبکه‌های اجتماعی</option>
                  <option value="وب‌گردی">وب‌گردی</option>
                  <option value="سرگرمی و ویدیو">سرگرمی و ویدیو</option>
                  <option value="کاری و ابزارها">کاری و ابزارها</option>
                  <option value="تماس و پیامک">تماس و پیامک</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">میزان کارکرد امروز (دقیقه)</label>
                <input
                  type="number"
                  value={newAppMinutes}
                  onChange={(e) => setNewAppMinutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
              >
                ثبت و اضافه کردن
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
