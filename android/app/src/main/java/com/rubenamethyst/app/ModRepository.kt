package com.rubenamethyst.app

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class ModRepository(private val baseDir: File) {
    private val stateFile = File(baseDir, "launcher_state.json")

    fun loadInitialState(): LauncherUiState {
        val defaultMods = listOf(
            ModEntry(
                id = "amethyst-dev-tools",
                name = "Amethyst Dev Overlay",
                version = "1.4.0",
                author = "FrederoxDev",
                abi = "arm64-v8a",
                libraryFile = "libamethyst_dev_overlay.so",
                targetMcVersion = "1.21.0.3"
            ),
            ModEntry(
                id = "bedrock-fov-unlocker",
                name = "Dynamic FOV & Camera",
                version = "2.1.0",
                author = "AmethystCommunity",
                abi = "arm64-v8a",
                libraryFile = "libdynamic_fov.so",
                targetMcVersion = "1.21.0.3"
            )
        )
        val defaultProfiles = listOf(
            ProfileEntry(
                id = "profile-amethyst-121",
                name = "Amethyst 1.21",
                mcVersion = "1.21.0.3",
                runtimeId = "amethyst-1.3.1",
                modIds = listOf("amethyst-dev-tools", "bedrock-fov-unlocker")
            ),
            ProfileEntry(
                id = "profile-vanilla-121",
                name = "Vanilla 1.21",
                mcVersion = "1.21.2.2",
                runtimeId = "vanilla",
                modIds = emptyList()
            )
        )
        return LauncherUiState(
            activeProfileId = "profile-amethyst-121",
            profiles = defaultProfiles,
            mods = defaultMods,
            config = AndroidPortConfig()
        )
    }

    fun persistState(state: LauncherUiState) {
        baseDir.mkdirs()
        val json = JSONObject().apply {
            put("activeProfileId", state.activeProfileId)
            put("packageName", state.config.packageName)
            put("targetAbi", state.config.targetAbi)
        }
        stateFile.writeText(json.toString(2))
    }

    fun writeRuntimeManifest(targetFile: File, profile: ProfileEntry, mods: List<ModEntry>) {
        val modsArray = JSONArray()
        mods.forEach { mod ->
            modsArray.put(JSONObject().apply {
                put("id", mod.id)
                put("libraryFile", mod.libraryFile)
                put("abi", mod.abi)
            })
        }
        val payload = JSONObject().apply {
            put("profileId", profile.id)
            put("mcVersion", profile.mcVersion)
            put("runtimeId", profile.runtimeId)
            put("mods", modsArray)
        }
        targetFile.writeText(payload.toString(2))
    }

    fun extractAndValidateMod(resolver: ContentResolver, uri: Uri, abi: String): ModEntry? {
        var displayName = "imported_mod.so"
        resolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) {
                displayName = cursor.getString(idx) ?: displayName
            }
        }
        if (!displayName.endsWith(".so") && !displayName.endsWith(".zip")) return null
        val modsDir = File(baseDir, "mods").apply { mkdirs() }
        val outFile = File(modsDir, displayName)
        resolver.openInputStream(uri)?.use { input ->
            outFile.outputStream().use { output -> input.copyTo(output) }
        }
        val cleanName = displayName.removePrefix("lib").substringBeforeLast(".")
        return ModEntry(
            id = cleanName.lowercase().replace(Regex("[^a-z0-9]+"), "-"),
            name = cleanName.replace('_', ' '),
            version = "1.0.0",
            author = "LocalImport",
            abi = abi,
            libraryFile = if (displayName.endsWith(".so")) displayName else "lib${cleanName}.so",
            targetMcVersion = "1.21.0.3"
        )
    }
}
