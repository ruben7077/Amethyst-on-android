import {
  AndroidAbi,
  AndroidPortConfig,
  InjectionMethod,
  LaunchReadiness,
  LaunchStep,
  LauncherState,
  ModEntry,
  ProfileEntry,
  RuntimeEntry,
  RuntimeType,
  ValidationResult,
} from './types';

export const STORAGE_KEY = 'amethyst_android_launcher_state_v1';

export function createInitialLauncherState(): LauncherState {
  const runtimes: RuntimeEntry[] = [
    {
      id: 'vanilla',
      name: 'Vanilla',
      version: 'native',
      type: RuntimeType.VANILLA,
      targetMcVersions: ['1.21.2.2', '1.21.0.3', '1.20.81.1'],
      abiSupport: [AndroidAbi.ARM64_V8A, AndroidAbi.ARMEABI_V7A, AndroidAbi.X86_64],
      libraryFile: 'libminecraftpe.so',
      installed: true,
      notes: 'Ejecución directa sin capa de hooks C++ de AmethystAPI.',
    },
    {
      id: 'amethyst-1.3.1',
      name: 'AmethystRuntime@1.3.1',
      version: '1.3.1',
      type: RuntimeType.AMETHYST,
      targetMcVersions: ['1.21.0.3', '1.21.2.2'],
      abiSupport: [AndroidAbi.ARM64_V8A],
      libraryFile: 'libamethyst_runtime.so',
      installed: true,
      notes: 'Runtime nativo ELF portado con Dobby/ShadowHook para MCBE 1.21.x en arm64-v8a.',
    },
    {
      id: 'amethyst-1.2.4',
      name: 'AmethystRuntime@1.2.4',
      version: '1.2.4',
      type: RuntimeType.AMETHYST,
      targetMcVersions: ['1.20.81.1'],
      abiSupport: [AndroidAbi.ARM64_V8A, AndroidAbi.ARMEABI_V7A],
      libraryFile: 'libamethyst_runtime_120.so',
      installed: false,
      notes: 'Runtime legado para compilaciones arm64-v8a y armeabi-v7a de MCBE 1.20.81.',
    },
  ];

  const mods: ModEntry[] = [
    {
      id: 'amethyst-dev-tools',
      name: 'Amethyst Dev Overlay',
      version: '1.4.0',
      author: 'FrederoxDev',
      description: 'Consola de depuración, inspector de entidades y recarga rápida de hooks nativos.',
      targetApiVersion: '1.3.1',
      targetMcVersion: '1.21.0.3',
      abi: AndroidAbi.ARM64_V8A,
      libraryFile: 'libamethyst_dev_overlay.so',
      sizeKb: 412,
      dependencies: [],
    },
    {
      id: 'bedrock-fov-unlocker',
      name: 'Dynamic FOV & Camera',
      version: '2.1.0',
      author: 'AmethystCommunity',
      description: 'Desbloquea rango de FOV y suavizado de cámara táctil mediante hooks en CameraDirector.',
      targetApiVersion: '1.3.1',
      targetMcVersion: '1.21.0.3',
      abi: AndroidAbi.ARM64_V8A,
      libraryFile: 'libdynamic_fov.so',
      sizeKb: 186,
      dependencies: [],
    },
    {
      id: 'chunk-border-renderer',
      name: 'Chunk Border Renderer',
      version: '1.1.2',
      author: 'VoxelPort',
      description: 'Renderiza límites de chunks con overlay Vulkan/GLES3 compatible con móviles Android.',
      targetApiVersion: '1.3.1',
      targetMcVersion: '1.21.2.2',
      abi: AndroidAbi.ARM64_V8A,
      libraryFile: 'libchunk_borders.so',
      sizeKb: 264,
      dependencies: ['amethyst-dev-tools'],
    },
    {
      id: 'legacy-compass-hud',
      name: 'Compass Telemetry HUD',
      version: '0.9.5',
      author: 'KitsuneModding',
      description: 'HUD minimalista de coordenadas y brújula compilado para ABI legado de 32 bits.',
      targetApiVersion: '1.2.4',
      targetMcVersion: '1.20.81.1',
      abi: AndroidAbi.ARMEABI_V7A,
      libraryFile: 'libcompass_hud.so',
      sizeKb: 142,
      dependencies: [],
    },
  ];

  const profiles: ProfileEntry[] = [
    {
      id: 'profile-amethyst-121',
      name: 'Amethyst 1.21',
      mcVersion: '1.21.0.3',
      runtimeId: 'amethyst-1.3.1',
      modIds: ['amethyst-dev-tools', 'bedrock-fov-unlocker'],
      lastPlayed: 'Hoy · 03:20',
    },
    {
      id: 'profile-vanilla-121',
      name: 'Vanilla 1.21',
      mcVersion: '1.21.2.2',
      runtimeId: 'vanilla',
      modIds: [],
      lastPlayed: 'Ayer · 21:14',
    },
    {
      id: 'profile-dev-sandbox',
      name: 'Dev Sandbox 1.21.2',
      mcVersion: '1.21.2.2',
      runtimeId: 'amethyst-1.3.1',
      modIds: ['amethyst-dev-tools', 'chunk-border-renderer'],
      lastPlayed: 'Hace 3 días',
    },
  ];

  const mcVersions = [
    {
      version: '1.21.0.3',
      versionCode: 962100030,
      installedOnDevice: true,
      abi: AndroidAbi.ARM64_V8A,
      packageName: 'com.mojang.minecraftpe',
    },
    {
      version: '1.21.2.2',
      versionCode: 962102020,
      installedOnDevice: true,
      abi: AndroidAbi.ARM64_V8A,
      packageName: 'com.mojang.minecraftpe',
    },
    {
      version: '1.20.81.1',
      versionCode: 952081010,
      installedOnDevice: false,
      abi: AndroidAbi.ARM64_V8A,
      packageName: 'com.mojang.minecraftpe',
    },
  ];

  const config: AndroidPortConfig = {
    targetAbi: AndroidAbi.ARM64_V8A,
    injectionMethod: InjectionMethod.PATCHED_APK,
    packageName: 'com.mojang.minecraftpe',
    storagePath: '/Android/data/com.rubenamethyst.app/files',
    developerMode: true,
    verifyAbiOnLaunch: true,
    keepLogcatOpen: true,
  };

  return {
    activeProfileId: 'profile-amethyst-121',
    profiles,
    mods,
    runtimes,
    mcVersions,
    config,
  };
}

