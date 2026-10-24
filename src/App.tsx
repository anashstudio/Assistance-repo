import React, { useState, useEffect, useCallback } from 'react';
import { 
  ActiveTab, 
  AppModuleConfig, 
  StorageStats, 
  SecuritySettings,
  ThemeConfig 
} from './types';
import { INITIAL_MODULES_CONFIG } from './data/modulesRegistry';
import { localDB } from './services/db';
import { getSecuritySettings } from './services/biometrics';
import { syncContactsToHost, getHostingConfig } from './services/sync';
import { getAppUsageStats } from './services/appUsageTracker';
import { getCustomAppIcon, DEFAULT_ANASH_ICON_SVG } from './services/appIcon';

import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LockScreen } from './components/LockScreen';
import { ModuleManagerModal } from './components/modules/ModuleManagerModal';
import { VersionChangelogModal } from './components/VersionChangelogModal';

import { DashboardModule } from './components/modules/DashboardModule';
import { MessengerModule } from './components/modules/MessengerModule';
import { FinanceModule } from './components/modules/FinanceModule';
import { PersonalModule } from './components/modules/PersonalModule';
import { ToolsModule } from './components/modules/ToolsModule';
import { DocumentScannerModule } from './components/modules/DocumentScannerModule';
import { AppUsageModule } from './components/modules/AppUsageModule';
import { VehicleModule } from './components/modules/VehicleModule';
import { MeetingsModule } from './components/modules/MeetingsModule';
import { ContactsModule } from './components/modules/ContactsModule';
import { HostingSyncModule } from './components/modules/HostingSyncModule';
import { SupportModule } from './components/modules/SupportModule';
import { AboutModule } from './components/modules/AboutModule';
import { LibraryModule } from './components/modules/LibraryModule';

const DEFAULT_THEME: ThemeConfig = {
  mode: 'dark',
  accentColor: 'cyan',
  compactMode: false,
};

