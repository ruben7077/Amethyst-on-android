export enum RuntimeType {
  VANILLA = 'Vanilla',
  AMETHYST = 'AmethystRuntime',
}

export enum AndroidAbi {
  ARM64_V8A = 'arm64-v8a',
  ARMEABI_V7A = 'armeabi-v7a',
  X86_64 = 'x86_64',
}

export enum InjectionMethod {
  PATCHED_APK = 'patched_apk',
  SHIZUKU_ZYGISK = 'shizuku_zygisk',
  LD_PRELOAD_WRAPPER = 'ld_preload_wrapper',
}

export enum LauncherTab {
  LAUNCHER = 'launcher',
  PROFILES = 'profiles',
  MODS = 'mods',
  PORT = 'port',
  SETTINGS = 'settings',
}

export interface ModEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  targetApiVersion: string;
  targetMcVersion: string;
  abi: AndroidAbi;
  libraryFile: string;
  sizeKb: number;
  dependencies: string[];
  isUserImported?: boolean;
}

export interface RuntimeEntry {
  id: string;
  name: string;
  version: string;
  type: RuntimeType;
  targetMcVersions: string[];
  abiSupport: AndroidAbi[];
  libraryFile: string;
  installed: boolean;
  notes: string;
}

export interface ProfileEntry {
  id: string;
  name: string;
  mcVersion: string;
  runtimeId: string;
  modIds: string[];
  lastPlayed?: string;
}

export interface MinecraftVersionInfo {
  version: string;
  versionCode: number;
  installedOnDevice: boolean;
  abi: AndroidAbi;
  packageName: string;
}

export interface AndroidPortConfig {
  targetAbi: AndroidAbi;
  injectionMethod: InjectionMethod;
  packageName: string;
  storagePath: string;
  developerMode: boolean;
  verifyAbiOnLaunch: boolean;
  keepLogcatOpen: boolean;
}

export interface LauncherState {
  activeProfileId: string;
  profiles: ProfileEntry[];
  mods: ModEntry[];
  runtimes: RuntimeEntry[];
  mcVersions: MinecraftVersionInfo[];
  config: AndroidPortConfig;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LaunchReadiness {
  ready: boolean;
  needsApkInstall: boolean;
  needsRuntimeInstall: boolean;
  blockingErrors: string[];
  warnings: string[];
  activeModList: ModEntry[];
  runtime: RuntimeEntry | null;
  profile: ProfileEntry | null;
}

export interface LaunchStep {
  id: string;
  label: string;
  detail: string;
  command: string;
  durationMs: number;
}