export function validateProfileInput(input: {
  name: string;
  mcVersion: string;
  runtimeId: string;
  existingProfiles?: ProfileEntry[];
  editingId?: string;
}): ValidationResult {
  const errors: string[] = [];
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    errors.push('El nombre del perfil es obligatorio.');
  } else if (trimmedName.length < 2) {
    errors.push('El nombre del perfil debe tener al menos 2 caracteres.');
  } else if (trimmedName.length > 40) {
    errors.push('El nombre del perfil no puede superar los 40 caracteres.');
  }

  if (
    input.existingProfiles?.some(
      (p) => p.id !== input.editingId && p.name.toLowerCase() === trimmedName.toLowerCase()
    )
  ) {
    errors.push('Ya existe otro perfil con ese mismo nombre.');
  }

  if (!input.mcVersion.trim()) {
    errors.push('Debes seleccionar una versión objetivo de Minecraft Bedrock.');
  }

  if (!input.runtimeId.trim()) {
    errors.push('Debes seleccionar un runtime válido.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface ModImportInput {
  id?: string;
  name: string;
  version: string;
  author: string;
  description?: string;
  targetApiVersion: string;
  targetMcVersion: string;
  abi: AndroidAbi;
  libraryFile: string;
  sizeKb?: number;
  dependencies?: string[];
}

export function validateModImport(
  input: ModImportInput,
  existingMods: ModEntry[]
): { result: ValidationResult; mod?: ModEntry } {
  const errors: string[] = [];
  const name = input.name.trim();
  const version = input.version.trim();
  const author = input.author.trim();
  const libraryFile = input.libraryFile.trim();

  if (!name) {
    errors.push('El nombre del mod es obligatorio.');
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    errors.push('La versión del mod debe seguir el formato semver (ej. 1.0.0).');
  }
  if (!author) {
    errors.push('El autor del mod es obligatorio.');
  }
  if (!libraryFile || !libraryFile.endsWith('.so')) {
    errors.push('En Android, el binario nativo del mod debe ser una librería ELF (.so).');
  }

  const generatedId =
    (input.id && input.id.trim()) ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  if (!generatedId) {
    errors.push('No se pudo generar un identificador válido para el mod.');
  } else if (existingMods.some((m) => m.id === generatedId)) {
    errors.push(`Ya existe un mod instalado con el ID "${generatedId}".`);
  }

  if (errors.length > 0) {
    return { result: { valid: false, errors } };
  }

  return {
    result: { valid: true, errors: [] },
    mod: {
      id: generatedId,
      name,
      version,
      author,
      description: input.description?.trim() || 'Mod nativo portado con AmethystAPI para Android.',
      targetApiVersion: input.targetApiVersion.trim() || '1.3.1',
      targetMcVersion: input.targetMcVersion.trim() || '1.21.0.3',
      abi: input.abi,
      libraryFile,
      sizeKb: input.sizeKb && input.sizeKb > 0 ? input.sizeKb : 220,
      dependencies: input.dependencies ?? [],
      isUserImported: true,
    },
  };
}

export function evaluateLaunchReadiness(state: LauncherState): LaunchReadiness {
  const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
  if (!profile) {
    return {
      ready: false,
      needsApkInstall: false,
      needsRuntimeInstall: false,
      blockingErrors: ['No hay ningún perfil activo seleccionado.'],
      warnings: [],
      activeModList: [],
      runtime: null,
      profile: null,
    };
  }

  const runtime = state.runtimes.find((r) => r.id === profile.runtimeId) ?? null;
  const mcInfo = state.mcVersions.find((v) => v.version === profile.mcVersion) ?? null;
  const activeModList =
    runtime?.type === RuntimeType.VANILLA
      ? []
      : state.mods.filter((m) => profile.modIds.includes(m.id));

  const blockingErrors: string[] = [];
  const warnings: string[] = [];

  if (!runtime) {
    blockingErrors.push(`Runtime "${profile.runtimeId}" no encontrado.`);
  } else if (!runtime.installed) {
    blockingErrors.push(`El runtime ${runtime.name} no está descargado en el dispositivo.`);
  }

  const needsApkInstall = !mcInfo || !mcInfo.installedOnDevice;
  if (needsApkInstall) {
    blockingErrors.push(
      `Minecraft Bedrock ${profile.mcVersion} (${state.config.targetAbi}) no está instalado en este perfil.`
    );
  }

  if (runtime && state.config.verifyAbiOnLaunch) {
    if (!runtime.abiSupport.includes(state.config.targetAbi)) {
      blockingErrors.push(
        `El runtime ${runtime.name} no soporta la arquitectura ${state.config.targetAbi}.`
      );
    }
    for (const mod of activeModList) {
      if (mod.abi !== state.config.targetAbi) {
        blockingErrors.push(
          `Incompatibilidad ABI: "${mod.name}" está compilado para ${mod.abi}, pero el dispositivo usa ${state.config.targetAbi}.`
        );
      }
      for (const depId of mod.dependencies) {
        if (!profile.modIds.includes(depId)) {
          warnings.push(`"${mod.name}" requiere la dependencia "${depId}" en el perfil activo.`);
        }
      }
      if (mod.targetMcVersion !== profile.mcVersion) {
        warnings.push(
          `"${mod.name}" apunta a MCBE ${mod.targetMcVersion} (perfil actual: ${profile.mcVersion}).`
        );
      }
    }
  }

  return {
    ready: blockingErrors.length === 0,
    needsApkInstall,
    needsRuntimeInstall: Boolean(runtime && !runtime.installed),
    blockingErrors,
    warnings,
    activeModList,
    runtime,
    profile,
  };
}

export function buildLaunchSequence(
  state: LauncherState,
  readiness: LaunchReadiness
): LaunchStep[] {
  if (!readiness.profile || !readiness.runtime) {
    return [];
  }

  const { profile, runtime, activeModList } = readiness;
  const { config } = state;

  const steps: LaunchStep[] = [
    {
      id: 'verify-apk',
      label: 'Verificando paquete MCBE y ABI',
      detail: `${config.packageName} · v${profile.mcVersion} · ${config.targetAbi}`,
      command: `pm path ${config.packageName} && getprop ro.product.cpu.abi`,
      durationMs: 320,
    },
    {
      id: 'mount-storage',
      label: 'Preparando directorio de instancia Android',
      detail: `${config.storagePath}/profiles/${profile.id}`,
      command: `mkdir -p ${config.storagePath}/mods && export AMETHYST_PROFILE="${profile.name}"`,
      durationMs: 260,
    },
  ];

  if (runtime.type === RuntimeType.VANILLA) {
    steps.push({
      id: 'launch-vanilla',
      label: 'Iniciando actividad nativa sin hooks',
      detail: 'Runtime Vanilla limpio (sin carga de librerías AmethystAPI)',
      command: `am start -n ${config.packageName}/com.mojang.minecraftpe.MainActivity`,
      durationMs: 420,
    });
  } else {
    const injectionLabel =
      config.injectionMethod === InjectionMethod.PATCHED_APK
        ? 'APK Parcheado (NativeActivity + libamethyst_loader.so)'
        : config.injectionMethod === InjectionMethod.SHIZUKU_ZYGISK
          ? 'Inyección vía Shizuku / Zygisk'
          : 'Wrapper LD_PRELOAD en espacio virtual';

    steps.push({
      id: 'load-runtime',
      label: `Cargando ${runtime.name}`,
      detail: `${injectionLabel} -> dlopen("${runtime.libraryFile}", RTLD_NOW)`,
      command: `dlopen("${config.storagePath}/runtimes/${runtime.libraryFile}", RTLD_NOW | RTLD_GLOBAL)`,
      durationMs: 380,
    });

    if (activeModList.length > 0) {
      steps.push({
        id: 'load-mods',
        label: `Inyectando ${activeModList.length} ${activeModList.length === 1 ? 'mod nativo' : 'mods nativos'} (.so)`,
        detail: activeModList.map((m) => m.libraryFile).join(', '),
        command: activeModList
          .map((m) => `amethyst_dlopen("${m.libraryFile}") // ${m.name} v${m.version}`)
          .join('\n'),
        durationMs: 420,
      });
    } else {
      steps.push({
        id: 'no-mods',
        label: 'Runtime listo sin mods activos',
        detail: 'AmethystRuntime inicializado en modo base',
        command: 'amethyst_init_hooks(0 mods)',
        durationMs: 250,
      });
    }

    steps.push({
      id: 'start-activity',
      label: 'Lanzando Minecraft Bedrock Edition',
      detail: `MainActivity adjuntada · Logcat ${config.keepLogcatOpen ? 'activo' : 'en segundo plano'}`,
      command: `am start -n ${config.packageName}/com.mojang.minecraftpe.MainActivity --es amethyst_profile "${profile.id}"`,
      durationMs: 360,
    });
  }

  return steps;
}

export function filterMods(
  mods: ModEntry[],
  query: string,
  abiFilter: AndroidAbi | 'all'
): ModEntry[] {
  const q = query.trim().toLowerCase();
  return mods.filter((mod) => {
    const matchesAbi = abiFilter === 'all' || mod.abi === abiFilter;
    const matchesQuery =
      !q ||
      mod.name.toLowerCase().includes(q) ||
      mod.author.toLowerCase().includes(q) ||
      mod.libraryFile.toLowerCase().includes(q) ||
      mod.description.toLowerCase().includes(q);
    return matchesAbi && matchesQuery;
  });
}

export function filterProfiles(
  profiles: ProfileEntry[],
  runtimes: RuntimeEntry[],
  query: string,
  runtimeFilter: 'all' | 'modded' | 'vanilla'
): ProfileEntry[] {
  const q = query.trim().toLowerCase();
  return profiles.filter((profile) => {
    const rt = runtimes.find((r) => r.id === profile.runtimeId);
    const isVanilla = rt?.type === RuntimeType.VANILLA;
    const matchesFilter =
      runtimeFilter === 'all' ||
      (runtimeFilter === 'vanilla' && isVanilla) ||
      (runtimeFilter === 'modded' && !isVanilla);
    const matchesQuery =
      !q ||
      profile.name.toLowerCase().includes(q) ||
      profile.mcVersion.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });
}

export function toggleModInProfile(
  profiles: ProfileEntry[],
  profileId: string,
  modId: string
): ProfileEntry[] {
  return profiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    const exists = profile.modIds.includes(modId);
    return {
      ...profile,
      modIds: exists
        ? profile.modIds.filter((id) => id !== modId)
        : [...profile.modIds, modId],
    };
  });
}

