import React, { useState } from 'react';
import { 
  Wrench, 
  FileScan, 
  Smartphone, 
  Car, 
  Briefcase, 
  CloudCog, 
  Headphones,
  Sparkles,
  Library 
} from 'lucide-react';
import { DocumentScannerModule } from './DocumentScannerModule';
import { AppUsageModule } from './AppUsageModule';
import { VehicleModule } from './VehicleModule';
import { MeetingsModule } from './MeetingsModule';
import { HostingSyncModule } from './HostingSyncModule';
import { SupportModule } from './SupportModule';
import { LibraryModule } from './LibraryModule';
import { vibratePhone } from '../../services/device';

export type ToolsSubTab = 'scanner' | 'app_usage' | 'vehicle' | 'meetings' | 'library' | 'sync' | 'support';

interface ToolsModuleProps {
  initialSubTab?: ToolsSubTab;
  onRefreshStats: () => void;
}

export const ToolsModule: React.FC<ToolsModuleProps> = ({
  initialSubTab = 'scanner',
  onRefreshStats,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ToolsSubTab>(initialSubTab);

  const handleTabChange = (tab: ToolsSubTab) => {
    vibratePhone(20);
    setActiveSubTab(tab);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Tools Hub Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">جعبه ابزار هوشمند (Tools Hub)</h2>
              <p className="text-[11px] text-slate-400">اسکنر چندصفحه‌ای PDF، رصد کارکرد برنامه‌ها، سرویس خودرو و جلسات کاری</p>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Pills for Tools */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
          <button
            onClick={() => handleTabChange('scanner')}
            className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
              activeSubTab === 'scanner'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileScan className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">اسکنر PDF</span>
          </button>

          <button
            onClick={() => handleTabChange('app_usage')}
            className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
              activeSubTab === 'app_usage'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-md ring-1 ring-cyan-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">کارکرد اپ‌ها</span>
          </button>

          <button
            onClick={() => handleTabChange('vehicle')}
            className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
              activeSubTab === 'vehicle'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">خودرو</span>
          </button>

          <button
            onClick={() => handleTabChange('meetings')}
            className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
              activeSubTab === 'meetings'
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-md ring-1 ring-indigo-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">جلسات</span>
          </button>

          <button
            onClick={() => handleTabChange('library')}
            className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
              activeSubTab === 'library'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Library className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">کتابخانه</span>
          </button>
          <button
            onClick={() => handleTabChange('sync')}
            className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
              activeSubTab === 'sync'
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-md ring-1 ring-sky-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CloudCog className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">هاست</span>
          </button>

          <button
            onClick={() => handleTabChange('support')}
            className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
              activeSubTab === 'support'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md ring-1 ring-rose-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">پشتیبانی</span>
          </button>
        </div>
      </div>

      {/* Sub-Section Content */}
      <div className="transition-opacity duration-200">
        {activeSubTab === 'scanner' && <DocumentScannerModule onRefreshStats={onRefreshStats} />}
        {activeSubTab === 'app_usage' && <AppUsageModule />}
        {activeSubTab === 'vehicle' && <VehicleModule />}
        {activeSubTab === 'meetings' && <MeetingsModule />}
        {activeSubTab === 'library' && <LibraryModule />}
        {activeSubTab === 'sync' && <HostingSyncModule />}
        {activeSubTab === 'support' && <SupportModule onRefreshStats={onRefreshStats} />}
      </div>
    </div>
  );
};
