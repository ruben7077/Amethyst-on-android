import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANDROID_APPLICATION_ID,
  ANDROID_PORT_FILES,
} from './androidPortFiles';
import {
  buildLaunchSequence,
  createInitialLauncherState,
  evaluateLaunchReadiness,
  filterMods,
  filterProfiles,
  parseAmethystModJson,
  setProfileMods,
  toggleModInProfile,
  validateModImport,
  validateProfileInput,
} from './launcherLogic';
import { AndroidAbi, LauncherTab, RuntimeType } from './types';
import { buildZipArchive, scanAmethystArchive } from './zipBuilder';

test('validateProfileInput rejects empty or duplicate names', () => {
  const state = createInitialLauncherState();

  const emptyResult = validateProfileInput({
    name: '   ',
    mcVersion: '1.21.0.3',
    runtimeId: 'amethyst-1.3.1',
  });
  assert.equal(emptyResult.valid, false);
  assert.ok(emptyResult.errors.length > 0);

  const dupResult = validateProfileInput({
    name: 'Amethyst 1.21',
    mcVersion: '1.21.0.3',
    runtimeId: 'amethyst-1.3.1',
    existingProfiles: state.profiles,
  });
  assert.equal(dupResult.valid, false);

  const editSelfResult = validateProfileInput({
    name: 'Amethyst 1.21',
    mcVersion: '1.21.0.3',
    runtimeId: 'amethyst-1.3.1',
    existingProfiles: state.profiles,
    editingId: 'profile-amethyst-121',
  });
  assert.equal(editSelfResult.valid, true);
});

test('validateModImport enforces .so extension and semver version', () => {
  const state = createInitialLauncherState();

  const invalidExt = validateModImport(
    {
      name: 'Invalid Mod',
      version: '1.0.0',
      author: 'Dev',
      targetApiVersion: '1.3.1',
      targetMcVersion: '1.21.0.3',
      abi: AndroidAbi.ARM64_V8A,
      libraryFile: 'mod.dll',
    },
    state.mods
  );
  assert.equal(invalidExt.result.valid, false);

  const validAmethyst = validateModImport(
    {
      name: 'Amethyst Zoom',
      version: '1.2.0',
      author: 'Ruben',
      targetApiVersion: '1.3.1',
      targetMcVersion: '1.21.0.3',
      abi: AndroidAbi.ARM64_V8A,
      libraryFile: 'amethyst_zoom.amethyst',
    },
    state.mods
  );
  assert.equal(validAmethyst.result.valid, true);
  assert.equal(validAmethyst.mod?.libraryFile, 'libamethyst_zoom.so');

  const validSo = validateModImport(
    {
      name: 'Shader Bridge',
      version: '1.0.2',
      author: 'AndroidPort',
      targetApiVersion: '1.3.1',
      targetMcVersion: '1.21.0.3',
      abi: AndroidAbi.ARM64_V8A,
      libraryFile: 'libshader_bridge.so',
    },
    state.mods
  );
  assert.equal(validSo.result.valid, true);
  assert.equal(validSo.mod?.id, 'shader-bridge');
  assert.equal(validSo.mod?.isUserImported, true);
});

test('evaluateLaunchReadiness detects ABI mismatch and generates launch sequence', () => {
  const state = createInitialLauncherState();
  const readiness = evaluateLaunchReadiness(state);

  assert.equal(readiness.ready, true);
  assert.equal(readiness.activeModList.length, 3);

  const steps = buildLaunchSequence(state, readiness);
  assert.ok(steps.length >= 4);
  assert.ok(steps.some((s) => s.id === 'load-runtime'));
  assert.ok(steps.some((s) => s.id === 'load-mods'));

  const mismatchState = {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === state.activeProfileId ? { ...p, modIds: ['legacy-compass-hud'] } : p
    ),
  };
  const mismatchReadiness = evaluateLaunchReadiness(mismatchState);
  assert.equal(mismatchReadiness.ready, false);
  assert.ok(mismatchReadiness.blockingErrors.some((err) => err.includes('Incompatibilidad ABI')));
});

test('filterMods, filterProfiles and toggleModInProfile behave deterministically', () => {
  const state = createInitialLauncherState();

  const armv7Mods = filterMods(state.mods, '', AndroidAbi.ARMEABI_V7A);
  assert.equal(armv7Mods.length, 1);
  assert.equal(armv7Mods[0].id, 'legacy-compass-hud');

  const vanillaProfiles = filterProfiles(state.profiles, state.runtimes, '', 'vanilla');
  assert.equal(vanillaProfiles.length, 1);
  assert.equal(vanillaProfiles[0].runtimeId, 'vanilla');
  assert.equal(
    state.runtimes.find((r) => r.id === vanillaProfiles[0].runtimeId)?.type,
    RuntimeType.VANILLA
  );

  const toggledOff = toggleModInProfile(state.profiles, 'profile-amethyst-121', 'amethyst-dev-tools');
  const updatedProfile = toggledOff.find((p) => p.id === 'profile-amethyst-121');
  assert.ok(updatedProfile && !updatedProfile.modIds.includes('amethyst-dev-tools'));
});

