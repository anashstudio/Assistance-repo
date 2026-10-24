import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Wallet, 
  UserCheck, 
  Wrench, 
  ShieldCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { ActiveTab, AppModuleConfig } from '../types';
import { vibratePhone } from '../services/device';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  modules: AppModuleConfig[];
  onOpenModuleManager: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Determine active parent hub for sub-views
  const isPersonalActive = 
    activeTab === 'personal' || 
    activeTab === 'health' || 
    activeTab === 'vault' || 
    activeTab === 'habits' || 
    activeTab === 'crm';

  const isToolsActive = 
    activeTab === 'tools' || 
    activeTab === 'scanner' || 
    activeTab === 'app_usage' || 
    activeTab === 'vehicle' || 
    activeTab === 'meetings' || 
    activeTab === 'sync' || 
    activeTab === 'support' ||
    activeTab === 'library';

  const NAV_ITEMS = [
    { 
      id: 'dashboard' as ActiveTab, 
      title: 'داشبورد', 
      icon: <LayoutDashboard className="w-5 h-5" />, 
      active: activeTab === 'dashboard' 
    },
    { 
      id: 'messenger' as ActiveTab, 
      title: 'پیام‌رسان', 
      icon: <MessageSquare className="w-5 h-5" />, 
      active: activeTab === 'messenger',
      badge: 'جدید' 
    },
    { 
      id: 'finance' as ActiveTab, 
      title: 'حسابداری', 
      icon: <Wallet className="w-5 h-5" />, 
      active: activeTab === 'finance' 
    },
    { 
      id: 'personal' as ActiveTab, 
      title: 'شخصی', 
      icon: <UserCheck className="w-5 h-5" />, 
      active: isPersonalActive 
    },
    { 
      id: 'tools' as ActiveTab, 
      title: 'ابزارها', 
      icon: <Wrench className="w-5 h-5" />, 
      active: isToolsActive 
    },
    { 
      id: 'about' as ActiveTab, 
      title: 'تنظیمات', 
      icon: <ShieldCheck className="w-5 h-5" />, 
      active: activeTab === 'about' 
    },
  ];

  const handleItemClick = (id: ActiveTab) => {
    vibratePhone(20);
    onTabChange(id);
  };

  const toggleCollapse = () => {
    vibratePhone(15);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <nav 
      aria-label="ناوبری سمت راست برنامه"
      className="fixed right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-40 select-none flex items-center"
    >
      {/* Toggle collapse tab button */}
      <button
        onClick={toggleCollapse}
        className="w-5 h-12 -ml-2 rounded-l-xl bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white border-l border-y border-slate-700/80 flex items-center justify-center shadow-lg transition-colors z-10"
        title={isCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Vertical Navigation Bar */}
      <div 
        className={`bg-[#0c1322]/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-1.5 sm:p-2 shadow-2xl shadow-black/80 ring-1 ring-white/10 flex flex-col gap-1.5 transition-all duration-300 ${
          isCollapsed ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
        }`}
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`relative flex flex-col items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-2xl transition-all duration-200 active:scale-95 group ${
              item.active
                ? 'text-cyan-300 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 shadow-md ring-1 ring-cyan-400/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title={item.title}
          >
            <div className="relative">
              {item.icon}
              {item.badge && !item.active && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-cyan-400 text-[8px] font-black text-slate-950 animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[9px] mt-0.5 font-medium tracking-tight whitespace-nowrap leading-tight ${
              item.active ? 'text-cyan-300 font-bold' : 'text-slate-400 group-hover:text-slate-200'
            }`}>
              {item.title}
            </span>

            {/* Active right glow line */}
            {item.active && (
              <div className="absolute right-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-l-full shadow-lg shadow-cyan-400" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
