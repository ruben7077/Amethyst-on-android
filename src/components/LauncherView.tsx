import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  FolderGit2,
  Play,
  Square,
  Terminal,
  Wrench,
} from 'lucide-react';
import bannerImg from '../assets/images/launcher_banner_backdrop_1794657049177.jpg';
import emblemImg from '../assets/images/amethyst_crystal_emblem_1794657048462.jpg';
import {
  buildLaunchSequence,
  evaluateLaunchReadiness,
} from '../core/launcherLogic';
import {
  InjectionMethod,
  LaunchStep,
  LauncherState,
  LauncherTab,
  RuntimeType,
} from '../core/types';

interface LauncherViewProps {
  state: LauncherState;
  onSelectProfile: (profileId: string) => void;
  onInstallMissingTarget: (mcVersion: string, runtimeId?: string) => void;
  onNavigateTab: (tab: LauncherTab) => void;
  onRecordPlay: (profileId: string) => void;
}

export const LauncherView: React.FC<LauncherViewProps> = ({
  state,
  onSelectProfile,
  onInstallMissingTarget,
  onNavigateTab,
  onRecordPlay,
}) => {
  const readiness = evaluateLaunchReadiness(state);
  const [launchState, setLaunchState] = useState<'idle' | 'launching' | 'running'>('idle');
  const [completedStepIndex, setCompletedStepIndex] = useState<number>(-1);
  const [activeSteps, setActiveSteps] = useState<LaunchStep[]>([]);
  const [bannerError, setBannerError] = useState(false);
  const [emblemError, setEmblemError] = useState(false);

  useEffect(() => {
    if (launchState !== 'launching') return;
    if (completedStepIndex + 1 >= activeSteps.length) {
      setLaunchState('running');
      if (readiness.profile) {
        onRecordPlay(readiness.profile.id);
      }
      return;
    }

    const nextStep = activeSteps[completedStepIndex + 1];
    const timer = window.setTimeout(() => {
      setCompletedStepIndex((prev) => prev + 1);
    }, nextStep.durationMs);

    return () => window.clearTimeout(timer);
  }, [launchState, completedStepIndex, activeSteps, readiness.profile, onRecordPlay]);

  const handleLaunch = () => {
    if (!readiness.ready) return;
    const steps = buildLaunchSequence(state, readiness);
    setActiveSteps(steps);
    setCompletedStepIndex(-1);
    setLaunchState('launching');
  };

  const handleStopSession = () => {
    setLaunchState('idle');
    setCompletedStepIndex(-1);
    setActiveSteps([]);
  };

  const injectionLabel =
    state.config.injectionMethod === InjectionMethod.PATCHED_APK
      ? 'APK Parcheado (JNI)'
      : state.config.injectionMethod === InjectionMethod.SHIZUKU_ZYGISK
        ? 'Shizuku / Zygisk'
        : 'Wrapper LD_PRELOAD';

  return (
    <div className="space-y-8">
      {/* Hero Banner Card */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#13111C]">
        <div className="relative min-h-[260px] md:min-h-[300px] flex flex-col justify-end p-6 md:p-8">
          {!bannerError ? (
            <img
              src={bannerImg}
              alt="Textura mineral de basalto y amatista para Amethyst Launcher Android"
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-55"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-[#1C1430] via-[#13111C] to-[#0B0A10]"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#0B0A10] via-[#0B0A10]/75 to-[#0B0A10]/30"
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 md:gap-5">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-white/15 bg-[#0B0A10] shrink-0 flex items-center justify-center">
                {!emblemError ? (
                  <img
                    src={emblemImg}
                    alt="Emblema de Amethyst Launcher"
                    referrerPolicy="no-referrer"
                    onError={() => setEmblemError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Cpu className="w-8 h-8 text-[#A78BFA]" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-[#C4BBE0] tracking-wide">
                  Minecraft Bedrock Edition · Port Android ({state.config.targetAbi})
                </p>
                <h1 className="mt-1 text-2xl md:text-4xl font-bold text-white tracking-tight text-balance">
                  {readiness.profile ? readiness.profile.name : 'Sin perfil seleccionado'}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs md:text-sm text-[#C4BBE0] tabular-nums">
                  <span>MCBE {readiness.profile?.mcVersion ?? '—'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{readiness.runtime?.name ?? 'Sin runtime'}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {readiness.runtime?.type === RuntimeType.VANILLA
                      ? 'Modo Vanilla'
                      : `${readiness.activeModList.length} ${readiness.activeModList.length === 1 ? 'mod activo' : 'mods activos'}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Launch & Profile Switcher Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full lg:w-auto">
              <div className="flex-1 sm:w-64">
                <label
                  htmlFor="active-profile-select"
                  className="block text-xs font-medium text-[#C4BBE0] mb-1.5"
                >
                  Perfil activo
                </label>
                <select
                  id="active-profile-select"
                  value={state.activeProfileId}
                  onChange={(e) => {
                    handleStopSession();
                    onSelectProfile(e.target.value);
                  }}
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#13111C]/95 border border-white/15 text-sm font-medium text-white focus:outline-none focus:border-[#8B5CF6]"
                >
                  {state.profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.mcVersion})
                    </option>
                  ))}
                </select>
              </div>

              {launchState === 'idle' ? (
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={!readiness.ready}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-white/10 disabled:text-[#9B8FB8] disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Minecraft</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopSession}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>{launchState === 'launching' ? 'Cancelar inicio' : 'Detener instancia'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Readiness Diagnostics & Quick Actions */}
      {(!readiness.ready || readiness.warnings.length > 0) && (
        <section
          aria-label="Diagnóstico de compatibilidad"
          className="rounded-2xl bg-[#13111C] border border-white/[0.08] p-5 space-y-4"
        >
          {readiness.blockingErrors.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Requisitos pendientes antes de iniciar
                    </h2>
                    <ul className="mt-1 space-y-1 text-sm text-rose-200/90">
                      {readiness.blockingErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {(readiness.needsApkInstall || readiness.needsRuntimeInstall) && readiness.profile && (
                  <button
                    type="button"
                    onClick={() =>
                      onInstallMissingTarget(
                        readiness.profile!.mcVersion,
                        readiness.needsRuntimeInstall ? readiness.runtime?.id : undefined
                      )
                    }
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Preparar versión y runtime</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {readiness.warnings.length > 0 && (
            <div className="flex items-start gap-3 pt-2 border-t border-white/[0.06]">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-200">
                  Advertencias de compatibilidad
                </h3>
                <ul className="mt-1 space-y-1 text-xs md:text-sm text-amber-100/80">
                  {readiness.warnings.map((warn) => (
                    <li key={warn}>{warn}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Two-Column Operational Overview (Android Target Specs + Active Mods / Runtime Console) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Active Mods & Runtime Summary */}
        <section className="lg:col-span-7 rounded-2xl bg-[#13111C] border border-white/[0.08] p-6 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                {readiness.runtime?.type === RuntimeType.VANILLA
                  ? 'Instancia Vanilla Limpia'
                  : 'Mods cargados en este perfil'}
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab(LauncherTab.MODS)}
                className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-[#A78BFA] hover:bg-white/5 transition-colors whitespace-nowrap shrink-0"
              >
                Gestionar mods
              </button>
            </div>

            {readiness.runtime?.type === RuntimeType.VANILLA ? (
              <div className="mt-4 py-8 text-center border-t border-white/[0.06]">
                <p className="text-sm text-[#9B8FB8]">
                  Este perfil utiliza el runtime nativo Vanilla sin inyección de librerías AmethystAPI.
                </p>
              </div>
            ) : readiness.activeModList.length === 0 ? (
              <div className="mt-4 py-8 text-center border-t border-white/[0.06] space-y-3">
                <p className="text-sm text-[#9B8FB8]">
                  No hay mods activados en el perfil actual.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab(LauncherTab.MODS)}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors"
                >
                  Activar mods
                </button>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {readiness.activeModList.map((mod) => (
                  <li key={mod.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{mod.name}</p>
                      <p className="mt-0.5 text-xs text-[#9B8FB8] font-mono truncate tabular-nums">
                        {mod.libraryFile} · v{mod.version} · {mod.abi}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 whitespace-nowrap shrink-0 tabular-nums">
                      {mod.sizeKb} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-4 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="block text-[#9B8FB8]">Paquete Android</span>
              <span className="mt-1 block font-mono text-white break-all">
                {state.config.packageName}
              </span>
            </div>
            <div>
              <span className="block text-[#9B8FB8]">Método de carga</span>
              <span className="mt-1 block font-medium text-white">{injectionLabel}</span>
            </div>
            <div>
              <span className="block text-[#9B8FB8]">Arquitectura ABI</span>
              <span className="mt-1 block font-mono text-white">{state.config.targetAbi}</span>
            </div>
          </div>
        </section>

        {/* Right: Live Android Runtime Launch Console / Port Quick Card */}
        <section className="lg:col-span-5 rounded-2xl bg-[#13111C] border border-white/[0.08] p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#A78BFA]" />
                <h2 className="text-lg font-semibold text-white">Runtime Android (Logcat)</h2>
              </div>
              <span className="text-xs font-medium text-[#C4BBE0]">
                {launchState === 'idle'
                  ? 'En espera'
                  : launchState === 'launching'
                    ? 'Inyectando...'
                    : 'Instancia activa'}
              </span>
            </div>

            {activeSteps.length === 0 ? (
              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                <p className="text-xs text-[#9B8FB8] leading-relaxed">
                  Al pulsar <strong className="text-white">Iniciar Minecraft</strong>, el cargador Android prepara el manifiesto del perfil, carga <code className="text-[#C4BBE0]">libamethyst_runtime.so</code> mediante <code className="text-[#C4BBE0]">dlopen()</code> y ejecuta los mods compilados para <code className="text-[#C4BBE0]">{state.config.targetAbi}</code>.
                </p>
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3 text-xs text-[#9B8FB8]">
                  <span className="shrink-0">Directorio scoped</span>
                  <span className="font-mono text-[#EDE9F6] truncate">
                    {state.config.storagePath}
                  </span>
                </div>
              </div>
            ) : (
              <div
                role="log"
                aria-live="polite"
                className="mt-4 pt-4 border-t border-white/[0.06] space-y-3 max-h-[280px] overflow-y-auto"
              >
                {activeSteps.map((step, index) => {
                  const isDone = index <= completedStepIndex;
                  const isCurrent = launchState === 'launching' && index === completedStepIndex + 1;
                  return (
                    <div key={step.id} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Wrench
                            className={`w-4 h-4 shrink-0 ${
                              isCurrent ? 'text-[#A78BFA]' : 'text-[#6A6085]'
                            }`}
                          />
                        )}
                        <span className={isDone || isCurrent ? 'text-white font-medium' : 'text-[#6A6085]'}>
                          {step.label}
                        </span>
                      </div>
                      {(isDone || isCurrent) && (
                        <pre className="pl-6 text-[11px] font-mono text-[#9B8FB8] whitespace-pre-wrap break-all">
                          {step.command}
                        </pre>
                      )}
                    </div>
                  );
                })}
                {launchState === 'running' && (
                  <p className="pt-2 border-t border-white/[0.06] text-xs font-medium text-emerald-400">
                    Instancia lanzada correctamente en com.mojang.minecraftpe.
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab(LauncherTab.PORT)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-sm font-medium text-[#EDE9F6] flex items-center justify-center gap-2 transition-colors"
          >
            <FolderGit2 className="w-4 h-4 text-[#A78BFA]" />
            <span>Ver código Kotlin y NDK del port</span>
          </button>
        </section>
      </div>
    </div>
  );
};
