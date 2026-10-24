import React, { useState } from 'react';
import { 
  HeartPulse, 
  LockKeyhole, 
  Target, 
  HeartHandshake, 
  UserCheck, 
  Sparkles 
} from 'lucide-react';
import { HealthModule } from './HealthModule';
import { VaultModule } from './VaultModule';
import { HabitsTodoModule } from './HabitsTodoModule';
import { CrmOccasionsModule } from './CrmOccasionsModule';
import { vibratePhone } from '../../services/device';

export type PersonalSubTab = 'health' | 'vault' | 'habits' | 'crm';

interface PersonalModuleProps {
  initialSubTab?: PersonalSubTab;
  onRefreshStats?: () => void;
}

export const PersonalModule: React.FC<PersonalModuleProps> = ({ 
  initialSubTab = 'health',
  onRefreshStats 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PersonalSubTab>(initialSubTab);

  const handleTabChange = (tab: PersonalSubTab) => {
    vibratePhone(20);
    setActiveSubTab(tab);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Personal Hub Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">بخش شخصی و محرمانه (Personal Hub)</h2>
              <p className="text-[11px] text-slate-400">یکپارچه‌سازی پرونده سلامت، گاوصندوق رمزها، عادات روزانه و ارتباطات فردی</p>
            </div>
          </div>
        </div>

        {/* Unified Sub-Navigation Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleTabChange('health')}
            className={`py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border ${
              activeSubTab === 'health'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md ring-1 ring-rose-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <span>سلامت و پزشکی</span>
          </button>

          <button
            onClick={() => handleTabChange('vault')}
            className={`py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border ${
              activeSubTab === 'vault'
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-md ring-1 ring-indigo-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LockKeyhole className="w-4 h-4 text-indigo-400" />
            <span>گاوصندوق رمزها</span>
          </button>

          <button
            onClick={() => handleTabChange('habits')}
            className={`py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border ${
              activeSubTab === 'habits'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4 text-emerald-400" />
            <span>عادات و روتین‌ها</span>
          </button>

          <button
            onClick={() => handleTabChange('crm')}
            className={`py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border ${
              activeSubTab === 'crm'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>ارتباطات و مناسبت‌ها</span>
          </button>
        </div>
      </div>

      {/* Sub-Section Content */}
      <div className="transition-opacity duration-200">
        {activeSubTab === 'health' && <HealthModule />}
        {activeSubTab === 'vault' && <VaultModule />}
        {activeSubTab === 'habits' && <HabitsTodoModule />}
        {activeSubTab === 'crm' && <CrmOccasionsModule />}
      </div>
    </div>
  );
};
