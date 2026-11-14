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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

class AmethystLauncherViewModel(app: Application) : AndroidViewModel(app) {
    private val repository = ModRepository(app.getExternalFilesDir(null) ?: app.filesDir)
    private val _uiState = MutableStateFlow(repository.loadInitialState())
    val uiState: StateFlow<LauncherUiState> = _uiState.asStateFlow()

    companion object {
        init {
            System.loadLibrary("amethyst_loader")
        }
    }

    fun detectDeviceAbi(): String = Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a"

    fun isMinecraftInstalled(context: Context, packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, PackageManager.GET_META_DATA)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }

    fun selectProfile(profileId: String) {
        _uiState.value = _uiState.value.copy(activeProfileId = profileId)
        repository.persistState(_uiState.value)
    }

    fun saveProfile(profile: ProfileEntry) {
        val current = _uiState.value.profiles
        val updated = if (current.any { it.id == profile.id }) {
            current.map { if (it.id == profile.id) profile else it }
        } else {
            listOf(profile) + current
        }
        _uiState.value = _uiState.value.copy(profiles = updated, activeProfileId = profile.id)
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

    fun updateConfig(config: AndroidPortConfig) {
        _uiState.value = _uiState.value.copy(config = config)
        repository.persistState(_uiState.value)
    }

    fun launchMinecraft(context: Context) {
        viewModelScope.launch {
            val state = _uiState.value
            val profile = state.activeProfile ?: return@launch
            val configDir = File(context.getExternalFilesDir(null), "runtime_bridge")
            configDir.mkdirs()

            repository.writeRuntimeManifest(
                targetFile = File(configDir, "active_profile.json"),
                profile = profile,
                mods = state.activeMods
            )

            val launchIntent = context.packageManager.getLaunchIntentForPackage(state.config.packageName)
                ?: Intent().apply {
                    setClassName(state.config.packageName, "com.mojang.minecraftpe.MainActivity")
                }

            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            launchIntent.putExtra("amethyst_profile_id", profile.id)
            launchIntent.putExtra("amethyst_manifest_path", File(configDir, "active_profile.json").absolutePath)
            context.startActivity(launchIntent)
        }
    }

    fun importModArchive(resolver: ContentResolver, uri: Uri) {
        viewModelScope.launch {
            val imported = repository.extractAndValidateMod(resolver, uri, detectDeviceAbi())
            if (imported != null) {
                val updated = _uiState.value.mods + imported
                _uiState.value = _uiState.value.copy(mods = updated)
                repository.persistState(_uiState.value)
            }
        }
    }
}
