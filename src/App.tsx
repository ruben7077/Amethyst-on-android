/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { LauncherView } from './components/LauncherView';
import { ModsView } from './components/ModsView';
import { NavigationShell } from './components/NavigationShell';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PortArchitectureView } from './components/PortArchitectureView';
import { ProfilesView } from './components/ProfilesView';
import { SettingsView } from './components/SettingsView';
import {
  createInitialLauncherState,
  loadLauncherState,
  saveLauncherState,
  toggleModInProfile,
} from './core/launcherLogic';
import {
  AndroidPortConfig,
  LauncherState,
  LauncherTab,
  ModEntry,
  ProfileEntry,
} from './core/types';

function resolveInitialTab(): LauncherTab {
  if (typeof window === 'undefined') return LauncherTab.LAUNCHER;
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (tabParam && Object.values(LauncherTab).includes(tabParam as LauncherTab)) {
    return tabParam as LauncherTab;
  }
  return LauncherTab.LAUNCHER;
}

export default function App() {
  const [state, setState] = useState<LauncherState>(() => loadLauncherState());
  const [activeTab, setActiveTab] = useState<LauncherTab>(() => resolveInitialTab());
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    saveLauncherState(state);
  }, [state]);

  const handleSelectProfile = useCallback((profileId: string) => {
    setState((prev) => ({
      ...prev,
      activeProfileId: profileId,
    }));
  }, []);

  const handleSaveProfile = useCallback((profile: ProfileEntry) => {
    setState((prev) => {
      const exists = prev.profiles.some((p) => p.id === profile.id);
      const profiles = exists
        ? prev.profiles.map((p) => (p.id === profile.id ? profile : p))
        : [profile, ...prev.profiles];
      return {
        ...prev,
        profiles,
        activeProfileId: exists ? prev.activeProfileId : profile.id,
      };
    });
  }, []);

  const handleDeleteProfile = useCallback((profileId: string) => {
    setState((prev) => {
      if (prev.profiles.length <= 1) return prev;
      const nextProfiles = prev.profiles.filter((p) => p.id !== profileId);
      const nextActive =
        prev.activeProfileId === profileId ? nextProfiles[0].id : prev.activeProfileId;
      return {
        ...prev,
        profiles: nextProfiles,
        activeProfileId: nextActive,
      };
    });
  }, []);

  const handleToggleMod = useCallback((modId: string) => {
    setState((prev) => ({
      ...prev,
      profiles: toggleModInProfile(prev.profiles, prev.activeProfileId, modId),
    }));
  }, []);

  const handleImportMod = useCallback((mod: ModEntry) => {
    setState((prev) => ({
      ...prev,
      mods: [mod, ...prev.mods],
      profiles: prev.profiles.map((p) =>
        p.id === prev.activeProfileId && !p.modIds.includes(mod.id)
          ? { ...p, modIds: [...p.modIds, mod.id] }
          : p
      ),
    }));
  }, []);

  const handleDeleteMod = useCallback((modId: string) => {
    setState((prev) => ({
      ...prev,
      mods: prev.mods.filter((m) => m.id !== modId),
      profiles: prev.profiles.map((p) => ({
        ...p,
        modIds: p.modIds.filter((id) => id !== modId),
      })),
    }));
  }, []);

  const handleToggleRuntimeInstalled = useCallback((runtimeId: string) => {
    setState((prev) => ({
      ...prev,
      runtimes: prev.runtimes.map((rt) =>
        rt.id === runtimeId ? { ...rt, installed: !rt.installed } : rt
      ),
    }));
  }, []);

  const handleInstallMissingTarget = useCallback((mcVersion: string, runtimeId?: string) => {
    setState((prev) => ({
      ...prev,
      mcVersions: prev.mcVersions.map((ver) =>
        ver.version === mcVersion ? { ...ver, installedOnDevice: true } : ver
      ),
      runtimes: runtimeId
        ? prev.runtimes.map((rt) =>
            rt.id === runtimeId ? { ...rt, installed: true } : rt
          )
        : prev.runtimes,
    }));
  }, []);

  const handleRecordPlay = useCallback((profileId: string) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === profileId ? { ...p, lastPlayed: `Hoy · ${hh}:${mm}` } : p
      ),
    }));
  }, []);

  const handleUpdateConfig = useCallback((partial: Partial<AndroidPortConfig>) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...partial },
    }));
  }, []);

  const handleResetState = useCallback(() => {
    const fresh = createInitialLauncherState();
    setState(fresh);
  }, []);

  const handlePrimaryHeaderAction = useCallback(() => {
    setActiveTab(LauncherTab.MODS);
    setImportModalOpen(true);
  }, []);

  return (
    <NavigationShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onPrimaryAction={handlePrimaryHeaderAction}
      primaryActionLabel="Importar Mod"
    >
      {activeTab === LauncherTab.LAUNCHER && (
        <LauncherView
          state={state}
          onSelectProfile={handleSelectProfile}
          onInstallMissingTarget={handleInstallMissingTarget}
          onNavigateTab={setActiveTab}
          onRecordPlay={handleRecordPlay}
        />
      )}

      {activeTab === LauncherTab.PROFILES && (
        <ProfilesView
          state={state}
          onSelectProfile={(id) => {
            handleSelectProfile(id);
            setActiveTab(LauncherTab.LAUNCHER);
          }}
          onSaveProfile={handleSaveProfile}
          onDeleteProfile={handleDeleteProfile}
        />
      )}

      {activeTab === LauncherTab.MODS && (
        <ModsView
          state={state}
          onToggleMod={handleToggleMod}
          onImportMod={handleImportMod}
          onDeleteMod={handleDeleteMod}
          onToggleRuntimeInstalled={handleToggleRuntimeInstalled}
          importModalOpen={importModalOpen}
          onSetImportModalOpen={setImportModalOpen}
        />
      )}

      {activeTab === LauncherTab.PORT && <PortArchitectureView />}

      {activeTab === LauncherTab.SETTINGS && (
        <SettingsView
          config={state.config}
          onUpdateConfig={handleUpdateConfig}
          onResetState={handleResetState}
        />
      )}

      <OfflineIndicator />
    </NavigationShell>
  );
}
