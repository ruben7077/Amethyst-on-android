import React, { useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { ANDROID_PORT_FILES } from '../core/androidPortFiles';
import {
  AndroidAbi,
  AndroidPortConfig,
  InjectionMethod,
} from '../core/types';
import { buildZipArchive } from '../core/zipBuilder';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  config: AndroidPortConfig;
  onUpdateConfig: (partial: Partial<AndroidPortConfig>) => void;
  onResetState: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
  onResetState,
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadApkProject = async () => {
    setDownloadingZip(true);
    try {
      const files = ANDROID_PORT_FILES.map((file) => ({
        path: file.path.startsWith('.github/') ? file.path : `android/${file.path}`,
        content: file.content,
      }));

      try {
        const res = await fetch('/bonus-mods/Create@0.1.1.amethyst');
        if (res.ok) {
          const buf = await res.arrayBuffer();
          files.push({
            path: 'android/app/src/main/assets/bonus_mods/Create@0.1.1.amethyst',
            content: new Uint8Array(buf),
          } as unknown as { path: string; content: string });
        }
      } catch {
        // Offline sin mod bonus en caché: exportar archivos de proyecto igualmente
      }

      const zipBytes = buildZipArchive(files);
      const copy = new Uint8Array(zipBytes.byteLength);
      copy.set(zipBytes);
      const blob = new Blob([copy], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'amethyst-android-com.rubenamethyst.app.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Ajustes del Launcher
        </h1>
        <p className="mt-1 text-sm text-[#9B8FB8]">
          Configura la arquitectura NDK objetivo, método de carga de AmethystRuntime, almacenamiento y compilación del APK.
        </p>
      </div>

      {/* Android Runtime Settings Card */}
      <section className="rounded-2xl bg-[#13111C] border border-white/[0.08] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Entorno Nativo y ABI</h2>
          <span className="text-xs font-mono text-[#A78BFA]">
            ID: com.rubenamethyst.app
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="settings-abi-select" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
              Arquitectura ABI objetivo
            </label>
            <select
              id="settings-abi-select"
              value={config.targetAbi}
              onChange={(e) => onUpdateConfig({ targetAbi: e.target.value as AndroidAbi })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value={AndroidAbi.ARM64_V8A}>arm64-v8a (Recomendado 64-bit)</option>
              <option value={AndroidAbi.ARMEABI_V7A}>armeabi-v7a (32-bit legado)</option>
              <option value={AndroidAbi.X86_64}>x86_64 (Emuladores / Chromebooks)</option>
            </select>
          </div>

          <div>
            <label htmlFor="settings-injection-select" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
              Estrategia de carga ELF (.so)
            </label>
            <select
              id="settings-injection-select"
              value={config.injectionMethod}
              onChange={(e) =>
                onUpdateConfig({ injectionMethod: e.target.value as InjectionMethod })
              }
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value={InjectionMethod.PATCHED_APK}>
                APK Nativo (libamethyst_loader.so)
              </option>
              <option value={InjectionMethod.SHIZUKU_ZYGISK}>
                Shizuku / Root Zygisk (Sin reempaquetar APK)
              </option>
              <option value={InjectionMethod.LD_PRELOAD_WRAPPER}>
                Wrapper LD_PRELOAD en espacio virtual
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="settings-pkg-input" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
              Package Name de Minecraft Bedrock
            </label>
            <input
              id="settings-pkg-input"
              type="text"
              value={config.packageName}
              onChange={(e) => onUpdateConfig({ packageName: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div>
            <label htmlFor="settings-storage-input" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
              Ruta de almacenamiento (Scoped Storage)
            </label>
            <input
              id="settings-storage-input"
              type="text"
              value={config.storagePath}
              onChange={(e) => onUpdateConfig({ storagePath: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.06] divide-y divide-white/[0.06]">
          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <span className="block text-sm font-medium text-white">
                Verificar compatibilidad ABI antes de iniciar
              </span>
              <span className="block text-xs text-[#9B8FB8]">
                Bloquea el arranque si un mod .so no coincide con la arquitectura seleccionada.
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.verifyAbiOnLaunch}
              onChange={(e) => onUpdateConfig({ verifyAbiOnLaunch: e.target.checked })}
              className="w-5 h-5 accent-[#8B5CF6] shrink-0"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <span className="block text-sm font-medium text-white">Modo Desarrollador</span>
              <span className="block text-xs text-[#9B8FB8]">
                Habilita registro detallado de símbolos dlsym() y recarga de perfiles de prueba.
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.developerMode}
              onChange={(e) => onUpdateConfig({ developerMode: e.target.checked })}
              className="w-5 h-5 accent-[#8B5CF6] shrink-0"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <span className="block text-sm font-medium text-white">
                Mantener consola de ejecución visible tras iniciar
              </span>
              <span className="block text-xs text-[#9B8FB8]">
                Muestra los comandos de arranque y salidas de AmethystLoader.
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.keepLogcatOpen}
              onChange={(e) => onUpdateConfig({ keepLogcatOpen: e.target.checked })}
              className="w-5 h-5 accent-[#8B5CF6] shrink-0"
            />
          </label>
        </div>
      </section>

      {/* APK Build Export & PWA Installation / Reset */}
      <section className="rounded-2xl bg-[#13111C] border border-white/[0.08] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-semibold text-white">
              Compilación APK (GitHub Actions)
            </h2>
            <p className="mt-1 text-xs text-[#9B8FB8]">
              Descarga el proyecto Kotlin/NDK completo con el workflow de GitHub Actions listo para generar el APK firmado (<code className="text-[#C4BBE0]">com.rubenamethyst.app</code>).
            </p>
          </div>
          <button
            type="button"
            disabled={downloadingZip}
            onClick={handleDownloadApkProject}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingZip ? 'Empaquetando...' : 'Descargar proyecto APK (.zip)'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Aplicación Web Progresiva (PWA)
            </h2>
            <p className="mt-1 text-xs text-[#9B8FB8]">
              Instala Amethyst Launcher en la pantalla de inicio de tu teléfono con soporte sin conexión.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={onResetState}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#EDE9F6] flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restablecer datos</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
