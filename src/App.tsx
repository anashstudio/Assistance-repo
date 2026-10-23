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
import { AppIconModal } from './components/AppIconModal';
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

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [modulesConfig, setModulesConfig] = useState<AppModuleConfig[]>(INITIAL_MODULES_CONFIG);
  const [isModuleManagerOpen, setIsModuleManagerOpen] = useState<boolean>(false);
  const [isIconModalOpen, setIsIconModalOpen] = useState<boolean>(false);
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

  // Apply theme attributes to document
  const applyTheme = useCallback((cfg: ThemeConfig) => {
    document.documentElement.setAttribute('data-theme', cfg.mode);
    document.documentElement.setAttribute('data-accent', cfg.accentColor);
  }, []);

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
  }, [refreshStorageStats, applyTheme]);

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
          onOpenIconModal={() => setIsIconModalOpen(true)}
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
            onOpenIconModal={() => setIsIconModalOpen(true)}
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
                onOpenIconModal={() => setIsIconModalOpen(true)}
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

          {/* Custom App Icon Picker Modal */}
          <AppIconModal
            isOpen={isIconModalOpen}
            onClose={() => setIsIconModalOpen(false)}
            currentIcon={appIcon}
            onIconUpdated={(newIcon) => setAppIcon(newIcon)}
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
