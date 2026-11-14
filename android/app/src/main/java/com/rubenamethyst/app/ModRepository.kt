package com.rubenamethyst.app

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.zip.ZipInputStream

class ModRepository(private val baseDir: File) {
    private val stateFile = File(baseDir, "launcher_state.json")

    fun loadInitialState(): LauncherUiState {
        if (stateFile.exists()) {
            try {
                val root = JSONObject(stateFile.readText())
                val activeProfileId = root.optString("activeProfileId", "profile-amethyst-121")
                val cfgObj = root.optJSONObject("config")
                val config = if (cfgObj != null) {
                    AndroidPortConfig(
                        targetAbi = cfgObj.optString("targetAbi", "arm64-v8a"),
                        packageName = cfgObj.optString("packageName", "com.mojang.minecraftpe"),
                        storagePath = cfgObj.optString("storagePath", "/Android/data/com.rubenamethyst.app/files"),
                        runtimePath = cfgObj.optString("runtimePath", ""),
                        verifyAbiOnLaunch = cfgObj.optBoolean("verifyAbiOnLaunch", true)
                    )
                } else {
                    AndroidPortConfig()
                }

                val modsArr = root.optJSONArray("mods")
                val mods = mutableListOf<ModEntry>()
                if (modsArr != null) {
                    for (i in 0 until modsArr.length()) {
                        val obj = modsArr.getJSONObject(i)
                        mods.add(
                            ModEntry(
                                id = obj.getString("id"),
                                name = obj.getString("name"),
                                version = obj.optString("version", "1.0.0"),
                                author = obj.optString("author", "Desconocido"),
                                abi = obj.optString("abi", "arm64-v8a"),
                                libraryFile = obj.optString("libraryFile", "libmod.so"),
                                targetMcVersion = obj.optString("targetMcVersion", "1.21.0.3"),
                                localPath = obj.optString("localPath", ""),
                                sourceFormat = obj.optString("sourceFormat", ".so")
                            )
                        )
                    }
                }

                val profArr = root.optJSONArray("profiles")
                val profiles = mutableListOf<ProfileEntry>()
                if (profArr != null) {
                    for (i in 0 until profArr.length()) {
                        val obj = profArr.getJSONObject(i)
                        val modIdsJson = obj.optJSONArray("modIds")
                        val modIds = mutableListOf<String>()
                        if (modIdsJson != null) {
                            for (j in 0 until modIdsJson.length()) {
                                modIds.add(modIdsJson.getString(j))
                            }
                        }
                        profiles.add(
                            ProfileEntry(
                                id = obj.getString("id"),
                                name = obj.getString("name"),
                                mcVersion = obj.optString("mcVersion", "1.21.0.3"),
                                runtimeId = obj.optString("runtimeId", "amethyst-1.3.1"),
                                modIds = modIds
                            )
                        )
                    }
                }

                if (profiles.isNotEmpty()) {
                    return LauncherUiState(
                        activeProfileId = activeProfileId,
                        profiles = profiles,
                        mods = mods,
                        config = config
                    )
                }
            } catch (_: Exception) {
                // Fallback a estado inicial si el JSON está corrupto
            }
        }

        val defaultProfiles = listOf(
            ProfileEntry(
                id = "profile-amethyst-121",
                name = "Amethyst 1.21",
                mcVersion = "1.21.0.3",
                runtimeId = "amethyst-1.3.1",
                modIds = emptyList()
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
            mods = emptyList(),
            config = AndroidPortConfig()
        )
    }

    fun persistState(state: LauncherUiState) {
        baseDir.mkdirs()
        val modsArr = JSONArray()
        state.mods.forEach { mod ->
            modsArr.put(
                JSONObject().apply {
                    put("id", mod.id)
                    put("name", mod.name)
                    put("version", mod.version)
                    put("author", mod.author)
                    put("abi", mod.abi)
                    put("libraryFile", mod.libraryFile)
                    put("targetMcVersion", mod.targetMcVersion)
                    put("localPath", mod.localPath)
                    put("sourceFormat", mod.sourceFormat)
                }
            )
        }
        val profilesArr = JSONArray()
        state.profiles.forEach { p ->
            profilesArr.put(
                JSONObject().apply {
                    put("id", p.id)
                    put("name", p.name)
                    put("mcVersion", p.mcVersion)
                    put("runtimeId", p.runtimeId)
                    put("modIds", JSONArray(p.modIds))
                }
            )
        }
        val configObj = JSONObject().apply {
            put("targetAbi", state.config.targetAbi)
            put("packageName", state.config.packageName)
            put("storagePath", state.config.storagePath)
            put("runtimePath", state.config.runtimePath)
            put("verifyAbiOnLaunch", state.config.verifyAbiOnLaunch)
        }
        val root = JSONObject().apply {
            put("activeProfileId", state.activeProfileId)
            put("mods", modsArr)
            put("profiles", profilesArr)
            put("config", configObj)
        }
        stateFile.writeText(root.toString(2))
    }

    fun writeRuntimeManifest(targetFile: File, profile: ProfileEntry, mods: List<ModEntry>) {
        val modsArray = JSONArray()
        mods.forEach { mod ->
            modsArray.put(
                JSONObject().apply {
                    put("id", mod.id)
                    put("libraryFile", mod.libraryFile)
                    put("localPath", mod.localPath)
                    put("abi", mod.abi)
                }
            )
        }
        val payload = JSONObject().apply {
            put("profileId", profile.id)
            put("mcVersion", profile.mcVersion)
            put("runtimeId", profile.runtimeId)
            put("mods", modsArray)
        }
        targetFile.writeText(payload.toString(2))
    }

    private fun resolveFileName(resolver: ContentResolver, uri: Uri): String {
        resolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) {
                val name = cursor.getString(idx)
                if (!name.isNullOrBlank()) return name
            }
        }
        return uri.lastPathSegment?.substringAfterLast('/') ?: "imported_mod.amethyst"
    }

    fun importRuntimeSo(resolver: ContentResolver, uri: Uri): Result<File> {
        return try {
            val fileName = resolveFileName(resolver, uri)
            val runtimesDir = File(baseDir, "runtimes").apply { mkdirs() }
            val dest = File(runtimesDir, if (fileName.endsWith(".so")) fileName else "libamethyst_runtime.so")
            resolver.openInputStream(uri)?.use { input ->
                dest.outputStream().use { output -> input.copyTo(output) }
            } ?: return Result.failure(IllegalStateException("No se pudo abrir el archivo de runtime."))
            dest.setReadable(true, false)
            dest.setExecutable(true, false)
            Result.success(dest)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun extractAndValidateMod(resolver: ContentResolver, uri: Uri, abi: String): Result<ModEntry> {
        return try {
            val displayName = resolveFileName(resolver, uri)
            val lower = displayName.lowercase()
            if (
                !lower.endsWith(".amethyst") &&
                !lower.endsWith(".so") &&
                !lower.endsWith(".zip") &&
                !lower.endsWith(".json")
            ) {
                return Result.failure(
                    IllegalArgumentException("Formato no soportado ($displayName). Usa .amethyst, .so, .zip o mod.json.")
                )
            }

            val modsRoot = File(baseDir, "mods").apply { mkdirs() }
            val rawBytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return Result.failure(IllegalStateException("No se pudo leer el archivo $displayName."))

            if (rawBytes.isEmpty()) {
                return Result.failure(IllegalArgumentException("El archivo $displayName está vacío."))
            }

            val isZip = rawBytes.size >= 2 && rawBytes[0] == 0x50.toByte() && rawBytes[1] == 0x4B.toByte()
            val isElf = rawBytes.size >= 4 &&
                rawBytes[0] == 0x7F.toByte() &&
                rawBytes[1] == 'E'.code.toByte() &&
                rawBytes[2] == 'L'.code.toByte() &&
                rawBytes[3] == 'F'.code.toByte()

            val baseId = displayName
                .substringBeforeLast(".")
                .removePrefix("lib")
                .lowercase()
                .replace(Regex("[^a-z0-9]+"), "-")
                .trim('-')
                .ifBlank { "mod-${System.currentTimeMillis()}" }

            val modDir = File(modsRoot, baseId).apply { mkdirs() }

            if (isZip) {
                var parsedMeta: JSONObject? = null
                var preferredSo: File? = null
                var fallbackSo: File? = null

                ZipInputStream(rawBytes.inputStream()).use { zis ->
                    var entry = zis.nextEntry
                    while (entry != null) {
                        val entryName = entry.name
                        if (!entry.isDirectory && !entryName.contains("..")) {
                            val safeRel = entryName.trimStart('/')
                            val fileName = safeRel.substringAfterLast('/')
                            val outFile = File(modDir, safeRel)
                            outFile.parentFile?.mkdirs()
                            outFile.outputStream().use { zis.copyTo(it) }

                            if (fileName.equals("mod.json", ignoreCase = true) ||
                                fileName.equals("manifest.json", ignoreCase = true)
                            ) {
                                parsedMeta = runCatching { JSONObject(outFile.readText()) }.getOrNull()
                            } else if (fileName.endsWith(".so", ignoreCase = true)) {
                                outFile.setReadable(true, false)
                                outFile.setExecutable(true, false)
                                if (entryName.contains(abi, ignoreCase = true)) {
                                    preferredSo = outFile
                                } else if (fallbackSo == null) {
                                    fallbackSo = outFile
                                }
                            }
                        }
                        zis.closeEntry()
                        entry = zis.nextEntry
                    }
                }

                val targetSo = preferredSo ?: fallbackSo
                    ?: return Result.failure(
                        IllegalStateException("El paquete $displayName no contiene ninguna librería nativa (.so) para Android.")
                    )

                val meta = parsedMeta
                val modName = meta?.optString("name")?.takeIf { it.isNotBlank() }
                    ?: displayName.substringBeforeLast(".").replace('_', ' ')
                val modVersion = meta?.optString("version")?.takeIf { it.isNotBlank() } ?: "1.0.0"
                val modAuthor = meta?.optString("author")?.takeIf { it.isNotBlank() } ?: "AmethystMod"
                val modTargetMc = meta?.optString("targetMcVersion")?.takeIf { it.isNotBlank() } ?: "1.21.0.3"
                val modId = (meta?.optString("id")?.takeIf { it.isNotBlank() } ?: baseId)
                    .lowercase().replace(Regex("[^a-z0-9-]+"), "-")

                return Result.success(
                    ModEntry(
                        id = modId,
                        name = modName,
                        version = modVersion,
                        author = modAuthor,
                        abi = abi,
                        libraryFile = targetSo.name,
                        targetMcVersion = modTargetMc,
                        localPath = targetSo.absolutePath,
                        sourceFormat = if (lower.endsWith(".amethyst")) ".amethyst" else ".zip"
                    )
                )
            }

            if (isElf || lower.endsWith(".so")) {
                val soFileName = if (displayName.endsWith(".so")) displayName else "lib${baseId.replace('-', '_')}.so"
                val outSo = File(modDir, soFileName)
                outSo.writeBytes(rawBytes)
                outSo.setReadable(true, false)
                outSo.setExecutable(true, false)

                return Result.success(
                    ModEntry(
                        id = baseId,
                        name = displayName.substringBeforeLast(".").removePrefix("lib").replace('_', ' '),
                        version = "1.0.0",
                        author = "LocalELF",
                        abi = abi,
                        libraryFile = outSo.name,
                        targetMcVersion = "1.21.0.3",
                        localPath = outSo.absolutePath,
                        sourceFormat = if (lower.endsWith(".amethyst")) ".amethyst" else ".so"
                    )
                )
            }

            // Manifiesto JSON suelto (.json o .amethyst JSON)
            val meta = JSONObject(rawBytes.toString(Charsets.UTF_8))
            val libName = meta.optString("libraryFile", "lib${baseId.replace('-', '_')}.so")
            val placeholderSo = File(modDir, libName)
            return Result.success(
                ModEntry(
                    id = meta.optString("id", baseId),
                    name = meta.optString("name", baseId),
                    version = meta.optString("version", "1.0.0"),
                    author = meta.optString("author", "AmethystMod"),
                    abi = meta.optString("abi", abi),
                    libraryFile = libName,
                    targetMcVersion = meta.optString("targetMcVersion", "1.21.0.3"),
                    localPath = if (placeholderSo.exists()) placeholderSo.absolutePath else "",
                    sourceFormat = if (lower.endsWith(".amethyst")) ".amethyst" else ".json"
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
