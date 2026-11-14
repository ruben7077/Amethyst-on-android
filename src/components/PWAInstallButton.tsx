import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'full' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-emerald-400 font-medium whitespace-nowrap shrink-0">
        <Smartphone className="w-4 h-4" />
        Instalada en dispositivo
      </span>
    );
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          variant === 'compact'
            ? 'inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA]'
            : 'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA]'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Instalar en Android</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#13111C] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h3 id="pwa-guide-title" className="text-lg font-semibold text-[#EDE9F6]">
                {isIOS ? 'Instalar en iPhone / iPad' : 'Instalar Amethyst en Android'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Cerrar guía de instalación"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#9B8FB8] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-4 space-y-2 text-sm text-[#C4BBE0] list-decimal list-inside leading-relaxed">
                <li>Toca el botón Compartir en la barra de Safari.</li>
                <li>Desplázate y selecciona Añadir a pantalla de inicio.</li>
                <li>Confirma para abrir Amethyst Launcher como app independiente.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 text-sm text-[#C4BBE0] list-decimal list-inside leading-relaxed">
                <li>Abre el menú del navegador Chrome en tu dispositivo Android.</li>
                <li>Selecciona Instalar aplicación o Añadir a pantalla de inicio.</li>
                <li>La app funcionará sin barra del navegador y con caché offline.</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
