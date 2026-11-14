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
  toggleModInProfile,
  validateModImport,
  validateProfileInput,
} from './launcherLogic';
import { AndroidAbi, RuntimeType } from './types';
import { buildZipArchive } from './zipBuilder';

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
  assert.equal(readiness.activeModList.length, 2);

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

  const zipBytes = buildZipArchive(
    ANDROID_PORT_FILES.map((f) => ({ path: `android/${f.path}`, content: f.content }))
  );
  // ZIP local file header magic bytes PK\x03\x04
  assert.equal(zipBytes[0], 0x50);
  assert.equal(zipBytes[1], 0x4b);
  assert.equal(zipBytes[2], 0x03);
  assert.equal(zipBytes[3], 0x04);
  const decodedText = new TextDecoder().decode(zipBytes);
  assert.ok(decodedText.includes('android/app/build.gradle.kts'));
  assert.ok(decodedText.includes('com.rubenamethyst.app'));
});
