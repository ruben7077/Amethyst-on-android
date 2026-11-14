import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600/95 px-3.5 py-2 text-xs font-medium text-white shadow-lg border border-amber-400/30"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo sin conexión · Usando perfiles locales</span>
    </div>
  );
};
