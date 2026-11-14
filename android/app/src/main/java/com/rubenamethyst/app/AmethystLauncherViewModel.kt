package com.rubenamethyst.app

import android.app.Application
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class AmethystLauncherViewModel(app: Application) : AndroidViewModel(app) {
    private val repository = ModRepository(
        baseDir = app.getExternalFilesDir(null) ?: app.filesDir,
        appNativeLibDir = app.applicationInfo.nativeLibraryDir ?: ""
    )
    private val _uiState = MutableStateFlow(
        repository.loadInitialState(app.assets, detectDeviceAbi())
    )
    val uiState: StateFlow<LauncherUiState> = _uiState.asStateFlow()

    init {
        AmethystNativeBridge.ensureLoaded()
    }

    fun detectDeviceAbi(): String = Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a"

    fun clearStatusMessage() {
        _uiState.value = _uiState.value.copy(statusMessage = null)
    }

    fun selectProfile(profileId: String) {
        _uiState.value = _uiState.value.copy(activeProfileId = profileId, statusMessage = null)
        repository.persistState(_uiState.value)
    }

    fun saveProfile(profile: ProfileEntry) {
        val current = _uiState.value.profiles
        val updated = if (current.any { it.id == profile.id }) {
            current.map { if (it.id == profile.id) profile else it }
        } else {
            listOf(profile) + current
        }
        _uiState.value = _uiState.value.copy(
            profiles = updated,
            activeProfileId = profile.id,
            statusMessage = "Perfil guardado: ${profile.name}"
        )
        repository.persistState(_uiState.value)
    }

    fun deleteProfile(profileId: String) {
        val current = _uiState.value.profiles
        if (current.size <= 1) return
        val remaining = current.filterNot { it.id == profileId }
        val nextActive = if (_uiState.value.activeProfileId == profileId) remaining.first().id else _uiState.value.activeProfileId
        _uiState.value = _uiState.value.copy(profiles = remaining, activeProfileId = nextActive)
        repository.persistState(_uiState.value)
    }

    fun toggleModForActiveProfile(modId: String) {
        val activeId = _uiState.value.activeProfileId
        val updated = _uiState.value.profiles.map { profile ->
            if (profile.id != activeId) profile
            else if (profile.modIds.contains(modId)) profile.copy(modIds = profile.modIds - modId)
            else profile.copy(modIds = profile.modIds + modId)
        }
        _uiState.value = _uiState.value.copy(profiles = updated)
        repository.persistState(_uiState.value)
    }

    fun deleteMod(modId: String) {
        val mod = _uiState.value.mods.firstOrNull { it.id == modId } ?: return
        if (mod.isBonus) return
        val updatedMods = _uiState.value.mods.filterNot { it.id == modId }
        val updatedProfiles = _uiState.value.profiles.map { p ->
            p.copy(modIds = p.modIds - modId)
        }
        _uiState.value = _uiState.value.copy(
            mods = updatedMods,
            profiles = updatedProfiles,
            statusMessage = "Mod eliminado: ${mod.name}"
        )
        repository.persistState(_uiState.value)
    }

    fun updateConfig(config: AndroidPortConfig) {
        _uiState.value = _uiState.value.copy(config = config)
        repository.persistState(_uiState.value)
    }

    fun launchMinecraft(context: Context) {
        val state = _uiState.value
        val profile = state.activeProfile ?: return

        if (profile.runtimeId == "vanilla") {
            val vanillaIntent = context.packageManager.getLaunchIntentForPackage(state.config.packageName)
            if (vanillaIntent != null) {
                vanillaIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(vanillaIntent)
            } else {
                _uiState.value = state.copy(
                    statusMessage = "No se encontró instalado ${state.config.packageName} en el dispositivo."
                )
            }
            return
        }

        val configDir = File(context.getExternalFilesDir(null), "runtime_bridge")
        configDir.mkdirs()
        repository.writeRuntimeManifest(
            targetFile = File(configDir, "active_profile.json"),
            profile = profile,
            mods = state.activeMods
        )

        val mcNativeDir = try {
            context.packageManager.getApplicationInfo(state.config.packageName, 0).nativeLibraryDir ?: ""
        } catch (_: PackageManager.NameNotFoundException) {
            ""
        }

        val modPaths = state.activeMods
            .filter { it.hasAndroidBinary && it.localPath.isNotBlank() }
            .map { it.localPath }
            .toTypedArray()

        val packNotices = state.activeMods
            .filter { it.packDir.isNotBlank() }
            .map { "${it.name} v${it.version}: ${it.packDir}" }
            .toTypedArray()

        val packDirs = state.activeMods
            .map { it.packDir }
            .filter { it.isNotBlank() }
            .distinct()
            .toTypedArray()

        val hostIntent = Intent(context, AmethystGameActivity::class.java).apply {
            putExtra("amethyst_profile_name", profile.name)
            putExtra("amethyst_mc_version", profile.mcVersion)
            putExtra("amethyst_mc_package", state.config.packageName)
            putExtra("amethyst_mc_native_dir", mcNativeDir)
            putExtra("amethyst_runtime_so", state.config.runtimePath)
            putExtra("amethyst_mod_paths", modPaths)
            putExtra("amethyst_pack_notices", packNotices)
            putExtra("amethyst_pack_dirs", packDirs)
        }
        context.startActivity(hostIntent)
    }

    fun importModArchive(resolver: ContentResolver, uri: Uri) {
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                repository.extractAndValidateMod(resolver, uri, detectDeviceAbi())
            }
            result.onSuccess { imported ->
                val currentMods = _uiState.value.mods.filterNot { it.id == imported.id } + imported
                val activeId = _uiState.value.activeProfileId
                val updatedProfiles = _uiState.value.profiles.map { profile ->
                    if (profile.id == activeId && !profile.modIds.contains(imported.id)) {
                        profile.copy(modIds = profile.modIds + imported.id)
                    } else {
                        profile
                    }
                }
                _uiState.value = _uiState.value.copy(
                    mods = currentMods,
                    profiles = updatedProfiles,
                    statusMessage = "Mod ${imported.sourceFormat} importado y activado: ${imported.name} (${imported.libraryFile})"
                )
                repository.persistState(_uiState.value)
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    statusMessage = "Error al importar mod: ${err.message ?: "archivo inválido"}"
                )
            }
        }
    }

    fun importRuntimeArchive(resolver: ContentResolver, uri: Uri) {
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                repository.importRuntimeSo(resolver, uri)
            }
            result.onSuccess { file ->
                val updatedConfig = _uiState.value.config.copy(runtimePath = file.absolutePath)
                _uiState.value = _uiState.value.copy(
                    config = updatedConfig,
                    statusMessage = "Runtime cargado: ${file.name}"
                )
                repository.persistState(_uiState.value)
            }.onFailure { err ->
                _uiState.value = _uiState.value.copy(
                    statusMessage = "Error al importar runtime: ${err.message}"
                )
            }
        }
    }
}
