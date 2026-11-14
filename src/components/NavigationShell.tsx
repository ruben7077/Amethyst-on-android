import React from 'react';
import { Box, Code2, Layers, Play, Settings } from 'lucide-react';
import { LauncherTab } from '../core/types';

interface NavigationShellProps {
  activeTab: LauncherTab;
  onSelectTab: (tab: LauncherTab) => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: LauncherTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: LauncherTab.LAUNCHER, label: 'Launcher', icon: Play },
  { id: LauncherTab.PROFILES, label: 'Perfiles', icon: Layers },
  { id: LauncherTab.MODS, label: 'Mods', icon: Box },
  { id: LauncherTab.PORT, label: 'Port Android', icon: Code2 },
  { id: LauncherTab.SETTINGS, label: 'Ajustes', icon: Settings },
];

export const NavigationShell: React.FC<NavigationShellProps> = ({
  activeTab,
  onSelectTab,
  onPrimaryAction,
  primaryActionLabel,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#0B0A10] text-[#EDE9F6] flex flex-col">
      {/* Desktop & Mobile Top Header (strictly 3-zone contract on desktop, <=52px compact on mobile) */}
      <header className="sticky top-0 z-30 h-[52px] md:h-16 bg-[#0B0A10]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab(LauncherTab.LAUNCHER)}
            className="text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#8B5CF6] rounded-md"
          >
            Amethyst Android
          </button>

          {/* Zone 2: Clean single-line text nav links (Desktop/Tablet) */}
          <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#8B5CF6] rounded-sm ${
                    isActive
                      ? 'text-white'
                      : 'text-[#9B8FB8] hover:text-[#EDE9F6]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6] rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-[0.98] text-xs md:text-sm font-semibold text-white transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA]"
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-5 pb-24 md:py-8">
        {children}
      </main>

      {/* Mobile Thumb-Zone Bottom Tab Bar (64px height, total sticky <= 116px = 13.7% of 844px) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#13111C]/95 backdrop-blur-md border-t border-white/[0.08] grid grid-cols-5 items-center px-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors px-1 ${
                isActive ? 'text-[#A78BFA]' : 'text-[#9B8FB8] hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-medium leading-none truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