const ACCENT_COLOR_MAP: Record<string, { color: string; hover: string; light: string; border: string; text: string; glow: string }> = {
  cyan: { color: '#06b6d4', hover: '#0891b2', light: 'rgba(6,182,212,0.18)', border: 'rgba(6,182,212,0.45)', text: '#22d3ee', glow: 'rgba(6,182,212,0.35)' },
  emerald: { color: '#10b981', hover: '#059669', light: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.45)', text: '#34d399', glow: 'rgba(16,185,129,0.35)' },
  indigo: { color: '#6366f1', hover: '#4f46e5', light: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.45)', text: '#818cf8', glow: 'rgba(99,102,241,0.35)' },
  amber: { color: '#f59e0b', hover: '#d97706', light: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.45)', text: '#fbbf24', glow: 'rgba(245,158,11,0.35)' },
  rose: { color: '#f43f5e', hover: '#e11d48', light: 'rgba(244,63,94,0.18)', border: 'rgba(244,63,94,0.45)', text: '#fb7185', glow: 'rgba(244,63,94,0.35)' },
  violet: { color: '#8b5cf6', hover: '#7c3aed', light: 'rgba(139,92,246,0.18)', border: 'rgba(139,92,246,0.45)', text: '#a78bfa', glow: 'rgba(139,92,246,0.35)' },
  sky: { color: '#0ea5e9', hover: '#0284c7', light: 'rgba(14,165,233,0.18)', border: 'rgba(14,165,233,0.45)', text: '#38bdf8', glow: 'rgba(14,165,233,0.35)' },
};

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [modulesConfig, setModulesConfig] = useState<AppModuleConfig[]>(INITIAL_MODULES_CONFIG);
  const [isModuleManagerOpen, setIsModuleManagerOpen] = useState<boolean>(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME);
  const [appIcon, setAppIcon] = useState<string>(DEFAULT_ANASH_ICON_SVG);
  const [totalScreenTimeMinutes, setTotalScreenTimeMinutes] = useState<number>(0);

  const [storageStats, setStorageStats] = useState<StorageStats>({
    transactionsCount: 0,
    documentsCount: 0,
    contactsCount: 0,
    ticketsCount: 0,
    estimatedBytes: 0,
  });

  // Apply theme attributes and dynamic CSS properties to documentElement
  const applyTheme = useCallback((cfg: ThemeConfig) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', cfg.mode);
    root.setAttribute('data-accent', cfg.accentColor);

    const c = ACCENT_COLOR_MAP[cfg.accentColor] || ACCENT_COLOR_MAP['cyan'];
    root.style.setProperty('--accent-color', c.color);
    root.style.setProperty('--accent-hover', c.hover);
    root.style.setProperty('--accent-light', c.light);
    root.style.setProperty('--accent-border', c.border);
    root.style.setProperty('--accent-text', c.text);
    root.style.setProperty('--accent-glow', c.glow);
  }, []);

  // Fetch host settings (such as app_icon, app_theme_mode, app_accent_color) configured in Web Panel
  const syncHostGlobalSettings = useCallback(async () => {
    try {
      const config = await getHostingConfig();
      if (!config.apiUrl) return;

      const res = await fetch(`${config.apiUrl}?action=get_settings`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.app_icon) {
            setAppIcon(s.app_icon);
            await localDB.setSetting('app_custom_logo_icon_url', s.app_icon);
          }
          if (s.app_theme_mode || s.app_accent_color) {
            const currentTheme = await localDB.getSetting<ThemeConfig>('app_theme_config', DEFAULT_THEME);
            const updatedTheme: ThemeConfig = {
              ...currentTheme,
              mode: (s.app_theme_mode as any) || currentTheme.mode,
              accentColor: (s.app_accent_color as any) || currentTheme.accentColor,
            };
            setThemeConfig(updatedTheme);
            applyTheme(updatedTheme);
            await localDB.setSetting('app_theme_config', updatedTheme);
          }
        }
      }
    } catch {
      // Offline or server not reached
    }
  }, [applyTheme]);

  // Load initial settings, modules configuration, theme, and stats
  const refreshStorageStats = useCallback(async () => {
    try {
      const stats = await localDB.getStorageStats();
      setStorageStats(stats);

      const usage = await getAppUsageStats();
      const totalMinutes = usage.reduce((sum, s) => sum + s.usageMinutesToday, 0);
      setTotalScreenTimeMinutes(totalMinutes);
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    }
  }, []);

  useEffect(() => {
    getSecuritySettings().then((sec) => {
      setSecuritySettings(sec);
      if (!sec.isLockEnabled) {
        setIsLocked(false);
      }
    });

    // Load custom app icon
    getCustomAppIcon().then((icon) => {
      setAppIcon(icon);
    });

    // Load theme configuration
    localDB.getSetting<ThemeConfig>('app_theme_config', DEFAULT_THEME)
      .then((savedTheme) => {
        setThemeConfig(savedTheme);
        applyTheme(savedTheme);
      });

    // Check host settings asynchronously
    syncHostGlobalSettings();

    // Load custom modules state
    localDB.getSetting<AppModuleConfig[]>('app_modules_registry', INITIAL_MODULES_CONFIG)
      .then((savedModules) => {
        setModulesConfig(savedModules);
      });

    refreshStorageStats();

    // Listen to network changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshStorageStats, applyTheme, syncHostGlobalSettings]);

  const handleUpdateTheme = (newTheme: ThemeConfig) => {
    setThemeConfig(newTheme);
    applyTheme(newTheme);
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleLock = () => {
    setIsLocked(true);
  };

  const handleToggleModule = async (id: ActiveTab) => {
    const updated = modulesConfig.map((m) =>
      m.id === id ? { ...m, isEnabled: !m.isEnabled } : m
    );
    setModulesConfig(updated);
    await localDB.setSetting('app_modules_registry', updated);

    // If active tab was disabled, fallback to dashboard
    const current = updated.find((m) => m.id === id);
    if (current && !current.isEnabled && activeTab === id) {
      setActiveTab('dashboard');
    }
  };

  const handleResetDefaults = async () => {
    setModulesConfig(INITIAL_MODULES_CONFIG);
    await localDB.setSetting('app_modules_registry', INITIAL_MODULES_CONFIG);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const config = await getHostingConfig();
      if (!config.apiUrl) {
        setActiveTab('sync');
        return;
      }
      await syncContactsToHost(config.apiUrl, config.apiKey);
      await refreshStorageStats();
    } finally {
      setIsSyncing(false);
    }
  };

  const enabledCount = modulesConfig.filter((m) => m.isEnabled).length;

  // Background styling based on theme
  const getThemeContainerClass = () => {
    switch (themeConfig.mode) {
      case 'oled':
        return 'bg-black text-slate-100';
      case 'light':
        return 'bg-slate-100 text-slate-900';
      case 'cyber':
        return 'bg-[#040810] text-cyan-100';
      case 'dark':
      default:
        return 'bg-[#070b14] text-slate-100';
    }
  };

  return (
    <div className={`min-h-screen ${getThemeContainerClass()} flex flex-col font-['Vazirmatn',sans-serif] transition-colors duration-300`}>
      {/* Biometric / PIN Lock Screen */}
      {isLocked && securitySettings ? (
        <LockScreen
          onUnlock={handleUnlock}
          savedPinHash={securitySettings.pinHash}
          isBiometricEnabled={securitySettings.isBiometricEnabled}
          appIcon={appIcon}
        />
      ) : (
        <>
          {/* Main Top Header */}
          <Header
            activeTab={activeTab}
            onLock={handleLock}
            isOnline={isOnline}
            onOpenModuleManager={() => setIsModuleManagerOpen(true)}
            isSyncing={isSyncing}
            onTriggerSync={handleTriggerSync}
            activeModulesCount={enabledCount}
            appIcon={appIcon}
            onOpenVersionModal={() => setIsVersionModalOpen(true)}
          />

          {/* Main Content Area - padded on the right for right-side navigation bar */}
          <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-5 pt-4 pb-12 pr-16 sm:pr-20">
            {activeTab === 'dashboard' && (
              <DashboardModule
                onNavigate={(tab) => setActiveTab(tab)}
                modules={modulesConfig}
                onOpenModuleManager={() => setIsModuleManagerOpen(true)}
                storageStats={storageStats}
                isOnline={isOnline}
                onLockApp={handleLock}
                totalScreenTimeMinutes={totalScreenTimeMinutes}
              />
            )}

            {activeTab === 'messenger' && <MessengerModule />}

            {activeTab === 'finance' && (
              <FinanceModule onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'personal' && (
              <PersonalModule onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'tools' && (
              <ToolsModule onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'scanner' && (
              <DocumentScannerModule onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'app_usage' && <AppUsageModule />}

            {activeTab === 'vehicle' && <VehicleModule />}

            {activeTab === 'health' && (
              <PersonalModule initialSubTab="health" onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'vault' && (
              <PersonalModule initialSubTab="vault" onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'habits' && (
              <PersonalModule initialSubTab="habits" onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'crm' && (
              <PersonalModule initialSubTab="crm" onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'meetings' && <MeetingsModule />}

            {activeTab === 'contacts' && (
              <ContactsModule
                onRefreshStats={refreshStorageStats}
                onNavigateToSms={() => setActiveTab('finance')}
              />
            )}

            {activeTab === 'sync' && <HostingSyncModule />}

            {activeTab === 'library' && <LibraryModule />}

            {activeTab === 'support' && (
              <SupportModule onRefreshStats={refreshStorageStats} />
            )}

            {activeTab === 'about' && (
              <AboutModule 
                onRefreshStats={refreshStorageStats}
                themeConfig={themeConfig}
                onUpdateTheme={handleUpdateTheme}
                appIcon={appIcon}
                onOpenVersionModal={() => setIsVersionModalOpen(true)}
              />
            )}
          </main>

          {/* Right-Side Ergonomic Navigation Bar */}
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            modules={modulesConfig}
            onOpenModuleManager={() => setIsModuleManagerOpen(true)}
          />

          {/* Dynamic Module Manager Modal */}
          <ModuleManagerModal
            isOpen={isModuleManagerOpen}
            onClose={() => setIsModuleManagerOpen(false)}
            modules={modulesConfig}
            onToggleModule={handleToggleModule}
            onResetDefaults={handleResetDefaults}
          />

          {/* Detailed Version & Changelog Modal */}
          <VersionChangelogModal
            isOpen={isVersionModalOpen}
            onClose={() => setIsVersionModalOpen(false)}
            appIcon={appIcon}
          />
        </>
      )}
    </div>
  );
}
export default App;