test('Android port configuration uses com.rubenamethyst.app and generates valid ZIP archive', () => {
  const state = createInitialLauncherState();
  assert.equal(ANDROID_APPLICATION_ID, 'com.rubenamethyst.app');
  assert.ok(state.config.storagePath.includes('com.rubenamethyst.app'));

  const gradleFile = ANDROID_PORT_FILES.find((f) => f.path === 'app/build.gradle.kts');
  assert.ok(gradleFile?.content.includes('applicationId = "com.rubenamethyst.app"'));
  assert.ok(gradleFile?.content.includes('namespace = "com.rubenamethyst.app"'));

  const runtimeCpp = ANDROID_PORT_FILES.find((f) => f.path === 'app/src/main/cpp/amethyst_runtime.cpp');
  assert.ok(runtimeCpp?.content.includes('Amethyst_InitRuntime'));
  const modsCpp = ANDROID_PORT_FILES.find((f) => f.path === 'app/src/main/cpp/amethyst_mods.cpp');
  assert.ok(modsCpp?.content.includes('Amethyst_RegisterMod'));
  const cmakeFile = ANDROID_PORT_FILES.find((f) => f.path === 'app/src/main/cpp/CMakeLists.txt');
  assert.ok(cmakeFile?.content.includes('create_bridge'));
  assert.ok(cmakeFile?.content.includes('amethyst_dev_overlay'));
  const loaderCpp = ANDROID_PORT_FILES.find((f) => f.path === 'app/src/main/cpp/amethyst_loader.cpp');
  assert.ok(loaderCpp?.content.includes('PreloadSiblingLibraries'));
  assert.ok(loaderCpp?.content.includes('MC_PAIRIP'));
  const gameActivity = ANDROID_PORT_FILES.find(
    (f) => f.path === 'app/src/main/java/com/rubenamethyst/app/AmethystGameActivity.kt'
  );
  assert.ok(gameActivity?.content.includes('safeDrawingPadding'));
  assert.ok(gameActivity?.content.includes('Dispatchers.IO'));
  assert.ok(gameActivity?.content.includes('FileProvider.getUriForFile'));
  const filePathsXml = ANDROID_PORT_FILES.find(
    (f) => f.path === 'app/src/main/res/xml/file_paths.xml'
  );
  assert.ok(filePathsXml?.content.includes('external-files-path'));

  const zipBytes = buildZipArchive([
    ...ANDROID_PORT_FILES.map((f) => ({ path: `android/${f.path}`, content: f.content })),
    {
      path: 'android/app/src/main/assets/bonus_mods/Create@0.1.1.amethyst',
      content: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    },
  ]);
  // ZIP local file header magic bytes PK\x03\x04
  assert.equal(zipBytes[0], 0x50);
  assert.equal(zipBytes[1], 0x4b);
  assert.equal(zipBytes[2], 0x03);
  assert.equal(zipBytes[3], 0x04);
  const decodedText = new TextDecoder().decode(zipBytes);
  assert.ok(decodedText.includes('android/app/build.gradle.kts'));
  assert.ok(decodedText.includes('com.rubenamethyst.app'));
  assert.ok(decodedText.includes('Create@0.1.1.amethyst'));
});

test('CREATE_BONUS_MOD and parseAmethystModJson support Amethyst 1.3.0 Create@0.1.1.amethyst', () => {
  const state = createInitialLauncherState();
  const bonus = state.mods.find((m) => m.isBonus);
  assert.ok(bonus);
  assert.equal(bonus.name, 'Create');
  assert.equal(bonus.version, '0.1.1');
  assert.equal(bonus.downloadUrl, '/bonus-mods/Create@0.1.1.amethyst');

  const sampleModJson = JSON.stringify({
    format_version: '1.3.0',
    meta: {
      name: 'Create',
      version: '0.1.1',
      namespace: 'create',
      author: 'FrederoxDev',
      platforms: {
        'win-client': {
          game_builds: [{ version: '1.26.42' }],
        },
      },
    },
  });
  const parsed = parseAmethystModJson(sampleModJson);
  assert.ok(parsed);
  assert.equal(parsed.name, 'Create');
  assert.equal(parsed.version, '0.1.1');
  assert.equal(parsed.author, 'FrederoxDev');
  assert.equal(parsed.id, 'create');
  assert.equal(parsed.targetMcVersion, '1.26.42');
});

test('LauncherTab omits PORT, setProfileMods updates bulk mods, and scanAmethystArchive extracts mod.json', async () => {
  const tabs = Object.values(LauncherTab);
  assert.deepEqual(tabs, ['launcher', 'profiles', 'mods', 'settings']);

  const state = createInitialLauncherState();
  const cleared = setProfileMods(state.profiles, 'profile-amethyst-121', []);
  assert.equal(
    cleared.find((p) => p.id === 'profile-amethyst-121')?.modIds.length,
    0
  );

  const archiveBytes = buildZipArchive([
    {
      path: 'mod.json',
      content: JSON.stringify({
        meta: { name: 'MiniMap', version: '1.0.4', author: 'Ruben' },
      }),
    },
    {
      path: 'lib/arm64-v8a/libminimap.so',
      content: new Uint8Array([0x7f, 0x45, 0x4c, 0x46]),
    },
    {
      path: 'behavior_packs/minimap/manifest.json',
      content: '{}',
    },
  ]);

  const scanned = await scanAmethystArchive(archiveBytes);
  assert.ok(scanned);
  assert.equal(scanned.hasPacks, true);
  assert.deepEqual(scanned.soLibraries, ['lib/arm64-v8a/libminimap.so']);
  assert.ok(scanned.modJsonText?.includes('MiniMap'));
});
