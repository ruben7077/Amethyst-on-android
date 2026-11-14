import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2, Info } from 'lucide-react';
import {
  ANDROID_APPLICATION_ID,
  ANDROID_PORT_FILES,
  WINDOWS_TO_ANDROID_MAPPINGS,
} from '../core/androidPortFiles';
import { buildZipArchive } from '../core/zipBuilder';

export const PortArchitectureView: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState(ANDROID_PORT_FILES[0].path);
  const [copied, setCopied] = useState(false);

  const activeFile =
    ANDROID_PORT_FILES.find((f) => f.path === selectedPath) ?? ANDROID_PORT_FILES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const handleDownloadFile = () => {
    const filename = activeFile.path.split('/').pop() || 'source.txt';
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportProjectZip = () => {
    const zipBytes = buildZipArchive(
      ANDROID_PORT_FILES.map((file) => ({
        path: file.path.startsWith('.github/') ? file.path : `android/${file.path}`,
        content: file.content,
      }))
    );
    const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amethyst-launcher-${ANDROID_APPLICATION_ID}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Arquitectura del Port a Android
          </h1>
          <p className="mt-1 text-sm text-[#9B8FB8] max-w-2xl">
            Proyecto nativo Kotlin + Jetpack Compose + NDK configurado con Application ID{' '}
            <code className="text-[#A78BFA] font-mono">{ANDROID_APPLICATION_ID}</code> en la carpeta{' '}
            <code className="text-white font-mono">android/</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportProjectZip}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Proyecto (.zip)</span>
        </button>
      </div>

      {/* Build / APK Notice */}
      <section
        aria-label="Estado de compilación APK"
        className="rounded-2xl bg-[#13111C] border border-white/[0.08] p-5 flex items-start gap-3.5"
      >
        <Info className="w-5 h-5 text-[#A78BFA] shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-sm text-[#C4BBE0]">
          <h2 className="font-semibold text-white">
            Paquete Android listo para compilar: {ANDROID_APPLICATION_ID}
          </h2>
          <p className="text-xs md:text-sm text-[#9B8FB8] leading-relaxed">
            Todos los archivos Gradle, Kotlin y NDK C++ ya están guardados dentro del proyecto en{' '}
            <code className="text-white font-mono">android/</code> y listos para descargar en ZIP.
            Como este entorno web solo dispone de Node.js (sin Java JDK, Android SDK ni NDK), ejecuta{' '}
            <code className="text-[#A78BFA] font-mono">./gradlew assembleDebug</code> localmente o usa el flujo incluido en{' '}
            <code className="text-white font-mono">.github/workflows/build-apk.yml</code> para generar{' '}
            <code className="text-white font-mono">app-debug.apk</code>.
          </p>
        </div>
      </section>

      {/* Windows -> Android Mapping Table */}
      <section
        aria-label="Tabla de migración Windows a Android"
        className="rounded-2xl bg-[#13111C] border border-white/[0.08] overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-xs font-semibold text-[#9B8FB8]">
                <th className="py-3.5 px-5">Capa</th>
                <th className="py-3.5 px-5">Windows Original</th>
                <th className="py-3.5 px-5">Port Android</th>
                <th className="py-3.5 px-5">Decisión técnica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {WINDOWS_TO_ANDROID_MAPPINGS.map((row) => (
                <tr key={row.layer} className="hover:bg-white/[0.02]">
                  <td className="py-4 px-5 font-semibold text-white whitespace-nowrap">
                    {row.layer}
                  </td>
                  <td className="py-4 px-5 font-mono text-xs text-[#C4BBE0]">
                    {row.windowsOriginal}
                  </td>
                  <td className="py-4 px-5 font-mono text-xs text-[#A78BFA]">
                    {row.androidPort}
                  </td>
                  <td className="py-4 px-5 text-xs text-[#9B8FB8] leading-relaxed min-w-[260px]">
                    {row.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Source Code Explorer */}
      <section
        aria-label="Explorador de código Kotlin y NDK"
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
      >
        {/* File selector list */}
        <div className="lg:col-span-4 rounded-2xl bg-[#13111C] border border-white/[0.08] p-3 space-y-1 max-h-[600px] overflow-y-auto">
          <p className="px-3 py-2 text-xs font-semibold text-[#9B8FB8]">
            Archivos del módulo Android ({ANDROID_PORT_FILES.length})
          </p>
          {ANDROID_PORT_FILES.map((file) => {
            const isSelected = file.path === activeFile.path;
            const fileName = file.path.split('/').pop() || file.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl text-left flex items-start gap-2.5 transition-colors ${
                  isSelected
                    ? 'bg-[#8B5CF6]/20 text-white border border-[#8B5CF6]/40'
                    : 'text-[#C4BBE0] hover:bg-white/[0.04]'
                }`}
              >
                <FileCode2 className="w-4 h-4 text-[#A78BFA] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="block text-xs font-mono font-medium truncate">
                    {fileName}
                  </span>
                  <span className="block text-[11px] text-[#9B8FB8] truncate">
                    {file.path}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-8 rounded-2xl bg-[#13111C] border border-white/[0.08] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-mono text-white truncate">{activeFile.path}</p>
              <p className="mt-0.5 text-xs text-[#9B8FB8]">{activeFile.summary}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 p-5 bg-[#0B0A10] text-xs font-mono text-[#EDE9F6] overflow-x-auto max-h-[520px] leading-relaxed">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      </section>
    </div>
  );
};
