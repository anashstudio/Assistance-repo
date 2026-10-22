import React, { useState, useEffect } from 'react';
import { 
  CloudCog, 
  Server, 
  Key, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { HostingConfig } from '../../types';
import { 
  getHostingConfig, 
  saveHostingConfig, 
  testHostingConnection, 
  syncContactsToHost 
} from '../../services/sync';
import { vibratePhone } from '../../services/device';

export const HostingSyncModule: React.FC = () => {
  const [config, setConfig] = useState<HostingConfig>({
    apiUrl: '',
    apiKey: '',
    autoSync: false,
    syncIntervalMinutes: 30,
  });

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    getHostingConfig().then((saved) => {
      setConfig(saved);
    });
  }, []);

  const handleSaveConfig = async () => {
    vibratePhone(25);
    await saveHostingConfig(config);
    setTestResult({ success: true, message: 'تنظیمات با موفقیت ذخیره شد.' });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    vibratePhone(25);

    try {
      const res = await testHostingConnection(config.apiUrl, config.apiKey);
      setTestResult({ success: res.success, message: res.message });
      if (res.success) {
        await saveHostingConfig(config);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    vibratePhone(35);

    try {
      const res = await syncContactsToHost(config.apiUrl, config.apiKey);
      setSyncResult({ success: res.success, message: res.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-12">
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <CloudCog className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">اتصال به هاست ابری شخصی</h3>
            <p className="text-[11px] text-slate-400">همگام‌سازی دوطرفه اطلاعات با سرور اختصاصی</p>
          </div>
        </div>

        {/* API URL */}
        <div>
          <label className="text-xs text-slate-400 block mb-1 font-medium">
            آدرس وب‌سرویس سرور
          </label>
          <input
            type="url"
            placeholder="https://yourdomain.com/api/api.php"
            value={config.apiUrl}
            onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white font-mono dir-ltr text-xs focus:outline-hidden focus:border-cyan-400"
          />
        </div>

        {/* Secret API Key */}
        <div>
          <label className="text-xs text-slate-400 block mb-1 font-medium">
            کلید امنیتی (API Key)
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white font-mono dir-ltr text-xs focus:outline-hidden focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !config.apiUrl}
            className="py-2.5 px-4 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 disabled:opacity-40 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>تست اتصال</span>
          </button>

          <button
            onClick={handleManualSync}
            disabled={isSyncing || !config.apiUrl}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 transition-all active:scale-95"
          >
            <CloudCog className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>همگام‌سازی</span>
          </button>

          <button
            onClick={handleSaveConfig}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
          >
            ذخیره
          </button>
        </div>

        {/* Feedback Banners */}
        {testResult && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {syncResult && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
              syncResult.success
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}
          >
            {syncResult.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{syncResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