export function loadLauncherState(): LauncherState {
  const fallback = createInitialLauncherState();
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LauncherState>;
    if (!parsed || !Array.isArray(parsed.profiles) || !Array.isArray(parsed.mods)) {
      return fallback;
    }
    const mergedConfig = parsed.config ? { ...fallback.config, ...parsed.config } : fallback.config;
    if (
      mergedConfig.storagePath.includes('com.frederox.amethyst') ||
      mergedConfig.storagePath.toLowerCase().includes('appsyudioo')
    ) {
      mergedConfig.storagePath = '/Android/data/com.rubenamethyst.app/files';
    }
    return {
      activeProfileId: parsed.activeProfileId || fallback.activeProfileId,
      profiles: parsed.profiles.length > 0 ? parsed.profiles : fallback.profiles,
      mods: parsed.mods.length > 0 ? parsed.mods : fallback.mods,
      runtimes: Array.isArray(parsed.runtimes) && parsed.runtimes.length > 0 ? parsed.runtimes : fallback.runtimes,
      mcVersions: Array.isArray(parsed.mcVersions) && parsed.mcVersions.length > 0 ? parsed.mcVersions : fallback.mcVersions,
      config: mergedConfig,
    };
  } catch {
    return fallback;
  }
}

export function saveLauncherState(state: LauncherState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
